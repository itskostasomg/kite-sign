'use strict';
// ============================================================
//  PIP.EXE - boot + fixed-step loop
// ============================================================

function start() {
  buildSprites();
  buildArt();
  buildDecor();
  setupTouch();
  fitCanvas();
  Input.onFirst.push(() => Sound.init());
  Game.set(new WarningScene());
  const STEP = 1000 / 60;
  let last = performance.now(), acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    acc += Math.min(250, now - last);
    last = now;
    Input.poll();
    let n = 0;
    while (acc >= STEP && n < 5) { Game.update(); Input.endFrame(); acc -= STEP; n++; }
    if (n === 5) acc = 0;
    Game.draw();
  }
  requestAnimationFrame(frame);
}

if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(start);
else start();
