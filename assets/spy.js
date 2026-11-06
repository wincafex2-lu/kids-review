'use strict';
/* 找出間諜：改錯字遊戲。題目全部來自 data/ 底下國語單元檔裡的改錯字題（type: "fix"），
   程式不寫死任何題目；新增單元或題目後自動出現在範圍選單裡。
   錯題和主網站共用錯題本（localStorage kr-wrong-v1，題目代號「單元檔#題號」）。 */
const $ = s => document.querySelector(s);
const stage = $('#stage');
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const T = ms => reduce ? 1 : ms;
const wait = ms => new Promise(r => setTimeout(r, T(ms)));

/* ---------- 點陣圖 ---------- */
function pix(map, colors) {
  const c = document.createElement('canvas');
  c.width = map[0].length; c.height = map.length;
  const g = c.getContext('2d');
  map.forEach((row, y) => [...row].forEach((ch, x) => { if (colors[ch]) { g.fillStyle = colors[ch]; g.fillRect(x, y, 1, 1); } }));
  return c.toDataURL();
}
function rects(w, h, list) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  for (const [col, x, y, rw, rh] of list) { g.fillStyle = col; g.fillRect(x, y, rw, rh); }
  return c.toDataURL();
}
/* 小人：用「Agent 辦公室」的新點陣人物（OFFICE_PEOPLE：身體、髮型、衣服、配件分層組合，
   有走路、舉手、思考、慶祝等動作）。舉牌用「慶祝」的雙手高舉姿勢，候補用「舉手」。 */
const PP = window.OFFICE_PEOPLE, PS = window.PEOPLE_SPRITES;
const PAL = { K: '#0d0a16', Q: '#b7bec9', Y: '#ffcc4d', M: '#a59fbf', E: '#6e4a2a', f: '#2b2440', B: '#8f4b2a', H: '#f3f5f7', W: '#ffffff' };
function layers(person, action, i, prop) {
  const rows = Array.from({ length: 20 }, () => Array(16).fill('.'));
  const stack = [['body', person.body], ['bottom', person.bottom], [person.body === 'female' ? 'top-female' : 'top', person.top], ['hair', person.hair], ['accessory', person.accessory]];
  if (prop) stack.push(['prop', 'action']);
  for (const [layer, kind] of stack) {
    const px = PS.parts[layer][kind][action][i];
    for (let y = 0; y < 20; y++) for (let x = 0; x < 16; x++) if (px[y][x] !== '.') rows[y][x] = px[y][x];
  }
  return rows.map(r => r.join(''));
}
// 站姿：走路圖第 0 格是一前一後的步伐，把左腳（第 4–6 欄）鏡射到右腳，變成兩腳並排站好
function standLegs(rows) {
  return rows.map((r, y) => y < 17 ? r : r.slice(0, 9) + [...r.slice(4, 7)].reverse().join('') + r.slice(12));
}
const palOf = (person, extra) => Object.assign({}, PP.frame(person, 'walk-down', 0).palette, extra);
const cache = new Map();
function look(key, person, action, i = 0, opt = {}) {
  const k = [key, action, i, opt.prop ? 'p' : '', opt.tag || ''].join('|');
  if (!cache.has(k)) {
    let rows = layers(person, action, i, opt.prop);
    if (action === 'walk-down' && i === 0) rows = standLegs(rows);
    if (opt.edit) rows = opt.edit(rows.slice(), action);
    cache.set(k, pix(rows, palOf(person, opt.pal)));
  }
  return cache.get(k);
}
function rng(seed) { let s = (seed * 2654435761) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const crewOf = seed => PP.create('隊員' + seed);
const guySrc = (seed, action = 'walk-down', i = 0) => look('g' + seed, crewOf(seed), action, i);
// 舉牌：全身用站立圖（兩腳並排），擦掉垂下的左手，接上原本舉手圖的那隻手臂（prop 層），不用坐姿那組的上半身
function standArm(person, step, both) {
  // step 為 0／1：原地踏步的兩格（走路圖），沒給就是兩腳並排站好
  const base = step === undefined ? standLegs(layers(person, 'walk-down', 0)) : layers(person, 'walk-down', step);
  const rows = base.map(r => [...r]);
  if (rows[16][1] === '.') rows[16][2] = '.';
  for (let y = 12; y <= 15; y++) { rows[y][2] = '.'; rows[y][3] = 'K'; rows[y][4] = rows[y][5] === 'K' ? 'C' : rows[y][5]; }
  const arm = PS.parts.prop.action.raise[0];
  for (let y = 0; y < 20; y++) for (let x = 0; x < 16; x++) if (arm[y][x] !== '.') rows[y][x] = arm[y][x];
  rows[11][0] = '.'; rows[11][1] = 'K'; rows[11][2] = 'C'; rows[11][3] = 'K';
  rows[12][1] = 'K'; rows[12][2] = 'K'; rows[12][3] = 'K';
  if (both) {
    // 舉雙手：右邊也一樣，擦掉垂下的右手，接上鏡射的舉手手臂
    if (rows[16][14] === '.') rows[16][13] = '.';
    for (let y = 12; y <= 15; y++) { rows[y][13] = '.'; rows[y][12] = 'K'; rows[y][11] = rows[y][10] === 'K' ? 'C' : rows[y][10]; }
    for (let y = 0; y < 20; y++) for (let x = 0; x < 16; x++) if (arm[y][x] !== '.') rows[y][15 - x] = arm[y][x];
    rows[11][15] = '.'; rows[11][14] = 'K'; rows[11][13] = 'C'; rows[11][12] = 'K';
    rows[12][14] = 'K'; rows[12][13] = 'K'; rows[12][12] = 'K';
  }
  return rows.map(r => r.join(''));
}
// 每個人隨機舉單手或舉雙手（由座號決定，同一人不會中途換）
const bothOf = seed => rng(seed * 7 + 3)() < 0.5;
const handCache = new Map();
const handSrc = (seed, step) => { const k = seed + '|' + step; if (!handCache.has(k)) { const p = crewOf(seed); handCache.set(k, pix(standArm(p, step, bothOf(seed)), palOf(p))); } return handCache.get(k); };
// 隊伍原地踏步：人換走路的兩格，牌子不動；相鄰的人左右腳錯開
let stepTick = 0;
setInterval(() => {
  stepTick ^= 1;
  document.querySelectorAll('#line .guy.idle:not(.laugh) img').forEach((im, k) => { const g = im.closest('.guy'); if (!g.classList.contains('gone')) im.src = handSrc(Number(g.dataset.seed), (stepTick + k) % 2); });
}, 260);
const setRow = (rows, y, x, s) => { rows[y] = rows[y].slice(0, x) + s + rows[y].slice(x + s.length); };
// 間諜：黑帽、墨鏡、風衣
const SPY_P = { ...PP.create('間諜'), hair: 'crop', accessory: 'none', top: 'blazer', bottom: 'trousers' };
const SPY_PAL = { C: '#b0844a', c: '#6e4f28', Q: '#d9b26a', P: '#2b2440', p: '#1d1b2e', f: '#2b2440', R: '#c94a3a', g: '#1d1b2e' };
function spyEdit(rows) {
  ['....KKKKKKKK....', '...KffffffffK...', '...KRRRRRRRRK...', '.KKKffffffffKKK.'].forEach((h, y) => { rows[y] = h; });
  rows[6] = rows[6].replace(/[IL]/g, 'g');
  return rows;
}
// 間諜表情：被抓走＝眼睛瞪大、張嘴尖叫、冒冷汗；沒被抓到＝瞇眼、露牙得意笑
const SPY_FACE = {
  scared: rows => {
    setRow(rows, 5, 12, 'L'); setRow(rows, 6, 12, 'L'); setRow(rows, 7, 12, 'L');
    setRow(rows, 6, 4, 'IK'); setRow(rows, 6, 10, 'KI'); setRow(rows, 7, 4, 'IK'); setRow(rows, 7, 10, 'KI');
    setRow(rows, 8, 6, 'KKKK'); setRow(rows, 9, 6, 'KRRK'); setRow(rows, 10, 6, 'KRRK'); setRow(rows, 11, 6, 'KRRK'); setRow(rows, 12, 6, 'KKKK');
    return rows;
  },
  smug: rows => {
    setRow(rows, 6, 4, 'KK'); setRow(rows, 6, 10, 'KK');
    setRow(rows, 8, 5, 'KIIIIK'); setRow(rows, 9, 6, 'KKKK');
    return rows;
  },
};
const spyLook = (action, i = 0, face) => look('spy', SPY_P, action, i, { edit: face ? rows => SPY_FACE[face](spyEdit(rows)) : spyEdit, pal: SPY_PAL, tag: face || '' });
// 警察：藍色制服、藍帽子、帽徽
const COP_P = { ...PP.create('警察'), body: 'male', hair: 'crop', accessory: 'cap', top: 'blazer', bottom: 'trousers' };
const COP_PAL = { C: '#2f56a8', c: '#1f3a78', Q: '#cfe0ff', P: '#1f3a78', p: '#16285a' };
const copEdit = (rows, action) => { if (action !== 'walk-up') setRow(rows, 2, 7, 'YY'); return rows; };
const copLook = (action, i = 0) => look('cop', COP_P, action, i, { edit: copEdit, pal: COP_PAL });
// 飛踢高手：辦公室的老闆（戴皇冠那位）
const BOSS = PP.boss();
const kickEdit = rows => { rows[17] = '...KPPPPPPPPPPK.'; rows[18] = '...KPPK...KKKKKK'; rows[19] = '...KKK..........'; return rows; };
const SPR = {
  spy: spyLook('walk-down'),
  spyWalk: [0, 1].map(i => spyLook('walk-down', i)),
  spyScared: spyLook('walk-down', 0, 'scared'),
  spyScaredWalk: [0, 1].map(i => spyLook('walk-down', i, 'scared')),
  spySmug: spyLook('walk-down', 0, 'smug'),
  cop: copLook('walk-down', 0),
  copWalk: { L: [0, 1].map(i => copLook('walk-left', i)), R: [0, 1].map(i => copLook('walk-right', i)), D: [0, 1].map(i => copLook('walk-down', i)) },
  kickWalk: { R: [0, 1].map(i => look('boss', BOSS, 'walk-right', i)), L: [0, 1].map(i => look('boss', BOSS, 'walk-left', i)) },
  kick: {
    R: look('boss', BOSS, 'walk-right', 0, { edit: kickEdit, tag: 'kick' }),
    L: look('boss', BOSS, 'walk-left', 0, { edit: rows => kickEdit(rows).map(r => [...r].reverse().join('')).map((r, y) => y >= 17 ? r : layers(BOSS, 'walk-left', 0)[y]), tag: 'kick' }),
  },
  kickYay: [0, 1].map(i => look('boss', BOSS, 'walk-down', i)),
  kickThink: look('boss', BOSS, 'walk-down', 0),
  happy: look('boss', BOSS, 'walk-down', 0),
  sad: look('boss', BOSS, 'walk-down', 0, { tag: 'sad', edit: rows => { [...rows[6]].forEach((ch, x) => { if (ch === 'I') setRow(rows, 7, x, 'L'); if (ch === 'I') setRow(rows, 8, x, 'L'); }); return rows; } }),
};
const IMG = {
  sad: SPR.sad, happy: SPR.happy,
  missile: pix(['.....RRR......', 'OOKKQQQQQQQRR.', 'OYKQQQQQQQQQRR', 'OOKKQQQQQQQRR.', '.....RRR......'], { R: '#d6334a', Q: '#dfe3ea', K: '#5a6072', O: '#ff7a1a', Y: '#ffd166' }),
  pow: pix(['......K......', '.....KYK.....', 'K...KYWYK...K', 'KYK.KYWYK.KYK', '.KYKYWWWYKYK.', '..KYWWWWWYK..', 'KKYWWWWWWWYKK', '..KYWWWWWYK..', '.KYKYWWWYKYK.', 'KYK.KYWYK.KYK', 'K...KYWYK...K', '.....KYK.....', '......K......'], { K: '#0d0a16', Y: '#ffd166', W: '#fff7d6' }),
  claw: pix(['....KKKKKK....', '....KQQQQK....', '...KKQQQQKK...', '..KQQKKKKQQK..', '.KQQK....KQQK.', 'KQQK......KQQK', 'KQK........KQK', 'KQK........KQK', '.KQK......KQK.', '..KK......KK..'], PAL),
  clawShut: pix(['....KKKKKK....', '....KQQQQK....', '...KKQQQQKK...', '..KQQKKKKQQK..', '..KQK....KQK..', '..KQK....KQK..', '...KQK..KQK...', '...KQK..KQK...', '....KQKKQK....', '.....KK.KK....'], PAL),
  spring: pix(['KKKKKKKKKKKK', 'KYYYYYYYYYYK', 'KKKKKKKKKKKK', '...KQQQQK...', '....KQQK....', '...KQQQQK...', '....KQQK....', '...KQQQQK...', '..KKKKKKKK..', '..KMMMMMMK..'], PAL),
  magnet: pix(['..KKKKKKKK..', '.KRRRRRRRRK.', 'KRRKKKKKKRRK', 'KRRK....KRRK', 'KRRK....KRRK', 'KRRK....KRRK', 'KQQK....KQQK', 'KQQK....KQQK', 'KKKK....KKKK'], { K: '#0d0a16', R: '#e0413a', Q: '#dfe3ea' }),
  vacuum: pix(['..........KKKKKKK...', '.........KYYYYYYYK..', 'KKKK....KYYYYYYYYYK.', 'KQQKKKKKKYYKKKKYYYYK', 'KQQQQQQQQYYKWWKYYYYK', 'KQQKKKKKKYYKKKKYYYYK', 'KKKK....KYYYYYYYYYK.', '.........KYYYYYYYYK.', '.........KKKKKKKKKK.', '..........KK....KK..', '..........KK....KK..', '...........K....K...'], { K: '#0d0a16', Y: '#3fa7d6', Q: '#dfe3ea', W: '#ffcc4d' }),
  net: pix(['..KKKKKK........', '.KHMHMHMK.......', 'KMHMHMHMHK......', 'KHMHMHMHMK......', 'KMHMHMHMHK......', 'KHMHMHMHMK......', '.KHMHMHMK.......', '..KKKKKKKE......', '.........EE.....', '..........EE....', '...........EE...', '............EE..', '.............EE.', '..............EE', '...............E', '................'], { K: '#0d0a16', H: '#ffffff', M: '#c9c3e6', E: '#8a5a2b' }),
  cage: pix(['.......KK.......', '......K..K......', 'KKKKKKKKKKKKKKKK', 'KQQQQQQQQQQQQQQK', 'K..Q..Q..Q..Q..K', 'K..Q..Q..Q..Q..K', 'K..Q..Q..Q..Q..K', 'K..Q..Q..Q..Q..K', 'K..Q..Q..Q..Q..K', 'K..Q..Q..Q..Q..K', 'K..Q..Q..Q..Q..K', 'K..Q..Q..Q..Q..K', 'K..Q..Q..Q..Q..K', 'K..Q..Q..Q..Q..K', 'K..Q..Q..Q..Q..K', 'K..Q..Q..Q..Q..K', 'K..Q..Q..Q..Q..K', 'K..Q..Q..Q..Q..K', 'KQQQQQQQQQQQQQQK', 'KKKKKKKKKKKKKKKK'], { K: '#0d0a16', Q: '#ffcc4d' }),
  pitIcon: pix(['..KKKKKKKK..', '.KEEEEEEEEK.', 'KEffffffffEK', '.KffffffffK.', '..KKKKKKKK..'], PAL),
  eagle: [
    pix(['KK..............KK..', 'KEK............KEK..', '.KEK..........KEK...', '..KEEK......KEEK....', '...KEEEKKKKEEEK.HH..', '....KEEBBBBBEEKHHHK.', '.....KBBBBBBBBKHKHYY', '....KBBBBBBBBBBKHHK.', '...KBBKBBBBBBBK.KK..', '..KBK..KYK.KYK......', '..KK...KK..KK.......', '....................'], PAL),
    pix(['....................', '....................', '....................', '................HH..', '...KKKKKKKKKKK.HHHK.', '..KBBBBBBBBBBBKHKHYY', '.KEEBBBBBBBBBBBKHHK.', 'KEEEEKBBBBBBBKEK.K..', 'KEEEK.KYK.KYKEEEK...', 'KEEK...KK..KKKEEEK..', '.KK...........KEEK..', '...............KK...'], PAL),
  ],
};
// 警車（車頭朝左），兩格警燈閃爍
IMG.car = [['#ff3b3b', '#1f3a78'], ['#7a1f1f', '#4fa8ff']].map(([r, b]) => rects(34, 18, [
  ['#0d0a16', 13, 0, 8, 3], [r, 14, 1, 3, 1], [b, 17, 1, 3, 1],
  ['#0d0a16', 8, 3, 18, 6], ['#f3f5f7', 9, 4, 16, 5], ['#8fd0ef', 10, 4, 6, 4], ['#8fd0ef', 18, 4, 6, 4],
  ['#0d0a16', 1, 8, 32, 7], ['#f3f5f7', 2, 9, 30, 5], ['#2f56a8', 2, 11, 30, 2], ['#0d0a16', 17, 9, 1, 5], ['#ffcc4d', 20, 9, 2, 1],
  ['#ffd166', 2, 9, 2, 2], ['#e0574a', 30, 9, 2, 2], ['#b7bec9', 0, 12, 3, 2], ['#b7bec9', 31, 12, 3, 2],
  ['#0d0a16', 6, 12, 4, 6], ['#0d0a16', 5, 13, 6, 4], ['#b7bec9', 7, 14, 2, 2],
  ['#0d0a16', 24, 12, 4, 6], ['#0d0a16', 23, 13, 6, 4], ['#b7bec9', 25, 14, 2, 2],
]));
// 飛碟，燈號交替
IMG.ufo = [0, 1].map(k => rects(32, 14, [
  ['#0d0a16', 11, 0, 10, 1], ['#0d0a16', 9, 1, 14, 6], ['#a8d8ff', 10, 1, 12, 5], ['#fff', 12, 2, 2, 2],
  ['#6fdc8c', 15, 3, 4, 3], ['#0d0a16', 16, 4, 1, 1], ['#0d0a16', 18, 4, 1, 1],
  ['#0d0a16', 2, 6, 28, 5], ['#0d0a16', 0, 7, 32, 3], ['#b7bec9', 3, 7, 26, 3], ['#dfe3ea', 1, 8, 30, 1],
  ...[4, 9, 14, 19, 24, 28].map((x, i) => [(i + k) % 2 ? '#ffd166' : '#ff6b6b', x, 8, 2, 1]),
  ['#0d0a16', 8, 11, 16, 2], ['#7c8396', 9, 11, 14, 1],
]));
// 爆炸
IMG.boom = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d');
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const d = Math.hypot(x - 7.5, y - 7.5) + Math.random() * 1.6;
    if (d > 8) continue;
    g.fillStyle = d < 3 ? '#fff4c2' : d < 5 ? '#ffd166' : d < 6.6 ? '#ff7a1a' : '#d6334a';
    g.fillRect(x, y, 1, 1);
  }
  return c.toDataURL();
})();
// 太陽與遠方城市
$('#sun').src = (() => { const m = []; for (let y = 0; y < 12; y++) { let r = ''; for (let x = 0; x < 12; x++) { const d = Math.hypot(x - 5.5, y - 5.5); r += d < 4 ? 'Y' : d < 5.6 ? 'O' : '.'; } m.push(r); } return pix(m, { Y: '#ffe27a', O: '#ffc24a' }); })();
(() => {
  const c = document.createElement('canvas'); c.width = 160; c.height = 36; const g = c.getContext('2d');
  const r = rng(5);
  for (let x = 0; x < 160;) {
    const w = 8 + Math.floor(r() * 12), h = 10 + Math.floor(r() * 24);
    g.fillStyle = '#9fc3e3'; g.fillRect(x, 36 - h, w, h);
    g.fillStyle = '#c4def2';
    for (let yy = 36 - h + 2; yy < 34; yy += 3) for (let xx = x + 2; xx < x + w - 1; xx += 3) if (r() < .55) g.fillRect(xx, yy, 1, 1);
    x += w + (r() < .3 ? 2 : 0);
  }
  const city = $('#city');
  city.style.backgroundImage = `url(${c.toDataURL()})`;
  city.style.backgroundSize = '320px 72px';
})();
$('#logo').src = SPR.spy;

/* ---------- 音效 ---------- */
let actx = null, muted = false;
function ac() { if (muted) return null; try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); return actx; } catch { return null; } }
function tone(f, d, type = 'square', v = .06, delay = 0, f2) {
  const a = ac(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + delay;
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + .02);
}
function noise(d, v = .25, freq = 900) {
  const a = ac(); if (!a) return;
  const b = a.createBuffer(1, a.sampleRate * d, a.sampleRate), ch = b.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length) ** 2;
  const s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = freq; s.buffer = b; g.gain.value = v;
  s.connect(f).connect(g).connect(a.destination); s.start();
}
const SFX = {
  lock: () => { tone(1400, .06, 'square', .04); tone(1400, .06, 'square', .04, .12); tone(1800, .1, 'square', .04, .24); },
  tick: () => tone(1100, .03, 'square', .03),
  go: () => [660, 990].forEach((f, i) => tone(f, .1, 'square', .05, i * .08)),
  whistle: () => tone(1600, .65, 'sine', .06, 0, 250),
  boom: () => { noise(.6); tone(90, .4, 'square', .08, 0, 40); },
  run: () => { for (let i = 0; i < 7; i++) tone(180 + (i % 2) * 40, .04, 'square', .04, i * .1); },
  kick: () => { noise(.15, .35, 2000); tone(220, .14, 'square', .08, 0, 70); },
  siren: n => { for (let i = 0; i < n; i++) tone(i % 2 ? 880 : 660, .3, 'square', .03, i * .3); },
  ufo: () => { for (let i = 0; i < 10; i++) tone(420 + (i % 2) * 260, .09, 'sine', .05, i * .09); },
  beam: () => tone(200, 1.1, 'sawtooth', .025, 0, 1200),
  motor: () => tone(110, .9, 'sawtooth', .025, 0, 140),
  clack: () => { tone(1500, .04, 'square', .05); noise(.06, .2, 3000); },
  drop: () => tone(800, .7, 'triangle', .07, 0, 80),
  boing: () => { tone(140, .35, 'square', .06, 0, 900); tone(300, .2, 'triangle', .05, .1, 1200); },
  screech: () => { tone(1900, .3, 'sawtooth', .035, 0, 900); tone(2100, .25, 'sawtooth', .03, .3, 1100); },
  flap: () => { for (let i = 0; i < 5; i++) noise(.06, .12, 600); },
  sad: () => [392, 370, 349, 294].forEach((f, i) => tone(f, .28, 'triangle', .08, i * .25)),
  laugh: () => [700, 600, 700, 600, 700].forEach((f, i) => tone(f, .07, 'square', .04, i * .09)),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .16, 'triangle', .08, i * .1)),
  hum: () => { tone(70, 1, 'square', .05, 0, 90); tone(140, 1, 'sine', .03); },
  zap: () => { tone(1200, .12, 'square', .05, 0, 300); tone(900, .1, 'square', .04, .1, 200); },
  suck: () => { noise(1.2, .2, 500); tone(300, 1.1, 'sawtooth', .03, 0, 1400); },
  sputter: () => { for (let i = 0; i < 4; i++) noise(.08, .25, 300); },
  swoosh: () => noise(.25, .25, 1800),
  slam: () => { noise(.2, .4, 400); tone(120, .2, 'square', .08, 0, 60); },
  pop: () => { tone(1800, .05, 'square', .06, 0, 600); noise(.05, .2, 4000); },
  blow: () => { for (let i = 0; i < 6; i++) tone(900 + i * 120, .06, 'sine', .04, i * .08, 1400 + i * 120); },
  warp: () => { tone(200, .9, 'sine', .07, 0, 1500); tone(1500, .6, 'triangle', .04, .3, 150); },
  jump: () => tone(300, .2, 'square', .05, 0, 900),
};
$('#mute').addEventListener('click', e => { muted = !muted; e.currentTarget.textContent = muted ? '🔇' : '🔊'; e.currentTarget.setAttribute('aria-pressed', String(muted)); });

/* ---------- 特效工具 ---------- */
const PX = () => parseFloat(getComputedStyle(stage).getPropertyValue('--px')) || 4;
function box(el) {
  const s = stage.getBoundingClientRect(), r = el.getBoundingClientRect();
  const x = r.left - s.left - stage.clientLeft, y = r.top - s.top - stage.clientTop;
  return { x, y, w: r.width, h: r.height, cx: x + r.width / 2, cy: y + r.height / 2, b: y + r.height };
}
function spr(src, cols, rows, z = 10) {
  const p = PX(), im = new Image();
  im.src = src; im.alt = ''; im.className = 'fx';
  Object.assign(im.style, { width: cols * p + 'px', height: rows * p + 'px', zIndex: z, transform: 'translate(-999px,-999px)' });
  stage.append(im); return im;
}
const at = (x, y, extra = '') => ({ transform: `translate(${x}px,${y}px) ${extra}` });
const mv = (el, kf, ms, easing = 'linear') => el.animate(kf, { duration: T(ms), easing, fill: 'forwards' }).finished;
function loop(img, frames, ms) { let k = 0; const id = setInterval(() => { k = (k + 1) % frames.length; img.src = frames[k]; }, ms); return () => clearInterval(id); }
function say(x, y, text, ms = 1300) {
  const b = document.createElement('div');
  b.className = 'bubble'; b.textContent = text;
  const W = stage.clientWidth;
  b.style.left = Math.max(60, Math.min(W - 60, x)) + 'px'; b.style.top = Math.max(30, y) + 'px';
  stage.append(b); setTimeout(() => b.remove(), T(ms) + 200); return b;
}
// 把隊伍裡的人「拿起來」變成可以亂飛的分身
function lift(el) {
  const b = box(el), g = el.cloneNode(true);
  g.querySelector('.ret')?.remove();
  g.classList.remove('idle', 'locked', 'dizzy');
  g.classList.add('fxguy'); g.removeAttribute('data-i'); g.setAttribute('aria-hidden', 'true');
  Object.assign(g.style, { left: b.x + 'px', top: b.y + 'px' });
  stage.append(g); el.classList.add('gone');
  return g;
}
const toSpy = g => { g.querySelector('img').src = SPR.spyScared; g.querySelector('.sign').classList.add('bad'); };
function putBack(el, g) { g?.remove(); el.classList.remove('gone'); el.classList.add('dizzy'); setTimeout(() => el.classList.remove('dizzy'), T(1300)); }
async function flyOff(g, dir = 1) {
  await mv(g, [at(0, 0, 'rotate(0)'), { ...at(dir * 160, -260, `rotate(${dir * 540}deg)`), offset: .55 }, { ...at(dir * 440, -200, `rotate(${dir * 1080}deg) scale(.3)`), opacity: 0 }], 1100, 'cubic-bezier(.2,.7,.4,1)');
  g.remove();
}
function boomAt(x, y, size = 128) {
  const b = spr(IMG.boom, 16, 16, 15); b.style.width = b.style.height = size + 'px';
  const o = `translate(${x - size / 2}px,${y - size / 2}px)`;
  b.animate([{ transform: o + ' scale(.2)' }, { transform: o + ' scale(1.15)', offset: .45 }, { transform: o + ' scale(1.3)', opacity: 0 }], { duration: T(600), easing: 'steps(6)' }).finished.then(() => b.remove());
}
function powAt(x, y) {
  const p = PX(), s = spr(IMG.pow, 13, 13, 15), w = 13 * p;
  mv(s, [at(x - w / 2, y - w / 2, 'scale(.3)'), at(x - w / 2, y - w / 2, 'scale(1.3)'), { ...at(x - w / 2, y - w / 2, 'scale(1)'), opacity: 0 }], 450, 'steps(4)').then(() => s.remove());
}
function sparkAt(x, y) {
  const d = document.createElement('i'); d.className = 'spark'; stage.append(d);
  d.animate([{ transform: `translate(${x - 4}px,${y - 4}px) scale(1)`, opacity: 1 }, { transform: `translate(${x - 4}px,${y - 12}px) scale(.2)`, opacity: 0 }], { duration: T(350), easing: 'steps(3)' }).finished.then(() => d.remove());
}
function shake() { if (!reduce) stage.animate([at(0, 0), at(-6, 3), at(5, -4), at(-3, 2), at(0, 0)], { duration: 300, easing: 'steps(4)' }); }
const imgBox = el => box(el.querySelector('img'));
// 抓對又補對：整排一起跳起來慶祝
function cheer() {
  document.querySelectorAll('#line .guy').forEach((g, k) => {
    const im = g.querySelector('img'), seed = Number(g.dataset.seed);
    setTimeout(() => { g.classList.remove('idle'); g.classList.add('cheer'); }, T(k * 40));
    setTimeout(() => { g.classList.remove('cheer'); g.classList.add('idle'); im.src = handSrc(seed); }, T(1600 + k * 40));
  });
}

/* ---------- 抓間諜的 14 種方法：hit＝真的是間諜，false＝抓錯人 ---------- */
const METHODS = [
  { key: 'rocket', name: '飛彈空襲', icon: IMG.missile, async run(el, hit) {
    const p = PX(), t = imgBox(el), W = stage.clientWidth;
    const m = spr(IMG.missile, 14, 5, 12), w = 14 * p, h = 5 * p;
    const sx = W + 40, sy = -40, ang = Math.atan2(t.cy - sy, t.cx - sx) * 180 / Math.PI + 180;
    SFX.whistle();
    const trail = setInterval(() => {
      const r = box(m), d = document.createElement('i'); d.className = 'puff';
      Object.assign(d.style, { left: r.cx - 5 + 'px', top: r.cy - 5 + 'px' }); stage.append(d);
      d.animate([{ transform: 'scale(.6)', opacity: 1 }, { transform: 'scale(2)', opacity: 0 }], { duration: 600, easing: 'steps(4)' }).finished.then(() => d.remove());
    }, 45);
    await mv(m, [at(sx - w / 2, sy - h / 2, `rotate(${ang}deg)`), at(t.cx - w / 2, t.cy - h / 2, `rotate(${ang}deg)`)], 750, 'cubic-bezier(.5,0,1,1)');
    clearInterval(trail); m.remove(); el.classList.remove('locked');
    SFX.boom(); boomAt(t.cx, t.cy, 30 * p); shake();
    if (hit) { const g = lift(el); toSpy(g); say(t.cx, t.y - 17 * p, '哇啊啊——！'); await flyOff(g, -1); }
    else { el.classList.add('soot', 'dizzy'); say(t.cx, t.y - 17 * p, '咳咳…我是好人啦！'); await wait(1400); el.classList.remove('soot', 'dizzy'); }
  } },
  { key: 'kick', name: '飛踢高手', icon: SPR.kick, async run(el, hit) {
    const p = PX(), t = imgBox(el), W = stage.clientWidth;
    el.classList.remove('locked');
    // 目標太靠左就從右邊跑進來（整個人左右翻轉）
    const R = t.x < 14 * p, f = '', go = SPR.kickWalk[R ? 'L' : 'R'], back = SPR.kickWalk[R ? 'R' : 'L'];
    const k = spr(go[0], 16, 20, 12), x0 = R ? W + 4 * p : -20 * p, x1 = R ? t.x + 11 * p : t.x - 11 * p;
    let stop = loop(k, go, 120); SFX.run();
    await mv(k, [at(x0, t.y, f), at(x1, t.y, f)], 750);
    stop(); k.src = SPR.kick[R ? 'L' : 'R']; SFX.kick(); powAt(R ? t.x + 13 * p : t.x + 3 * p, t.y + 15 * p); shake();
    if (hit) {
      const g = lift(el); toSpy(g); say(x1 + 8 * p, t.y - 2 * p, '看我的飛踢！'); flyOff(g, R ? -1 : 1);
      await wait(500); const st = loop(k, SPR.kickYay, 180); k.src = SPR.kickYay[0];
      await mv(k, [at(x1, t.y, f), at(x1, t.y - 10 * p, f), at(x1, t.y, f)], 400, 'ease-out'); await wait(400); st();
    } else {
      el.classList.add('dizzy'); say(t.cx, t.y - 17 * p, '哎唷！踢錯人了啦！');
      await wait(400); k.src = SPR.kickThink; say(x1 + 8 * p, t.y + 2 * p, '咦？'); await wait(900); el.classList.remove('dizzy');
    }
    stop = loop(k, back, 120);
    await mv(k, [at(x1, t.y, f), at(x0, t.y, f)], 600); stop(); k.remove();
  } },
  { key: 'police', name: '警察出動', icon: IMG.car[0], async run(el, hit) {
    const p = PX(), t = imgBox(el), r = box($('#road')), W = stage.clientWidth;
    el.classList.remove('locked');
    const cw = 34 * p, ch = 18 * p, cy = r.y + r.h - ch - p, cx = Math.max(4, Math.min(W - cw - 4, t.cx - cw / 2));
    const car = spr(IMG.car[0], 34, 18, 14), stopS = loop(car, IMG.car, 180);
    SFX.siren(9);
    await mv(car, [at(W + 20, cy), at(cx, cy)], 900, 'cubic-bezier(.2,.8,.3,1)');
    const ox = cx + cw / 2 - 8 * p, oy = cy - 12 * p, tx = Math.min(W - 16 * p, t.x + 10 * p), ty = t.y;
    const cop = spr(SPR.copWalk.L[0], 16, 20, 13), dirTo = tx < ox ? 'L' : 'R', dirBack = dirTo === 'L' ? 'R' : 'L';
    let stopW = loop(cop, SPR.copWalk[dirTo], 150);
    await mv(cop, [{ ...at(ox, oy), opacity: 0 }, { ...at(ox, oy), opacity: 1, offset: .2 }, at(tx, ty)], 800);
    stopW(); cop.src = SPR.cop;
    say(tx + 8 * p, ty - 2 * p, '警察！不准動！', 1100); await wait(1000);
    if (hit) {
      const g = lift(el); toSpy(g); g.style.zIndex = 12;
      say(t.cx, t.y - 17 * p, '被抓到了…', 900); await wait(700);
      const gi = g.querySelector('img'), stopG = loop(gi, SPR.spyScaredWalk, 150); stopW = loop(cop, SPR.copWalk.D, 150);
      const dx = ox - t.x, dy = oy - t.y;
      await Promise.all([
        mv(g, [at(0, 0), { ...at(dx, dy), opacity: 1, offset: .85 }, { ...at(dx, dy + 8 * p, 'scale(.8)'), opacity: 0 }], 1000),
        mv(cop, [at(tx, ty), { ...at(ox + 5 * p, oy), opacity: 1, offset: .85 }, { ...at(ox + 5 * p, oy + 8 * p), opacity: 0 }], 1000),
      ]);
      stopG(); stopW(); g.remove(); cop.remove();
    } else {
      cop.src = SPR.cop; say(tx + 8 * p, ty - 2 * p, '咦？這個字沒寫錯啊！', 1200); el.classList.add('dizzy'); say(t.cx - 6 * p, t.y - 17 * p, '冤枉啊～', 1200);
      await wait(1200); el.classList.remove('dizzy');
      stopW = loop(cop, SPR.copWalk[dirBack], 150);
      await mv(cop, [at(tx, ty), { ...at(ox, oy), opacity: 1, offset: .85 }, { ...at(ox, oy), opacity: 0 }], 800); stopW(); cop.remove();
    }
    await mv(car, [at(cx, cy), at(-cw - 30, cy)], 900, 'cubic-bezier(.6,0,.9,.6)'); stopS(); car.remove();
  } },
  { key: 'ufo', name: '外星人抓走', icon: IMG.ufo[0], async run(el, hit) {
    const p = PX(), t = imgBox(el), W = stage.clientWidth;
    el.classList.remove('locked');
    const uw = 32 * p, uh = 14 * p, uy = Math.max(4, t.y - 17 * p - uh - 2 * p), ux = t.cx - uw / 2;
    const u = spr(IMG.ufo[0], 32, 14, 14), stopU = loop(u, IMG.ufo, 160);
    SFX.ufo();
    await mv(u, [at(-uw, -uh), at(ux, uy)], 1000, 'cubic-bezier(.2,.8,.3,1)');
    const beam = document.createElement('div'); beam.className = 'beam';
    Object.assign(beam.style, { left: t.cx - 10 * p + 'px', top: uy + uh - 2 * p + 'px', width: 20 * p + 'px', height: t.b - (uy + uh - 2 * p) + p + 'px' });
    stage.append(beam); SFX.beam(); await wait(450);
    const g = lift(el), dy = uy + uh / 2 - t.cy;
    if (hit) {
      toSpy(g); say(t.cx, t.y - 17 * p, '放我下來～');
      await mv(g, [at(0, 0, 'scale(1)'), { ...at(0, dy, 'scale(.15) rotate(30deg)'), opacity: .4 }], 1100, 'ease-in'); g.remove(); beam.remove();
    } else {
      await mv(g, [at(0, 0), at(0, dy * .45)], 650, 'ease-out');
      say(t.cx, uy - 2, '嗶嗶？抓錯了！', 1000); await wait(600); beam.remove();
      await mv(g, [at(0, dy * .45), at(0, 0)], 380, 'cubic-bezier(.5,0,1,1)'); putBack(el, g); shake(); await wait(700);
    }
    await mv(u, [at(ux, uy), at(ux, uy + 6), at(W + uw, -uh * 3)], 800, 'cubic-bezier(.5,0,.9,.6)'); stopU(); u.remove();
  } },
  { key: 'claw', name: '夾娃娃機', icon: IMG.claw, async run(el, hit) {
    const p = PX(), t = imgBox(el);
    el.classList.remove('locked');
    const rig = document.createElement('div'); rig.className = 'rig';
    rig.innerHTML = `<i class="cable"></i><img alt="" src="${IMG.claw}" style="width:${14 * p}px;height:${10 * p}px">`;
    stage.append(rig);
    const rx = t.cx - 7 * p, top = -12 * p, grab = t.y - 16 * p - 8 * p, claw = rig.querySelector('img');
    SFX.motor();
    await mv(rig, [at(rx, top), at(rx, grab)], 900, 'cubic-bezier(.3,0,.7,1)');
    claw.src = IMG.clawShut; SFX.clack(); await wait(350);
    const g = lift(el); SFX.motor();
    if (hit) {
      toSpy(g); say(t.cx, t.y - 26 * p, '被夾走了啦！', 1000);
      const up = top - (grab - top) - 60;
      await Promise.all([mv(rig, [at(rx, grab), at(rx + 6, grab - 40), at(rx, up)], 1100, 'ease-in'), mv(g, [at(0, 0), at(6, -40, 'rotate(8deg)'), at(0, up - grab, 'rotate(-6deg)')], 1100, 'ease-in')]);
      g.remove();
    } else {
      await Promise.all([mv(rig, [at(rx, grab), at(rx, grab - 14 * p)], 600), mv(g, [at(0, 0), at(0, -14 * p)], 600)]);
      say(t.cx, t.y - 32 * p, '叮咚～夾錯人', 1000); await wait(500);
      claw.src = IMG.claw; SFX.clack();
      await mv(g, [at(0, -14 * p), at(0, 0)], 350, 'cubic-bezier(.5,0,1,1)'); putBack(el, g); shake(); await wait(500);
      await mv(rig, [at(rx, grab - 14 * p), at(rx, top - 200)], 700, 'ease-in');
    }
    rig.remove();
  } },
  { key: 'trap', name: '地洞陷阱', icon: IMG.pitIcon, async run(el, hit) {
    const p = PX(), t = imgBox(el), gb = box(el);
    el.classList.remove('locked');
    const pit = document.createElement('div'); pit.className = 'pit';
    const pw = 18 * p, ph = 5 * p;
    Object.assign(pit.style, { left: t.cx - pw / 2 + 'px', top: t.b - ph / 2 - p + 'px', width: pw + 'px', height: ph + 'px' });
    stage.append(pit);
    await mv(pit, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], 300, 'steps(4)');
    const g = lift(el); g.style.zIndex = 8;
    // 往下掉：一邊下移，一邊把洞口以下的部分剪掉
    const H = gb.h, cut = d => ({ transform: `translateY(${d}px)`, clipPath: `inset(-200px -40px ${Math.max(0, d)}px -40px)` });
    SFX.drop();
    if (hit) {
      toSpy(g); say(t.cx, t.y - 17 * p, '啊——');
      await mv(g, [cut(0), cut(-4 * p), cut(H)], 700, 'cubic-bezier(.4,0,1,1)'); g.remove();
      await wait(200);
    } else {
      await mv(g, [cut(0), cut(-4 * p), cut(H * .55)], 500, 'cubic-bezier(.4,0,1,1)');
      say(t.cx, t.y - 6 * p, '我不是間諜！', 1000); await wait(500); SFX.jump();
      await mv(g, [cut(H * .55), cut(-14 * p), cut(0)], 600, 'ease-out'); putBack(el, g);
    }
    await mv(pit, [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], 300, 'steps(4)'); pit.remove();
  } },
  { key: 'spring', name: '彈簧跳板', icon: IMG.spring, async run(el, hit) {
    const p = PX(), t = imgBox(el);
    el.classList.remove('locked');
    const sp = spr(IMG.spring, 12, 10, 7), sx = t.cx - 6 * p, sy = t.b - 10 * p;
    sp.style.transformOrigin = 'bottom';
    const g = lift(el);
    await Promise.all([mv(sp, [at(sx, sy, 'scaleY(0)'), at(sx, sy, 'scaleY(.4)')], 250, 'steps(3)'), mv(g, [at(0, 0), at(0, -4 * p)], 250, 'steps(3)')]);
    await wait(250);
    SFX.boing();
    if (hit) {
      toSpy(g);
      mv(sp, [at(sx, sy, 'scaleY(.4)'), at(sx, sy, 'scaleY(1.6)'), at(sx, sy, 'scaleY(1)')], 300, 'steps(3)');
      say(t.cx, t.y - 17 * p, '咻～～', 900);
      await mv(g, [at(0, -4 * p, 'rotate(0)'), { ...at(30, -t.b - 220, 'rotate(720deg) scale(.6)'), opacity: 0 }], 900, 'cubic-bezier(.1,.6,.4,1)'); g.remove();
    } else {
      mv(sp, [at(sx, sy, 'scaleY(.4)'), at(sx, sy, 'scaleY(1)')], 200, 'steps(2)');
      await mv(g, [at(0, -4 * p), at(0, -40 * p, 'rotate(360deg)'), at(0, 0, 'rotate(720deg)')], 1000, 'cubic-bezier(.3,.9,.6,1)');
      putBack(el, g); say(t.cx, t.y - 17 * p, '頭好暈…我是好人', 1100); shake(); await wait(800);
    }
    await mv(sp, [at(sx, sy, 'scaleY(1)'), at(sx, sy, 'scaleY(0)')], 250, 'steps(3)'); sp.remove();
  } },
  { key: 'eagle', name: '大老鷹叼走', icon: IMG.eagle[0], async run(el, hit) {
    const p = PX(), t = imgBox(el), W = stage.clientWidth;
    el.classList.remove('locked');
    const e = spr(IMG.eagle[0], 20, 12, 14), stopF = loop(e, IMG.eagle, 120), ew = 20 * p;
    const ex = t.cx - ew / 2 - 2 * p, ey = t.y - 16 * p - 10 * p;
    SFX.screech(); SFX.flap();
    await mv(e, [at(-ew, ey - 160), at(ex, ey)], 900, 'cubic-bezier(.2,.7,.4,1)');
    const g = lift(el);
    if (hit) {
      toSpy(g); say(t.cx, t.y - 30 * p, '救命啊～', 900); SFX.flap();
      const dx = W + 60 - ex, dy = -ey - 200;
      await Promise.all([mv(e, [at(ex, ey), at(ex + dx, ey + dy)], 1200, 'ease-in'), mv(g, [at(0, 0), at(dx, dy, 'rotate(-20deg) scale(.7)')], 1200, 'ease-in')]);
      g.remove();
    } else {
      await Promise.all([mv(e, [at(ex, ey), at(ex, ey - 16 * p)], 600), mv(g, [at(0, 0), at(0, -16 * p)], 600)]);
      say(ex + ew / 2, ey - 20 * p, '嘎！叼錯了', 900); await wait(400);
      await mv(g, [at(0, -16 * p), at(0, 0)], 380, 'cubic-bezier(.5,0,1,1)'); putBack(el, g); shake();
      await mv(e, [at(ex, ey - 16 * p), at(W + 60, -200)], 800, 'ease-in');
    }
    stopF(); e.remove();
  } },
  { key: 'magnet', name: '超級磁鐵', icon: IMG.magnet, async run(el, hit) {
    const p = PX(), t = imgBox(el);
    el.classList.remove('locked');
    const rig = document.createElement('div'); rig.className = 'rig';
    rig.innerHTML = `<i class="cable"></i><img alt="" src="${IMG.magnet}" style="width:${12 * p}px;height:${9 * p}px">`;
    stage.append(rig);
    const rx = t.cx - 6 * p, top = -12 * p, stop = t.y - 16 * p - 14 * p;
    SFX.motor();
    await mv(rig, [at(rx, top), at(rx, stop)], 800, 'cubic-bezier(.3,0,.7,1)');
    SFX.hum(); const zz = setInterval(() => sparkAt(t.cx + (Math.random() - .5) * 14 * p, stop + 9 * p + Math.random() * 6 * p), 90);
    const g = lift(el);
    if (hit) {
      toSpy(g); say(t.cx, t.y - 30 * p, '我的錢包是鐵做的啦！', 1100);
      await mv(g, [at(0, 0), at(-p, -3 * p, 'rotate(-6deg)'), at(p, -2 * p, 'rotate(6deg)'), at(0, stop + 9 * p - t.y + 14 * p, 'rotate(0)')], 700, 'cubic-bezier(.6,0,1,1)');
      SFX.clack(); clearInterval(zz); await wait(300);
      const up = top - 260;
      await Promise.all([mv(rig, [at(rx, stop), at(rx, up)], 900, 'ease-in'), mv(g, [at(0, stop + 9 * p - t.y + 14 * p), at(0, up + 9 * p - t.y + 14 * p)], 900, 'ease-in')]);
      g.remove();
    } else {
      await mv(g, [at(0, 0), at(0, -6 * p)], 500, 'ease-out');
      clearInterval(zz); say(t.cx, t.y - 30 * p, '吸不起來…他身上沒有可疑的東西', 1100); await wait(600);
      await mv(g, [at(0, -6 * p), at(0, 0)], 300, 'cubic-bezier(.5,0,1,1)'); putBack(el, g); shake(); await wait(400);
      await mv(rig, [at(rx, stop), at(rx, top - 200)], 700, 'ease-in');
    }
    rig.remove();
  } },
  { key: 'bubble', name: '泡泡封印', icon: IMG.spring, async run(el, hit) {
    const p = PX(), t = imgBox(el), gb = box(el);
    el.classList.remove('locked');
    SFX.blow();
    for (let i = 0; i < 6; i++) setTimeout(() => {
      const d = document.createElement('div'); d.className = 'soap'; const r = (2 + Math.random() * 3) * p;
      Object.assign(d.style, { width: r + 'px', height: r + 'px' }); stage.append(d);
      const sx = -20, sy = t.b - 20 * p * Math.random();
      mv(d, [at(sx, sy), at(t.cx + (Math.random() - .5) * 10 * p, t.cy + (Math.random() - .5) * 10 * p)], 600, 'ease-out').then(() => d.remove());
    }, T(i * 80));
    await wait(650);
    const D = Math.max(gb.w, gb.h) + 4 * p, b = document.createElement('div'); b.className = 'soap';
    Object.assign(b.style, { width: D + 'px', height: D + 'px' }); stage.append(b);
    const bx = gb.cx - D / 2, by = gb.cy - D / 2;
    SFX.pop();
    await mv(b, [at(bx, by, 'scale(0)'), at(bx, by, 'scale(1.1)'), at(bx, by, 'scale(1)')], 400, 'ease-out');
    const g = lift(el); g.style.zIndex = 12;
    if (hit) {
      toSpy(g); say(t.cx, t.y - 24 * p, '咕嚕咕嚕…出不去！', 1100);
      const wob = (k, dy) => at(Math.sin(k) * 12, dy);
      const H = -gb.y - D - 60;
      const kf = n => Array.from({ length: 6 }, (_, k) => ({ ...wob(k * 1.3, H * (k / 5) ** 1.4), offset: k / 5 }));
      await Promise.all([mv(g, kf(), 1600, 'linear'), mv(b, kf().map(f => ({ ...f, transform: f.transform.replace(/translate\(([-\d.]+)px,([-\d.]+)px\)/, (m, x, y) => `translate(${bx + +x}px,${by + +y}px)`) })), 1600, 'linear')]);
      g.remove(); b.remove();
    } else {
      await Promise.all([mv(g, [at(0, 0), at(0, -10 * p)], 700, 'ease-out'), mv(b, [at(bx, by), at(bx, by - 10 * p)], 700, 'ease-out')]);
      say(t.cx, t.y - 34 * p, '啵！我不是間諜啦', 1000); SFX.pop(); b.remove();
      for (let i = 0; i < 8; i++) sparkAt(gb.cx + Math.cos(i * .8) * D / 2, gb.cy - 10 * p + Math.sin(i * .8) * D / 2);
      await mv(g, [at(0, -10 * p), at(0, 0)], 350, 'cubic-bezier(.5,0,1,1)'); putBack(el, g); shake(); await wait(700);
    }
  } },
  { key: 'vacuum', name: '超強吸塵器', icon: IMG.vacuum, async run(el, hit) {
    const p = PX(), t = imgBox(el), W = stage.clientWidth;
    el.classList.remove('locked');
    // 吸嘴朝左；目標太靠右就從左邊來（左右翻轉）
    const L = t.x + t.w + 22 * p > W, flip = L ? 'scaleX(-1)' : '';
    const vw = 20 * p, vy = t.b - 12 * p, vx = L ? t.x - vw - 2 * p : t.x + t.w + 2 * p, x0 = L ? -vw - 20 : W + 20;
    const v = spr(IMG.vacuum, 20, 12, 13);
    SFX.run(); await mv(v, [at(x0, vy, flip), at(vx, vy, flip)], 800, 'cubic-bezier(.2,.8,.3,1)');
    SFX.suck(); const nose = L ? vx + vw : vx;
    const air = setInterval(() => { const d = document.createElement('i'); d.className = 'puff'; stage.append(d);
      const sy = t.y + Math.random() * t.h, sx = t.cx + (L ? -1 : 1) * (Math.random() * 6 * p);
      d.animate([{ transform: `translate(${sx - 5}px,${sy - 5}px) scale(.8)`, opacity: .9 }, { transform: `translate(${nose - 5}px,${vy + 4 * p}px) scale(.2)`, opacity: 0 }], { duration: 350, easing: 'ease-in' }).finished.then(() => d.remove()); }, 50);
    const g = lift(el), dir = L ? -1 : 1;
    if (hit) {
      toSpy(g); say(t.cx, t.y - 17 * p, '我要被吸進去了～', 1000);
      await mv(g, [at(0, 0, 'skewX(0)'), at(dir * 3 * p, 0, `skewX(${-dir * 18}deg)`), at(dir * 6 * p, 0, `skewX(${-dir * 30}deg) scaleX(.8)`)], 800, 'ease-in');
      await mv(g, [at(dir * 6 * p, 0, `skewX(${-dir * 30}deg) scaleX(.8)`), { ...at(nose - t.cx, vy + 4 * p - t.cy, 'scale(.05)'), opacity: .3 }], 350, 'cubic-bezier(.6,0,1,1)');
      g.remove(); clearInterval(air); SFX.pop(); say(vx + vw / 2, vy - 4 * p, '咕嚕！', 700); await wait(500);
    } else {
      await mv(g, [at(0, 0, 'skewX(0)'), at(dir * 3 * p, 0, `skewX(${-dir * 18}deg)`)], 600, 'ease-in');
      clearInterval(air); SFX.sputter(); v.classList.add('soot');
      say(vx + vw / 2, vy - 4 * p, '噗噗…吸錯人，塞住了', 1100); await wait(400);
      await mv(g, [at(dir * 3 * p, 0, `skewX(${-dir * 18}deg)`), at(0, 0, 'skewX(0)')], 300, 'ease-out'); putBack(el, g); await wait(700);
    }
    await mv(v, [at(vx, vy, flip), at(x0, vy, flip)], 700, 'ease-in'); v.remove();
  } },
  { key: 'net', name: '捕蟲網', icon: IMG.net, async run(el, hit) {
    const p = PX(), t = imgBox(el), W = stage.clientWidth;
    el.classList.remove('locked');
    const nw = 32 * p, n = spr(IMG.net, 32, 32, 13);
    n.style.transformOrigin = '100% 100%';
    // 網頭（左上角）罩住頭上的牌子和人
    const nx = t.cx - 10 * p, ny = t.y - 14 * p;
    SFX.swoosh();
    await mv(n, [at(W + 40, -nw, 'rotate(-70deg)'), at(nx, ny, 'rotate(10deg)'), at(nx, ny, 'rotate(0)')], 700, 'cubic-bezier(.2,.8,.4,1)');
    const g = lift(el); g.style.zIndex = 12;
    if (hit) {
      toSpy(g); say(t.cx, t.y - 26 * p, '我又不是蟲！', 1000);
      await mv(g, [at(0, 0, 'scale(1)'), at(0, -6 * p, 'scale(.6) rotate(-10deg)')], 450, 'ease-in');
      SFX.swoosh();
      await Promise.all([mv(n, [at(nx, ny, 'rotate(0)'), at(W + 80, -nw * 3, 'rotate(40deg)')], 900, 'ease-in'), mv(g, [at(0, -6 * p, 'scale(.6) rotate(-10deg)'), at(W + 80 - nx, -nw * 3 - ny - 6 * p, 'scale(.6) rotate(40deg)')], 900, 'ease-in')]);
      g.remove();
    } else {
      await mv(g, [at(0, 0, 'scaleY(1)'), at(0, 6 * p, 'scaleY(.7)')], 250, 'steps(2)');
      say(t.cx, t.y - 26 * p, '嘿！網錯人了', 1000); await wait(600);
      await mv(g, [at(0, 6 * p, 'scaleY(.7)'), at(0, 0, 'scaleY(1)')], 250, 'steps(2)'); putBack(el, g);
      SFX.swoosh(); await mv(n, [at(nx, ny, 'rotate(0)'), at(W + 80, -nw * 3, 'rotate(40deg)')], 700, 'ease-in');
    }
    n.remove();
  } },
  { key: 'portal', name: '任意傳送門', icon: IMG.pitIcon, async run(el, hit) {
    const p = PX(), t = imgBox(el), gb = box(el);
    el.classList.remove('locked');
    const pw = 20 * p, ph = 6 * p;
    const mk = (x, y) => { const d = document.createElement('div'); d.className = 'portal'; Object.assign(d.style, { left: x - pw / 2 + 'px', top: y - ph / 2 + 'px', width: pw + 'px', height: ph + 'px' }); stage.append(d); return d; };
    const pa = mk(t.cx, t.b - p);
    SFX.warp();
    await mv(pa, [{ transform: 'scale(0) rotate(0)' }, { transform: 'scale(1.2)' }, { transform: 'scale(1)' }], 400, 'ease-out');
    const g = lift(el); g.style.zIndex = 8;
    const H = gb.h, cut = (d, r = 0) => ({ transform: `translateY(${d}px) rotate(${r}deg)`, clipPath: `inset(-200px -40px ${Math.max(0, d)}px -40px)` });
    if (hit) {
      toSpy(g); say(t.cx, t.y - 17 * p, '這是去哪裡啦～', 1000);
      await mv(g, [cut(0), cut(H * .3, -8), cut(H * .6, 8), cut(H, 0)], 1000, 'ease-in'); g.remove();
      const top = -gb.y + 4 * p, pb = mk(stage.clientWidth - 30 * p, 14 * p);
      await mv(pb, [{ transform: 'scale(0)' }, { transform: 'scale(1)' }], 250);
      const tiny = lift(el); el.classList.add('gone'); toSpy(tiny); tiny.style.zIndex = 12;
      const dx = stage.clientWidth - 30 * p - gb.cx, dy = 14 * p - gb.cy;
      await mv(tiny, [{ ...at(dx, dy, 'scale(.4) rotate(0)'), opacity: 1 }, { ...at(dx + 200, dy - 120, 'scale(.2) rotate(720deg)'), opacity: 0 }], 800, 'ease-out');
      tiny.remove(); await mv(pb, [{ transform: 'scale(1)' }, { transform: 'scale(0)' }], 250); pb.remove();
    } else {
      await mv(g, [cut(0), cut(H * .5, 10)], 450, 'ease-in');
      say(t.cx, t.y - 6 * p, '欸？傳送失敗！', 900);
      const pb = mk(t.cx, gb.y - 6 * p); await mv(pb, [{ transform: 'scale(0)' }, { transform: 'scale(1)' }], 250);
      g.style.clipPath = ''; SFX.warp();
      await mv(g, [{ transform: `translateY(${-H - 8 * p}px) rotate(180deg)`, clipPath: 'inset(-200px -40px 0 -40px)' }, { transform: `translateY(${-H * .4}px) rotate(270deg)`, clipPath: 'inset(-200px -40px 0 -40px)' }, { transform: 'translateY(0) rotate(360deg)', clipPath: 'inset(-200px -40px 0 -40px)' }], 700, 'ease-in');
      putBack(el, g); shake(); await mv(pb, [{ transform: 'scale(1)' }, { transform: 'scale(0)' }], 250); pb.remove(); await wait(500);
    }
    await mv(pa, [{ transform: 'scale(1)' }, { transform: 'scale(0) rotate(180deg)' }], 300, 'ease-in'); pa.remove();
  } },
  { key: 'cage', name: '天降鐵籠', icon: IMG.cage, async run(el, hit) {
    const p = PX(), t = imgBox(el);
    el.classList.remove('locked');
    const c = spr(IMG.cage, 16, 20, 13), cx = t.x, cy = t.y;
    SFX.whistle();
    await mv(c, [at(cx, -22 * p), at(cx, cy)], 600, 'cubic-bezier(.5,0,1,1)');
    SFX.slam(); shake(); powAt(t.cx, t.b);
    const g = lift(el); g.style.zIndex = 12;
    if (hit) {
      toSpy(g); say(t.cx, t.y - 17 * p, '放我出去！', 1000);
      await mv(g, [at(0, 0), at(-p, 0), at(p, 0), at(-p, 0), at(0, 0)], 500, 'steps(4)');
      const rope = document.createElement('div'); rope.className = 'rig';
      rope.innerHTML = `<i class="cable"></i>`; stage.append(rope); rope.animate([at(t.cx, -10), at(t.cx, cy)], { duration: T(400), fill: 'forwards' });
      await wait(450); SFX.motor();
      const up = -cy - 22 * p - 80;
      await Promise.all([mv(c, [at(cx, cy), at(cx, cy + up)], 1000, 'ease-in'), mv(g, [at(0, 0), at(0, up)], 1000, 'ease-in'), mv(rope, [at(t.cx, cy), at(t.cx, cy + up)], 1000, 'ease-in')]);
      g.remove(); rope.remove();
    } else {
      putBack(el, g); say(t.cx, t.y - 17 * p, '喂～關錯人了啦！', 1100); await wait(1100);
      await mv(c, [at(cx, cy), at(cx, -22 * p - 40)], 600, 'ease-in');
    }
    c.remove();
  } },
];
// 每次完全隨機抽，只避開跟上一次一模一樣（bag 只給測試用來指定方法）
let bag = [], lastKey = '';
function nextMethod() {
  const pool = METHODS.filter(m => m.key !== lastKey);
  const m = bag.length ? bag.shift() : pool[Math.floor(Math.random() * pool.length)];
  lastKey = m.key; return m;
}
const seen = new Set();
async function roulette(m) { seen.add(m.key); }

/* ---------- 遊戲流程 ---------- */
let order = [];
let qi = 0, score = 0, phase = 'setup', q = null, spyIdx = -1;
let log = [];

/* ---------- 題庫：讀 data/index.json，找出有改錯字題的國語單元 ---------- */
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } },
};
const wrongBook = () => new Set(store.get('kr-wrong-v1', []));
function markWrong(key, wrong) {
  const w = wrongBook();
  if (wrong) w.add(key); else w.delete(key);
  store.set('kr-wrong-v1', [...w]);
}
const SUBJECT = '國語', FIX = '改錯字';
const dataUrl = file => 'data/' + file.split('/').map(encodeURIComponent).join('/');
const unitCache = new Map();
function loadUnit(meta, grade) {
  if (!unitCache.has(meta.file)) unitCache.set(meta.file, fetch(dataUrl(meta.file)).then(r => { if (!r.ok) throw Error(meta.file); return r.json(); }).then(u =>
    (u.questions || []).map((x, i) => ({ ...x, key: `${meta.file}#${i}` })).filter(x => x.type === 'fix' && [...x.sentence].includes(x.wrong))
      .map(x => ({ key: x.key, sentence: x.sentence, wrong: x.wrong, correct: x.correct, options: x.options, why: x.why || '', src: `${grade} ${meta.title}` }))));
  return unitCache.get(meta.file);
}
let INDEX = null;
const setup = Object.assign({ grade: '', term: '', unit: '', size: 10 }, store.get('kr-spy-setup', {}));
const fixUnits = grade => (INDEX.grades.find(g => g.name === grade)?.subjects.find(s => s.name === SUBJECT)?.units || []).filter(u => u.cats?.[FIX]);
const gradesWithFix = () => INDEX.grades.map(g => g.name).filter(g => fixUnits(g).length);
const inTerm = u => !setup.term || u.term === setup.term;
const fixCount = units => units.reduce((n, u) => n + (u.cats[FIX] || 0), 0);
const escH = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function renderSetup() {
  const grades = gradesWithFix();
  if (!grades.includes(setup.grade)) setup.grade = grades[0];
  const all = fixUnits(setup.grade);
  const terms = [...new Set(all.map(u => u.term).filter(Boolean))];
  if (setup.term && !terms.includes(setup.term)) setup.term = '';
  const units = all.filter(inTerm);
  if (setup.unit && !units.some(u => u.file === setup.unit)) setup.unit = '';
  const chosen = setup.unit ? units.filter(u => u.file === setup.unit) : units;
  const total = fixCount(chosen);
  const wrongN = [...wrongBook()].filter(k => chosen.some(u => k.startsWith(u.file + '#'))).length;
  const seg = (name, list, cur) => `<div class="seg" role="group" aria-label="${name}">${list.map(([v, t]) => `<button type="button" data-set="${name}" data-v="${escH(v)}" aria-pressed="${String(v) === String(cur)}">${t}</button>`).join('')}</div>`;
  $('#setupPanel').innerHTML = `
    <h2>選好範圍，開始抓間諜！</h2>
    <div class="field"><span class="lab">年級</span>${seg('grade', grades.map(g => [g, g]), setup.grade)}</div>
    ${terms.length > 1 ? `<div class="field"><span class="lab">範圍</span>${seg('term', [['', '全部'], ...terms.map(t => [t, t])], setup.term)}</div>` : ''}
    <div class="field"><label class="lab" for="unitSel">單元</label>
      <select id="unitSel"><option value="">全部單元（${fixCount(units)} 句）</option>${units.map(u => `<option value="${escH(u.file)}" ${u.file === setup.unit ? 'selected' : ''}>${escH(u.title)}（${u.cats[FIX]} 句）</option>`).join('')}</select></div>
    <div class="field"><span class="lab">句數</span>${seg('size', [[10, '10 句'], [20, '20 句'], [0, `全部 ${total} 句`]], setup.size)}</div>
    <div class="actions"><button class="btn" id="go" type="button">開始任務</button>
      <button class="btn alt" id="goWrong" type="button" ${wrongN ? '' : 'disabled'}>只練錯題（${wrongN} 句）</button></div>
    <p class="src">找到間諜得 1 分，再把正確的隊員放回隊伍得 1 分。沒抓到或放錯的句子會收進錯題本，和複習小書共用。</p>`;
}
async function begin(onlyWrong) {
  store.set('kr-spy-setup', setup);
  const units = fixUnits(setup.grade).filter(inTerm).filter(u => !setup.unit || u.file === setup.unit);
  $('#go').disabled = true; $('#go').textContent = '準備中…';
  let qs;
  try { qs = (await Promise.all(units.map(u => loadUnit(u, setup.grade)))).flat(); }
  catch (err) { $('#go').disabled = false; $('#go').textContent = '開始任務'; $('#mission').textContent = '題目讀取失敗，請檢查網路後再試一次。'; return; }
  if (onlyWrong) { const w = wrongBook(); qs = qs.filter(x => w.has(x.key)); }
  qs = shuffle(qs);
  if (!onlyWrong && setup.size) qs = qs.slice(0, setup.size);
  if (!qs.length) { renderSetup(); return; }
  order = qs; qi = 0; score = 0; log = []; seen.clear();
  $('#qt').textContent = order.length;
  $('#setupPanel').hidden = true;
  startQuestion();
  stage.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}
function showSetup() {
  phase = 'setup';
  const title = '找出間諜';
  $('#line').innerHTML = [...title].map((ch, i) => guyHtml(ch, 900 + i, 'tabindex="-1" aria-hidden="true"')).join('');
  stage.classList.remove('aim');
  $('#mission').innerHTML = '隊員舉牌排成一句話，裡面混進一個<b>間諜</b>舉著錯字。<br>先在下面選好範圍，再開始任務！';
  $('#benchPanel').hidden = true; $('#resultPanel').hidden = true;
  $('#qn').textContent = 0; $('#qt').textContent = '–'; $('#score').textContent = 0;
  renderSetup(); $('#setupPanel').hidden = false;
}
$('#setupPanel').addEventListener('click', e => {
  const b = e.target.closest('[data-set]');
  if (b) { const k = b.dataset.set; setup[k] = k === 'size' ? Number(b.dataset.v) : b.dataset.v; if (k !== 'unit') setup.unit = k === 'grade' || k === 'term' ? '' : setup.unit; store.set('kr-spy-setup', setup); return renderSetup(); }
  if (e.target.id === 'go') return begin(false);
  if (e.target.id === 'goWrong') return begin(true);
});
$('#setupPanel').addEventListener('change', e => { if (e.target.id === 'unitSel') { setup.unit = e.target.value; store.set('kr-spy-setup', setup); renderSetup(); } });
const isHan = ch => /\p{Script=Han}/u.test(ch);
const guyHtml = (ch, seed, attrs = '', cls = 'guy idle') => `<button class="${cls}" ${attrs} data-seed="${seed}" style="--d:${(seed % 5) * -.25}s"><span class="sign">${ch}</span><img alt="" src="${handSrc(seed)}"><i class="shadow"></i><i class="ret"></i></button>`;
const MISSION = '隊員舉牌排成一句話，其中混進一個<b>間諜</b>，他舉的是錯字。<br>瞄準他點下去，看看誰來把他抓走！';

function startQuestion() {
  q = order[qi]; phase = 'find';
  const chars = [...q.sentence];
  spyIdx = chars.indexOf(q.wrong);
  const base = 100 + Math.floor(Math.random() * 500);
  $('#line').innerHTML = chars.map((ch, i) => isHan(ch)
    ? guyHtml(ch, base + i, `data-i="${i}" aria-label="舉著「${ch}」的隊員"`)
    : `<span class="punct" aria-hidden="true">${ch}</span>`).join('');
  $('#mission').innerHTML = MISSION;
  stage.classList.add('aim');
  $('#benchPanel').hidden = true; $('#resultPanel').hidden = true;
  $('#qn').textContent = qi + 1; $('#score').textContent = score;
  q.res = { found: false, fixed: false, shot: null, picked: null };
}

async function shoot(el) {
  if (phase !== 'find') return;
  phase = 'busy';
  stage.classList.remove('aim');
  const i = Number(el.dataset.i), hit = i === spyIdx;
  q.res.shot = [...q.sentence][i];
  el.classList.remove('idle'); el.classList.add('locked'); SFX.lock();
  await wait(550);
  const m = nextMethod();
  await roulette(m);
  await m.run(el, hit);
  el.classList.remove('locked');
  if (hit) {
    q.res.found = true; score++; $('#score').textContent = score;
    el.outerHTML = `<div class="slot" id="slot"><div class="hole" aria-label="空位">？</div></div>`;
    $('#mission').innerHTML = `抓到了！「<b>${q.wrong}</b>」是間諜舉的錯字。`;
    openBench();
  } else {
    el.classList.add('idle');
    const spyEl = $(`#line .guy[data-i="${spyIdx}"]`);
    spyEl.querySelector('img').src = SPR.spySmug; spyEl.querySelector('.sign').classList.add('bad');
    spyEl.classList.add('laugh');
    spyEl.insertAdjacentHTML('beforeend', '<span class="spyTag">我才是間諜</span>');
    SFX.laugh();
    $('#mission').innerHTML = `抓錯人了！真正的間諜舉著「<b>${q.wrong}</b>」。`;
    await wait(800);
    SFX.sad();
    finish(false, `「${q.res.shot}」是好隊員，真正的間諜舉著「${q.wrong}」。`);
  }
}

function openBench() {
  phase = 'fix';
  const seeds = shuffle([3, 11, 19, 27, 35, 43, 51]);
  $('#bench').innerHTML = shuffle(q.options).map((ch, k) => guyHtml(ch, seeds[k], `data-pick="${ch}" aria-label="候補隊員，舉著「${ch}」"`, 'guy one')).join('');
  $('#benchPanel').hidden = false;
  $('#benchPanel').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
}
async function pick(el) {
  if (phase !== 'fix') return;
  phase = 'busy';
  const ch = el.dataset.pick;
  q.res.picked = ch;
  if (ch === q.correct) {
    q.res.fixed = true; score++; $('#score').textContent = score;
    await jumpIn(el);
    SFX.win(); confetti(); cheer();
    finish(true, '');
  } else {
    el.querySelector('img').src = SPR.spySmug; el.querySelector('.sign').classList.add('bad');
    el.classList.add('laugh');
    el.insertAdjacentHTML('beforeend', `<span class="spyTag">${ch === q.wrong ? '又是我！' : '我也是間諜'}</span>`);
    SFX.laugh();
    await wait(900);
    const right = $(`#bench .guy[data-pick="${q.correct}"]`);
    right.classList.add('glow');
    SFX.sad();
    await wait(500);
    await jumpIn(right);
    finish(false, ch === q.wrong
      ? `糟糕，又把間諜「${q.wrong}」放回隊伍了！正確的隊員是「${q.correct}」。`
      : `「${ch}」也是間諜！正確的隊員是「${q.correct}」。`);
  }
}
async function jumpIn(el) {
  const slot = $('#slot');
  const a = el.getBoundingClientRect(), b = slot.getBoundingClientRect();
  const ghost = el.cloneNode(true);
  ghost.querySelector('.ret')?.remove();
  Object.assign(ghost.style, { position: 'fixed', left: a.left + 'px', top: a.top + 'px', margin: 0, zIndex: 20, pointerEvents: 'none' });
  ghost.classList.remove('idle', 'glow');
  document.body.append(ghost);
  el.style.visibility = 'hidden';
  SFX.jump();
  const dx = b.left - a.left, dy = b.bottom - a.bottom;
  await ghost.animate([at(0, 0), at(dx / 2, Math.min(dy, 0) / 2 - 120), at(dx, dy)], { duration: T(750), easing: 'ease-in-out' }).finished;
  ghost.remove();
  slot.outerHTML = guyHtml(el.dataset.pick, Number(el.dataset.seed), '', 'guy glow idle');
}
function confetti() {
  if (reduce) return;
  const colors = ['#ff7a1a', '#ffd166', '#2f9e5b', '#3f7fd8', '#d6334a', '#9b5fd0'];
  for (let k = 0; k < 40; k++) {
    const p = document.createElement('i');
    p.className = 'confetti'; p.style.left = Math.random() * 100 + 'vw'; p.style.background = colors[k % colors.length];
    document.body.append(p);
    p.animate([{ transform: 'translateY(0) rotate(0)' }, { transform: `translateY(${innerHeight + 40}px) rotate(${360 + Math.random() * 360}deg)` }],
      { duration: 1400 + Math.random() * 1200, delay: Math.random() * 300, easing: 'linear' }).finished.then(() => p.remove());
  }
}

function finish(ok, msg) {
  phase = 'done';
  log.push({ q, ok, res: q.res });
  markWrong(q.key, !ok);
  $('#benchPanel').hidden = true;
  const fixedSentence = q.sentence.replace(q.wrong, `<mark>${q.correct}</mark>`);
  const last = qi + 1 >= order.length;
  const p = $('#resultPanel');
  p.innerHTML = `<div class="result ${ok ? '' : 'bad'}">
      <img alt="${ok ? '開心的隊長' : '沮喪的隊長'}" src="${ok ? IMG.happy : IMG.sad}">
      <div><h2>${ok ? '任務成功！隊伍恢復正常' : '任務失敗…'}</h2>
        ${msg ? `<p>${msg}</p>` : ''}
        <p class="fixed">正確的句子：${fixedSentence}</p>
        <p>${q.why}</p>
        <p class="src">題目來源：${q.src}</p></div></div>
    <div class="actions"><button class="btn" id="next">${last ? '看任務成績' : '下一句 →'}</button></div>`;
  p.hidden = false;
  $('#next').focus({ preventScroll: true });
  p.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
}
function summary() {
  const max = order.length * 2;
  const misses = log.filter(x => !x.ok);
  $('#line').innerHTML = '';
  $('#mission').innerHTML = '全部任務完成！';
  stage.classList.remove('aim');
  const p = $('#resultPanel');
  p.innerHTML = `<div class="sum"><img alt="" src="${score >= max - 2 ? IMG.happy : IMG.sad}" style="width:64px;height:80px;image-rendering:pixelated">
      <h2>任務成績</h2><p class="score">${score} / ${max}</p>
      <p class="src">找到間諜得 1 分，把正確的隊員放回去再得 1 分。</p>
      <p class="src" style="margin-top:8px">這次看過的抓間諜方法（${seen.size}/${METHODS.length}）</p>
      <div class="dex">${METHODS.map(m => `<span class="${seen.has(m.key) ? '' : 'no'}"><img alt="" src="${m.icon}">${seen.has(m.key) ? m.name : '？？？'}</span>`).join('')}</div>
      ${misses.length ? `<h2 style="font-size:17px;margin-top:12px">要再看一次的句子</h2><ul>${misses.map(x => `<li><b>${x.q.sentence.replace(x.q.wrong, x.q.correct)}</b>：${x.q.why}</li>`).join('')}</ul>` : '<p>每一個間諜都抓到了，太厲害了！</p>'}
    </div><div class="actions" style="justify-content:center"><button class="btn" id="again">再玩一次</button></div>`;
  p.hidden = false;
}

document.addEventListener('click', e => {
  const g = e.target.closest('#line .guy');
  if (g && !g.classList.contains('gone')) return shoot(g);
  const b = e.target.closest('#bench .guy');
  if (b) return pick(b);
  if (e.target.id === 'next') { qi++; if (qi >= order.length) return summary(); startQuestion(); stage.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }
  if (e.target.id === 'again') { showSetup(); $('#setupPanel').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' }); }
});
fetch('data/index.json').then(r => r.json()).then(ix => { INDEX = ix; showSetup(); })
  .catch(() => { $('#mission').textContent = '題庫讀取失敗，請重新整理頁面。'; });
