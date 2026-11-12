// vidlink: upload a video (up to 500 MB), get a link that embeds in Discord & co.
const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, "uploads"));
const MAX_BYTES = 500 * 1024 * 1024;
// Optional: set UPLOAD_PASSWORD so randoms can't use your server as free hosting.
const UPLOAD_PASSWORD = process.env.UPLOAD_PASSWORD || "";
// Set this to your public URL (e.g. https://vids.example.com) when behind a proxy.
const PUBLIC_URL = (process.env.PUBLIC_URL || "").replace(/\/+$/, "");

const MIME = {
  ".mp4": "video/mp4", ".m4v": "video/mp4", ".webm": "video/webm",
  ".mov": "video/quicktime", ".mkv": "video/x-matroska", ".ogv": "video/ogg",
  ".avi": "video/x-msvideo",
};

fs.mkdirSync(DATA_DIR, { recursive: true });

const app = express();
app.set("trust proxy", true);
app.disable("x-powered-by");

const baseUrl = (req) => PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
const newId = () => crypto.randomBytes(6).toString("base64url"); // 8 chars
const validId = (id) => /^[A-Za-z0-9_-]{8}$/.test(id);
const metaPath = (id) => path.join(DATA_DIR, `${id}.json`);
const readMeta = (id) => {
  if (!validId(id)) return null;
  try { return JSON.parse(fs.readFileSync(metaPath(id), "utf8")); } catch { return null; }
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const upload = multer({
  storage: multer.diskStorage({
    destination: DATA_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      req.vidId = newId();
      cb(null, req.vidId + ext);
    },
  }),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!MIME[ext]) return cb(new Error("That doesn't look like a video (mp4, webm, mov, mkv, m4v, ogv, avi)."));
    if (UPLOAD_PASSWORD && req.get("x-upload-password") !== UPLOAD_PASSWORD) {
      return cb(Object.assign(new Error("Wrong upload password."), { status: 401 }));
    }
    cb(null, true);
  },
});

app.get("/api/config", (req, res) => res.json({ needsPassword: !!UPLOAD_PASSWORD, maxBytes: MAX_BYTES }));

app.post("/api/upload", (req, res) => {
  upload.single("video")(req, res, (err) => {
    if (err) {
      if (req.file) fs.rm(req.file.path, () => {});
      const msg = err.code === "LIMIT_FILE_SIZE" ? "File is over 500 MB." : err.message;
      return res.status(err.status || 400).json({ error: msg });
    }
    if (!req.file) return res.status(400).json({ error: "No file received." });

    const ext = path.extname(req.file.filename);
    const num = (v) => { const n = parseInt(v, 10); return n > 0 && n < 10000 ? n : null; };
    const meta = {
      id: req.vidId,
      file: req.file.filename,
      name: path.basename(req.file.originalname).slice(0, 200),
      type: MIME[ext],
      size: req.file.size,
      width: num(req.body.width),
      height: num(req.body.height),
      created: new Date().toISOString(),
    };
    fs.writeFileSync(metaPath(meta.id), JSON.stringify(meta));

    const base = baseUrl(req);
    res.json({ page: `${base}/v/${meta.id}`, direct: `${base}/f/${meta.file}` });
  });
});

// Raw file. express.static/sendFile handles Range requests, which video players need for seeking.
app.get("/f/:file", (req, res) => {
  const { name, ext } = path.parse(req.params.file);
  const meta = readMeta(name);
  if (!meta || meta.file !== name + ext) return res.status(404).send("Not found");
  res.sendFile(path.join(DATA_DIR, meta.file), {
    headers: { "Content-Type": meta.type, "Cache-Control": "public, max-age=31536000, immutable" },
  });
});

// Share page with Open Graph tags so Discord/Twitter/etc. show an inline player.
app.get("/v/:id", (req, res) => {
  const meta = readMeta(req.params.id);
  if (!meta) return res.status(404).send("Video not found");
  const base = baseUrl(req);
  const src = `${base}/f/${meta.file}`;
  const w = meta.width || 1280, h = meta.height || 720;
  const title = esc(meta.name);
  res.type("html").send(`<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<meta property="og:type" content="video.other">
<meta property="og:title" content="${title}">
<meta property="og:url" content="${base}/v/${meta.id}">
<meta property="og:video" content="${src}">
<meta property="og:video:url" content="${src}">
<meta property="og:video:secure_url" content="${src}">
<meta property="og:video:type" content="${meta.type}">
<meta property="og:video:width" content="${w}">
<meta property="og:video:height" content="${h}">
<meta name="twitter:card" content="player">
<meta name="twitter:player" content="${base}/v/${meta.id}">
<meta name="twitter:player:stream" content="${src}">
<meta name="twitter:player:width" content="${w}">
<meta name="twitter:player:height" content="${h}">
<meta name="theme-color" content="#7c5cff">
<style>
  html,body{margin:0;height:100%;background:#0b0b10;color:#eee;font:15px system-ui,sans-serif}
  body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:16px;box-sizing:border-box}
  video{max-width:100%;max-height:85vh;border-radius:10px;background:#000}
  a{color:#a594ff}
</style></head><body>
<video src="${src}" controls autoplay playsinline preload="metadata"></video>
<div>${title} · <a href="${src}" download>download</a> · <a href="/">upload your own</a></div>
</body></html>`);
});

app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`vidlink on http://localhost:${PORT}  (files in ${DATA_DIR})`);
  if (!UPLOAD_PASSWORD) console.log("heads up: no UPLOAD_PASSWORD set, anyone can upload");
});
