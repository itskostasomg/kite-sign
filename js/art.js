'use strict';
// ============================================================
//  PIP.EXE - big art: title head, scare faces, logos, portraits
// ============================================================

function bigHead(cursed) {
  const C = cursed ? PAL.pipX : PAL.pip;
  const p = new Painter(100, 88);
  // ears
  p.ell(27, 18, 14, 14, C.ear); p.ell(27, 19, 7.5, 7.5, C.earIn);
  p.ell(69, 13, 13, 13, C.ear); p.ell(69, 14, 7, 7, C.earIn);
  // head and tufts
  p.tri(30, 22, 40, 2, 48, 20, C.fur); p.tri(44, 18, 54, 0, 58, 18, C.fur);
  p.ell(48, 45, 34, 30, C.fur);
  p.ell(36, 32, 14, 8, mixHex(C.fur, '#ffffff', 0.18));
  // face mask + snout
  p.ell(53, 53, 26, 21, C.face);
  p.ell(72, 57, 17, 11, C.face);
  p.ell(87, 53, 6.5, 6, C.nose); p.ell(85, 51, 2, 1.6, cursed ? '#d06a84' : '#ffd0dc');
  // whisker dots
  [[76, 62], [80, 64], [74, 66]].forEach(([x, y]) => p.px(x, y, mixHex(C.face, '#000000', 0.35)));
  if (!cursed) {
    p.ell(42, 41, 8.5, 11.5, '#ffffff'); p.ell(61, 40, 8.5, 11.5, '#ffffff');
    p.ell(45, 43, 3.8, 6.5, C.pupil); p.ell(64, 42, 3.8, 6.5, C.pupil);
    p.ell(46, 39.5, 1.4, 1.8, '#ffffff'); p.ell(65, 38.5, 1.4, 1.8, '#ffffff');
    p.rect(35, 28, 10, 2, C.fur2); p.rect(56, 27, 10, 2, C.fur2);
    // smile + tongue
    p.ell(67, 64, 11, 6, '#3a1020'); p.ell(67, 61, 12, 5, C.face);
    p.ell(70, 68, 4, 2, '#ff7aa2');
  } else {
    p.ell(42, 42, 9, 12.5, C.eye); p.ell(61, 41, 9, 12.5, C.eye);
    p.ell(44, 44, 2.4, 2.4, '#7a0a18'); p.ell(63, 43, 2.4, 2.4, '#7a0a18');
    p.ell(44, 44, 1.1, 1.1, C.pupil); p.ell(63, 43, 1.1, 1.1, C.pupil);
    p.thick(40, 53, 38, 76, 1.4, '#120a18'); p.thick(43, 54, 44, 70, 0.8, '#120a18');
    p.thick(62, 53, 64, 74, 1.4, '#120a18');
    p.line(33, 30, 46, 33, C.fur2); p.line(54, 32, 68, 28, C.fur2);
    // the grin
    p.ell(63, 65, 25, 9, '#1c060c'); p.ell(63, 59.5, 26, 6.5, C.face);
    for (let x = 41; x < 86; x += 3) { p.tri(x, 62, x + 3, 62, x + 1.5, 67, '#f4f0e8'); }
    for (let x = 43; x < 84; x += 3) { p.tri(x, 74, x + 3, 74, x + 1.5, 69, '#e8e0d0'); }
  }
  // scarf
  p.rect(22, 72, 54, 8, C.scarf); p.rect(22, 72, 54, 2, mixHex(C.scarf, '#ffffff', 0.25));
  p.tri(24, 74, 10, 86, 30, 80, C.scarf2);
  p.outline(OUT);
  return p.canvas();
}

function scareFace(open) {
  const p = new Painter(160, 90);
  const fur = '#3e3946', face = '#b4abbb';
  p.ell(18, 2, 26, 26, '#120e16'); p.ell(146, 0, 26, 26, '#120e16');
  p.ell(80, 52, 74, 56, fur);
  p.ell(84, 60, 56, 36, face);
  // eyes
  p.ell(54, 38, 18, 23, '#030104'); p.ell(110, 36, 18, 23, '#030104');
  p.ell(57, 41, 5, 5, '#5a0410'); p.ell(113, 39, 5, 5, '#5a0410');
  p.ell(57, 41, 2.2, 2.2, '#ff2238'); p.ell(113, 39, 2.2, 2.2, '#ff2238');
  p.px(56, 40, '#ffd0d0'); p.px(112, 38, '#ffd0d0');
  // ink
  p.thick(48, 58, 44, 90, 2.4, '#0a0610'); p.thick(56, 60, 58, 84, 1.4, '#0a0610');
  p.thick(116, 56, 120, 90, 2.4, '#0a0610'); p.thick(106, 58, 104, 80, 1.2, '#0a0610');
  if (!open) {
    p.ell(86, 70, 50, 14, '#16040a'); p.ell(86, 62, 52, 9, face);
    for (let x = 38; x < 134; x += 5) p.tri(x, 66, x + 5, 66, x + 2.5, 74, '#f4f0e8');
    for (let x = 41; x < 131; x += 5) p.tri(x, 84, x + 5, 84, x + 2.5, 76, '#e0d8c8');
  } else {
    p.ell(86, 72, 34, 18, '#16040a'); p.ell(86, 76, 22, 10, '#3a0812');
    for (let a = 0; a < Math.PI * 2; a += 0.28) {
      const x = 86 + Math.cos(a) * 32, y = 72 + Math.sin(a) * 16;
      const ix = 86 + Math.cos(a) * 22, iy = 72 + Math.sin(a) * 9;
      p.tri(x - 2, y, x + 2, y, ix, iy, '#f4f0e8');
    }
  }
  // grime speckle
  for (let i = 0; i < 260; i++) { const x = irnd(0, 159), y = irnd(0, 89); if (p.at(x, y)) p.px(x, y, mixHex(p.at(x, y), '#000000', 0.4)); }
  return p.canvas();
}

function studioMark() {
  const p = new Painter(30, 30);
  p.thick(15, 28, 15, 12, 1, '#3f7a3a'); p.tri(15, 16, 26, 10, 18, 20, '#5cc04a'); p.tri(15, 18, 4, 13, 12, 22, '#4aa83c');
  [[11, 7], [16, 5], [20, 9], [13, 11], [18, 13], [9, 12]].forEach(([x, y]) => { p.ell(x, y, 3.2, 3.2, '#7a3aa8'); p.px(x - 1, y - 1, '#c89aff'); });
  p.outline(OUT);
  return p.canvas();
}

// desaturate + darken a canvas (for dead portraits)
function grimCanvas(src, amt = 1, dark = 0.45) {
  const c = makeCanvas(src.width, src.height), g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  const img = g.getImageData(0, 0, c.width, c.height), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
    d[i] = lerp(d[i], l, amt) * (1 - dark) + 18 * dark;
    d[i + 1] = lerp(d[i + 1], l, amt) * (1 - dark);
    d[i + 2] = lerp(d[i + 2], l, amt) * (1 - dark) + 8 * dark;
  }
  g.putImageData(img, 0, 0);
  return c;
}

const ART = {};
function buildArt() {
  ART.head = bigHead(false);
  ART.headX = bigHead(true);
  ART.scare = scareFace(false);
  ART.scareOpen = scareFace(true);
  ART.mark = studioMark();
  ART.dead = {};
  ['hazel', 'digby', 'dev', 'p2', 'pip'].forEach((n) => { ART.dead[n] = grimCanvas(SPR[n].lieDead, 0.7, 0.2); });
}

// chunky outlined title text
function bigText(g, str, x, y, sc, fill, outline, opt = {}) {
  const o = Math.max(1, Math.round(sc / 2));
  for (let dx = -o; dx <= o; dx += o) for (let dy = -o; dy <= o; dy += o) {
    if (dx || dy) drawText(g, str, x + dx, y + dy, { color: outline, scale: sc, align: opt.align });
  }
  drawText(g, str, x, y + sc, { color: opt.shade || outline, scale: sc, align: opt.align });
  drawText(g, str, x, y, { color: fill, scale: sc, align: opt.align, shake: opt.shake });
}

function drawLogo(g, x, y, cursed, t) {
  if (!cursed) {
    bigText(g, 'PIP', x, y, 5, '#ffd84a', OUT, { align: 'center', shade: '#c0601a' });
    bigText(g, 'THE POSSUM', x, y + 40, 2, '#ffffff', OUT, { align: 'center', shade: '#2ec4b6' });
  } else {
    bigText(g, 'PIP', x, y, 5, '#d8d0dc', OUT, { align: 'center', shade: '#6b1822', shake: (t % 90 < 6) ? 1 : 0 });
    // drips
    g.fillStyle = '#8a0a18';
    for (let i = 0; i < 7; i++) { const dx = x - 40 + i * 13 + (i % 2) * 3, len = 4 + ((t * 0.05 + i * 7) % 12); g.fillRect(dx, y + 36, 2, len); }
    bigText(g, "LET'S PLAY DEAD", x, y + 46, 1, '#ff3048', OUT, { align: 'center' });
  }
}

// small framed dialog box
function drawBox(g, x, y, w, h, bg = '#120c18', edge = '#e9e4f0') {
  g.fillStyle = OUT; g.fillRect(x - 2, y - 2, w + 4, h + 4);
  g.fillStyle = edge; g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = bg; g.fillRect(x, y, w, h);
}
