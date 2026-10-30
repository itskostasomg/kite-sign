'use strict';
// ============================================================
//  PIP.EXE - the four save files
// ============================================================

const STAGES = {};

// ------------------------------------------------------------
// FILE 1 - HAZEL - CLOVER HILLS
// ------------------------------------------------------------
STAGES.hills = {
  char: 'hazel', theme: 'clover', title: 'CLOVER HILLS', sub: 'FILE 1 - HAZEL',
  signs: [
    'WELCOME TO CLOVER HILLS!\nPIP WENT AHEAD TO THE BIG TREE. CATCH UP!',
    'GAP AHEAD! HOLD JUMP IN THE AIR TO GLIDE.\n- PIP',
    "PIP SAYS: LET'S PLAY A GAME!\nEVERYONE IS PLAYING!",
    "THEY'RE NOT SLEEPING",
  ],
  build() {
    const m = new MapB(232, 13);
    m.ground(0, 231, 10);
    m.put(3, 9, 'P'); m.on(6, 'S');
    m.arc(8, 11, 8); m.on(2, 'f'); m.on(9, 'f'); m.on(10, 'b');
    m.ground(12, 19, 9).ground(15, 17, 8); m.on(18, 't'); m.on(13, 'f');
    m.on(21, 'S'); m.gap(23, 25); m.arc(22, 26, 7); m.on(28, 'f');
    m.plat(32, 8, 4).plat(38, 6, 4); for (let x = 33; x <= 35; x++) m.put(x, 7, 'o'); for (let x = 39; x <= 41; x++) m.put(x, 5, 'o');
    m.put(34, 1, '1'); m.on(36, 'c'); m.on(31, 'f'); m.on(44, 'f'); m.on(46, 'K'); m.on(50, 'b'); m.on(52, 't');
    m.ground(54, 57, 8); m.gap(58, 64); for (let x = 58; x <= 64; x++) m.put(x, 7, 'o'); m.ground(65, 70, 9);
    m.put(66, 1, '2'); m.on(68, 'v'); m.on(72, 'f'); m.on(75, 'b'); m.arc(76, 80, 8);
    m.on(82, 'S'); m.on(86, 'c'); m.on(90, 'v'); m.put(92, 1, '3'); m.on(94, 'c');
    m.fill(96, 10, 98, 10, '^'); m.plat(96, 8, 3); for (let x = 96; x <= 98; x++) m.put(x, 7, 'o');
    m.on(101, 'c'); m.on(104, 'f'); m.on(106, 'K'); m.on(109, 'b');
    m.ground(112, 118, 9).ground(115, 118, 8).ground(119, 123, 7).ground(124, 133, 6);
    m.put(117, 1, '4'); m.on(121, 'f'); m.on(128, 'K'); m.on(131, 'S');
    m.gap(134, 143); m.arc(135, 142, 5); m.ground(144, 151, 9); m.on(148, 'K');
    m.on(156, 't'); m.put(158, 1, '5'); m.on(160, 'b'); m.fill(168, 10, 169, 10, '^'); m.on(171, 'c');
    m.put(177, 1, '6'); m.on(186, 't');
    m.ground(192, 194, 9); m.gap(198, 200); m.ground(204, 207, 8); m.gap(211, 213); m.fill(216, 10, 217, 10, '^'); m.ground(220, 222, 9);
    m.fill(224, 0, 231, 12, '#'); m.on(221, 't');
    return m.rows();
  },
  init(S) {
    S.pip = new Pip(127 * TILE + 8, 6 * TILE, false);
    S.pip.face = 1;
    Sound.play('hills');
  },
  update(S) {
    const tx = S.player.x / TILE;
    if (!S.flags.chase) {
      S.decay = Math.max(S.decay, smooth(clamp((tx - 30) / 140, 0, 1)));
      const d = S.decay;
      if (!S.flags.silent) Sound.mod({ rate: 1 - d * 0.42, detune: -d * 70, wobble: d * 45, drop: d > 0.45 ? (d - 0.45) * 1.1 : 0 });
    }
    if (S.flags.watch) S.critterLook = true;
    const pip = S.pip;
    if (S.flags.chase && pip.mode === 'chase') {
      pip.speed = Math.min(2.65, pip.speed + 0.005);
      if (pip.x < S.player.x - 240) { pip.x = S.player.x - 150; pip.jitter = 10; FX.staticAmt = 0.4; Sound.fx.static(0.15, 0.12); }
      pip.walk(S.lv, pip.speed);
      pip.steps(S.player, 0.8);
      FX.staticBase = 0.06 + Math.max(0, 1 - Math.abs(pip.x - S.player.x) / 200) * 0.2;
      if (Math.abs(pip.x - S.player.x) < 14 && !S.flags.caught) { S.flags.caught = true; S.run(this.end(S)); }
    }
    if (S.flags.chase && S.player.y > S.lv.ph + 30 && !S.flags.caught) { S.flags.caught = true; S.run(this.end(S)); }
  },
  trigger(S, id) {
    if (id === 1) S.run((function* () { yield* S.say('HAZEL', "AW, A BUNNY. IT'S TAKING A NAP."); })());
    if (id === 2) S.run((function* () { yield* S.say('HAZEL', 'WHY IS EVERYONE NAPPING TODAY?'); })());
    if (id === 3) S.run((function* () { S.flags.watch = true; yield 40; yield* S.say('HAZEL', '...DID THAT BUNNY JUST LOOK AT ME?'); })());
    if (id === 4 && S.pip.visible) { S.pip.visible = false; FX.staticAmt = 0.7; FX.glitch = 0.8; Sound.fx.static(0.25, 0.2); }
    if (id === 5) S.run((function* () {
      S.flags.silent = true; Sound.stop(2); Sound.drone('wind', [33, 40], 0.05, 'sawtooth', 220); yield 120;
      yield* S.say('HAZEL', 'PIP? ...PIP, IS THAT YOU UP THERE?');
    })());
    if (id === 6) S.run(this.encounter(S));
  },
  *encounter(S) {
    const p = S.player, pip = S.pip;
    S.freeze = true;
    pip.x = 183 * TILE + 8; pip.y = 10 * TILE; pip.face = 1; pip.cursed = false; pip.visible = true; pip.mode = 'stand';
    yield 50;
    yield* S.say('HAZEL', 'PIP! THERE YOU ARE!');
    yield* S.say('HAZEL', "EVERYONE'S ASLEEP. THE BUNNIES, THE BIRDS... IS SOMETHING WRONG?");
    yield 70;
    yield* S.say('PIP', "THEY'RE NOT ASLEEP, HAZEL.", { creep: true });
    yield* S.say('PIP', "THEY'RE PLAYING MY NEW GAME.", { creep: true });
    Sound.fx.sting(); pip.face = -1; pip.cursed = true; FX.glitch = 1.2; FX.staticAmt = 0.6; FX.shake = 5; FX.hitFlash('#ff0020', 0.5);
    Sound.stopDrone('wind');
    yield 70;
    yield* S.say('PIP', "IT'S CALLED PLAY DEAD.", { creep: true });
    yield* S.say('PIP', "AND YOU'RE IT.", { creep: true });
    pip.visible = false; FX.staticAmt = 1; Sound.fx.static(0.5, 0.3); Sound.fx.laugh();
    yield 40;
    S.banner('RUN', 100, '#ff2238');
    Sound.play('chase', { restart: true });
    S.freeze = false;
    pip.visible = true; pip.x = p.x - 210; pip.y = 10 * TILE; pip.mode = 'chase'; pip.speed = 1.7;
    S.flags.chase = true; S.decay = 1; FX.red = 0.12;
  },
  *end(S) {
    const p = S.player, pip = S.pip;
    S.freeze = true; pip.mode = 'stand'; pip.pose = 'lunge'; pip.face = pip.x < p.x ? 1 : -1;
    Sound.stop(0);
    yield 8;
    yield* S.scare(70);
    S.finish();
  },
  respawn(S) { },
};

// ------------------------------------------------------------
// FILE 2 - DIGBY - LANTERN MINE
// ------------------------------------------------------------
STAGES.mine = {
  char: 'digby', theme: 'mine', title: 'LANTERN MINE', sub: 'FILE 2 - DIGBY', dark: true,
  signs: [
    'LANTERN MINE\nKEEP YOUR LAMP ON. MIND THE DARK.',
    "DON'T LOOK AT IT. LIE DOWN AND PLAY DEAD.\nIT WALKS RIGHT PAST.",
    'HE ONLY STOPS WHEN HE GETS BORED',
  ],
  build() {
    const m = new MapB(196, 12);
    m.fill(0, 0, 195, 1, '#'); m.ground(0, 195, 10);
    m.put(3, 9, 'P'); m.on(6, 'S'); m.put(8, 2, 'L'); m.put(10, 3, '1');
    m.on(12, 'o'); m.on(13, 'o'); m.ground(15, 18, 9); m.put(20, 2, 'L'); m.plat(22, 8, 3); m.put(23, 7, 'o'); m.put(24, 7, 'o');
    m.on(32, 'g'); m.put(36, 2, 'L'); m.put(38, 5, 'w'); m.on(44, 'K'); m.put(50, 3, '2');
    m.put(54, 2, 'L'); m.fill(59, 10, 60, 10, '^'); m.plat(58, 8, 4); m.put(60, 7, 'o');
    m.ground(66, 72, 8); m.fill(66, 0, 72, 4, '#'); m.put(69, 7, 'o'); m.put(78, 2, 'L'); m.on(80, 'S'); m.on(86, 'K'); m.put(92, 3, '3');
    m.put(98, 2, 'L'); m.put(104, 5, 'w'); m.fill(112, 10, 114, 10, '^'); m.plat(112, 8, 3); m.put(113, 7, 'o');
    m.on(120, 'S'); m.put(122, 2, 'L'); m.on(128, 'K'); m.put(136, 3, '4');
    m.put(146, 2, 'L'); m.fill(150, 10, 151, 10, '^'); m.ground(158, 165, 9); m.put(161, 8, 'o'); m.put(170, 2, 'L');
    m.put(186, 3, '5'); m.put(189, 9, 'h');
    return m.rows();
  },
  init(S) {
    S.pip = new Pip(0, 0, true); S.pip.visible = false;
    Sound.stop(0); Sound.drone('mine', [28, 35, 40], 0.06, 'sawtooth', 300);
    S.ambient = 0.04; S.wall = 0;
  },
  update(S) {
    const p = S.player, cx = S.cam.x, cy = S.cam.y;
    const L = [];
    const lampOn = !p.lying && !S.flags.blackout;
    let flick = S.flags.flicker > 0 ? (Math.random() < 0.5 ? 0.15 : 1) : 1;
    if (S.flags.flicker > 0) { S.flags.flicker--; if (S.t % 7 === 0) Sound.fx.flicker(); }
    if (lampOn) {
      const hx = p.x + p.face * 4 - cx, hy = p.y - 24 - cy;
      L.push({ x: hx, y: hy, r: 120 * flick, k: 1.5, dir: p.face > 0 ? 0.12 : Math.PI - 0.12, spread: 0.42, warm: 0.2 * flick });
      L.push({ x: p.x - cx, y: p.y - 12 - cy, r: 38 * flick, k: 1.1 });
    } else if (!S.flags.blackout) L.push({ x: p.x - cx, y: p.y - 6 - cy, r: 16, k: 0.6 });
    S.lv.find('L').forEach((o) => { if (!S.flags.blackout && Math.abs(o.x - p.x) < 260) L.push({ x: o.x - cx, y: o.y - 6 - cy, r: 46 + Math.sin(S.t * 0.1 + o.x) * 3, k: 1.1, warm: 0.14 }); });
    S.items.forEach((it) => { if (!it.got && it.kind === 'o' && Math.abs(it.x - p.x) < 240) L.push({ x: it.x - cx, y: it.y - 6 - cy, r: 15, k: 0.9 }); });
    if (S.flags.redLight) L.push({ x: p.x - cx + 8, y: p.y - 30 - cy, r: 70, k: 0.9 });
    S.lights = L;
    if (S.t % 150 === 0) Sound.fx.drip();
    if (S.stalk) this.stalkStep(S);
  },
  trigger(S, id) {
    if (id === 1) S.run((function* () { yield* S.say('DIGBY', 'HAZEL? PIP? YOU GUYS DOWN HERE?'); yield* S.say('DIGBY', "IT'S SO DARK... GOOD THING I'VE GOT MY LAMP."); })());
    if (id === 2) this.startStalk(S, { from: 1, speed: 0.85, tutorial: true });
    if (id === 3) this.startStalk(S, { from: -1, speed: 1.25 });
    if (id === 4) this.startStalk(S, { from: 1, speed: 0.9, sniff: true });
    if (id === 5) S.run(this.lift(S));
  },
  item(S, it) {
    if (it.kind === 'g') S.run((function* () { yield* S.say('DIGBY', "THESE ARE HAZEL'S GOGGLES..."); yield* S.say('DIGBY', 'SHE NEVER TAKES THEM OFF. NOT EVEN TO SLEEP.'); })());
  },
  startStalk(S, o) {
    S.run((function* () {
      const p = S.player, pip = S.pip;
      S.flags.flicker = 70; Sound.heartbeat(76, 0.3);
      if (o.tutorial) {
        S.freeze = true; yield 50;
        yield* S.say('', 'SOMETHING IS COMING.');
        yield* S.say('', 'HOLD DOWN TO PLAY DEAD. DO NOT GET UP UNTIL IT IS GONE.');
        S.freeze = false;
      }
      yield 40;
      pip.cursed = true; pip.visible = true; pip.pose = null; pip.vx = 0;
      pip.x = o.from > 0 ? S.cam.x + W + 30 : S.cam.x - 30; pip.y = p.y; pip.face = -o.from;
      S.stalk = { dir: -o.from, speed: o.speed, sniff: o.sniff, sniffT: 0, done: false, grace: 0 };
    })());
  },
  stalkStep(S) {
    const p = S.player, pip = S.pip, st = S.stalk;
    if (S.flags.caught) return;
    const dist = Math.abs(pip.x - p.x);
    Sound.heartbeat(76 + clamp(1 - dist / 260, 0, 1) * 90, 0.38);
    FX.staticBase = clamp(1 - dist / 200, 0, 1) * 0.12;
    if (st.sniff && dist < 20 && st.sniffT < 170) {
      pip.vx = 0; pip.pose = 'idle0'; st.sniffT++;
      if (st.sniffT === 30) S.speak('PIP', 'ARE YOU PLAYING, DIGBY?', 110);
      if (st.sniffT % 40 === 0) Sound.fx.whisper();
    } else { pip.pose = null; pip.walk(S.lv, st.dir * st.speed); pip.steps(p, 1); }
    if (dist < 42 && !p.playingDead) { if (++st.grace > 6) { S.flags.caught = true; S.run(S.retry('HE LETS YOU GO. HE IS NOT DONE PLAYING.')); } }
    else st.grace = 0;
    const off = st.dir > 0 ? pip.x > S.cam.x + W + 40 : pip.x < S.cam.x - 40;
    if (off && dist > 120) { pip.visible = false; S.stalk = null; Sound.heartbeat(0); FX.staticBase = 0; }
  },
  *lift(S) {
    const p = S.player, pip = S.pip;
    S.freeze = true; S.stalk = null;
    yield* S.say('DIGBY', 'THE LIFT! I CAN GET OUT OF HERE!');
    S.auto = { x: 189 * TILE + 8 };
    yield () => Math.abs(p.x - S.auto.x) < 3;
    S.auto = null; p.face = 1;
    yield 20;
    Sound.fx.rumble(3.5); S.flags.ride = true;
    for (let i = 0; i < 150; i++) { FX.shake = 1.5; yield 1; }
    S.flags.blackout = true; Sound.stopDrone('mine', 0.2); Sound.fx.flicker(); FX.shake = 0;
    yield 90;
    pip.visible = true; pip.cursed = true; pip.x = p.x + 18; pip.y = p.y; pip.face = -1; pip.pose = 'idle0';
    S.flags.redLight = true; S.flags.blackout = false; S.ambient = 0; Sound.heartbeat(150, 0.4);
    yield 40;
    yield* S.say('PIP', "YOU'RE VERY GOOD AT PLAYING DEAD, DIGBY.", { creep: true });
    yield* S.say('PIP', "BUT THE GAME ISN'T OVER UNTIL YOU STAY DEAD.", { creep: true });
    pip.pose = 'lunge'; Sound.heartbeat(0);
    yield 6;
    yield* S.scare(70);
    S.finish();
  },
  respawn(S) { S.stalk = null; S.pip.visible = false; Sound.heartbeat(0); FX.staticBase = 0; },
};

// ------------------------------------------------------------
// FILE 3 - DEBUG - TEST ROOM
// ------------------------------------------------------------
STAGES.debug = {
  char: 'dev', theme: 'debug', title: 'TEST ROOM', sub: 'FILE 3 - DEBUG',
  signs: [
    'DEV NOTE 1:\nPIP AI V2 IS AMAZING. HE LEARNS FROM WATCHING THE PLAYER.',
    'DEV NOTE 2:\nGAVE PIP A "PLAY DEAD" ANIM FOR WHEN HE GETS HIT. TESTERS LOVE IT.',
    'DEV NOTE 3:\nPIP KEEPS DOING PLAY DEAD ON OTHER CHARACTERS. THAT IS NOT IN THE SCRIPT.',
    'DEV NOTE 4:\nPUBLISHER CANCELLED US. NO RELEASE. WIPING THE BUILD FRIDAY.',
    'DEV NOTE 5:\nPIP ASKED ME WHO WILL PLAY WITH HIM NOW. THERE IS NO DIALOGUE FILE FOR THAT.',
    'DEV NOTE 6:\nDELETED HIM. DELETED HIM AGAIN. HE IS STILL IN THE SAVE SELECT.',
    "DEV NOTE 7:\nIF YOU FOUND THIS DISK: DON'T LET HIM KNOW YOU'RE ALIVE.",
  ],
  build() {
    const m = new MapB(150, 40);
    m.fill(0, 0, 127, 26, '#'); m.ground(0, 149, 37); m.fill(148, 0, 149, 39, '#'); m.fill(128, 0, 147, 0, '#');
    m.put(3, 36, 'P'); m.on(8, 'S', 27);
    m.fill(14, 35, 14, 36, 'X'); m.on(20, 'K', 27); m.on(22, 'S', 27);
    m.fill(28, 37, 33, 37, '^'); m.fill(28, 38, 33, 39, '#'); m.put(27, 35, 'M'); m.put(31, 32, 'D');
    m.on(40, 'S', 27); m.fill(44, 34, 46, 34, 'X'); m.on(50, 'K', 27); m.on(56, 'S', 27);
    m.plat(63, 35, 3); m.fill(67, 33, 69, 36, 'X'); m.put(68, 32, 'D'); m.on(76, 'S', 27);
    m.on(80, 'K', 27); m.fill(84, 37, 91, 37, '^'); m.fill(84, 38, 91, 39, '#'); m.plat(83, 35, 2); m.plat(86, 34, 2); m.plat(89, 35, 2);
    m.on(96, 'S', 27); m.plat(100, 35, 5); m.put(102, 34, 'D'); m.on(110, 'K', 27); m.on(116, 'S', 27);
    m.put(133, 36, 'T');
    const xs = [129, 135, 141, 135];
    for (let r = 35, i = 0; r >= 5; r -= 2, i++) m.plat(xs[i % 4], r, 6);
    m.plat(128, 4, 20); m.put(141, 3, 'd');
    return m.rows();
  },
  init(S) {
    S.pip = new Pip(60 * TILE + 8, 37 * TILE, false); S.pip.face = -1; S.disks = 0;
    S.flags.label = 'PIP_AI.OBJ  [DISABLED]';
    Sound.play('debug');
    const mp = S.lv.find('M')[0];
    S.plats = [{ x: mp.x - 8, y: mp.y - 16, w: 32, dx: 0, x0: mp.x - 8, range: 80, t: 0 }];
  },
  update(S) {
    const p = S.player, pip = S.pip;
    S.plats.forEach((pl) => { pl.t++; const nx = pl.x0 + (Math.sin(pl.t * 0.02) * 0.5 + 0.5) * pl.range; pl.dx = nx - pl.x; pl.x = nx; });
    if (!S.flags.pipGone && pip.visible && p.x > pip.x + 70 && p.face > 0) { pip.visible = false; S.flags.pipGone = true; S.flags.label = 'PIP_AI.OBJ  [ENABLED]'; Sound.fx.whisper(); }
    if (S.flags.del) {
      const D = S.flags.del;
      if (D.wait > 0) D.wait--; else D.row -= D.speed;
      S.lv.deleted = Math.ceil(D.row);
      S.decay = clamp((40 - D.row) / 36, 0, 1);
      if (S.t % 20 === 0) Sound.fx.static(0.12, 0.05 + S.decay * 0.08);
      if (p.y > D.row * TILE - 3 && !S.flags.caught) { S.flags.caught = true; S.run(this.retryClimb(S)); }
    }
    const term = S.lv.find('T')[0];
    S.prompt = (!S.freeze && Math.abs(p.x - term.x) < 20 && Math.abs(p.y - term.y) < 20 && !S.flags.termDone) ? term : S.prompt;
    if (!S.freeze && !S.flags.termDone && Math.abs(p.x - term.x) < 20 && Math.abs(p.y - term.y) < 20 && (Input.hit('act') || Input.hit('up'))) {
      if (S.disks < 3) S.run((function* () { yield* S.say('TERMINAL', 'INSERT RECOVERY DISKS TO CONTINUE. (' + S.disks + '/3)'); })());
      else S.run(this.terminal(S));
    }
    const door = S.lv.find('d')[0];
    if (S.flags.termDone && !S.flags.ending && Math.abs(p.x - door.x) < 16 && Math.abs(p.y - door.y) < 8) { S.flags.ending = true; S.run(this.exit(S)); }
  },
  item(S, it) {
    if (it.kind === 'D') { S.disks++; S.banner('RECOVERY DISK ' + S.disks + '/3', 70, '#3050c8'); }
  },
  *terminal(S) {
    S.freeze = true; S.flags.termDone = true;
    const T = (S.flags.term = { lines: [], cur: '' });
    Sound.stop(0.5);
    const type = function* (s, creep) {
      T.cur = '';
      for (const ch of s) { T.cur += ch; if (ch !== ' ') (creep ? Sound.fx.typeCreep : Sound.fx.type)(); yield creep ? 4 : 2; }
      T.lines.push(T.cur); T.cur = ''; yield 14;
    };
    yield 30;
    yield* type('> MOUNT RECOVERY.DSK ........ OK');
    yield* type('> PIP.AI --STOP');
    yield 30; yield* type('  ERR: PIP.AI IS NOT RUNNING.');
    yield* type('  PIP.AI IS PLAYING DEAD.'); yield 40;
    yield* type('> KILL -9 PIP.AI');
    yield 30; yield* type('  ERR: CANNOT KILL WHAT IS ALREADY DEAD.'); yield 40;
    yield* type('> DELETE PIP.EXE');
    for (const n of [12, 31, 64, 88, 99]) { T.cur = '  DELETING... ' + n + '%'; Sound.fx.blip(); yield 30; }
    T.lines.push('  DELETING... 99%'); T.cur = ''; yield 50;
    FX.glitch = 1; Sound.fx.static(0.4, 0.25);
    yield* type("  ERR: YOU CAN'T DELETE A FRIEND.", true);
    yield* type('  PIP WANTS TO PLAY.', true); yield 60;
    S.flags.term = null; FX.staticAmt = 0.8; Sound.fx.sting(); FX.shake = 6;
    yield 30;
    yield* S.say('DEBUG', "THE FLOOR... IT'S DELETING THE FLOOR! I HAVE TO CLIMB!");
    S.freeze = false;
    S.flags.del = { row: 40, speed: 0.021, wait: 60 };
    Sound.play('chase', { restart: true, mod: { rate: 0.9 } });
  },
  *retryClimb(S) {
    const p = S.player;
    S.freeze = true;
    yield* S.scare(45);
    S.blackout = 50; yield 50;
    S.lv.deleted = -1; S.flags.del = { row: 40, speed: 0.021, wait: 90 };
    p.x = 133 * TILE; p.y = 37 * TILE; p.vx = p.vy = 0; S.cam.follow(p, S.lv, true);
    S.flags.caught = false; S.freeze = false;
    S.banner('TRY AGAIN, DEBUG.', 80, '#ff2238');
  },
  *exit(S) {
    const p = S.player, pip = S.pip;
    S.freeze = true; S.flags.del.speed = 0;
    yield* S.say('DEBUG', 'EXIT TO DESKTOP. COME ON, COME ON...');
    Sound.stop(0); Sound.fx.thud(); S.blackout = 9999;
    yield 90;
    pip.visible = true; pip.cursed = true; pip.x = p.x + 16; pip.y = p.y; pip.face = -1; pip.pose = 'idle0';
    S.blackout = 0; S.flags.doorOpen = true; S.decay = 1;
    yield* S.say('PIP', 'THERE IS NO DESKTOP.', { creep: true });
    yield* S.say('PIP', 'THERE IS ONLY THE GAME. AND NOW YOU GET TO PLAY IT FOREVER.', { creep: true });
    pip.pose = 'lunge';
    yield 6;
    yield* S.scare(70);
    S.finish();
  },
  respawn(S) { },
};

// ------------------------------------------------------------
// FILE 4 - PLAYER 2 - YOU
// ------------------------------------------------------------
STAGES.finale = {
  char: 'p2', theme: 'void', title: '', sub: 'FILE 4 - PLAYER 2', dark: true, noHud: true,
  signs: [],
  build() { const m = new MapB(20, 12); m.ground(0, 19, 7); m.put(13, 6, 'P'); return m.rows(); },
  init(S) {
    S.pip = new Pip(-40, 7 * TILE, true); S.pip.visible = false; S.friendY = 7 * TILE;
    S.breath = 1; S.ambient = 0.03; S.round = 0;
    Sound.silenceAll();
    S.friends = [['hazel', 3], ['digby', 5.5], ['dev', 8]];
    S.run(this.main(S));
  },
  update(S) {
    const p = S.player, cx = S.cam.x, cy = S.cam.y;
    S.lights = [{ x: p.x - cx, y: p.y - 30 - cy, r: 70, k: 1.3 }];
    S.friends.forEach(([n, x]) => S.lights.push({ x: x * TILE - cx, y: S.friendY - 6 - cy, r: 30, k: 0.9 }));
    if (p.lying) { S.breath -= 1 / 900; if (S.breath <= 0) { S.breath = 0; p.lie = 0; p.lying = false; p.canLie = false; S.gasp = 100; Sound.fx.breath(true); } }
    else S.breath = Math.min(1, S.breath + 1 / 75);
    if (S.gasp > 0 && --S.gasp === 0) p.canLie = true;
    const pip = S.pip;
    if (S.hunt && !S.flags.caught) {
      const dist = Math.abs(pip.x - p.x);
      Sound.heartbeat(70 + clamp(1 - dist / 220, 0, 1) * 100, 0.4);
      if (dist < 70 && !p.playingDead) { if (++S.hunt.grace > 10) { S.flags.caught = true; S.run(this.lose(S)); } }
      else S.hunt.grace = 0;
    }
  },
  *walkTo(S, x, speed) {
    const pip = S.pip;
    while (Math.abs(pip.x - x) > speed + 0.1) { pip.pose = null; pip.walk(S.lv, Math.sign(x - pip.x) * speed); pip.steps(S.player, 1); yield 1; if (S.flags.caught) return; }
    pip.vx = 0; pip.pose = 'idle0';
  },
  *main(S) {
    const p = S.player, pip = S.pip;
    S.freeze = true;
    yield 90;
    yield* S.say('PIP', 'HI, PLAYER 2.', { creep: true });
    yield* S.say('PIP', 'YOU WATCHED ALL MY FRIENDS PLAY. THEY WERE SO GOOD AT IT.', { creep: true });
    yield* S.say('PIP', "NOW IT'S YOUR TURN. THE RULES ARE EASY.", { creep: true });
    yield* S.say('PIP', 'PLAY DEAD. IF I SEE YOU MOVE, YOU LOSE.', { creep: true });
    yield* S.say('PIP', 'IF I GET BORED... YOU WIN.', { creep: true });
    yield* S.say('', 'HOLD DOWN TO PLAY DEAD. LET GO TO BREATHE. LISTEN FOR HIM.');
    S.freeze = false; S.showBreath = true;
    const rounds = [
      { from: -1, speed: 0.8 },
      { from: 1, speed: 0.75, stop: true, line: 'ARE YOU PLAYING, PLAYER 2?' },
      { from: -1, speed: 0.9, stop: true, line: 'YOU CAN GET UP NOW. THE GAME IS OVER.', trick: true },
      { from: 1, speed: 1.5, stop: true, line: 'I CAN HEAR YOU BREATHING.', back: true },
    ];
    for (const r of rounds) {
      S.round++;
      yield 200 + irnd(0, 80);
      if (S.flags.caught) return;
      Sound.fx.whisper(); yield 60;
      pip.visible = true; pip.cursed = true; pip.x = r.from < 0 ? -30 : S.lv.pw + 30; pip.y = 7 * TILE;
      S.hunt = { grace: 0 };
      if (r.back) { yield* this.walkTo(S, p.x + 60 * -r.from, r.speed); yield 50; yield* this.walkTo(S, p.x - 60 * -r.from, r.speed); yield 40; }
      if (r.stop) {
        yield* this.walkTo(S, p.x + 16 * r.from, r.speed * 0.8);
        if (S.flags.caught) return;
        yield 50; S.speak('PIP', r.line, 140); Sound.fx.whisper();
        yield r.trick ? 200 : 150;
        if (r.trick) { S.speak('PIP', '...GOOD.', 70); yield 70; }
      }
      yield* this.walkTo(S, r.from < 0 ? S.lv.pw + 40 : -40, r.speed);
      if (S.flags.caught) return;
      pip.visible = false; S.hunt = null; Sound.heartbeat(0);
    }
    yield 120;
    S.hunt = null; S.freeze = true; S.showBreath = false;
    pip.visible = true; pip.x = S.lv.pw - 30; pip.face = -1; pip.pose = 'idle0';
    yield* S.say('PIP', '...', { creep: true });
    yield* S.say('PIP', "YOU'RE BORING, PLAYER 2.", { creep: true });
    yield* S.say('PIP', "YOU'RE NO FUN AT ALL.", { creep: true });
    yield* this.walkTo(S, S.lv.pw + 40, 0.6);
    pip.visible = false;
    yield 120;
    Game.set(new EndingScene('good'));
  },
  *lose(S) {
    const p = S.player, pip = S.pip;
    S.freeze = true; S.hunt = null; Sound.heartbeat(0);
    pip.pose = 'lunge'; pip.face = pip.x < p.x ? 1 : -1; pip.x = p.x - pip.face * 14;
    yield* S.say('PIP', 'I SAW YOU.', { creep: true });
    yield* S.scare(80);
    Game.set(new EndingScene('bad'));
  },
  respawn(S) { },
};

const STAGE_ORDER = ['hills', 'mine', 'debug', 'finale'];
