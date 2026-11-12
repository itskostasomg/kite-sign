# vidlink

Drop a video (up to 500 MB), get a link you can paste in Discord and it plays inline.

```bash
cd vidlink
npm install
UPLOAD_PASSWORD=pick-something npm start   # http://localhost:3000
```

You get two links per upload:

- `/v/<id>`: share page with Open Graph video tags (Discord, Twitter, etc. show a player)
- `/f/<id>.mp4`: the raw file, supports seeking (Range requests)

## Env vars

| Var | What it does |
| --- | --- |
| `PORT` | Port to listen on (default 3000) |
| `UPLOAD_PASSWORD` | If set, uploads need this password. **Set it** or anyone can use your server as free hosting. |
| `PUBLIC_URL` | Your public URL, e.g. `https://vids.example.com`, if links come out wrong behind a proxy |
| `DATA_DIR` | Where videos are stored (default `./uploads`) |

## For Discord embeds to actually work

- The server has to be reachable on the public internet over **HTTPS**. Discord can't embed `localhost`.
- Use **mp4 (H.264/AAC)** or **webm**. `.mov`/`.mkv`/`.avi` upload fine but Discord usually won't play them inline.
- Any host with a persistent disk works: a small VPS behind Caddy, Fly.io with a volume, Railway with a volume, etc.
  Quick test from your own PC: `npx cloudflared tunnel --url http://localhost:3000`.
