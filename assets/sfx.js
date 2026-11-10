/* 共用音效引擎（即時合成，不用音檔）：小遊戲、洞穴大冒險、找出間諜都用這一份。
   和舊版比：聲音有起音和收尾（不會「啪」一聲）、方波和鋸齒波收掉刺耳的高頻、整體加一點回音，
   答對、答錯各有幾種旋律輪流出現。時間單位一律是秒。 */
window.KRSFX = (() => {
  let C = null, out = null, wet = null, waves = {};
  function build(c) {
    C = c; waves = {};
    out = C.createGain(); out.gain.value = 1.5; out.connect(C.destination);
    // 一點點回音，聲音才不會乾乾的
    const d = C.createDelay(.5), fb = C.createGain(), lp = C.createBiquadFilter();
    wet = C.createGain(); wet.gain.value = .22; d.delayTime.value = .13; fb.gain.value = .26; lp.type = 'lowpass'; lp.frequency.value = 2400;
    wet.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(out);
  }
  function ctx() {
    if (!C) { try { build(new (window.AudioContext || window.webkitAudioContext)()); } catch { return null; } }
    if (C.state === 'suspended' && C.resume) C.resume();
    return C;
  }
  // 柔和版的方波、鋸齒波：保留電玩感，但高頻泛音收掉
  function wave(type) {
    if (type !== 'square' && type !== 'sawtooth') return null;
    if (!waves[type]) {
      const n = 14, re = new Float32Array(n), im = new Float32Array(n);
      for (let k = 1; k < n; k++) im[k] = type === 'square' ? (k % 2 ? Math.exp(-(k - 1) / 5) / k : 0) : (k % 2 ? 1 : -1) * Math.exp(-(k - 1) / 6) / k;
      waves[type] = C.createPeriodicWave(re, im);
    }
    return waves[type];
  }
  /* 一個音：f 頻率、d 長度、type 波形、v 音量、delay 幾秒後開始、f2 滑到的頻率
     o.a 起音秒數、o.hold 維持音量到長度的幾成才開始收、o.dry 不要回音 */
  function tone(f, d = .08, type = 'square', v = .05, delay = 0, f2, o = {}) {
    const c = ctx(); if (!c) return;
    const t = c.currentTime + delay, osc = c.createOscillator(), g = c.createGain(), w = wave(type), a = Math.min(o.a ?? .006, d / 3);
    if (w) osc.setPeriodicWave(w); else osc.type = type;
    osc.frequency.setValueAtTime(f, t); if (f2) osc.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + a);
    if (o.hold) g.gain.setValueAtTime(v, t + d * o.hold);
    g.gain.exponentialRampToValueAtTime(.0001, t + d);
    osc.connect(g); g.connect(out); if (!o.dry) g.connect(wet);
    osc.start(t); osc.stop(t + d + .03);
  }
  /* 雜音：d 長度、v 音量、freq 濾波頻率、delay 幾秒後開始
     o.type 濾波種類（預設 lowpass）、o.f2 濾波頻率滑到哪、o.q、o.curve 收尾快慢、o.swell 由小變大 */
  function noise(d = .4, v = .25, freq = 900, delay = 0, o = {}) {
    const c = ctx(); if (!c) return;
    const t = c.currentTime + delay, n = Math.max(8, Math.floor(c.sampleRate * d)), b = c.createBuffer(1, n, c.sampleRate), ch = b.getChannelData(0), p = o.curve ?? 1.4;
    for (let i = 0; i < n; i++) { const k = i / n; ch[i] = (Math.random() * 2 - 1) * (o.swell ? k * k * Math.min(1, (1 - k) * 12) : Math.min(1, k * n / 96) * (1 - k) ** p); }
    const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    s.buffer = b; fl.type = o.type || 'lowpass'; fl.Q.value = o.q ?? .7; fl.frequency.setValueAtTime(freq, t); if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t + d);
    g.gain.value = v; s.connect(fl); fl.connect(g); g.connect(out); if (!o.dry) g.connect(wet);
    s.start(t);
  }
  // 幾種樂器
  const bell = (f, d = .5, v = .06, delay = 0) => { tone(f, d, 'sine', v, delay); tone(f * 2.76, d * .55, 'sine', v * .35, delay); tone(f * 5.4, d * .25, 'sine', v * .15, delay); };
  const lead = (f, d = .16, v = .05, delay = 0) => { tone(f, d, 'square', v, delay, 0, { hold: .5 }); tone(f * 2, d * .6, 'triangle', v * .35, delay); };
  const soft = (f, d = .3, v = .07, delay = 0, f2) => tone(f, d, 'triangle', v, delay, f2, { a: .02, hold: .4 });
  const thud = (f = 110, d = .2, v = .25, delay = 0) => { tone(f, d, 'sine', v, delay, f * .4, { dry: true }); noise(.05, v * .5, 700, delay, { dry: true }); };
  const N = { G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, D6: 1174.7, E6: 1318.5, G6: 1568, C7: 2093 };
  const rnd = n => Math.floor(Math.random() * n);
  let lastWin = -1, lastLose = -1, big = false;
  const WIN = [
    // 一路往上的琶音，最後停在和弦
    () => { [N.C5, N.E5, N.G5].forEach((f, i) => lead(f, .13, .05, i * .1)); lead(N.C6, .5, .055, .3); soft(N.E5, .5, .04, .3); soft(N.G5, .5, .04, .3); bell(N.C7, .5, .025, .34); },
    // 噠噠噠——噹！
    () => { [0, .09, .18].forEach(t => lead(N.G5, .08, .05, t)); lead(N.C6, .5, .055, .3); soft(N.E5, .5, .04, .3); soft(N.C5, .5, .04, .3); bell(N.G6, .5, .03, .32); },
    // 快速音階往上跑，兩聲收尾
    () => { [N.C5, N.D5, N.E5, N.G5, N.A5].forEach((f, i) => lead(f, .09, .045, i * .065)); lead(N.C6, .14, .055, .34); lead(N.C6, .45, .055, .5); soft(N.E5, .45, .04, .5); bell(N.E6, .5, .03, .5); },
  ];
  const LOSE = [
    // 哇——哇——哇——
    () => { [[N.G4, 370], [370, 349], [349, 330]].forEach(([a, b], i) => tone(a, .24, 'sawtooth', .05, i * .26, b, { a: .03, hold: .5 })); tone(311, .7, 'sawtooth', .055, .78, 233, { a: .03, hold: .3 }); },
    // 三個往下的音，最後咚一聲
    () => { [N.E5, N.C5, N.A4].forEach((f, i) => soft(f, .26, .08, i * .2)); soft(349, .6, .08, .6, 330); thud(90, .3, .16, .62); },
  ];
  const lib = {
    tick: () => tone(1500, .04, 'sine', .08, 0, 950, { dry: true }),
    click: () => { tone(540, .05, 'triangle', .1, 0, 270, { dry: true }); noise(.02, .04, 3200, 0, { dry: true }); },
    snip: () => { noise(.03, .12, 5000, 0, { type: 'highpass', dry: true }); tone(2300, .04, 'triangle', .05, .03, 1500); noise(.04, .12, 5000, .06, { type: 'highpass', dry: true }); },
    pop: () => tone(430, .11, 'sine', .14, 0, 1300),
    clink: () => { bell(2100, .35, .06); bell(2800, .4, .045, .07); },
    whoosh: () => noise(.5, .24, 500, 0, { type: 'bandpass', f2: 3600, q: 1.1, curve: .8 }),
    splash: () => { noise(.45, .3, 2600, 0, { type: 'bandpass', f2: 700, q: .8 }); [.12, .2, .27].forEach((t, i) => tone(900 + i * 260, .06, 'sine', .05, t, 1500 + i * 200)); },
    sputter: () => { for (let i = 0; i < 6; i++) { noise(.06, .2, 320, i * .09, { dry: true }); tone(70 + (i % 2) * 12, .06, 'sawtooth', .05, i * .09, 0, { dry: true }); } },
    beat: () => { thud(64, .16, .3); thud(56, .18, .24, .17); },
    // 小鼓連打，越打越大聲
    drum: (n = 8) => { for (let i = 0; i < n; i++) { const v = .07 + i / n * .16; noise(.07, v, 1900, i * .055, { type: 'bandpass', q: .9, dry: true }); tone(190, .05, 'triangle', v * .4, i * .055, 120, { dry: true }); } },
    boom: () => { tone(120, .8, 'sine', .22, 0, 30, { dry: true }); noise(1.1, .36, 1400, 0, { f2: 110 }); [.3, .45, .62, .8].forEach(t => noise(.08, .08, 500 + rnd(500), t)); },
    // 揭曉：一串往上的鈴聲加上由小變大的「沙——」
    reveal: () => { [N.C5, N.E5, N.G5, N.C6, N.E6, N.G6].forEach((f, i) => bell(f, .3, .04, i * .055)); noise(.5, .1, 5000, 0, { type: 'highpass', swell: true }); },
    // 反轉演出：先「咦？糟了」
    uhoh: () => { tone(392, .16, 'square', .06, 0, 370, { hold: .5 }); tone(277, .38, 'square', .06, .18, 247, { hold: .4 }); thud(80, .25, .14, .18); },
    win: () => {
      if (big) { big = false; return lib.winBig(); }
      let k = rnd(WIN.length); if (k === lastWin) k = (k + 1) % WIN.length; lastWin = k; WIN[k]();
    },
    // 逆轉成功：比平常更熱鬧
    winBig: () => {
      tone(300, .22, 'triangle', .07, 0, 1200); [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => lead(f, .1, .05, .2 + i * .075));
      lead(N.E6, .16, .055, .52); lead(N.C6, .16, .05, .52); lead(N.G6, .7, .055, .7); soft(N.C6, .7, .045, .7); soft(N.E5, .7, .04, .7);
      noise(.7, .1, 7000, .7, { type: 'highpass', curve: 2 }); for (let i = 0; i < 6; i++) bell(N.C6 * [1, 1.25, 1.5, 2][rnd(4)], .3, .025, .8 + i * .09);
    },
    lose: () => { let k = rnd(LOSE.length); if (k === lastLose) k = (k + 1) % LOSE.length; lastLose = k; LOSE[k](); },
  };
  return { ctx, tone, noise, bell, lead, soft, thud, lib, N, setBig: v => { big = !!v; }, use: build };
})();
