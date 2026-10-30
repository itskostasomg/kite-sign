'use strict';
// ============================================================
//  PIP.EXE - dialog, save progress, and the in-level scene
// ============================================================

const Dialog = {
  active: false, queue: [], cur: null, shown: 0, t: 0, lines: [],
  reset() { this.active = false; this.queue = []; this.cur = null; },
  open(who, text, opt = {}) {
    this.queue.push({ who, text: String(text).toUpperCase(), creep: !!opt.creep });
    if (!this.active) this.next();
  },
  next() {
    this.cur = this.queue.shift() || null;
    this.active = !!this.cur; this.shown = 0; this.t = 0;
    this.lines = this.cur ? wrapText(this.cur.text, 47) : [];
  },
  update() {
    if (!this.active) return;
    this.t++;
    const c = this.cur, n = c.text.length;
    if (this.shown < n) {
      const prev = Math.floor(this.shown);
      this.shown = Math.min(n, this.shown + (c.creep ? 0.45 : 1));
      if (Math.floor(this.shown) > prev && c.text[prev] !== ' ' && this.t % 2 === 0) (c.creep ? Sound.fx.typeCreep : Sound.fx.type)();
      if (Input.confirm() && this.t > 8) this.shown = n;
    } else if (Input.confirm()) { Sound.fx.blip(); this.next(); }
  },
  draw(g, t) {
    if (!this.active) return;
    const c = this.cur, x = 10, w = W - 20, h = 40, y = Game.scene && Game.scene.dialogTop ? 14 : H - 48;
    drawBox(g, x, y, w, h, c.creep ? '#0c0206' : '#120c18', c.creep ? '#8a0a18' : '#e9e4f0');
    if (c.who) {
      const tw = textWidth(c.who) + 8;
      drawBox(g, x + 4, y - 11, tw, 9, c.creep ? '#2a0610' : '#2a1f38', c.creep ? '#8a0a18' : '#e9e4f0');
      drawText(g, c.who, x + 8, y - 10, { color: c.creep ? '#ff4058' : '#ffd84a' });
    }
    let left = Math.floor(this.shown);
    this.lines.forEach((ln, i) => {
      const part = ln.slice(0, Math.max(0, left));
      left -= ln.length + 1;
      drawText(g, part, x + 6, y + 7 + i * 10, { color: c.creep ? '#ff5468' : '#ffffff', shake: c.creep && Math.random() < 0.08 ? 1 : 0 });
    });
    if (this.shown >= c.text.length && (t >> 4) % 2) drawText(g, '>', x + w - 10, y + h - 10, { color: c.creep ? '#ff4058' : '#ffd84a' });
  },
};

const Progress = {
  dead: Store.get('dead', []),
  ending: Store.get('ending', null),
  runs: Store.get('runs', 0),
  kill(id) { if (!this.dead.includes(id)) this.dead.push(id); Store.set('dead', this.dead); },
  next() { return STAGE_ORDER.find(s => !this.dead.includes(s)) || 'finale'; },
  finish(kind) { this.ending = kind; this.runs++; this.dead = []; Store.set('ending', kind); Store.set('runs', this.runs); Store.set('dead', []); },
  erase() { const f = Settings.flashing; Store.clear(); Store.set('flashing', f); this.dead = []; this.ending = null; this.runs = 0; },
};

const NO_CTL = { left: false, right: false, jump: false, jumpHit: false, down: false };

class PlayScene {
  constructor(id) {
    this.id = id; this.st = STAGES[id];
    this.lv = new Level(this.st.build(), this.st.theme);
    const ps = this.lv.find('P')[0];
    this.player = new Player(this.st.char, ps.x, ps.y);
    this.cam = new Camera(); this.parts = new Particles();
    Object.assign(this, { t: 0, freeze: false, flags: {}, decay: 0, lights: [], ambient: 0, count: 0, disks: 0, scripts: [], bubble: null, bannerT: null,
      scareT: null, blackout: 0, blackMsg: null, plats: [], prompt: null, auto: null, paused: false, critterLook: false, friends: null, stalk: null });
    this.check = { x: ps.x, y: ps.y };
    this.items = this.lv.objs.filter(o => 'oDg'.includes(o.ch)).map(o => ({ kind: o.ch, x: o.x, y: o.y, got: false, bob: rnd(0, 6) }));
    this.signs = this.lv.find('S').sort((a, b) => a.x - b.x).map((o, i) => ({ x: o.x, y: o.y, text: this.st.signs[i] || '...', i }));
    this.flagsK = this.lv.find('K').map(o => ({ x: o.x, y: o.y, on: false }));
    this.triggers = this.lv.objs.filter(o => /[1-9]/.test(o.ch)).map(o => ({ id: +o.ch, x: o.x, fired: false }));
    this.decor = this.lv.objs.filter(o => 'ftbcvLwhTd'.includes(o.ch));
    let chalkN = 0;
    this.decor.forEach((o) => { if (o.ch === 'w') o.n = chalkN++; });
    Dialog.reset(); FX.reset();
    Sound.heartbeat(0);
    this.st.init(this);
    this.cam.follow(this.player, this.lv, true);
    document.title = id === 'finale' ? 'PLAYER 2' : 'PIP.EXE';
  }
  run(gen) { this.scripts.push(new Script(gen)); }
  *say(who, text, opt = {}) { Dialog.open(who, text, opt); yield () => !Dialog.active; }
  speak(who, text, frames) { this.bubble = { who, text: text.toUpperCase(), t: frames }; }
  banner(text, frames, color = '#ffffff') { this.bannerT = { text, t: frames, max: frames, color }; }
  *scare(frames) {
    this.scareT = { t: 0, max: frames };
    Sound.fx.scream(); Sound.fx.static(frames / 60, 0.3);
    FX.shake = 10; FX.staticAmt = 0.5; FX.hitFlash('#ff0020', 0.9);
    yield frames;
    this.scareT = null; FX.staticAmt = 0; FX.shake = 0;
  }
  *retry(msg) {
    const p = this.player;
    this.freeze = true;
    if (this.pip) { this.pip.pose = 'lunge'; this.pip.face = this.pip.x < p.x ? 1 : -1; }
    yield 6;
    yield* this.scare(45);
    this.blackout = 150; this.blackMsg = msg;
    yield 140;
    p.x = this.check.x; p.y = this.check.y; p.vx = p.vy = 0; p.lie = 0; p.lying = false;
    this.triggers.forEach((tr) => { if (tr.x > this.check.x) tr.fired = false; });
    this.st.respawn(this);
    this.flags.caught = false; this.freeze = false; this.blackMsg = null;
    this.cam.follow(p, this.lv, true);
  }
  finish() {
    Progress.kill(this.id);
    Sound.silenceAll();
    Game.set(new DeathScene(this.id));
  }
  controls() {
    const p = this.player;
    if (this.auto) return { left: p.x > this.auto.x + 2, right: p.x < this.auto.x - 2, jump: false, jumpHit: false, down: false };
    if (this.freeze || Dialog.active || this.scareT || this.blackout > 0) return NO_CTL;
    return { left: Input.down('left'), right: Input.down('right'), jump: Input.down('jump'), jumpHit: Input.hit('jump'), down: Input.down('down') };
  }
  update() {
    if (Input.hit('pause') && !this.scareT) { this.paused = !this.paused; Sound.fx.blip(); }
    if (this.paused) {
      if (Input.hit('start') || Input.hit('jump')) this.paused = false;
      if (Input.hit('act')) { Sound.silenceAll(); Game.set(new FileSelectScene()); }
      return;
    }
    this.t++;
    const p = this.player, lv = this.lv;
    Dialog.update();
    this.scripts.forEach(s => s.step());
    this.scripts = this.scripts.filter(s => !s.done);
    p.update(lv, this.plats, this.controls());
    if (p.onGround && Math.abs(p.vx) > 1.6 && this.t % 6 === 0) this.parts.add(p.x - p.face * 4, p.y - 1, { vx: -p.face * 0.4, vy: -0.3, c: '#d8d0c8', life: 14, g: 0 });
    // falling out of the world
    if (p.y > lv.ph + 40 && !this.flags.chase && !this.flags.caught) {
      FX.staticAmt = 0.8; Sound.fx.static(0.3, 0.2);
      p.x = this.check.x; p.y = this.check.y; p.vx = p.vy = 0;
      this.cam.follow(p, lv, true);
    }
    if (touchesSpike(p, lv) && p.hurtT === 0 && !this.flags.caught) {
      p.hurtT = 60; Sound.fx.hurt(); p.vy = -3.6; p.vx = -p.face * 2; FX.shake = 3;
      if (this.count > 0) { this.count = Math.max(0, this.count - 3); this.parts.burst(p.x, p.y - 12, 8, '#e0a050'); }
    }
    for (const it of this.items) {
      if (it.got || Math.abs(it.x - p.x) > 11 || it.y - 14 > p.y || it.y - 2 < p.y - p.h) continue;
      it.got = true;
      if (it.kind === 'o') {
        this.count++;
        const bad = this.st.theme === 'clover' && this.decay > 0.45;
        (bad ? Sound.fx.rotten : Sound.fx.collect)();
        this.parts.burst(it.x, it.y - 8, 6, bad ? '#5e5560' : this.st.theme === 'mine' ? '#7ff0ff' : '#ffe080', 1);
      } else { Sound.fx.select(); this.parts.burst(it.x, it.y - 8, 10, '#ffffff', 1.2); }
      if (this.st.item) this.st.item(this, it);
    }
    for (const k of this.flagsK) if (!k.on && Math.abs(k.x - p.x) < 10 && Math.abs(k.y - p.y) < 30) { k.on = true; this.check = { x: k.x, y: k.y }; Sound.fx.select(); }
    for (const tr of this.triggers) if (!tr.fired && p.x >= tr.x && !this.flags.caught) { tr.fired = true; this.st.trigger(this, tr.id); }
    this.prompt = null;
    const near = this.signs.find(s => Math.abs(s.x - p.x) < 14 && Math.abs(s.y - p.y) < 24);
    if (near && !this.freeze && !Dialog.active) {
      this.prompt = near;
      if (Input.hit('act') || Input.hit('up')) { Sound.fx.blip(); this.run(this.say(this.st.theme === 'debug' ? 'NOTE' : '', near.text)); }
    }
    this.st.update(this);
    this.parts.update();
    this.cam.follow(p, lv);
    if (this.bubble && --this.bubble.t <= 0) this.bubble = null;
    if (this.bannerT && --this.bannerT.t <= 0) this.bannerT = null;
    if (this.blackout > 0) this.blackout--;
    if (this.scareT) this.scareT.t++;
  }

  drawDecor(g, cx, cy, front) {
    const d = this.decay;
    for (const o of this.decor) {
      const x = o.x - cx, y = o.y - cy;
      if (x < -60 || x > W + 60) continue;
      const ch = o.ch;
      if (!front) {
        if (ch === 't') drawSprite(g, d > 0.55 ? DECOR.treeDead : DECOR.tree, x, y + 1);
        else if (ch === 'b') drawSprite(g, d > 0.6 ? DECOR.bushDead : DECOR.bush, x, y + 1);
        else if (ch === 'L') { g.fillStyle = '#3a3a40'; g.fillRect(x, y - 16, 1, 4); drawSprite(g, SPR.prop.lantern, x, y - 2); }
        else if (ch === 'w') drawSprite(g, o.n ? DECOR.chalkX : DECOR.chalk, x, y + 6);
        else if (ch === 'h') { drawSprite(g, DECOR.lift, x, y + 1); }
        else if (ch === 'T') drawSprite(g, SPR.prop.terminal, x, y + 1);
        else if (ch === 'd') { drawSprite(g, SPR.prop.door, x, y + 1); if (this.flags.doorOpen) { g.fillStyle = '#000000'; g.fillRect(x - 9, y - 32, 18, 30); } drawText(g, 'EXIT', x, y - 44, { color: '#30303a', align: 'center' }); }
      } else {
        if (ch === 'f') drawSprite(g, d > 0.5 ? SPR.prop.flowerDead : SPR.prop.flower, x, y + 1);
        else if (ch === 'c' || ch === 'v') {
          const look = this.critterLook, red = look && d > 0.8;
          const sp = ch === 'c' ? (red ? SPR.prop.bunnyRed : look ? SPR.prop.bunnyWatch : SPR.prop.bunnyDead) : (red ? SPR.prop.birdRed : look ? SPR.prop.birdWatch : SPR.prop.birdDead);
          drawSprite(g, sp, x, y + 1, look && this.player.x > o.x);
        }
      }
    }
  }
  draw(g) {
    const cx = Math.round(this.cam.x), cy = Math.round(this.cam.y), p = this.player, st = this.st;
    drawBackground(g, st.theme, cx, cy, this.decay, this.t);
    if (this.id === 'debug') this.drawDebugBack(g, cx, cy);
    this.drawDecor(g, cx, cy, false);
    drawTiles(g, this.lv, cx, cy, this.decay);
    for (const pl of this.plats) { const a = tileArt('debug', 'oneway', 0, 0); g.drawImage(a, Math.round(pl.x - cx), Math.round(pl.y - cy)); g.drawImage(a, Math.round(pl.x + 16 - cx), Math.round(pl.y - cy)); }
    for (const s of this.signs) drawSprite(g, st.theme === 'debug' ? SPR.prop.note : (s.i >= 3 && st.theme === 'clover') ? SPR.prop.signBad : SPR.prop.sign, s.x - cx, s.y - cy + 1);
    for (const k of this.flagsK) drawSprite(g, k.on ? (this.decay > 0.6 ? SPR.prop.flagUpBad : SPR.prop.flagUp) : SPR.prop.flagDown, k.x - cx, k.y - cy + 1);
    for (const it of this.items) {
      if (it.got) continue;
      const by = Math.round(Math.sin(this.t * 0.08 + it.bob) * 1.5);
      const sp = it.kind === 'D' ? SPR.prop.floppy : it.kind === 'g' ? SPR.prop.goggles : st.theme === 'mine' ? SPR.prop.crystal : this.decay > 0.45 ? SPR.prop.acornBad : SPR.prop.acorn;
      drawSprite(g, sp, it.x - cx, it.y - cy - 3 + (it.kind === 'g' ? 3 : by));
    }
    this.drawDecor(g, cx, cy, true);
    if (this.friends) this.friends.forEach(([n, x]) => drawSprite(g, this.friendsUp ? SPR[n].idle0 : SPR[n].liePlay, x * TILE - cx, this.friendY - cy + 2, this.friendsUp && x * TILE > p.x));
    if (this.pip) this.pip.draw(g, cx, cy);
    p.draw(g, cx, cy);
    this.parts.draw(g, cx, cy);
    if (this.flags.del) this.drawDeletion(g, cx, cy);
    if (st.dark) {
      drawDarkness(g, this.lights, this.ambient);
      g.save(); g.globalCompositeOperation = 'lighter';
      for (const L of this.lights) {
        if (!L.warm) continue;
        const gx = L.x + (L.dir !== undefined ? Math.cos(L.dir) * 44 : 0), gy = L.y + (L.dir !== undefined ? 14 : 0), r = L.r * 0.55;
        const grd = g.createRadialGradient(gx, gy, 1, gx, gy, r);
        grd.addColorStop(0, 'rgba(255,196,110,' + L.warm + ')'); grd.addColorStop(1, 'rgba(255,196,110,0)');
        g.fillStyle = grd; g.fillRect(gx - r, gy - r, r * 2, r * 2);
      }
      g.restore();
      if (this.pip && this.pip.visible) this.pip.drawEyes(g, cx, cy, this.t);
    }
    if (this.prompt && !Dialog.active) {
      const bx = Math.round(this.prompt.x - cx), by = Math.round(this.prompt.y - cy - 34 + Math.sin(this.t * 0.15) * 1.5);
      drawBox(g, bx - 5, by, 9, 9, '#120c18', '#ffd84a'); drawText(g, 'X', bx - 2, by + 1, { color: '#ffd84a' });
    }
    if (this.bubble && this.pip && this.pip.visible) {
      const lines = wrapText(this.bubble.text, 24), bw = Math.max(...lines.map(textWidth)) + 8, bh = lines.length * 9 + 5;
      const bx = clamp(Math.round(this.pip.x - cx - bw / 2), 4, W - bw - 4), by = Math.max(4, Math.round(this.pip.y - cy - 34 - bh));
      drawBox(g, bx, by, bw, bh, '#0c0206', '#8a0a18');
      lines.forEach((ln, i) => drawText(g, ln, bx + 4, by + 3 + i * 9, { color: '#ff5468', shake: Math.random() < 0.06 ? 1 : 0 }));
    }
    if (!st.noHud) this.drawHud(g);
    if (this.showBreath) this.drawBreath(g);
    if (this.bannerT) {
      const b = this.bannerT, k = Math.min(1, (b.max - b.t) / 10, b.t / 10);
      bigText(g, b.text, W / 2, 62, b.text.length > 10 ? 2 : 4, b.color, OUT, { align: 'center', shake: b.color === '#ff2238' ? 1 : 0 });
      void k;
    }
    if (this.flags.term) this.drawTerminal(g);
    if (this.scareT) this.drawScare(g);
    if (this.blackout > 0) {
      g.fillStyle = '#000000'; g.fillRect(0, 0, W, H);
      if (this.blackMsg) drawText(g, this.blackMsg, W / 2, H / 2 - 4, { color: '#c81e3a', align: 'center' });
    }
    Dialog.draw(g, this.t);
    if (this.paused) {
      g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(0, 0, W, H);
      bigText(g, 'PAUSED', W / 2, 50, 3, '#ffffff', OUT, { align: 'center' });
      drawText(g, 'ENTER - RESUME\nX - BACK TO FILE SELECT\nM - SOUND ' + (Settings.muted ? 'OFF' : 'ON') + '\nF - FLASHING ' + (Settings.flashing ? 'ON' : 'OFF'), W / 2, 88, { color: '#c8c0d0', align: 'center' });
    }
  }
  drawHud(g) {
    const st = this.st;
    if (st.theme === 'clover' || st.theme === 'mine') {
      drawSprite(g, st.theme === 'mine' ? SPR.prop.crystal : this.decay > 0.45 ? SPR.prop.acornBad : SPR.prop.acorn, 12, 17);
      let txt = 'X ' + String(this.count).padStart(2, '0');
      if (this.decay > 0.75 && Math.random() < 0.03) txt = 'PLAY DEAD';
      drawText(g, txt, 20, 7, { color: '#ffffff', shadow: OUT });
    } else if (st.theme === 'debug') {
      drawText(g, 'DISKS ' + this.disks + '/3', 6, 6, { color: '#202028', shadow: '#ffffff' });
      drawText(g, 'X:' + String(Math.floor(this.player.x)).padStart(4, '0') + ' Y:' + String(Math.floor(this.player.y)).padStart(3, '0'), W - 6, 6, { color: '#202028', align: 'right', shadow: '#ffffff' });
    }
    drawText(g, CHAR[st.char].name, W - 6, H - 11, { color: 'rgba(255,255,255,0.55)', align: 'right' });
  }
  drawBreath(g) {
    const x = W / 2 - 40, y = 8, b = this.breath;
    drawText(g, 'BREATH', W / 2, y, { color: '#c8c0d0', align: 'center' });
    g.fillStyle = OUT; g.fillRect(x - 1, y + 9, 82, 6);
    g.fillStyle = b < 0.25 ? ((this.t >> 3) % 2 ? '#ff2238' : '#7a0a18') : '#c8c0d0';
    g.fillRect(x, y + 10, Math.round(80 * b), 4);
  }
  drawScare(g) {
    const s = this.scareT, open = (s.t >> 3) % 2 === 0, k = Math.min(1, s.t / 4);
    g.fillStyle = Settings.flashing && (s.t >> 2) % 2 ? '#3a0006' : '#000000';
    g.fillRect(0, 0, W, H);
    const z = 1.02 + k * 0.16 + Math.sin(s.t * 0.9) * 0.02, jw = W * z, jh = H * z;
    const jx = rnd(-4, 4), jy = rnd(-4, 4);
    g.drawImage(open ? ART.scareOpen : ART.scare, W / 2 - jw / 2 + jx, H / 2 - jh / 2 + jy, jw, jh);
  }
  drawTerminal(g) {
    const T = this.flags.term;
    g.fillStyle = '#04100a'; g.fillRect(0, 0, W, H);
    const all = T.lines.concat(T.cur !== '' ? [T.cur + ((this.t >> 4) % 2 ? '_' : '')] : []);
    const start = Math.max(0, all.length - 16);
    all.slice(start).forEach((ln, i) => {
      const bad = ln.includes('FRIEND') || ln.includes('WANTS');
      drawText(g, ln, 8, 8 + i * 10, { color: bad ? '#ff3048' : '#40ff80', shake: bad && Math.random() < 0.2 ? 1 : 0 });
    });
  }
  drawDebugBack(g, cx, cy) {
    if (!this.pip) return;
    const x = 60 * TILE + 8 - cx, y = 37 * TILE - cy;
    if (x > -80 && x < W + 80) drawText(g, this.flags.label, x, y - 40, { color: this.flags.pipGone ? '#c81e3a' : '#5a5866', align: 'center' });
    const tx = 108 * TILE - cx, ty = 37 * TILE - cy;
    if (tx > -80 && tx < W + 80) {
      g.strokeStyle = '#5a5866'; g.setLineDash([2, 2]); g.strokeRect(tx - 20, ty - 60, 40, 60); g.setLineDash([]);
      g.fillStyle = '#7a4a2a'; g.fillRect(tx - 2, ty - 26, 5, 26);
      drawText(g, 'TODO: TREE', tx, ty - 70, { color: '#5a5866', align: 'center' });
    }
  }
  drawDeletion(g, cx, cy) {
    const y = Math.round(this.flags.del.row * TILE - cy);
    if (y >= H) return;
    g.save();
    g.drawImage(NOISE[(this.t >> 1) % 4], 0, Math.max(0, y), W, H);
    g.fillStyle = 'rgba(255,0,220,0.25)'; g.fillRect(0, y, W, 3);
    g.restore();
    drawText(g, 'DELETING...', W / 2, Math.max(4, Math.min(H - 12, y - 12)), { color: '#ff00dc', align: 'center', shadow: OUT });
  }
}
