'use strict';
// ============================================================
//  PIP.EXE - map builder, decor art, Pip himself
// ============================================================

class MapB {
  constructor(w, h) { this.w = w; this.h = h; this.g = Array.from({ length: h }, () => Array(w).fill(' ')); }
  fill(x0, y0, x1, y1, ch = '#') { for (let y = Math.max(0, y0); y <= Math.min(this.h - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(this.w - 1, x1); x++) this.g[y][x] = ch; return this; }
  ground(x0, x1, top) { return this.fill(x0, top, x1, this.h - 1, '#'); }
  gap(x0, x1) { return this.fill(x0, 0, x1, this.h - 1, ' '); }
  plat(x, y, len, ch = '=') { return this.fill(x, y, x + len - 1, y, ch); }
  put(x, y, ch) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.g[y][x] = ch; return this; }
  // put an object standing on the first solid tile found below row y0
  on(x, ch, y0 = 0) { for (let y = y0; y < this.h; y++) if ('#=X'.includes(this.g[y][x])) { this.put(x, y - 1, ch); return this; } return this; }
  arc(x0, x1, y, ch = 'o') { for (let x = x0; x <= x1; x++) { const k = (x - x0) / Math.max(1, x1 - x0); this.put(x, Math.round(y - Math.sin(k * Math.PI) * 2), ch); } return this; }
  surface(x) { for (let y = 0; y < this.h; y++) if ('#X'.includes(this.g[y][x])) return y; return this.h; }
  rows() { return this.g.map(r => r.join('')); }
}

// ---------- decor art ----------
const DECOR = {};
function buildDecor() {
  const tree = (dead) => {
    const p = new Painter(56, 72);
    const bark = dead ? '#3a2228' : '#7a4a2a', bark2 = dead ? '#24141a' : '#5a3418';
    p.rect(25, 34, 7, 38, bark); p.rect(25, 34, 2, 38, bark2);
    p.thick(28, 46, 16, 36, 1.4, bark); p.thick(29, 42, 42, 32, 1.4, bark);
    if (dead) {
      p.thick(16, 36, 10, 28, 0.8, bark); p.thick(42, 32, 48, 22, 0.8, bark); p.thick(28, 34, 26, 16, 1, bark); p.thick(26, 16, 20, 8, 0.6, bark); p.thick(27, 20, 34, 10, 0.6, bark);
    } else {
      [[28, 22, 20, 16], [14, 30, 11, 10], [42, 28, 12, 11], [28, 12, 13, 10]].forEach(([x, y, rx, ry]) => p.ell(x, y, rx, ry, '#3f9a3a'));
      [[24, 18, 9, 7], [12, 27, 6, 5], [40, 24, 7, 6]].forEach(([x, y, rx, ry]) => p.ell(x, y, rx, ry, '#5cc04a'));
      [[20, 14], [34, 20], [10, 25], [44, 26], [27, 6]].forEach(([x, y]) => p.px(x, y, '#9ae07a'));
    }
    return p.outline(OUT).canvas();
  };
  DECOR.tree = tree(false); DECOR.treeDead = tree(true);
  const bush = (dead) => {
    const p = new Painter(26, 14);
    const c1 = dead ? '#3a2a24' : '#3f9a3a', c2 = dead ? '#4a3a2a' : '#5cc04a';
    p.ell(7, 9, 6, 5, c1); p.ell(14, 7, 7, 6.5, c1); p.ell(20, 9, 5.5, 5, c1); p.ell(12, 6, 3, 2.5, c2); p.ell(19, 8, 2, 2, c2);
    if (!dead) { p.px(9, 7, '#ff5a7a'); p.px(17, 5, '#ff5a7a'); }
    return p.outline(OUT).canvas();
  };
  DECOR.bush = bush(false); DECOR.bushDead = bush(true);
  // chalk drawing on mine wall: three friends holding hands
  const chalk = (crossed) => {
    const p = new Painter(44, 26), c = '#d8d4e0';
    [[8, 'h'], [22, 'p'], [36, 'd']].forEach(([x, who]) => {
      p.ell(x, 7, 4, 4, null); for (let a = 0; a < 6.3; a += 0.3) p.px(x + Math.cos(a) * 4, 7 + Math.sin(a) * 4, c);
      p.line(x, 11, x, 18, c); p.line(x, 18, x - 3, 24, c); p.line(x, 18, x + 3, 24, c);
      p.line(x - 6, 14, x + 6, 14, c);
      if (who === 'p') { p.px(x - 3, 2, c); p.px(x + 3, 2, c); p.px(x - 3, 1, c); p.px(x + 3, 1, c); }
      if (who === 'h') { p.line(x - 2, 3, x - 1, 0, c); p.line(x + 2, 3, x + 1, 0, c); }
    });
    if (crossed) { p.thick(2, 2, 15, 25, 0.7, '#c81e3a'); p.thick(15, 2, 2, 25, 0.7, '#c81e3a'); }
    return p.canvas();
  };
  DECOR.chalk = chalk(false); DECOR.chalkX = chalk(true);
  // lift cage
  const lift = new Painter(40, 52);
  lift.rect(0, 0, 40, 3, '#6a6070'); lift.rect(0, 49, 40, 3, '#6a6070');
  for (let x = 0; x <= 36; x += 6) lift.rect(x, 3, 2, 46, '#4a4250');
  lift.rect(18, 0, 4, 1, '#c8c0d0');
  DECOR.lift = lift.canvas();
}

// ---------- Pip ----------
class Pip {
  constructor(x, y, cursed = true) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.w = 10; this.h = 22;
    this.face = -1; this.cursed = cursed; this.visible = true; this.mode = 'stand';
    this.anim = 0; this.speed = 1; this.stepT = 0; this.pose = null; this.jitter = 0; this.alpha = 1;
  }
  groundBelow(lv) {
    const tx = Math.floor(this.x / TILE);
    for (let ty = Math.max(0, Math.floor((this.y - 40) / TILE)); ty < lv.h; ty++) {
      const t = lv.at(tx, ty);
      if (t === T_SOLID || t === T_MISSING || t === T_ONEWAY) return ty * TILE;
    }
    return null;
  }
  // terrain-following walk: he does not care about walls
  walk(lv, vx) {
    this.vx = vx; this.x += vx;
    if (vx) this.face = vx > 0 ? 1 : -1;
    const gy = this.groundBelow(lv);
    if (gy !== null) this.y = lerp(this.y, gy, 0.35);
    this.anim += Math.abs(vx) * 0.18;
  }
  steps(listener, heavy = 1) {
    if (Math.abs(this.vx) < 0.1) return;
    if (--this.stepT > 0) return;
    this.stepT = Math.max(8, 26 - Math.abs(this.vx) * 6);
    const d = listener ? Math.abs(listener.x - this.x) : 0;
    const v = clamp(1 - d / 340, 0.08, 1) * heavy;
    Sound.fx.stomp(v);
  }
  eyePos() { return [this.x + (this.face > 0 ? 4 : -5), this.y - 20]; }
  draw(g, camX, camY) {
    if (!this.visible) return;
    const set = this.cursed ? SPR.pipX : SPR.pip;
    let pose = this.pose;
    if (!pose) pose = Math.abs(this.vx) > 0.2 ? 'run' + (Math.floor(this.anim) % 4) : 'idle0';
    let jx = 0;
    if (this.cursed && (Math.random() < 0.04 || this.jitter > 0)) { jx = irnd(-2, 2); this.jitter = Math.max(0, this.jitter - 1); }
    drawSprite(g, set[pose], this.x - camX + jx, this.y - camY + (pose.startsWith('lie') ? 2 : 2), this.face < 0, this.alpha < 1 ? this.alpha : undefined);
  }
  drawEyes(g, camX, camY, t) {
    if (!this.visible) return;
    const [ex, ey] = this.eyePos();
    const x = Math.round(ex - camX), y = Math.round(ey - camY), o = this.face > 0 ? -3 : 3;
    g.fillStyle = 'rgba(255,30,50,0.35)'; g.fillRect(x - 1, y - 1, 3, 3); g.fillRect(x + o - 1, y - 1, 3, 3);
    g.fillStyle = (t >> 3) % 9 === 0 ? '#ff9aa8' : '#ff2238'; g.fillRect(x, y, 1, 1); g.fillRect(x + o, y, 1, 1);
  }
}
