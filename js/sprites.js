'use strict';
// ============================================================
//  PIP.EXE - sprites. Every pixel drawn in code, no borrowed art.
// ============================================================

const OUT = '#0b0710';
const PAL = {
  pip: { fur: '#a9a5b8', fur2: '#8b8799', face: '#f3eff7', ear: '#2b2733', earIn: '#ef8fae', nose: '#ff7aa2', tail: '#f1a6bb', belly: '#dcd6e6',
    scarf: '#2ec4b6', scarf2: '#1f8f86', shoe: '#ffcf3f', sole: '#fff1c2', paw: '#f1a6bb', eye: '#ffffff', pupil: '#1a1420' },
  pipX: { fur: '#6d6779', fur2: '#55505f', face: '#c9c1cf', ear: '#17131c', earIn: '#7a2f45', nose: '#b0405e', tail: '#a0687a', belly: '#9e97a7',
    scarf: '#6b1822', scarf2: '#45101a', shoe: '#8a7a3a', sole: '#b5a982', paw: '#a0687a', eye: '#06030a', pupil: '#ff2238' },
  hazel: { fur: '#c8763c', fur2: '#a65c2b', face: '#f5dcb0', ear: '#c8763c', earIn: '#f0a080', nose: '#5a2e1a', tail: '#c8763c', tail2: '#e9a462', belly: '#f5dcb0',
    shoe: '#7fd8a8', sole: '#e8fff2', paw: '#f5dcb0', eye: '#ffffff', pupil: '#2f8f4a', strap: '#6b4423', lens: '#7fe0ff', wing: '#e3a473' },
  digby: { fur: '#5b4b6e', fur2: '#463955', face: '#8a78a0', nose: '#ff9ab0', belly: '#8a78a0', helmet: '#e8b62a', helmet2: '#b88a16', lamp: '#fffbe0',
    over: '#3a6ab8', over2: '#2b4f8c', shoe: '#6b4a2a', sole: '#a07a52', paw: '#ff9ab0', frame: '#c0c8d8', eye: '#120d18' },
  dev: { skin: '#e8b48a', skin2: '#c98f66', hair: '#4a3426', hood: '#4a5a8a', hood2: '#36436a', logo: '#f0c040', jeans: '#2c3a5a', shoe: '#e8e8ee', sole: '#a0a0b0', frame: '#202024', lens: '#9fd0ff' },
  p2: { body: '#8c8a9c', body2: '#6c6a7c', eye: '#ffffff' },
};

// pose table for upright characters (facing right)
const POSES = {
  idle0: { legA: 1, legB: -1, bob: 0, arm: 0 },
  idle1: { legA: 1, legB: -1, bob: 1, arm: 0, blink: true },
  run0: { legA: 4, legB: -3, bob: 0, arm: -3 },
  run1: { legA: 1, legB: 0, bob: -1, arm: -1 },
  run2: { legA: -3, legB: 4, bob: 0, arm: 3 },
  run3: { legA: 0, legB: 1, bob: -1, arm: 1 },
  jump: { legA: 3, legB: -2, bob: -1, arm: -4, tuck: 2, armsUp: true },
  fall: { legA: 1, legB: 2, bob: 0, arm: 2, armsUp: true },
  glide: { legA: 2, legB: -2, bob: -1, arm: 0, glide: true },
  hurt: { legA: -2, legB: 3, bob: -1, arm: 4, armsUp: true, wince: true },
  look: { legA: 1, legB: -1, bob: 0, arm: 0, lookBack: true },
  lunge: { legA: 5, legB: -4, bob: 1, arm: -6, lunge: true },
};

function drawUpright(name, pose, cursed) {
  const p = new Painter(28, 31);
  const C = name === 'pip' ? (cursed ? PAL.pipX : PAL.pip) : PAL[name];
  const cx = 14, B = pose.bob || 0, G = 28;
  const human = name === 'dev' || name === 'p2';
  const tuck = pose.tuck || 0;

  const leg = (x, back) => {
    const top = human ? 20 + B : 22 + B;
    const legCol = name === 'dev' ? C.jeans : name === 'p2' ? C.body2 : name === 'digby' ? C.over2 : (back ? C.fur2 : C.fur);
    const shoe = name === 'p2' ? C.body2 : C.shoe;
    p.rect(x - 1, top, 2, G - top - 1 - tuck, legCol);
    p.ell(x + 1, G - 0.5 - tuck, 2.6, 1.6, back ? mixHex(shoe, '#000000', 0.25) : shoe);
    if (C.sole) p.rect(x - 1, G - tuck, 4, 1, C.sole);
  };
  const arm = (dx, back) => {
    const sx = cx + (back ? -2 : 1), sy = (human ? 15 : 17) + B;
    const col = name === 'dev' ? (back ? C.hood2 : C.hood) : name === 'p2' ? C.body2 : name === 'digby' ? C.fur2 : (back ? C.fur2 : C.fur);
    const paw = name === 'dev' ? C.skin : name === 'p2' ? C.body : C.paw;
    let ex, ey;
    if (pose.glide) { ex = sx + (back ? -7 : 8); ey = sy - 1; }
    else if (pose.lunge) { ex = sx + 8; ey = sy - 1 + (back ? 2 : 0); }
    else if (pose.armsUp) { ex = sx + (back ? -3 : 3) + dx * 0.3; ey = sy - 6; }
    else { ex = sx + dx * (back ? -0.6 : 0.6) + 1; ey = sy + 5; }
    p.thick(sx, sy, ex, ey, 0.8, col);
    p.ell(ex, ey, 1.4, 1.4, paw);
    if (pose.lunge && name === 'pip') { p.px(ex + 1, ey - 1, '#f4f0e8'); p.px(ex + 2, ey, '#f4f0e8'); }
    return [ex, ey];
  };

  // ---- behind the body ----
  if (name === 'pip') {
    const pts = [[cx - 3, 22 + B], [cx - 8, 21 + B], [cx - 11, 17 + B], [cx - 11, 13 + B], [cx - 9, 11 + B]];
    for (let i = 0; i < pts.length - 1; i++) p.thick(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 0.9, C.tail);
  } else if (name === 'hazel') {
    p.ell(cx - 7, 16 + B, 4.2, 6.5, C.tail);
    p.ell(cx - 8, 11 + B, 3.6, 3.2, C.tail2);
    p.ell(cx - 6, 18 + B, 2, 3, C.fur2);
  }
  if (pose.glide && name === 'hazel') {
    p.tri(cx - 9, 15 + B, cx + 9, 15 + B, cx, 25 + B, C.wing);
  }
  arm(-(pose.arm || 0), true);
  leg(cx - 1 + (pose.legB || 0), true);

  // ---- body ----
  if (human) {
    const col = name === 'dev' ? C.hood : C.body;
    p.ell(cx, 17 + B, 4.4, 5.2, col);
    p.rect(cx - 4, 17 + B, 9, 4, col);
    if (name === 'dev') { p.rect(cx, 15 + B, 2, 2, C.logo); p.rect(cx - 4, 20 + B, 9, 1, C.hood2); }
  } else {
    p.ell(cx, 19 + B, 4.6, 5.2, name === 'digby' ? C.over : C.fur);
    if (name === 'digby') { p.rect(cx - 2, 14 + B, 1, 4, C.over2); p.rect(cx + 2, 14 + B, 1, 4, C.over2); p.ell(cx + 1, 19 + B, 2.4, 2.4, C.over2); }
    else p.ell(cx + 1.6, 20 + B, 2.6, 3.4, C.belly);
  }
  leg(cx + 1 + (pose.legA || 0), false);

  // ---- head ----
  const hy = (human ? 8 : 10) + B + (pose.lunge ? 1 : 0);
  if (human) {
    const skin = name === 'dev' ? C.skin : C.body;
    p.ell(cx, hy, 4.8, 5, skin);
    if (name === 'dev') {
      p.ell(cx - 1, hy - 3, 5, 2.8, C.hair); p.rect(cx - 5, hy - 3, 3, 4, C.hair);
      p.rect(cx + 1, hy - 1, 4, 3, C.frame); p.rect(cx + 2, hy, 2, 1, C.lens);
      p.px(cx + 5, hy + 2, C.skin2); p.rect(cx + 1, hy + 3, 2, 1, C.skin2);
    } else {
      p.px(cx + 2, hy, C.eye); p.px(cx + 4, hy, C.eye);
    }
  } else if (name === 'digby') {
    p.ell(cx, hy, 6, 5.6, C.fur);
    p.ell(cx + 2, hy + 2, 4.2, 3.2, C.face);
    p.ell(cx + 7, hy + 2, 2.6, 2.4, C.nose); p.px(cx + 8, hy + 1, '#ffd0dc');
    p.rect(cx + 1, hy - 1, 5, 3, C.frame); p.rect(cx + 2, hy, 3, 1, '#2a2440'); p.px(cx + 4, hy, C.eye);
    p.ell(cx, hy - 4, 6.2, 3.2, C.helmet); p.rect(cx - 6, hy - 3, 13, 2, C.helmet2);
    p.rect(cx + 4, hy - 6, 3, 3, C.lamp); p.px(cx + 4, hy - 6, C.helmet2);
    if (!pose.wince) { p.px(cx + 4, hy + 4, '#2a1830'); p.px(cx + 5, hy + 4, '#2a1830'); }
  } else {
    // possum / squirrel heads
    p.ell(cx, hy, 6.6, 6, C.fur);
    p.ell(cx + 2, hy + 2, 4.6, 3.8, C.face);
    if (name === 'pip') {
      p.ell(cx + 6, hy + 2, 3.4, 2.2, C.face);
      p.ell(cx + 9.2, hy + 1.4, 1.4, 1.3, C.nose);
      p.ell(cx - 3, hy - 5, 2.8, 2.8, C.ear); p.ell(cx - 3, hy - 4.6, 1.4, 1.4, C.earIn);
      p.ell(cx + 1.5, hy - 5.5, 2.6, 2.6, C.ear); p.ell(cx + 1.5, hy - 5.1, 1.2, 1.2, C.earIn);
      p.rect(cx - 5, hy + 5, 10, 2, C.scarf); p.tri(cx - 5, hy + 5, cx - 10, hy + 6 + (B ? 1 : 0), cx - 5, hy + 7, C.scarf2);
    } else {
      p.ell(cx + 5.5, hy + 2.5, 2.6, 2, C.face);
      p.px(cx + 8, hy + 1, C.nose); p.px(cx + 8, hy + 2, C.nose);
      p.tri(cx - 5, hy - 2, cx - 2, hy - 10, cx + 1, hy - 3, C.ear); p.tri(cx - 3, hy - 3, cx - 2, hy - 7, cx, hy - 3, C.earIn);
      p.rect(cx - 4, hy - 4, 10, 1, C.strap); p.ell(cx + 1, hy - 4.5, 1.6, 1.4, C.lens); p.ell(cx + 4.5, hy - 4.5, 1.6, 1.4, C.lens);
    }
    // eyes
    const ex = cx + 3, ey = hy - 1;
    if (pose.blink && !cursed) { p.rect(ex - 1, ey + 1, 3, 1, OUT); }
    else if (pose.wince) { p.line(ex - 1, ey - 1, ex + 1, ey + 1, OUT); p.line(ex - 1, ey + 1, ex + 1, ey - 1, OUT); }
    else {
      p.ell(ex + 0.5, ey + 0.5, 1.9, 2.7, C.eye);
      if (cursed) { p.px(ex + 1, ey, C.pupil); p.px(ex, ey + 1, '#7a0a18'); }
      else { const lx = pose.lookBack ? -1 : 0; p.rect(ex + 1 + lx, ey - 1, 1, 3, C.pupil); p.px(ex + 1 + lx, ey - 1, '#ffffff'); }
    }
    // mouths
    if (cursed) {
      p.line(ex, ey + 3, ex - 1, ey + 8, '#120a18');
      const my = hy + 3;
      p.rect(cx + 2, my, 9, pose.lunge ? 4 : 2, '#2a0a10');
      for (let i = 0; i < 9; i += 2) { p.px(cx + 2 + i, my, '#f4f0e8'); p.px(cx + 3 + i, my + (pose.lunge ? 3 : 1), '#f4f0e8'); }
    } else if (name === 'pip' || name === 'hazel') {
      p.px(cx + 4, hy + 4, OUT); p.px(cx + 5, hy + 5, OUT); p.px(cx + 6, hy + 5, OUT); p.px(cx + 7, hy + 4, OUT);
    }
  }
  arm(pose.arm || 0, false);
  p.outline(OUT);
  return p.canvas();
}

// lying on the back, feet up: the "play dead" pose
function drawLying(name, mode, cursed) {
  // mode: 'play' (eyes shut, tongue out) | 'dead' (X eyes) | 'watch' (one eye open)
  const p = new Painter(34, 18);
  const C = name === 'pip' ? (cursed ? PAL.pipX : PAL.pip) : PAL[name];
  const G = 15;
  const fur = name === 'dev' ? C.hood : name === 'p2' ? C.body : name === 'digby' ? C.over : C.fur;
  const fur2 = name === 'dev' ? C.jeans : name === 'p2' ? C.body2 : name === 'digby' ? C.over2 : C.fur2;
  const shoe = name === 'p2' ? C.body2 : C.shoe;
  if (name === 'pip') { p.thick(24, G - 3, 30, G - 2, 0.8, C.tail); p.thick(30, G - 2, 32, G - 5, 0.8, C.tail); }
  if (name === 'hazel') p.ell(27, G - 3, 5, 3, C.tail);
  // legs up
  p.thick(19, G - 5, 20, G - 11, 0.9, fur2); p.ell(20.5, G - 12, 1.8, 2.4, shoe);
  p.thick(22, G - 5, 24, G - 10, 0.9, fur2); p.ell(24.5, G - 11, 1.8, 2.4, mixHex(shoe, '#000000', 0.2));
  // body
  p.ell(18, G - 3, 7, 3.6, fur);
  if (name !== 'dev' && name !== 'p2' && name !== 'digby') p.ell(18, G - 5, 4.6, 1.8, C.belly);
  // arms up
  const paw = name === 'dev' ? C.skin : name === 'p2' ? C.body : C.paw;
  p.thick(13, G - 5, 12, G - 9, 0.8, fur); p.ell(12, G - 10, 1.3, 1.3, paw);
  // head (on its side, face up-left)
  const hx = 8, hy = G - 4;
  if (name === 'dev' || name === 'p2') {
    p.ell(hx, hy, 4.6, 4.2, name === 'dev' ? C.skin : C.body);
    if (name === 'dev') { p.ell(hx - 3, hy + 1, 2.5, 3.5, C.hair); p.rect(hx - 1, hy - 3, 3, 3, C.frame); p.px(hx, hy - 2, '#ffffff'); p.line(hx - 1, hy - 3, hx + 1, hy - 1, '#ffffff'); }
  } else if (name === 'digby') {
    p.ell(hx, hy, 5.4, 4.6, C.fur); p.ell(hx - 1, hy - 4, 2.3, 2.1, C.nose);
    p.ell(hx + 3, hy + 1, 3, 4, C.helmet);
  } else {
    p.ell(hx, hy, 5.8, 4.8, C.fur); p.ell(hx - 1, hy - 2, 3.6, 3, C.face);
    if (name === 'pip') { p.ell(hx - 2, hy - 5, 2, 2.6, C.face); p.ell(hx - 2.5, hy - 7.5, 1.2, 1.2, C.nose); p.ell(hx + 3, hy + 3, 2.4, 2.4, C.ear); p.rect(hx + 3, hy - 3, 2, 6, C.scarf); }
    else { p.ell(hx - 2, hy - 4.5, 1.8, 2, C.face); p.px(hx - 3, hy - 6, C.nose); p.tri(hx + 3, hy, hx + 9, hy + 3, hx + 3, hy + 4, C.ear); }
  }
  // eyes and tongue
  const ex = hx + 1, ey = hy - 2;
  if (name === 'p2') { p.px(ex - 1, ey, mode === 'dead' ? '#000000' : C.eye); }
  else if (mode === 'dead') { p.line(ex - 1, ey - 1, ex + 1, ey + 1, OUT); p.line(ex - 1, ey + 1, ex + 1, ey - 1, OUT); }
  else if (mode === 'watch' || cursed) { p.ell(ex, ey, 1.3, 1.3, cursed ? '#06030a' : '#ffffff'); p.px(ex, ey, cursed ? '#ff2238' : OUT); }
  else { p.line(ex - 1, ey, ex + 1, ey, OUT); }
  if (mode !== 'watch' && name !== 'p2' && name !== 'dev') { p.px(hx - 4, hy - 1, '#ff7aa2'); p.px(hx - 5, hy, '#ff7aa2'); }
  p.outline(OUT);
  return p.canvas();
}

// ---- small props ----
function propSprites() {
  const S = {};
  let p;
  // acorn, rotten acorn
  const acorn = (cap, nut, hi) => { const q = new Painter(10, 11); q.ell(5, 6.5, 3.4, 3.6, nut); q.px(4, 5, hi); q.ell(5, 3.5, 4, 2, cap); q.rect(5, 0, 1, 2, cap); return q.outline(OUT).canvas(); };
  S.acorn = acorn('#7a4a22', '#e0a050', '#fff0c0');
  S.acornBad = acorn('#2e2a30', '#5e5560', '#8a8090');
  // crystal (mine), floppy (debug)
  p = new Painter(10, 12); p.tri(5, 0, 9, 7, 1, 7, '#7ff0ff'); p.tri(1, 7, 9, 7, 5, 11, '#3ab0d0'); p.px(4, 3, '#ffffff'); S.crystal = p.outline(OUT).canvas();
  p = new Painter(12, 12); p.rect(1, 1, 10, 10, '#3050c8'); p.rect(3, 1, 6, 4, '#c8ccd8'); p.rect(6, 2, 2, 2, '#3050c8'); p.rect(3, 7, 6, 3, '#f4f4f8'); S.floppy = p.outline(OUT).canvas();
  // critters lying on their backs
  const bunny = (eye) => {
    const q = new Painter(16, 10);
    q.ell(9, 7, 5, 2.6, '#e8e0ea'); q.ell(4, 6.5, 3, 2.4, '#e8e0ea');
    q.thick(3, 6, 0.5, 8.5, 0.6, '#e8e0ea'); q.thick(4, 7, 2, 9.5, 0.6, '#d0c4d4');
    q.px(9, 3, '#e8e0ea'); q.px(9, 4, '#e8e0ea'); q.px(12, 4, '#e8e0ea'); q.px(12, 5, '#e8e0ea'); q.px(14, 6, '#ffffff');
    if (eye === 'x') { q.px(3, 5, OUT); q.px(5, 5, OUT); q.px(4, 6, OUT); q.px(3, 7, OUT); q.px(5, 7, OUT); }
    else { q.px(4, 5, '#0b0710'); q.px(4, 4, eye === 'red' ? '#ff2238' : '#0b0710'); }
    return q.outline(OUT).canvas();
  };
  S.bunnyDead = bunny('x'); S.bunnyWatch = bunny('open'); S.bunnyRed = bunny('red');
  const bird = (eye) => {
    const q = new Painter(13, 9);
    q.ell(6.5, 6, 4, 2.4, '#5a9ee8'); q.ell(6.5, 5, 2.4, 1.2, '#cfe6ff'); q.ell(3, 5.5, 2.2, 2, '#5a9ee8');
    q.px(0, 5, '#ffb030'); q.px(1, 5, '#ffb030'); q.px(6, 2, '#ffb030'); q.px(6, 3, '#ffb030'); q.px(8, 2, '#ffb030'); q.px(8, 3, '#ffb030');
    if (eye === 'x') { q.px(2, 4, OUT); q.px(3, 5, OUT); q.px(4, 4, OUT); } else { q.px(3, 4, eye === 'red' ? '#ff2238' : OUT); }
    return q.outline(OUT).canvas();
  };
  S.birdDead = bird('x'); S.birdWatch = bird('open'); S.birdRed = bird('red');
  // flowers: happy, wilted
  p = new Painter(9, 14); p.rect(4, 6, 1, 8, '#3f9a3a'); p.px(5, 10, '#5cc04a'); p.px(6, 9, '#5cc04a');
  [[4, 1], [1, 3], [7, 3], [2, 6], [6, 6]].forEach(([x, y]) => p.ell(x + 0.5, y + 0.5, 1.6, 1.6, '#ff8ac8')); p.ell(4.5, 4, 1.6, 1.6, '#ffe04a'); S.flower = p.outline(OUT).canvas();
  p = new Painter(9, 14); p.line(4, 13, 4, 7, '#6a6a3a'); p.line(4, 7, 6, 6, '#6a6a3a'); p.line(6, 6, 7, 8, '#6a6a3a'); p.ell(7, 9.5, 1.6, 1.8, '#7a5a5a'); p.px(6, 11, '#5a3a3a'); S.flowerDead = p.outline(OUT).canvas();
  // sign post
  p = new Painter(18, 18); p.rect(8, 8, 2, 10, '#6b4423'); p.rect(1, 1, 16, 9, '#b0783e'); p.rect(2, 2, 14, 1, '#d09a5a'); p.rect(3, 5, 9, 1, '#6b4423'); p.rect(3, 7, 7, 1, '#6b4423'); S.sign = p.outline(OUT).canvas();
  p = new Painter(18, 18); p.rect(8, 8, 2, 10, '#3a3a40'); p.rect(1, 1, 16, 9, '#d8d8e0'); p.rect(2, 2, 14, 1, '#ffffff'); p.rect(3, 4, 11, 1, '#ff3a8a'); p.rect(3, 6, 8, 1, '#5a5a6a'); S.note = p.outline(OUT).canvas();
  p = new Painter(18, 18); p.rect(8, 8, 2, 10, '#3a2a20'); p.rect(1, 1, 16, 9, '#5a4030'); p.line(3, 3, 14, 8, '#c8b8a8'); p.line(3, 8, 14, 3, '#c8b8a8'); S.signBad = p.outline(OUT).canvas();
  // checkpoint flag: down / up
  const flag = (up, col) => { const q = new Painter(12, 26); q.rect(2, 2, 2, 23, '#d8d0c0'); q.ell(3, 2, 1.6, 1.6, '#ffd040'); const y = up ? 3 : 15; q.tri(4, y, 11, y + 3, 4, y + 6, col); return q.outline(OUT).canvas(); };
  S.flagDown = flag(false, '#8a8a8a'); S.flagUp = flag(true, '#4ad06a'); S.flagUpBad = flag(true, '#a0202a');
  // terminal, lift, goggles item, lantern
  p = new Painter(26, 28); p.rect(1, 1, 24, 18, '#c8c4b4'); p.rect(3, 3, 20, 13, '#0a1a10'); p.rect(4, 4, 8, 1, '#40ff80'); p.rect(4, 6, 12, 1, '#40ff80'); p.rect(4, 8, 5, 1, '#40ff80');
  p.rect(8, 19, 10, 3, '#a8a494'); p.rect(2, 22, 22, 5, '#c8c4b4'); p.rect(4, 23, 18, 1, '#8a8678'); p.rect(4, 25, 18, 1, '#8a8678'); S.terminal = p.outline(OUT).canvas();
  p = new Painter(14, 8); p.rect(1, 3, 12, 2, '#6b4423'); p.ell(4, 4, 2.6, 2.4, '#7fe0ff'); p.ell(10, 4, 2.6, 2.4, '#7fe0ff'); p.px(3, 3, '#ffffff'); S.goggles = p.outline(OUT).canvas();
  p = new Painter(10, 16); p.rect(4, 0, 2, 4, '#3a3a40'); p.rect(2, 4, 6, 1, '#5a5a60'); p.rect(2, 5, 6, 7, '#ffd870'); p.rect(3, 6, 4, 5, '#fff8d0'); p.rect(2, 12, 6, 2, '#5a5a60'); S.lantern = p.outline(OUT).canvas();
  // debug "missing texture" chunk and dev door
  p = new Painter(24, 36); p.rect(1, 1, 22, 34, '#4a4a56'); p.rect(3, 3, 18, 30, '#22222a'); p.rect(17, 18, 2, 2, '#d0d0d8'); S.door = p.outline(OUT).canvas();
  return S;
}

const SPR = {};
function buildSprites() {
  const chars = ['pip', 'hazel', 'digby', 'dev', 'p2'];
  chars.forEach((n) => {
    SPR[n] = {};
    Object.keys(POSES).forEach((k) => { SPR[n][k] = drawUpright(n, POSES[k], false); });
    SPR[n].liePlay = drawLying(n, 'play');
    SPR[n].lieDead = drawLying(n, 'dead');
    SPR[n].lieWatch = drawLying(n, 'watch');
  });
  SPR.pipX = {};
  Object.keys(POSES).forEach((k) => { SPR.pipX[k] = drawUpright('pip', POSES[k], true); });
  SPR.pipX.liePlay = drawLying('pip', 'watch', true);
  SPR.prop = propSprites();
}

// draw a sprite with its bottom-center at (x, y)
function drawSprite(g, c, x, y, flip, alpha) {
  if (!c) return;
  x = Math.round(x); y = Math.round(y);
  if (alpha !== undefined) { g.save(); g.globalAlpha = alpha; }
  if (flip) {
    g.save(); g.translate(x, 0); g.scale(-1, 1);
    g.drawImage(c, -Math.floor(c.width / 2), y - c.height);
    g.restore();
  } else g.drawImage(c, x - Math.floor(c.width / 2), y - c.height);
  if (alpha !== undefined) g.restore();
}
