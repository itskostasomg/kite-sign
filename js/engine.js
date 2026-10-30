'use strict';
// ============================================================
//  PIP.EXE - engine: canvas, input, pixel painter, font, fx
// ============================================================

const W = 320, H = 180, TILE = 16;
const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ---------- small utils ----------
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const irnd = (a, b) => Math.floor(rnd(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const smooth = (t) => t * t * (3 - 2 * t);
function hash2(x, y) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return c;
}

const _rgb = {};
function hexRgb(h) {
  if (_rgb[h]) return _rgb[h];
  let s = h.replace('#', '');
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  const v = parseInt(s, 16);
  return (_rgb[h] = [(v >> 16) & 255, (v >> 8) & 255, v & 255]);
}
function mixHex(a, b, t) {
  const A = hexRgb(a), B = hexRgb(b);
  const r = Math.round(lerp(A[0], B[0], t)), g = Math.round(lerp(A[1], B[1], t)), bl = Math.round(lerp(A[2], B[2], t));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}
// three-stop palette blend: t 0..1 over [a,b,c]
function mix3(a, b, c, t) { return t < 0.5 ? mixHex(a, b, t * 2) : mixHex(b, c, (t - 0.5) * 2); }

// ---------- storage (may be blocked: never trust it) ----------
const Store = {
  get(k, d) { try { const v = localStorage.getItem('pipexe_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('pipexe_' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
  clear() { try { Object.keys(localStorage).filter(k => k.startsWith('pipexe_')).forEach(k => localStorage.removeItem(k)); } catch (e) { /* ignore */ } },
};

const Settings = { flashing: Store.get('flashing', true), muted: false };

// ---------- canvas fit ----------
function fitCanvas() {
  const wrap = document.getElementById('wrap');
  const r = wrap.getBoundingClientRect();
  let s = Math.min(r.width / W, r.height / H);
  if (s >= 2) s = Math.floor(s);
  s = Math.max(0.5, s);
  canvas.style.width = Math.floor(W * s) + 'px';
  canvas.style.height = Math.floor(H * s) + 'px';
}
window.addEventListener('resize', fitCanvas);

// ---------- input ----------
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  KeyZ: 'jump', Space: 'jump', KeyK: 'jump', KeyC: 'jump',
  KeyX: 'act', KeyJ: 'act', KeyE: 'act',
  Enter: 'start', NumpadEnter: 'start', Escape: 'pause', KeyP: 'pause', KeyM: 'mute', KeyF: 'flash',
};
const ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'act', 'start', 'pause', 'mute', 'flash'];
const Input = {
  held: {}, hits: {}, kb: {}, touch: {}, pad: {}, padPrev: {}, onFirst: [],
  down(a) { return !!this.held[a]; },
  hit(a) { return !!this.hits[a]; },
  confirm() { return this.hit('jump') || this.hit('start') || this.hit('act'); },
  _press(a) { this.hits[a] = true; this.onFirst.forEach(f => f()); },
  poll() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const p = {};
    for (const gp of pads) {
      if (!gp) continue;
      const b = (i) => gp.buttons[i] && gp.buttons[i].pressed;
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      p.left = p.left || ax < -0.4 || b(14);
      p.right = p.right || ax > 0.4 || b(15);
      p.up = p.up || ay < -0.5 || b(12);
      p.down = p.down || ay > 0.5 || b(13);
      p.jump = p.jump || b(0);
      p.act = p.act || b(2) || b(1);
      p.start = p.start || b(9);
      p.pause = p.pause || b(8);
    }
    for (const a of ACTIONS) {
      if (p[a] && !this.padPrev[a]) this._press(a);
      this.held[a] = !!(this.kb[a] || this.touch[a] || p[a]);
    }
    this.padPrev = p;
  },
  endFrame() { this.hits = {}; },
};
window.addEventListener('keydown', (e) => {
  const a = KEYMAP[e.code];
  if (!a) return;
  e.preventDefault();
  if (!e.repeat) Input._press(a);
  Input.kb[a] = true;
});
window.addEventListener('keyup', (e) => { const a = KEYMAP[e.code]; if (a) Input.kb[a] = false; });
window.addEventListener('blur', () => { Input.kb = {}; Input.touch = {}; });
canvas.addEventListener('pointerdown', () => { canvas.focus(); Input._press('start'); });

function setupTouch() {
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (isTouch) document.body.classList.add('touch-on');
  document.querySelectorAll('#touch button').forEach((btn) => {
    const k = btn.dataset.k;
    const on = (e) => { e.preventDefault(); if (!Input.touch[k]) Input._press(k); Input.touch[k] = true; btn.classList.add('on'); };
    const off = (e) => { e.preventDefault(); Input.touch[k] = false; btn.classList.remove('on'); };
    btn.addEventListener('pointerdown', on);
    btn.addEventListener('pointerup', off);
    btn.addEventListener('pointercancel', off);
    btn.addEventListener('pointerleave', off);
  });
  fitCanvas();
}

// ---------- pixel painter (crisp shapes for sprites) ----------
class Painter {
  constructor(w, h) { this.w = w; this.h = h; this.p = new Array(w * h).fill(null); }
  px(x, y, c) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.p[y * this.w + x] = c; }
  at(x, y) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null; return this.p[y * this.w + x]; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c); }
  ell(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.px(x, y, c);
      }
  }
  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  thick(x0, y0, x1, y1, r, c) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= n; i++) this.ell(lerp(x0, x1, i / n), lerp(y0, y1, i / n), r, r, c);
  }
  tri(x0, y0, x1, y1, x2, y2, c) {
    const minX = Math.floor(Math.min(x0, x1, x2)), maxX = Math.ceil(Math.max(x0, x1, x2));
    const minY = Math.floor(Math.min(y0, y1, y2)), maxY = Math.ceil(Math.max(y0, y1, y2));
    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (area === 0) return;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5, py = y + 0.5;
      const w0 = ((x1 - px) * (y2 - py) - (x2 - px) * (y1 - py)) / area;
      const w1 = ((x2 - px) * (y0 - py) - (x0 - px) * (y2 - py)) / area;
      const w2 = 1 - w0 - w1;
      if (w0 >= 0 && w1 >= 0 && w2 >= 0) this.px(x, y, c);
    }
  }
  outline(c) {
    const add = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.at(x, y) !== null) continue;
      const n = [this.at(x - 1, y), this.at(x + 1, y), this.at(x, y - 1), this.at(x, y + 1)];
      if (n.some(v => v !== null && v !== c)) add.push(x, y);
    }
    for (let i = 0; i < add.length; i += 2) this.px(add[i], add[i + 1], c);
    return this;
  }
  recolor(map) { for (let i = 0; i < this.p.length; i++) if (this.p[i] && map[this.p[i]]) this.p[i] = map[this.p[i]]; return this; }
  canvas() {
    const c = makeCanvas(this.w, this.h);
    const g = c.getContext('2d');
    const img = g.createImageData(this.w, this.h);
    for (let i = 0; i < this.p.length; i++) {
      const col = this.p[i];
      if (!col) continue;
      const [r, gg, b] = hexRgb(col);
      img.data[i * 4] = r; img.data[i * 4 + 1] = gg; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }
}

// ---------- 5x7 bitmap font ----------
const FONT_CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?.,'\"-:;/()+=><_%#*[]&@~$";
const FONT_ROWS = [
  [0, 0, 0, 0, 0, 0, 0],
  [14, 17, 17, 31, 17, 17, 17], [30, 17, 17, 30, 17, 17, 30], [14, 17, 16, 16, 16, 17, 14], [30, 17, 17, 17, 17, 17, 30],
  [31, 16, 16, 30, 16, 16, 31], [31, 16, 16, 30, 16, 16, 16], [14, 17, 16, 23, 17, 17, 15], [17, 17, 17, 31, 17, 17, 17],
  [14, 4, 4, 4, 4, 4, 14], [7, 2, 2, 2, 2, 18, 12], [17, 18, 20, 24, 20, 18, 17], [16, 16, 16, 16, 16, 16, 31],
  [17, 27, 21, 21, 17, 17, 17], [17, 17, 25, 21, 19, 17, 17], [14, 17, 17, 17, 17, 17, 14], [30, 17, 17, 30, 16, 16, 16],
  [14, 17, 17, 17, 21, 18, 13], [30, 17, 17, 30, 20, 18, 17], [15, 16, 16, 14, 1, 1, 30], [31, 4, 4, 4, 4, 4, 4],
  [17, 17, 17, 17, 17, 17, 14], [17, 17, 17, 17, 17, 10, 4], [17, 17, 17, 21, 21, 21, 10], [17, 17, 10, 4, 10, 17, 17],
  [17, 17, 17, 10, 4, 4, 4], [31, 1, 2, 4, 8, 16, 31],
  [14, 17, 19, 21, 25, 17, 14], [4, 12, 4, 4, 4, 4, 14], [14, 17, 1, 2, 4, 8, 31], [31, 2, 4, 2, 1, 17, 14],
  [2, 6, 10, 18, 31, 2, 2], [31, 16, 30, 1, 1, 17, 14], [6, 8, 16, 30, 17, 17, 14], [31, 1, 2, 4, 8, 8, 8],
  [14, 17, 17, 14, 17, 17, 14], [14, 17, 17, 15, 1, 2, 12],
  [4, 4, 4, 4, 4, 0, 4], [14, 17, 1, 2, 4, 0, 4], [0, 0, 0, 0, 0, 12, 12], [0, 0, 0, 0, 12, 4, 8],
  [4, 4, 8, 0, 0, 0, 0], [10, 10, 0, 0, 0, 0, 0], [0, 0, 0, 14, 0, 0, 0], [0, 12, 12, 0, 12, 12, 0],
  [0, 12, 12, 0, 12, 4, 8], [1, 1, 2, 4, 8, 16, 16], [2, 4, 8, 8, 8, 4, 2], [8, 4, 2, 2, 2, 4, 8],
  [0, 4, 4, 31, 4, 4, 0], [0, 0, 31, 0, 31, 0, 0], [8, 4, 2, 1, 2, 4, 8], [2, 4, 8, 16, 8, 4, 2],
  [0, 0, 0, 0, 0, 0, 31], [24, 25, 2, 4, 8, 19, 3], [10, 10, 31, 10, 31, 10, 10], [0, 4, 21, 14, 21, 4, 0],
  [14, 8, 8, 8, 8, 8, 14], [14, 2, 2, 2, 2, 2, 14], [12, 18, 20, 8, 21, 18, 13], [14, 17, 1, 13, 21, 21, 14],
  [0, 0, 8, 21, 2, 0, 0], [0, 10, 31, 31, 14, 4, 0],
];
const FONT_INDEX = {};
for (let i = 0; i < FONT_CHARS.length; i++) FONT_INDEX[FONT_CHARS[i]] = i;
const fontBase = (() => {
  const p = new Painter(FONT_CHARS.length * 6, 7);
  FONT_ROWS.forEach((rows, i) => rows.forEach((bits, y) => { for (let x = 0; x < 5; x++) if (bits & (16 >> x)) p.px(i * 6 + x, y, '#ffffff'); }));
  return p.canvas();
})();
const _fontTint = {};
function fontAtlas(color) {
  if (_fontTint[color]) return _fontTint[color];
  const c = makeCanvas(fontBase.width, fontBase.height);
  const g = c.getContext('2d');
  g.drawImage(fontBase, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return (_fontTint[color] = c);
}
const textWidth = (s) => Math.max(0, ...String(s).split('\n').map(l => l.length * 6 - 1));

// opt: color, align, shadow, scale, shake, wave, t, alpha
function drawText(g, str, x, y, opt = {}) {
  str = String(str).toUpperCase();
  const color = opt.color || '#ffffff', sc = opt.scale || 1;
  const lines = str.split('\n');
  const atlas = fontAtlas(color);
  const shadowAtlas = opt.shadow ? fontAtlas(opt.shadow) : null;
  if (opt.alpha !== undefined) { g.save(); g.globalAlpha = opt.alpha; }
  lines.forEach((line, li) => {
    const lw = (line.length * 6 - 1) * sc;
    let lx = x;
    if (opt.align === 'center') lx = Math.round(x - lw / 2);
    else if (opt.align === 'right') lx = x - lw;
    const ly = y + li * 9 * sc;
    for (let i = 0; i < line.length; i++) {
      const idx = FONT_INDEX[line[i]];
      if (idx === undefined || idx === 0) continue;
      let ox = 0, oy = 0;
      if (opt.shake) { ox = Math.round(rnd(-opt.shake, opt.shake)); oy = Math.round(rnd(-opt.shake, opt.shake)); }
      if (opt.wave) oy += Math.round(Math.sin((opt.t || 0) * 0.15 + i * 0.6) * opt.wave);
      const dx = lx + i * 6 * sc + ox, dy = ly + oy;
      if (shadowAtlas) g.drawImage(shadowAtlas, idx * 6, 0, 5, 7, dx + sc, dy + sc, 5 * sc, 7 * sc);
      g.drawImage(atlas, idx * 6, 0, 5, 7, dx, dy, 5 * sc, 7 * sc);
    }
  });
  if (opt.alpha !== undefined) g.restore();
}
function wrapText(str, max) {
  const out = [];
  String(str).split('\n').forEach((para) => {
    let line = '';
    para.split(' ').forEach((w) => {
      if ((line + (line ? ' ' : '') + w).length > max) { if (line) out.push(line); line = w; }
      else line += (line ? ' ' : '') + w;
    });
    out.push(line);
  });
  return out;
}

// ---------- screen effects ----------
const NOISE = [];
for (let n = 0; n < 4; n++) {
  const c = makeCanvas(160, 90), g = c.getContext('2d'), img = g.createImageData(160, 90);
  for (let i = 0; i < 160 * 90; i++) { const v = Math.random() * 255; img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
  NOISE.push(c);
}
const VIGNETTE = (() => {
  const c = makeCanvas(W, H), g = c.getContext('2d');
  const grd = g.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 200);
  grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  return c;
})();
const SCANLINES = (() => {
  const c = makeCanvas(W, H), g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0.13)';
  for (let y = 0; y < H; y += 2) g.fillRect(0, y, W, 1);
  return c;
})();
const fxBuf = makeCanvas(W, H), fxg = fxBuf.getContext('2d');

const FX = {
  shake: 0, flash: 0, flashColor: '#ffffff', staticAmt: 0, staticBase: 0, glitch: 0, vignette: 0.35, red: 0,
  reset() { this.shake = 0; this.flash = 0; this.staticAmt = 0; this.staticBase = 0; this.glitch = 0; this.vignette = 0.35; this.red = 0; },
  hitFlash(color = '#ffffff', amt = 1) { this.flashColor = color; this.flash = Settings.flashing ? amt : Math.min(amt, 0.35); },
  update() {
    this.shake *= 0.88; if (this.shake < 0.2) this.shake = 0;
    this.flash *= 0.86; if (this.flash < 0.02) this.flash = 0;
    this.staticAmt *= 0.9;
    this.glitch *= 0.9; if (this.glitch < 0.05) this.glitch = 0;
  },
  offset() {
    const s = Settings.flashing ? this.shake : this.shake * 0.5;
    return s ? [Math.round(rnd(-s, s)), Math.round(rnd(-s, s))] : [0, 0];
  },
  post(g, t) {
    if (this.glitch > 0) {
      fxg.drawImage(canvas, 0, 0);
      const n = Math.ceil(this.glitch * 6);
      for (let i = 0; i < n; i++) {
        const y = irnd(0, H - 8), h = irnd(2, 14), dx = Math.round(rnd(-1, 1) * this.glitch * 24);
        g.drawImage(fxBuf, 0, y, W, h, dx, y, W, h);
      }
    }
    if (this.red > 0) { g.fillStyle = `rgba(120,0,10,${this.red})`; g.fillRect(0, 0, W, H); }
    const st = Math.min(1, this.staticAmt + this.staticBase);
    if (st > 0.01) {
      g.save();
      g.globalAlpha = Settings.flashing ? st : st * 0.5;
      g.drawImage(NOISE[(t >> 1) % 4], 0, 0, W, H);
      g.restore();
    }
    if (this.vignette > 0) { g.save(); g.globalAlpha = this.vignette; g.drawImage(VIGNETTE, 0, 0); g.restore(); }
    g.drawImage(SCANLINES, 0, 0);
    if (this.flash > 0) { g.save(); g.globalAlpha = this.flash; g.fillStyle = this.flashColor; g.fillRect(0, 0, W, H); g.restore(); }
  },
};

// ---------- tiny coroutine runner for cutscenes ----------
// a script is a generator; yield N waits N frames, yield fn waits until fn() is true
class Script {
  constructor(gen) { this.it = gen; this.wait = 0; this.until = null; this.done = false; }
  step() {
    if (this.done) return;
    if (this.wait > 0) { this.wait--; return; }
    if (this.until) { if (!this.until()) return; this.until = null; }
    const r = this.it.next();
    if (r.done) { this.done = true; return; }
    if (typeof r.value === 'number') this.wait = r.value - 1;
    else if (typeof r.value === 'function') this.until = r.value;
  }
}
