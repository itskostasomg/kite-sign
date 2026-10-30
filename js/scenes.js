'use strict';
// ============================================================
//  PIP.EXE - menus, cutscenes and endings
// ============================================================

const Game = {
  scene: null, t: 0, toast: null,
  set(s) { this.scene = s; },
  say(msg) { this.toast = { msg, t: 100 }; },
  update() {
    this.t++;
    if (Input.hit('mute')) this.say(Sound.toggleMute() ? 'SOUND OFF' : 'SOUND ON');
    if (Input.hit('flash')) { Settings.flashing = !Settings.flashing; Store.set('flashing', Settings.flashing); this.say('FLASHING ' + (Settings.flashing ? 'ON' : 'OFF')); }
    FX.update();
    this.scene.update();
    if (this.toast && --this.toast.t <= 0) this.toast = null;
  },
  draw() {
    const [ox, oy] = FX.offset();
    ctx.setTransform(1, 0, 0, 1, ox, oy);
    this.scene.draw(ctx);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    FX.post(ctx, this.t);
    if (this.toast) drawText(ctx, this.toast.msg, W - 6, 6, { color: '#ffffff', align: 'right', shadow: OUT });
  },
};

// ---------- content warning ----------
class WarningScene {
  constructor() { this.t = 0; }
  update() {
    this.t++;
    if (this.t > 20 && (Input.hit('start') || Input.hit('jump') || Input.hit('act'))) { Sound.init(); Sound.fx.beep(); Game.set(new BootScene()); }
  }
  draw(g) {
    g.fillStyle = '#000000'; g.fillRect(0, 0, W, H);
    bigText(g, 'WARNING', W / 2, 18, 2, '#c81e3a', OUT, { align: 'center' });
    drawText(g, 'THIS GAME HAS JUMPSCARES, LOUD SCREAMS,\nFLASHING LIGHTS AND HORROR THEMES.\n\nNOTHING HERE TOUCHES YOUR COMPUTER.\nIT JUST WANTS YOU TO THINK IT DOES.', W / 2, 46, { color: '#c8c0d0', align: 'center' });
    drawText(g, 'F - FLASHING EFFECTS: ' + (Settings.flashing ? 'ON' : 'REDUCED') + '      M - SOUND: ' + (Settings.muted ? 'OFF' : 'ON'), W / 2, 112, { color: '#ffd84a', align: 'center' });
    if ((this.t >> 5) % 2) drawText(g, 'PRESS ENTER OR TAP TO CONTINUE', W / 2, 140, { color: '#ffffff', align: 'center' });
    drawText(g, 'HEADPHONES RECOMMENDED', W / 2, 162, { color: '#5a5266', align: 'center' });
  }
}

// ---------- fake devkit boot ----------
class BootScene {
  constructor() {
    this.t = 0; this.lines = []; this.phase = 0;
    const h = new Date().getHours(), m = new Date().getMinutes();
    const clock = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    this.script = [
      'BRAMBLEBYTE DEV KIT  V2.07', 'MEMORY TEST ....... 4096K OK', 'READING DISC: PIP_PROTO_07.EXE',
      'CHECKSUM .......... MISMATCH (IGNORED)', 'SYSTEM CLOCK ...... ' + clock,
    ];
    if (h >= 0 && h < 5) this.script.push("IT'S LATE. YOU SHOULD BE ASLEEP.");
    if (Progress.runs > 0) this.script.push(Progress.ending === 'good' ? 'WELCOME BACK, PLAYER 2.' : 'YOU CAME BACK. HE KNEW YOU WOULD.');
    this.script.push('LOADING .....');
    this.li = 0; this.ci = 0;
  }
  update() {
    this.t++;
    if (Input.confirm() && this.t > 10) { Game.set(new TitleScene()); return; }
    if (this.phase === 0) {
      if (this.pause > 0) this.pause--;
      else if (this.li < this.script.length) {
        {
          const ln = this.script[this.li];
          this.ci++;
          if (ln[this.ci - 1] !== ' ') Sound.fx.type();
          if (this.ci >= ln.length) { this.lines.push(ln); this.li++; this.ci = 0; this.pause = 12; }
        }
      } else { this.phase = 1; this.pt = 0; }
    } else if (this.phase === 1) {
      this.pt++;
      if (this.pt === 30) Sound.fx[Progress.runs > 0 ? 'jingleBad' : 'jingle']();
      if (this.pt > 190) Game.set(new TitleScene());
    }
  }
  draw(g) {
    g.fillStyle = '#000000'; g.fillRect(0, 0, W, H);
    if (this.phase === 0) {
      this.lines.forEach((ln, i) => drawText(g, ln, 8, 8 + i * 10, { color: ln.includes('LATE') || ln.includes('BACK') ? '#ff4058' : '#a8a0b8' }));
      const ln = this.script[this.li];
      if (ln) drawText(g, ln.slice(0, this.ci) + ((this.t >> 3) % 2 ? '_' : ''), 8, 8 + this.lines.length * 10, { color: '#a8a0b8' });
    } else {
      const a = Math.min(1, this.pt / 30, (190 - this.pt) / 30);
      g.save(); g.globalAlpha = Math.max(0, a);
      g.fillStyle = '#f4f0e8'; g.fillRect(0, 0, W, H);
      g.drawImage(ART.mark, W / 2 - 30, 40, 60, 60);
      bigText(g, 'BRAMBLEBYTE', W / 2, 108, 2, '#7a3aa8', OUT, { align: 'center', shade: '#3f7a3a' });
      drawText(g, 'SOFTWARE  1995', W / 2, 132, { color: '#3f3a48', align: 'center' });
      g.restore();
      if (this.pt > 120 && this.pt < 126 && Settings.flashing) { g.fillStyle = '#000000'; g.fillRect(0, 70 + irnd(0, 30), W, 6); }
    }
  }
}

// ---------- title ----------
class TitleScene {
  constructor() {
    this.t = 0; this.flick = 0;
    this.cursed = Progress.ending !== null;
    this.uneasy = Progress.dead.length > 0;
    this.nextFlick = irnd(500, 800);
    if (this.cursed) Sound.play('musicbox', { restart: true, mod: { minor: true } });
    else Sound.play('title', { restart: true, mod: this.uneasy ? { detune: -25 * Progress.dead.length, wobble: 12 * Progress.dead.length } : {} });
    document.title = this.cursed ? "LET'S PLAY DEAD" : 'PIP.EXE';
  }
  update() {
    this.t++;
    if (--this.nextFlick <= 0) { this.flick = 6; this.nextFlick = irnd(400, 900); Sound.fx.static(0.12, 0.12); FX.glitch = 0.6; }
    if (this.flick > 0) this.flick--;
    if (this.t > 20 && (Input.hit('start') || Input.hit('jump'))) { Sound.fx.select(); Game.set(new FileSelectScene()); }
  }
  draw(g) {
    drawBackground(g, 'clover', this.t * 0.6, 0, this.cursed ? 1 : this.uneasy ? 0.18 * Progress.dead.length : 0, this.t);
    g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(0, 0, W, H);
    const bob = Math.round(Math.sin(this.t * 0.05) * 3);
    const evil = this.cursed || this.flick > 0;
    g.drawImage(evil ? ART.headX : ART.head, 18, 52 + bob);
    drawLogo(g, 214, 26, this.cursed, this.t);
    if ((this.t >> 5) % 2) drawText(g, 'PRESS START', 214, 112, { color: '#ffffff', align: 'center', shadow: OUT });
    drawText(g, '(C) 1995 BRAMBLEBYTE SOFTWARE', 214, 166, { color: 'rgba(255,255,255,0.7)', align: 'center', shadow: OUT });
    drawText(g, 'PROTOTYPE - NOT FOR SALE', 214, 152, { color: this.cursed ? '#ff4058' : '#ffd84a', align: 'center', shadow: OUT });
  }
}

// ---------- file select ----------
const SLOTS = [
  { id: 'hills', who: 'hazel', name: 'HAZEL' },
  { id: 'mine', who: 'digby', name: 'DIGBY' },
  { id: 'debug', who: 'dev', name: 'DEBUG' },
  { id: 'finale', who: 'p2', name: 'PLAYER 2' },
];
class FileSelectScene {
  constructor(reveal) {
    this.t = 0; this.erase = 0; this.msg = null; this.msgT = 0;
    this.four = Progress.dead.length >= 3;
    this.reveal = reveal && this.four ? 120 : 0;
    const nx = Progress.next();
    this.sel = Math.max(0, SLOTS.findIndex(s => s.id === nx));
    Sound.play(Progress.dead.length ? 'musicbox' : 'title', { mod: Progress.dead.length ? { minor: Progress.dead.length > 1, rate: 1 - Progress.dead.length * 0.08 } : {} });
    if (this.reveal) { Sound.stop(0); Sound.fx.sting(); }
  }
  slots() { return this.four ? SLOTS : SLOTS.slice(0, 3); }
  update() {
    this.t++;
    if (this.reveal > 0) { this.reveal--; FX.staticBase = this.reveal > 0 ? 0.2 : 0; if (this.reveal === 0) Sound.play('musicbox', { restart: true, mod: { minor: true, rate: 0.7 } }); return; }
    const n = this.slots().length;
    if (Input.hit('left')) { this.sel = (this.sel + n - 1) % n; Sound.fx.blip(); }
    if (Input.hit('right')) { this.sel = (this.sel + 1) % n; Sound.fx.blip(); }
    if (Input.down('act')) { if (++this.erase === 120) { Progress.erase(); Sound.fx.thud(); Game.set(new FileSelectScene()); return; } } else this.erase = 0;
    if (this.msgT > 0) this.msgT--;
    if (Input.hit('start') || Input.hit('jump')) {
      const s = this.slots()[this.sel];
      if (s.id === Progress.next()) { Sound.fx.select(); Sound.stop(0.4); Game.set(new StageCard(s.id)); }
      else {
        Sound.fx.deny();
        const deadMsgs = { hills: "SHE DOESN'T WANT TO PLAY ANYMORE.", mine: 'HE IS STAYING DOWN THERE.', debug: 'THE DEVELOPER HAS LEFT THE GAME.' };
        this.msg = Progress.dead.includes(s.id) ? deadMsgs[s.id] : 'NOT YET. PIP SAYS WAIT YOUR TURN.'; this.msgT = 140;
      }
    }
    if (Input.hit('pause')) Game.set(new TitleScene());
  }
  draw(g) {
    g.fillStyle = '#0d0912'; g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 8) { g.fillStyle = (y / 8) % 2 ? '#120c18' : '#0d0912'; g.fillRect(0, y, W, 8); }
    bigText(g, 'SELECT FILE', W / 2, 10, 2, '#ffd84a', OUT, { align: 'center', shade: '#c0601a' });
    const sl = this.slots(), sw = 66, gap = 8, tot = sl.length * sw + (sl.length - 1) * gap, x0 = Math.round(W / 2 - tot / 2);
    sl.forEach((s, i) => {
      const x = x0 + i * (sw + gap), y = 40, dead = Progress.dead.includes(s.id), on = i === this.sel;
      const glitch = s.id === 'finale' && (this.reveal > 0 || Math.random() < 0.05);
      drawBox(g, x, y, sw, 92, dead ? '#16080c' : '#1e1628', on ? (s.id === 'finale' ? '#c81e3a' : '#ffd84a') : '#4a3e58');
      drawText(g, 'FILE ' + (i + 1), x + sw / 2, y + 5, { color: '#8a80a0', align: 'center' });
      if (dead) {
        g.drawImage(ART.dead[s.who], x + sw / 2 - 34, y + 30, 68, 36);
        drawText(g, 'DEAD', x + sw / 2, y + 70, { color: '#c81e3a', align: 'center' });
      } else {
        const spr = SPR[s.who][on && (this.t >> 4) % 2 ? 'idle1' : 'idle0'];
        g.drawImage(spr, x + sw / 2 - 28, y + 10 + (glitch ? irnd(-2, 2) : 0), 56, 62);
        drawText(g, s.id === Progress.next() ? 'NEW' : '---', x + sw / 2, y + 70, { color: s.id === 'finale' ? '#ff4058' : '#7fd8a8', align: 'center' });
      }
      drawText(g, glitch ? 'Y0U' : s.name, x + sw / 2, y + 80, { color: dead ? '#6a5a62' : '#ffffff', align: 'center', shake: glitch ? 1 : 0 });
      if (on && !this.reveal) drawText(g, 'V', x + sw / 2, y - 9 + ((this.t >> 3) % 2), { color: '#ffd84a', align: 'center' });
    });
    if (this.reveal > 0) bigText(g, "IT'S YOUR TURN", W / 2, 140, 2, '#ff2238', OUT, { align: 'center', shake: 1 });
    else if (this.msgT > 0) drawText(g, this.msg, W / 2, 146, { color: '#ff5468', align: 'center' });
    else drawText(g, Progress.dead.length ? 'PIP IS WAITING' : 'CHOOSE A FRIEND TO PLAY AS', W / 2, 146, { color: '#c8c0d0', align: 'center' });
    drawText(g, this.erase ? 'ERASING... ' + Math.floor(this.erase / 1.2) + '%' : 'HOLD X TO ERASE ALL DATA', W / 2, 164, { color: this.erase ? '#ff4058' : '#5a5266', align: 'center' });
  }
}

// ---------- stage title card ----------
class StageCard {
  constructor(id) {
    this.id = id; this.t = 0; this.st = STAGES[id];
    this.scene = new PlayScene(id);
    if (id !== 'finale') Sound.fx.jingle(); else Sound.fx.heartbeat();
  }
  update() {
    this.t++;
    if (this.t > 150 || (this.t > 30 && Input.confirm())) { Game.set(this.scene); }
  }
  draw(g) {
    if (this.id === 'finale') {
      g.fillStyle = '#000000'; g.fillRect(0, 0, W, H);
      drawText(g, 'FILE 4 - PLAYER 2', W / 2, 70, { color: '#5a5266', align: 'center' });
      if (this.t > 40) drawText(g, 'NO MORE FRIENDS LEFT TO PLAY AS.', W / 2, 90, { color: '#c81e3a', align: 'center' });
      if (this.t > 80) drawText(g, 'SO YOU WILL HAVE TO DO.', W / 2, 102, { color: '#c81e3a', align: 'center', shake: 1 });
      return;
    }
    this.scene.draw(g);
    const k = smooth(clamp(this.t / 25, 0, 1)) * smooth(clamp((150 - this.t) / 20, 0, 1));
    const y = Math.round(lerp(-60, 54, k));
    g.fillStyle = 'rgba(0,0,0,' + (0.55 * k) + ')'; g.fillRect(0, 0, W, H);
    g.fillStyle = OUT; g.fillRect(0, y - 2, W, 52);
    g.fillStyle = this.st.theme === 'clover' ? '#2ec4b6' : this.st.theme === 'mine' ? '#e8b62a' : '#ff00dc'; g.fillRect(0, y, W, 48);
    g.fillStyle = 'rgba(255,255,255,0.18)'; for (let i = 0; i < W; i += 12) g.fillRect(i + (this.t % 12), y, 6, 48);
    bigText(g, this.st.title, W / 2, y + 8, 2, '#ffffff', OUT, { align: 'center' });
    drawText(g, this.st.sub, W / 2, y + 33, { color: OUT, align: 'center' });
  }
}

// ---------- a friend is gone ----------
const DEATH_TEXT = {
  hills: ['HAZEL IS PLAYING DEAD.', "SHE'S VERY GOOD AT IT."],
  mine: ['DIGBY IS PLAYING DEAD.', 'HE WILL NEVER GET UP AGAIN.'],
  debug: ['THE DEVELOPER HAS LEFT THE GAME.', "PIP DOESN'T NEED HIM ANYMORE."],
};
class DeathScene {
  constructor(id) { this.id = id; this.t = 0; this.who = STAGES[id].char; Sound.silenceAll(); FX.reset(); Sound.drone('death', [26, 33], 0.05, 'sawtooth', 240); document.title = "LET'S PLAY DEAD"; }
  update() {
    this.t++;
    if (this.t === 30) Sound.fx.thud();
    if (this.t === 120) Sound.fx.musicNote(64);
    if (this.t === 150) Sound.fx.musicNote(63);
    if ((this.t > 360 && Input.confirm()) || this.t > 720) {
      Sound.stopDrone('death');
      Game.set(new FileSelectScene(true));
    }
  }
  draw(g) {
    g.fillStyle = '#000000'; g.fillRect(0, 0, W, H);
    if (this.t < 30) return;
    const a = Math.min(1, (this.t - 30) / 60);
    g.save(); g.globalAlpha = a;
    const grd = g.createRadialGradient(W / 2, 92, 4, W / 2, 92, 90);
    grd.addColorStop(0, 'rgba(120,10,24,0.55)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.drawImage(ART.dead[this.who], W / 2 - 51, 64, 102, 54);
    g.restore();
    const L = DEATH_TEXT[this.id];
    if (this.t > 120) drawText(g, L[0], W / 2, 30, { color: '#e9e4f0', align: 'center' });
    if (this.t > 220) drawText(g, L[1], W / 2, 136, { color: '#c81e3a', align: 'center', shake: Math.random() < 0.1 ? 1 : 0 });
    if (this.t > 360 && (this.t >> 5) % 2) drawText(g, 'PRESS START', W / 2, 160, { color: '#5a5266', align: 'center' });
  }
}

// ---------- endings ----------
class EndingScene {
  constructor(kind) {
    this.kind = kind; this.t = 0; this.step = 0;
    Sound.silenceAll(); FX.reset();
    Progress.finish(kind);
    this.script = new Script(kind === 'good' ? this.good() : this.bad());
    this.view = 'black'; this.text = []; this.up = [false, false, false]; this.credits = 0; this.eyes = false;
    document.title = kind === 'good' ? 'SEE YOU TOMORROW' : "LET'S PLAY DEAD";
  }
  *bad() {
    yield 60; FX.staticBase = 0.07; Sound.drone('end', [24, 31, 36], 0.06);
    this.view = 'files'; yield 90;
    this.text = ['PLAYER 2 IS PLAYING DEAD.']; Sound.fx.thud(); yield 150;
    this.text.push('PIP FOUND A NEW FRIEND.'); yield 150;
    this.text.push(''); this.text.push('AND YOU NEVER, EVER HAVE TO STOP PLAYING.'); Sound.fx.laugh(); yield 200;
    FX.staticBase = 0; this.view = 'black'; this.text = []; Sound.stopDrone('end', 2); yield 90;
    this.text = ['THE END?']; this.done = true;
  }
  *good() {
    yield 60;
    this.view = 'friends'; yield 120;
    Dialog.reset();
    const say = function* (who, text, creep) { Dialog.open(who, text, { creep }); yield () => !Dialog.active; };
    this.up[0] = true; Sound.fx.jump(); yield 30;
    yield* say('HAZEL', '...IS HE GONE?');
    this.up[1] = true; Sound.fx.jump(); yield 30;
    yield* say('DIGBY', "SHH. I THINK SO. I CAN'T HEAR HIS FEET ANYMORE.");
    this.up[2] = true; Sound.fx.jump(); yield 30;
    yield* say('DEBUG', 'HE ONLY STOPS WHEN HE GETS BORED. YOU BORED HIM, PLAYER 2.');
    yield* say('HAZEL', 'WE WERE NEVER DEAD. WE WERE PLAYING DEAD THE WHOLE TIME.');
    yield* say('DIGBY', "IT'S THE ONLY GAME HE CAN'T WIN.");
    yield* say('DEBUG', "THANKS FOR PLAYING. NOW CLOSE THE GAME BEFORE HE GETS UN-BORED.");
    this.view = 'credits'; Sound.play('musicbox', { restart: true, mod: { rate: 1.1 } });
    for (let i = 0; i < 900; i++) { this.credits = i; yield 1; }
    Sound.stop(2); this.view = 'black'; yield 150;
    this.eyes = true; Sound.fx.whisper(); yield 80;
    this.text = ['SEE YOU TOMORROW, PLAYER 2.']; this.creepText = true; yield 200;
    this.done = true;
  }
  update() {
    this.t++;
    Dialog.update();
    this.script.step();
    if (this.done && Input.confirm()) { Dialog.reset(); FX.reset(); Game.set(new TitleScene()); }
  }
  draw(g) {
    g.fillStyle = '#000000'; g.fillRect(0, 0, W, H);
    if (this.view === 'files') {
      SLOTS.forEach((s, i) => {
        const x = 18 + i * 74, y = 50;
        drawBox(g, x, y, 62, 50, '#16080c', '#4a1a24');
        g.drawImage(ART.dead[s.who], x - 3, y + 6, 68, 36);
        drawText(g, s.name, x + 31, y + 40, { color: '#6a5a62', align: 'center' });
      });
    }
    if (this.view === 'friends') {
      g.fillStyle = '#0e0a12'; g.fillRect(0, 120, W, 60);
      const grd = g.createRadialGradient(W / 2, 110, 10, W / 2, 110, 140);
      grd.addColorStop(0, 'rgba(120,110,160,0.35)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.fillRect(0, 0, W, H);
      ['hazel', 'digby', 'dev'].forEach((n, i) => {
        const x = 110 + i * 50;
        drawSprite(g, this.up[i] ? SPR[n].idle0 : SPR[n].liePlay, x, 122, i === 2);
      });
      drawSprite(g, SPR.p2.idle0, 40, 122);
    }
    if (this.view === 'credits') {
      const lines = ['PIP.EXE', '', 'A GAME THAT WAS NEVER FINISHED', '', 'STARRING', 'HAZEL', 'DIGBY', 'DEBUG', 'AND YOU', '', 'PIP WAS PLAYED BY', 'PIP', '', 'NO FRIENDS WERE HARMED.', 'THEY WERE ONLY PLAYING.', '', 'THANK YOU FOR PLAYING', '', '', '...DEAD'];
      const y0 = H - this.credits * 0.3;
      lines.forEach((ln, i) => drawText(g, ln, W / 2, Math.round(y0 + i * 14), { color: ln === 'PIP' || ln === '...DEAD' ? '#ff4058' : i === 0 ? '#ffd84a' : '#e9e4f0', align: 'center' }));
    }
    if (this.eyes) {
      const o = (this.t >> 2) % 40 === 0 ? 0 : 1;
      g.fillStyle = '#ff2238'; if (o) { g.fillRect(W / 2 - 12, 70, 3, 2); g.fillRect(W / 2 + 9, 70, 3, 2); }
    }
    this.text.forEach((ln, i) => drawText(g, ln, W / 2, (this.view === 'files' ? 116 : 96) + i * 11, { color: this.kind === 'bad' || this.creepText ? '#ff4058' : '#ffffff', align: 'center', shake: this.creepText && Math.random() < 0.06 ? 1 : 0 }));
    if (this.done && (this.t >> 5) % 2) drawText(g, 'PRESS START', W / 2, 164, { color: '#5a5266', align: 'center' });
    Dialog.draw(g, this.t);
  }
}
