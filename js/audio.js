'use strict';
// ============================================================
//  PIP.EXE - sound: a tiny WebAudio chip synth + sequencer
// ============================================================

const Sound = (() => {
  let ac = null, master, comp, music, sfx, amb, noiseBuf, pulse25 = null;
  const drones = {};
  const S = { song: null, step: 0, next: 0, rate: 1, detune: 0, drop: 0, wobble: 0, minor: false, transpose: 0, beat: null };
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function bus(v, to) { const g = ac.createGain(); g.gain.value = v; g.connect(to); return g; }

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 6;
    comp.connect(ac.destination);
    master = bus(Settings.muted ? 0 : 0.7, comp);
    music = bus(0.42, master); sfx = bus(0.9, master); amb = bus(0.7, master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const n = 32, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * 0.25);
    pulse25 = ac.createPeriodicWave(re, im);
    setInterval(schedule, 25);
  }

  // ---- voices ----
  function tone(o) {
    if (!ac) return;
    const t0 = ac.currentTime + (o.when || 0);
    const dur = o.dur || 0.1, vol = o.vol === undefined ? 0.2 : o.vol;
    const osc = ac.createOscillator(), g = ac.createGain();
    if (o.wave === 'pulse') osc.setPeriodicWave(pulse25); else osc.type = o.wave || 'square';
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + dur);
    osc.detune.value = o.detune || 0;
    if (o.vib) {
      const l = ac.createOscillator(), lg = ac.createGain();
      l.frequency.value = o.vib; lg.gain.value = o.vibAmt || 30;
      l.connect(lg); lg.connect(osc.detune); l.start(t0); l.stop(t0 + dur + 0.6);
    }
    const a = o.attack || 0.004, r = o.release === undefined ? 0.05 : o.release;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + a);
    g.gain.setValueAtTime(vol, t0 + Math.max(a, dur - 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + r);
    let out = g;
    if (o.lp) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; g.connect(f); out = f; }
    osc.connect(g);
    out.connect(o.bus === 'music' ? music : o.bus === 'amb' ? amb : sfx);
    osc.start(t0); osc.stop(t0 + dur + r + 0.05);
  }
  function noise(o) {
    if (!ac) return;
    const t0 = ac.currentTime + (o.when || 0), dur = o.dur || 0.1, vol = o.vol === undefined ? 0.2 : o.vol;
    const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ac.createBiquadFilter(); f.type = o.filter || 'lowpass';
    f.frequency.setValueAtTime(o.freq || 2000, t0);
    if (o.to) f.frequency.exponentialRampToValueAtTime(Math.max(30, o.to), t0 + dur);
    f.Q.value = o.q || 1;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + (o.attack || 0.003));
    g.gain.setValueAtTime(vol, t0 + Math.max(0.004, dur - 0.02));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + (o.release || 0.04));
    src.connect(f); f.connect(g); g.connect(o.bus === 'music' ? music : o.bus === 'amb' ? amb : sfx);
    src.start(t0, Math.random()); src.stop(t0 + dur + 0.2);
  }

  // ---- songs (16th-note steps; '-' holds, '.' rests) ----
  function parse(str) {
    const toks = str.trim().split(/\s+/), ev = [];
    const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    toks.forEach((tk, i) => {
      if (tk === '-') { if (ev.length && ev[ev.length - 1].open) ev[ev.length - 1].len++; return; }
      if (ev.length) ev[ev.length - 1].open = false;
      if (tk === '.') return;
      const m = tk.match(/^([A-G])([#b]?)(-?\d)$/);
      if (!m) return;
      const midi = 12 * (parseInt(m[3], 10) + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
      ev.push({ step: i, midi, len: 1, open: true });
    });
    return { len: toks.length, ev };
  }
  const SONGS = {};
  function song(name, def) {
    def.tracks.forEach(t => { t.p = parse(t.seq); });
    def.len = Math.max(...def.tracks.map(t => t.p.len), def.drums ? def.drums.trim().split(/\s+/).length : 0);
    if (def.drums) def.dp = def.drums.trim().split(/\s+/);
    SONGS[name] = def;
  }
  const THEME_MEL =
    'E5 - G5 - C6 - - - B5 - G5 - A5 - - - G5 - E5 - F5 - E5 - D5 - - - - - . . ' +
    'E5 - G5 - C6 - - - D6 - C6 - B5 - A5 - G5 - A5 - G5 - E5 - C5 - - - - - . .';
  const THEME_BASS =
    'C3 . G3 . C3 . G3 . A2 . E3 . A2 . E3 . F2 . C3 . F2 . C3 . G2 . D3 . G2 . D3 . ' +
    'C3 . G3 . C3 . G3 . E2 . B2 . E2 . B2 . F2 . C3 . G2 . D3 . C3 . G2 . C3 . . .';
  const THEME_ARP =
    'C4 E4 G4 E4 C4 E4 G4 E4 A3 C4 E4 C4 A3 C4 E4 C4 F3 A3 C4 A3 F3 A3 C4 A3 G3 B3 D4 B3 G3 B3 D4 B3 ' +
    'C4 E4 G4 E4 C4 E4 G4 E4 E3 G3 B3 G3 E3 G3 B3 G3 F3 A3 C4 A3 G3 B3 D4 B3 C4 E4 G4 E4 C4 . . .';
  song('title', { bpm: 132, tracks: [
    { wave: 'pulse', vol: 0.13, seq: THEME_MEL },
    { wave: 'triangle', vol: 0.3, seq: THEME_BASS },
    { wave: 'square', vol: 0.035, seq: THEME_ARP },
  ], drums: 'k . h . s . h . k . h k s . h . k . h . s . h . k . h k s . s s ' + 'k . h . s . h . k . h k s . h . k . h . s . h . k k h . s s s s' });
  song('hills', { bpm: 120, tracks: [
    { wave: 'pulse', vol: 0.12, seq: THEME_MEL },
    { wave: 'triangle', vol: 0.3, seq: THEME_BASS },
    { wave: 'square', vol: 0.03, seq: THEME_ARP },
  ], drums: 'k . h . s . h . k . h . s . h h '.repeat(4) });
  song('musicbox', { bpm: 66, tracks: [
    { wave: 'sine', vol: 0.18, rel: 0.9, seq: THEME_MEL },
    { wave: 'triangle', vol: 0.06, rel: 0.6, seq: THEME_ARP.replace(/([A-G][#b]?)(\d)/g, (m, n, o) => n + (parseInt(o, 10) + 1)) },
  ] });
  song('chase', { bpm: 170, tracks: [
    { wave: 'sawtooth', vol: 0.08, lp: 900, seq: 'A2 A2 A3 A2 . A2 A3 A2 A2 A2 A3 A2 . G2 G3 G2 F2 F2 F3 F2 . F2 F3 F2 E2 E2 E3 E2 . E2 E3 Bb2' },
    { wave: 'square', vol: 0.06, seq: 'E5 - - - . . D#5 - - - . . . . A#4 - E5 - - - . . D#5 - - - . . B4 - A#4 -' },
    { wave: 'pulse', vol: 0.04, seq: 'A4 . . . A5 . . . A4 . . . A5 . . . A4 . . . A5 . . . Bb4 . . . Bb5 . . .' },
  ], drums: 'k . k . s . k . k . k . s . s s k . k . s . k . k k k . s s s s' });
  song('debug', { bpm: 88, tracks: [
    { wave: 'square', vol: 0.05, seq: 'C5 . . . . . . . G4 . . . . . . . D#5 . . . . . . . . . . . . . . . C5 . . . . . . . F#4 . . . . . . . G4 . . . . . . . . . . . . . . .' },
    { wave: 'triangle', vol: 0.2, seq: 'C2 - - - - - - - - - - - - - - - G#1 - - - - - - - - - - - - - - - C2 - - - - - - - - - - - - - - - F#1 - - - - - - - - - - - - - - -' },
  ], drums: 'h . . . . . . . . . h . . . . . h . . . . . . . . h . . . . . . '.repeat(2) });

  function drum(k, when) {
    if (k === 'k') tone({ wave: 'sine', freq: 150, to: 40, dur: 0.12, vol: 0.5, when, bus: 'music', release: 0.03 });
    else if (k === 's') { noise({ dur: 0.08, vol: 0.18, filter: 'bandpass', freq: 1800, q: 0.7, when, bus: 'music' }); tone({ wave: 'triangle', freq: 220, to: 120, dur: 0.06, vol: 0.12, when, bus: 'music' }); }
    else if (k === 'h') noise({ dur: 0.02, vol: 0.06, filter: 'highpass', freq: 7000, when, bus: 'music' });
  }
  function shiftMinor(m) { const pc = ((m % 12) + 12) % 12; return (pc === 4 || pc === 9 || pc === 11) ? m - 1 : m; }

  function schedule() {
    if (!ac) return;
    const horizon = ac.currentTime + 0.12;
    // heartbeat runs on its own clock
    if (S.beat && S.beat.next < horizon) {
      const w = Math.max(0, S.beat.next - ac.currentTime), v = S.beat.vol;
      tone({ wave: 'sine', freq: 70, to: 38, dur: 0.12, vol: v, when: w, bus: 'amb' });
      tone({ wave: 'sine', freq: 62, to: 34, dur: 0.12, vol: v * 0.7, when: w + 0.2, bus: 'amb' });
      S.beat.next += 60 / S.beat.bpm;
    }
    const sg = S.song && SONGS[S.song];
    if (!sg) return;
    if (S.next < ac.currentTime - 0.2) S.next = ac.currentTime + 0.02;
    while (S.next < horizon) {
      const stepDur = 60 / sg.bpm / 4 / Math.max(0.15, S.rate);
      const st = S.step % sg.len, w = Math.max(0, S.next - ac.currentTime);
      sg.tracks.forEach((tr) => {
        const evs = tr.p.ev;
        for (let i = 0; i < evs.length; i++) {
          const e = evs[i];
          if (e.step !== st % tr.p.len) continue;
          if (S.drop && Math.random() < S.drop) continue;
          let m = e.midi + S.transpose;
          if (S.minor) m = shiftMinor(m);
          const det = S.detune + (S.wobble ? rnd(-S.wobble, S.wobble) : 0);
          tone({ wave: tr.wave, freq: mtof(m), dur: e.len * stepDur * 0.92, vol: tr.vol, when: w, bus: 'music', detune: det, release: tr.rel || 0.04, lp: tr.lp });
        }
      });
      if (sg.dp && !(S.drop > 0.5)) { const k = sg.dp[st % sg.dp.length]; if (k !== '.' && !(S.drop && Math.random() < S.drop)) drum(k, w); }
      S.step++;
      S.next += stepDur;
    }
  }

  function play(name, opt = {}) {
    if (S.song === name && !opt.restart) { Object.assign(S, opt.mod || {}); return; }
    Object.assign(S, { song: name, step: 0, rate: 1, detune: 0, drop: 0, wobble: 0, minor: false, transpose: 0 }, opt.mod || {});
    if (ac) { music.gain.cancelScheduledValues(ac.currentTime); music.gain.setValueAtTime(0.42, ac.currentTime); S.next = ac.currentTime + 0.05; }
  }
  function stop(fade = 0) {
    if (!ac || !fade) { S.song = null; return; }
    const t = ac.currentTime, name = S.song;
    music.gain.setValueAtTime(music.gain.value, t);
    music.gain.linearRampToValueAtTime(0.0001, t + fade);
    setTimeout(() => { if (S.song === name) { S.song = null; music.gain.setValueAtTime(0.42, ac.currentTime); } }, fade * 1000);
  }
  function mod(o) { Object.assign(S, o); }

  function drone(id, notes, vol = 0.05, wave = 'sawtooth', lp = 400) {
    if (!ac || drones[id]) return;
    const g = ac.createGain(), f = ac.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = lp;
    g.gain.setValueAtTime(0.0001, ac.currentTime);
    g.gain.linearRampToValueAtTime(vol, ac.currentTime + 2);
    f.connect(g); g.connect(amb);
    const oscs = notes.map((m, i) => {
      const o = ac.createOscillator(); o.type = wave; o.frequency.value = mtof(m);
      const l = ac.createOscillator(), lg = ac.createGain();
      l.frequency.value = 0.07 + i * 0.05; lg.gain.value = 9;
      l.connect(lg); lg.connect(o.detune); l.start(); o.connect(f); o.start();
      return [o, l];
    });
    drones[id] = { g, oscs };
  }
  function stopDrone(id, fade = 1.5) {
    const d = drones[id];
    if (!d || !ac) return;
    delete drones[id];
    d.g.gain.setValueAtTime(d.g.gain.value, ac.currentTime);
    d.g.gain.linearRampToValueAtTime(0.0001, ac.currentTime + fade);
    d.oscs.forEach(([o, l]) => { o.stop(ac.currentTime + fade + 0.1); l.stop(ac.currentTime + fade + 0.1); });
  }
  function heartbeat(bpm, vol = 0.35) {
    if (!bpm) { S.beat = null; return; }
    if (!S.beat) S.beat = { next: ac ? ac.currentTime + 0.1 : 0, bpm, vol };
    S.beat.bpm = bpm; S.beat.vol = vol;
  }
  function silenceAll() { stop(0); Object.keys(drones).forEach(k => stopDrone(k, 0.3)); S.beat = null; }
  function toggleMute() {
    Settings.muted = !Settings.muted;
    if (ac) master.gain.setValueAtTime(Settings.muted ? 0 : 0.7, ac.currentTime);
    return Settings.muted;
  }

  // ---- sound effects ----
  const fx = {
    jump: () => tone({ wave: 'square', freq: 280, to: 620, dur: 0.1, vol: 0.09 }),
    land: () => noise({ dur: 0.04, vol: 0.08, freq: 600 }),
    collect: () => { tone({ wave: 'square', freq: 988, dur: 0.05, vol: 0.08 }); tone({ wave: 'square', freq: 1319, dur: 0.12, vol: 0.08, when: 0.05 }); },
    rotten: () => { tone({ wave: 'square', freq: 330, dur: 0.06, vol: 0.08 }); tone({ wave: 'square', freq: 233, dur: 0.18, vol: 0.08, when: 0.06, detune: -40 }); },
    glide: () => noise({ dur: 0.18, vol: 0.03, filter: 'bandpass', freq: 900, to: 500, q: 0.6 }),
    step: () => noise({ dur: 0.03, vol: 0.05, freq: 900 }),
    stomp: (v = 1) => { noise({ dur: 0.07, vol: 0.22 * v, freq: 260 }); tone({ wave: 'sine', freq: 90, to: 45, dur: 0.1, vol: 0.3 * v }); },
    hurt: () => tone({ wave: 'square', freq: 420, to: 90, dur: 0.3, vol: 0.12 }),
    blip: () => tone({ wave: 'square', freq: 880, dur: 0.04, vol: 0.06 }),
    select: () => { tone({ wave: 'square', freq: 660, dur: 0.05, vol: 0.07 }); tone({ wave: 'square', freq: 990, dur: 0.09, vol: 0.07, when: 0.05 }); },
    deny: () => tone({ wave: 'square', freq: 140, dur: 0.18, vol: 0.1 }),
    type: () => tone({ wave: 'square', freq: rnd(900, 1300), dur: 0.012, vol: 0.025 }),
    typeCreep: () => tone({ wave: 'sawtooth', freq: rnd(70, 110), dur: 0.05, vol: 0.05 }),
    static: (dur = 0.4, vol = 0.25) => noise({ dur, vol, filter: 'highpass', freq: 400 }),
    beep: () => tone({ wave: 'square', freq: 1000, dur: 0.14, vol: 0.06 }),
    drip: () => tone({ wave: 'sine', freq: rnd(1100, 1500), to: 500, dur: 0.08, vol: 0.06 }),
    flicker: () => { tone({ wave: 'square', freq: 120, dur: 0.05, vol: 0.05, lp: 800 }); noise({ dur: 0.05, vol: 0.05, freq: 3000 }); },
    thud: () => { noise({ dur: 0.3, vol: 0.35, freq: 200, to: 60 }); tone({ wave: 'sine', freq: 80, to: 30, dur: 0.35, vol: 0.45 }); },
    rumble: (dur = 2) => noise({ dur, vol: 0.18, freq: 140, attack: 0.4 }),
    breath: (inhale = true) => noise({ dur: 0.7, vol: 0.05, filter: 'bandpass', freq: inhale ? 700 : 500, to: inhale ? 1200 : 300, q: 0.8, attack: 0.3 }),
    whisper: () => { for (let i = 0; i < 5; i++) noise({ dur: 0.08, vol: 0.06, filter: 'bandpass', freq: rnd(2500, 4500), q: 4, when: i * 0.09 }); },
    sting: () => {
      [0, 1, 6, 11].forEach((s, i) => tone({ wave: 'sawtooth', freq: mtof(45 + s), dur: 1.1, vol: 0.09, vib: 7, vibAmt: 25, attack: 0.01, release: 0.8, detune: i * 7 }));
      noise({ dur: 0.9, vol: 0.2, filter: 'highpass', freq: 800, release: 0.5 });
    },
    scream: () => {
      [0, 13, 27].forEach((d) => tone({ wave: 'sawtooth', freq: 880 + d * 9, to: 260, dur: 1.3, vol: 0.12, vib: 11, vibAmt: 70, attack: 0.01, release: 0.4, detune: d }));
      noise({ dur: 1.4, vol: 0.3, filter: 'bandpass', freq: 2400, to: 900, q: 0.6, release: 0.4 });
    },
    laugh: () => {
      for (let i = 0; i < 6; i++) {
        tone({ wave: 'sawtooth', freq: 300 - i * 22, to: 220 - i * 20, dur: 0.11, vol: 0.12, when: i * 0.16, lp: 1400 });
        noise({ dur: 0.08, vol: 0.06, filter: 'bandpass', freq: 900, q: 2, when: i * 0.16 });
      }
    },
    jingle: () => {
      [72, 76, 79, 84].forEach((m, i) => tone({ wave: 'pulse', freq: mtof(m), dur: 0.14, vol: 0.12, when: i * 0.13 }));
      tone({ wave: 'triangle', freq: mtof(84), to: mtof(83), dur: 0.9, vol: 0.18, when: 0.52, vib: 5, vibAmt: 12, release: 0.6 });
    },
    jingleBad: () => {
      [72, 76, 79, 84].forEach((m, i) => tone({ wave: 'pulse', freq: mtof(m - (i === 3 ? 1 : 0)), dur: 0.14, vol: 0.12, when: i * 0.2, detune: -i * 30 }));
      tone({ wave: 'triangle', freq: mtof(83), to: mtof(70), dur: 1.6, vol: 0.18, when: 0.8, release: 0.6 });
    },
    musicNote: (m, when = 0) => tone({ wave: 'sine', freq: mtof(m), dur: 0.25, vol: 0.12, when, release: 0.9 }),
    heartbeat: () => { tone({ wave: 'sine', freq: 70, to: 38, dur: 0.12, vol: 0.4, bus: 'amb' }); tone({ wave: 'sine', freq: 62, to: 34, dur: 0.12, vol: 0.3, when: 0.2, bus: 'amb' }); },
  };

  return { init, play, stop, mod, drone, stopDrone, heartbeat, silenceAll, toggleMute, fx, tone, noise, get ready() { return !!ac; }, get t() { return ac ? ac.currentTime : 0; } };
})();
