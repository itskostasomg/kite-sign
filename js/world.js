'use strict';
// ============================================================
//  PIP.EXE - world: tiles, backgrounds, physics, player, light
// ============================================================

const T_EMPTY = 0, T_SOLID = 1, T_ONEWAY = 2, T_SPIKE = 3, T_WALL = 4, T_MISSING = 5;
const OBJ_CHARS = 'PoSKcvftbLTDgE123456789Mdwh';

class Level {
  constructor(rows, theme) {
    this.theme = theme;
    this.h = rows.length;
    this.w = Math.max(...rows.map(r => r.length));
    this.tiles = new Uint8Array(this.w * this.h);
    this.objs = [];
    rows.forEach((row, ty) => {
      for (let tx = 0; tx < this.w; tx++) {
        const ch = row[tx] || ' ';
        let t = T_EMPTY;
        if (ch === '#') t = T_SOLID; else if (ch === '=') t = T_ONEWAY; else if (ch === '^') t = T_SPIKE;
        else if (ch === '|') t = T_WALL; else if (ch === 'X') t = T_MISSING;
        else if (OBJ_CHARS.includes(ch)) this.objs.push({ ch, tx, ty, x: tx * TILE + 8, y: ty * TILE + 16 });
        this.tiles[ty * this.w + tx] = t;
      }
    });
    this.pw = this.w * TILE; this.ph = this.h * TILE;
    this.deleted = -1; // debug stage: rows >= this are erased
  }
  at(tx, ty) {
    if (tx < 0 || tx >= this.w) return T_WALL;
    if (ty < 0 || ty >= this.h) return T_EMPTY;
    if (this.deleted >= 0 && ty >= this.deleted) return T_EMPTY;
    return this.tiles[ty * this.w + tx];
  }
  set(tx, ty, t) { if (tx >= 0 && ty >= 0 && tx < this.w && ty < this.h) this.tiles[ty * this.w + tx] = t; }
  solid(tx, ty) { const t = this.at(tx, ty); return t === T_SOLID || t === T_WALL || t === T_MISSING; }
  find(ch) { return this.objs.filter(o => o.ch === ch); }
}

// ---------- tile art (cached by theme / kind / decay bucket) ----------
const _tiles = {};
function tileArt(theme, kind, d, v) {
  const key = theme + kind + d + v;
  if (_tiles[key]) return _tiles[key];
  const p = new Painter(16, 16), k = d / 4;
  const N = (x, y) => hash2(x + v * 31, y + v * 17);
  if (theme === 'clover') {
    const grass = mix3('#5cc04a', '#8f8a3c', '#3a1418', k), grassD = mix3('#3f9a3a', '#6a6430', '#24080c', k);
    const dirt = mix3('#b0703c', '#7a5a46', '#3a1c20', k), dirtD = mix3('#83502a', '#5a4236', '#220c12', k), peb = mix3('#e0b880', '#a09080', '#6a3a3a', k);
    if (kind === 'oneway') {
      p.rect(0, 1, 16, 6, mix3('#9a6a3a', '#7a5a40', '#3a2020', k)); p.rect(0, 1, 16, 1, mix3('#c8945a', '#9a7a5a', '#5a3030', k));
      p.rect(0, 6, 16, 1, dirtD); p.px(4, 3, dirtD); p.px(11, 4, dirtD);
    } else if (kind === 'spike') {
      for (let i = 0; i < 4; i++) p.tri(i * 4, 16, i * 4 + 4, 16, i * 4 + 2, 6 + (i % 2) * 2, mix3('#5a3a2a', '#4a3a2a', '#2a0a10', k));
      for (let i = 0; i < 4; i++) p.px(i * 4 + 2, 8 + (i % 2) * 2, mix3('#e8e0d0', '#c0b0a0', '#ff4050', k));
    } else {
      p.rect(0, 0, 16, 16, dirt);
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const band = Math.sin((x + v * 16) * 0.4) * 1.5 + 10;
        if (Math.abs(y - band) < 1) p.px(x, y, dirtD);
        if (N(x, y) > 0.975) p.px(x, y, peb); else if (N(x, y) < 0.04) p.px(x, y, dirtD);
      }
      if (kind === 'top') {
        p.rect(0, 0, 16, 4, grass); p.rect(0, 4, 16, 1, grassD);
        for (let x = 0; x < 16; x++) if (N(x, 99) > 0.5) p.px(x, 5, grassD);
        for (let x = 0; x < 16; x += 3) p.px(x + (v % 2), 0, mixHex(grass, '#ffffff', 0.3));
      }
    }
  } else if (theme === 'mine') {
    const rock = '#4a3e5c', rockD = '#30283e', rockL = '#6e5e82';
    if (kind === 'oneway') { p.rect(0, 1, 16, 4, '#7a5a3a'); p.rect(0, 1, 16, 1, '#a07a50'); p.px(3, 3, '#4a3420'); p.px(12, 3, '#4a3420'); p.rect(2, 5, 2, 3, '#4a3420'); p.rect(12, 5, 2, 3, '#4a3420'); }
    else if (kind === 'spike') { for (let i = 0; i < 3; i++) p.tri(i * 5 + 1, 16, i * 5 + 6, 16, i * 5 + 3.5, 5 + (i % 2) * 3, '#8a8098'); p.px(4, 8, '#c8c0d8'); }
    else {
      p.rect(0, 0, 16, 16, rock);
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const n = N(x, y); if (n > 0.9) p.px(x, y, rockL); else if (n < 0.12) p.px(x, y, rockD); }
      p.line(2 + v % 5, 6, 7, 11, rockD); p.line(7, 11, 9, 15, rockD);
      if (kind === 'top') { p.rect(0, 0, 16, 2, rockL); p.rect(0, 2, 16, 1, rockD); }
      if (N(5, 5) > 0.8) { p.px(10, 8, '#7ff0ff'); p.px(11, 7, '#3ab0d0'); }
    }
  } else if (theme === 'debug') {
    const base = mix3('#c8c8cc', '#8a8890', '#2a2430', k), line = mix3('#8a8a96', '#5a5866', '#14101a', k);
    if (kind === 'missing') { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.px(x, y, ((x >> 3) + (y >> 3)) % 2 ? '#ff00dc' : '#000000'); }
    else if (kind === 'oneway') { p.rect(0, 0, 16, 5, '#ff9a2a'); for (let x = 0; x < 16; x += 4) p.rect(x, 0, 2, 5, '#30303a'); }
    else if (kind === 'spike') { for (let i = 0; i < 4; i++) p.tri(i * 4, 16, i * 4 + 4, 16, i * 4 + 2, 7, '#ff3040'); }
    else {
      p.rect(0, 0, 16, 16, base); p.rect(0, 0, 16, 1, line); p.rect(0, 0, 1, 16, line);
      p.px(2, 2, line); p.px(3, 2, line); p.px(2, 3, line);
      if (d > 2) for (let i = 0; i < 6; i++) p.px(Math.floor(N(i, 1) * 16), Math.floor(N(1, i) * 16), N(i, i) > 0.5 ? '#ff00dc' : '#000000');
    }
  } else { // void
    p.rect(0, 0, 16, 16, '#0e0a12'); if (kind === 'top') p.rect(0, 0, 16, 1, '#2a2232');
  }
  return (_tiles[key] = p.canvas());
}

function drawTiles(g, lv, camX, camY, decay) {
  const d = Math.round(clamp(decay, 0, 1) * 4);
  const x0 = Math.floor(camX / TILE), x1 = Math.ceil((camX + W) / TILE), y0 = Math.floor(camY / TILE), y1 = Math.ceil((camY + H) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const t = lv.at(tx, ty);
    if (t === T_EMPTY || t === T_WALL || (tx < 0 || tx >= lv.w)) continue;
    let kind = 'fill';
    if (t === T_ONEWAY) kind = 'oneway'; else if (t === T_SPIKE) kind = 'spike'; else if (t === T_MISSING) kind = 'missing';
    else if (!lv.solid(tx, ty - 1) && lv.at(tx, ty - 1) !== T_ONEWAY) kind = 'top';
    g.drawImage(tileArt(lv.theme, kind, d, (tx * 7 + ty * 3) % 4), Math.round(tx * TILE - camX), Math.round(ty * TILE - camY));
  }
}

// ---------- parallax backgrounds ----------
function hillLine(x, seed, amp, base) { return base - (Math.sin(x * 0.011 + seed) * amp + Math.sin(x * 0.027 + seed * 2) * amp * 0.5 + Math.sin(x * 0.005 + seed * 3) * amp * 0.8); }
function drawBackground(g, theme, camX, camY, d, t) {
  if (theme === 'clover') {
    const top = mix3('#4aa8f0', '#c8582a', '#120206', d), bot = mix3('#bfe8ff', '#ffb070', '#5a0a14', d);
    const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, top); grd.addColorStop(1, bot);
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    // sun turns into an eye
    const sy = 38 + d * 30, sc = mix3('#fff2a0', '#ff7a3a', '#ff2030', d);
    g.fillStyle = sc; g.beginPath(); g.arc(250, sy, 16, 0, Math.PI * 2); g.fill();
    if (d > 0.82) { g.fillStyle = '#05000a'; g.beginPath(); g.ellipse(250, sy, 4, 11, 0, 0, Math.PI * 2); g.fill(); }
    // clouds
    g.fillStyle = mix3('#ffffff', '#ffc8a0', '#3a0a10', d);
    for (let i = 0; i < 6; i++) {
      const cx = ((i * 97 - camX * 0.08 + t * 0.05) % 420 + 420) % 420 - 50, cy = 20 + (i * 23) % 40;
      g.beginPath(); g.arc(cx, cy, 9, 0, 7); g.arc(cx + 10, cy - 4, 11, 0, 7); g.arc(cx + 22, cy, 8, 0, 7); g.fill();
    }
    const yo = -camY * 0.2;
    g.fillStyle = mix3('#8fd4a8', '#b07a60', '#2a060c', d);
    for (let x = 0; x < W; x += 2) { const y = hillLine(x + camX * 0.15, 1, 14, 112) + yo; g.fillRect(x, y, 2, H - y); }
    g.fillStyle = mix3('#4aa860', '#7a5040', '#14020a', d);
    for (let x = 0; x < W; x += 2) { const y = hillLine(x + camX * 0.35, 4, 10, 138) + yo; g.fillRect(x, y, 2, H - y); }
    // lollipop trees on the near hills
    for (let i = -1; i < 9; i++) {
      const wx = Math.floor((camX * 0.35) / 48) * 48 + i * 48, sx = wx - camX * 0.35, gy = hillLine(sx + camX * 0.35, 4, 10, 138) + yo;
      g.fillStyle = mix3('#6a4a2a', '#5a3a2a', '#0a0004', d); g.fillRect(sx, gy - 14, 2, 14);
      if (d < 0.7) { g.fillStyle = mix3('#3f9a3a', '#8a7a2a', '#2a0a0a', d); g.beginPath(); g.arc(sx + 1, gy - 17, 7 - d * 4, 0, 7); g.fill(); }
      else { g.fillRect(sx - 4, gy - 12, 4, 1); g.fillRect(sx + 2, gy - 9, 5, 1); }
    }
  } else if (theme === 'mine') {
    g.fillStyle = '#0d0912'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#16101e';
    for (let i = -1; i < 8; i++) { const x = ((i * 53 - camX * 0.3) % 424 + 424) % 424 - 52; g.fillRect(x, 0, 18 + (i % 3) * 6, H); }
    g.fillStyle = '#1c1426';
    for (let x = 0; x < W; x += 4) { const y = hillLine(x + camX * 0.5, 2, 6, 24); g.fillRect(x, 0, 4, y - camY * 0.3); }
  } else if (theme === 'debug') {
    g.fillStyle = mix3('#e2e2e6', '#9a98a2', '#0a0810', d); g.fillRect(0, 0, W, H);
    const ox = -((camX * 0.5) % 32), oy = -((camY * 0.5) % 32);
    g.fillStyle = mix3('#c4c4cc', '#7a7884', '#1a1420', d);
    for (let x = ox; x < W; x += 32) g.fillRect(Math.round(x), 0, 1, H);
    for (let y = oy; y < H; y += 32) g.fillRect(0, Math.round(y), W, 1);
    if (d < 0.8) for (let x = ox; x < W; x += 64) drawText(g, String(Math.floor((x + camX * 0.5) / 32)), Math.round(x) + 2, 2, { color: mix3('#a8a8b0', '#6a6874', '#2a2030', d) });
  } else {
    g.fillStyle = '#000000'; g.fillRect(0, 0, W, H);
  }
}

// ---------- physics ----------
function moveBody(b, lv, plats) {
  b.hitWall = 0;
  const wasBottom = b.y;
  // horizontal
  b.x += b.vx;
  const top = b.y - b.h + 2, bot = b.y - 2;
  const ty0 = Math.floor(top / TILE), ty1 = Math.floor(bot / TILE);
  if (b.vx > 0) {
    const tx = Math.floor((b.x + b.w / 2) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) if (lv.solid(tx, ty)) { b.x = tx * TILE - b.w / 2 - 0.01; b.vx = 0; b.hitWall = 1; break; }
  } else if (b.vx < 0) {
    const tx = Math.floor((b.x - b.w / 2) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) if (lv.solid(tx, ty)) { b.x = (tx + 1) * TILE + b.w / 2 + 0.01; b.vx = 0; b.hitWall = -1; break; }
  }
  // vertical
  b.y += b.vy;
  b.onGround = false;
  const tx0 = Math.floor((b.x - b.w / 2 + 1) / TILE), tx1 = Math.floor((b.x + b.w / 2 - 1) / TILE);
  if (b.vy >= 0) {
    const ty = Math.floor(b.y / TILE);
    for (let tx = tx0; tx <= tx1; tx++) {
      const t = lv.at(tx, ty);
      if (lv.solid(tx, ty) || (t === T_ONEWAY && wasBottom <= ty * TILE + 0.5 && !b.dropping)) { b.y = ty * TILE; b.vy = 0; b.onGround = true; break; }
    }
    if (!b.onGround && plats) for (const pl of plats) {
      if (b.x + b.w / 2 > pl.x && b.x - b.w / 2 < pl.x + pl.w && wasBottom <= pl.y + 1 && b.y >= pl.y) { b.y = pl.y; b.vy = 0; b.onGround = true; b.x += pl.dx; break; }
    }
  } else {
    const ty = Math.floor((b.y - b.h) / TILE);
    for (let tx = tx0; tx <= tx1; tx++) if (lv.solid(tx, ty)) { b.y = (ty + 1) * TILE + b.h; b.vy = 0; break; }
  }
}
function touchesSpike(b, lv) {
  const tx0 = Math.floor((b.x - b.w / 2 + 2) / TILE), tx1 = Math.floor((b.x + b.w / 2 - 2) / TILE);
  const ty0 = Math.floor((b.y - b.h + 4) / TILE), ty1 = Math.floor((b.y - 1) / TILE);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (lv.at(tx, ty) === T_SPIKE && b.y - 1 > ty * TILE + 6) return true;
  return false;
}

// ---------- player ----------
const CHAR = {
  hazel: { speed: 2.3, accel: 0.15, jump: 4.75, glide: true, name: 'HAZEL' },
  digby: { speed: 1.75, accel: 0.12, jump: 4.35, name: 'DIGBY' },
  dev: { speed: 2.1, accel: 0.14, jump: 4.6, name: 'DEBUG' },
  p2: { speed: 1.0, accel: 0.1, jump: 0, name: 'PLAYER 2' },
};
class Player {
  constructor(kind, x, y) {
    this.kind = kind; this.c = CHAR[kind];
    this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.w = 10; this.h = 22;
    this.face = 1; this.onGround = false; this.coyote = 0; this.buffer = 0;
    this.anim = 0; this.lie = 0; this.lying = false; this.gliding = false; this.hurtT = 0; this.frozen = false;
    this.canLie = true; this.blink = 0; this.stepT = 0; this.visible = true; this.speedMul = 1;
  }
  get playingDead() { return this.lying; }
  update(lv, plats, ctl) {
    const C = this.c;
    const L = ctl.left, R = ctl.right;
    if (this.hurtT > 0) this.hurtT--;
    // play dead
    if (ctl.down && this.onGround && this.canLie && !this.frozen) { this.lie = Math.min(12, this.lie + 1); }
    else this.lie = Math.max(0, this.lie - 2);
    const wasLying = this.lying;
    this.lying = this.lie >= 8;
    if (this.lying && !wasLying) Sound.fx.land();
    if (this.lie > 0) { this.vx *= 0.7; }
    else if (!this.frozen) {
      const max = C.speed * this.speedMul;
      if (L && !R) { this.vx = Math.max(-max, this.vx - C.accel * (this.vx > 0 ? 2.2 : 1)); this.face = -1; }
      else if (R && !L) { this.vx = Math.min(max, this.vx + C.accel * (this.vx < 0 ? 2.2 : 1)); this.face = 1; }
      else this.vx *= this.onGround ? 0.78 : 0.96;
      if (Math.abs(this.vx) < 0.05) this.vx = 0;
    } else this.vx *= 0.8;
    // jump with coyote time and buffer
    this.coyote = this.onGround ? 7 : Math.max(0, this.coyote - 1);
    this.buffer = ctl.jumpHit ? 7 : Math.max(0, this.buffer - 1);
    if (this.buffer && this.coyote && C.jump && this.lie === 0 && !this.frozen) {
      this.vy = -C.jump; this.coyote = 0; this.buffer = 0; Sound.fx.jump();
    }
    if (!ctl.jump && this.vy < -1.6) this.vy *= 0.6;
    // gravity & glide
    this.vy = Math.min(this.vy + 0.24, 5.2);
    this.gliding = C.glide && !this.onGround && ctl.jump && this.vy > 0.4 && !this.frozen;
    if (this.gliding) { this.vy = Math.min(this.vy, 0.65); if ((this.anim | 0) % 12 === 0) Sound.fx.glide(); }
    this.dropping = ctl.down && ctl.jumpHit;
    const air = !this.onGround;
    moveBody(this, lv, plats);
    if (air && this.onGround) Sound.fx.land();
    // animation
    if (this.onGround && Math.abs(this.vx) > 0.3) {
      this.anim += Math.abs(this.vx) * 0.18;
      if (Math.floor(this.anim) % 2 === 0 && this.stepT <= 0) { Sound.fx.step(); this.stepT = 8; }
    } else this.anim += 0.05;
    this.stepT--;
    this.blink = (this.blink + 1) % 200;
  }
  pose() {
    if (this.lying || this.lie > 4) return 'liePlay';
    if (this.hurtT > 0) return 'hurt';
    if (!this.onGround) return this.gliding ? 'glide' : this.vy < 0 ? 'jump' : 'fall';
    if (Math.abs(this.vx) > 0.3) return 'run' + (Math.floor(this.anim) % 4);
    return this.blink > 190 ? 'idle1' : 'idle0';
  }
  draw(g, camX, camY) {
    if (!this.visible) return;
    if (this.hurtT > 0 && (this.hurtT >> 2) % 2) return;
    const pose = this.pose(), lie = pose.startsWith('lie');
    drawSprite(g, SPR[this.kind][pose], this.x - camX, this.y - camY + (lie ? 2 : 2), this.face < 0);
  }
}

// ---------- darkness with ordered dithering ----------
const DW = 160, DH = 90;
const darkC = makeCanvas(DW, DH), darkG = darkC.getContext('2d'), darkImg = darkG.createImageData(DW, DH);
const darkPx = new Uint32Array(darkImg.data.buffer);
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
// lights: {x, y, r, k, dir, spread} in screen pixels
function drawDarkness(g, lights, ambient = 0, tint = 0x0a0306) {
  const r = tint & 255, gg = (tint >> 8) & 255, b = (tint >> 16) & 255;
  for (let py = 0; py < DH; py++) for (let px = 0; px < DW; px++) {
    const wx = px * 2 + 1, wy = py * 2 + 1;
    let I = ambient;
    for (let i = 0; i < lights.length; i++) {
      const L = lights[i], dx = wx - L.x, dy = wy - L.y, d2 = dx * dx + dy * dy;
      if (d2 > L.r * L.r) continue;
      let v = 1 - Math.sqrt(d2) / L.r;
      if (L.dir !== undefined) {
        const a = Math.atan2(dy, dx) - L.dir;
        const da = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
        if (da > L.spread) v *= Math.max(0, 1 - (da - L.spread) * 3);
      }
      I += v * (L.k || 1.4);
    }
    const dark = 1 - Math.min(1, I);
    const a = dark * 3, base = Math.floor(a), lvl = base + (a - base > BAYER[(px & 3) + (py & 3) * 4] ? 1 : 0);
    darkPx[py * DW + px] = ((Math.min(3, lvl) * 85) << 24) | (b << 16) | (gg << 8) | r;
  }
  darkG.putImageData(darkImg, 0, 0);
  g.drawImage(darkC, 0, 0, W, H);
}

// ---------- particles ----------
class Particles {
  constructor() { this.list = []; }
  add(x, y, o = {}) { this.list.push({ x, y, vx: o.vx || 0, vy: o.vy || 0, life: o.life || 30, max: o.life || 30, c: o.c || '#ffffff', s: o.s || 1, g: o.g === undefined ? 0.05 : o.g }); }
  burst(x, y, n, c, sp = 1.5) { for (let i = 0; i < n; i++) this.add(x, y, { vx: rnd(-sp, sp), vy: rnd(-sp * 1.4, sp * 0.3), c, life: irnd(18, 36) }); }
  update() { this.list = this.list.filter(p => { p.x += p.vx; p.y += p.vy; p.vy += p.g; return --p.life > 0; }); }
  draw(g, camX, camY) { for (const p of this.list) { g.fillStyle = p.c; g.fillRect(Math.round(p.x - camX), Math.round(p.y - camY), p.s, p.s); } }
}

class Camera {
  constructor() { this.x = 0; this.y = 0; this.look = 0; }
  follow(t, lv, snap) {
    this.look = lerp(this.look, (t.face || 1) * 28, 0.04);
    const tx = clamp(t.x - W / 2 + this.look, 0, Math.max(0, lv.pw - W)), ty = clamp(t.y - H * 0.62, 0, Math.max(0, lv.ph - H));
    if (snap) { this.x = tx; this.y = ty; return; }
    this.x = lerp(this.x, tx, 0.14); this.y = lerp(this.y, ty, 0.1);
  }
}
