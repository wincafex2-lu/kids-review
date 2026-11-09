/* 最後一刻揭曉：是非（OX 翻板、吊橋）、選擇（開票、保險箱、送貨、寶藏門、火車、信鴿、實驗室）、題組（小偵探）。
   題目讀 data/index.json 和各單元檔；錯題和複習小書共用錯題本（localStorage kr-wrong-v1，題目代號「單元檔#題號」，題組小題「單元檔#題號.小題」）。 */
'use strict';
const $ = s => document.querySelector(s);
const stage = $('#stage');
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const T = ms => RM ? ms * 0.4 : ms;
const sleep = ms => new Promise(r => setTimeout(r, T(ms)));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const store = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const U = v => v + 'cqw';
const at = (e, x, y) => { e.style.left = U(x); e.style.top = U(y); return e; };
const size = (e, w, h) => { e.style.width = U(w); e.style.height = U(h); return e; };
// 逐格補間：fn(進度) 每格呼叫一次
const ease = { in: t => t * t, out: t => 1 - (1 - t) * (1 - t), io: t => t < .5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t), lin: t => t, back: t => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); } };
function tween(ms, fn, e = ease.lin) {
  return new Promise(res => { const t0 = performance.now(), D = T(ms); const f = now => { const t = Math.min(1, (now - t0) / D); fn(e(t), t); t < 1 ? requestAnimationFrame(f) : res(); }; requestAnimationFrame(f); });
}
const anim = (e, kf, ms, opt = {}) => e.animate(kf, { duration: T(ms), fill: 'forwards', ...opt }).finished;

/* ---------- 點陣圖 ---------- */
function pix(rows, colors) {
  const c = document.createElement('canvas'); c.width = Math.max(...rows.map(r => r.length)); c.height = rows.length;
  const g = c.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (colors[ch]) { g.fillStyle = colors[ch]; g.fillRect(x, y, 1, 1); } }));
  return c.toDataURL();
}
function pimg(src, w, h) { const i = el('img', 'px'); i.src = src; i.alt = ''; if (w) size(i, w, h); return i; }
const MON = SPRITES.monsterPal.map(p => pix(SPRITES.monster, p));
const LANE = ['#e8414f', '#3c8dde', '#ffd166', '#2f9e5b'];
const HORSE = LANE.map(c => SPRITES.horse.map(r => pixShaded(r, { k: '#1d1b2e', c, f: '#f5c79a', j: c, r: '#fffaf0', b: '#9a6a3f', n: '#6e4a2a', d: '#3a2618' })));
const ROCKET = LANE.map(c => pixShaded(SPRITES.rocket, { k: '#1d1b2e', r: c, w: '#f2f4f8', s: '#b9b6d8', g: '#5d5a77', b: '#78c3f0' }));
const WEAPON = ['sword', 'arrow', 'hammer', 'wand'].map(k => ({ k, src: pixShaded(SPRITES[k], SPAL.weapon), w: SPRITES[k][0].length, h: SPRITES[k].length }));
const CANNON = pixShaded(SPRITES.cannon, SPAL.cannon), FISH = pixShaded(SPRITES.fish, SPAL.fish), BOOT = pixShaded(SPRITES.boot, SPAL.boot);
const setBG = (scene, key) => { scene.style.backgroundImage = `url(${ART.BG[key]})`; };

/* ---------- 點陣人物（Agent 辦公室，只用站姿） ---------- */
const PP = window.OFFICE_PEOPLE, PS = window.PEOPLE_SPRITES;
function layers(person, action, i) {
  const rows = Array.from({ length: 20 }, () => Array(16).fill('.'));
  const stack = [['body', person.body], ['bottom', person.bottom], [person.body === 'female' ? 'top-female' : 'top', person.top], ['hair', person.hair], ['accessory', person.accessory]];
  for (const [layer, kind] of stack) { const px = PS.parts[layer][kind][action][i]; for (let y = 0; y < 20; y++) for (let x = 0; x < 16; x++) if (px[y][x] !== '.') rows[y][x] = px[y][x]; }
  return rows.map(r => r.join(''));
}
// 站姿：走路圖第 0 格是步伐，把左腳鏡射到右腳變成兩腳並排
const standLegs = rows => rows.map((r, y) => y < 17 ? r : r.slice(0, 9) + [...r.slice(4, 7)].reverse().join('') + r.slice(12));
const setRow = (rows, y, x, s) => { rows[y] = rows[y].slice(0, x) + s + rows[y].slice(x + s.length); };
// 舉雙手：擦掉垂下的手，接上「舉手」的手臂（只取手臂層），左右各一
function armsUp(rows) {
  rows = rows.map(r => [...r]);
  const arm = PS.parts.prop.action.raise[0];
  if (rows[16][1] === '.') rows[16][2] = '.';
  for (let y = 12; y <= 15; y++) { rows[y][2] = '.'; rows[y][3] = 'K'; rows[y][4] = rows[y][5] === 'K' ? 'C' : rows[y][5]; }
  for (let y = 0; y < 20; y++) for (let x = 0; x < 16; x++) if (arm[y][x] !== '.') rows[y][x] = arm[y][x];
  rows[11][0] = '.'; rows[11][1] = 'K'; rows[11][2] = 'C'; rows[11][3] = 'K'; rows[12][1] = 'K'; rows[12][2] = 'K'; rows[12][3] = 'K';
  if (rows[16][14] === '.') rows[16][13] = '.';
  for (let y = 12; y <= 15; y++) { rows[y][13] = '.'; rows[y][12] = 'K'; rows[y][11] = rows[y][10] === 'K' ? 'C' : rows[y][10]; }
  for (let y = 0; y < 20; y++) for (let x = 0; x < 16; x++) if (arm[y][x] !== '.') rows[y][15 - x] = arm[y][x];
  rows[11][15] = '.'; rows[11][14] = 'K'; rows[11][13] = 'C'; rows[11][12] = 'K'; rows[12][14] = 'K'; rows[12][13] = 'K'; rows[12][12] = 'K';
  return rows.map(r => r.join(''));
}
const FACE = {
  happy: rows => { setRow(rows, 6, 4, 'KK'); setRow(rows, 6, 10, 'KK'); setRow(rows, 8, 5, 'KIIIIK'); setRow(rows, 9, 6, 'KKKK'); return rows; },
  scared: rows => { setRow(rows, 5, 12, 'L'); setRow(rows, 6, 12, 'L'); setRow(rows, 6, 4, 'IK'); setRow(rows, 6, 10, 'KI'); setRow(rows, 7, 4, 'IK'); setRow(rows, 7, 10, 'KI'); setRow(rows, 9, 6, 'KKKK'); setRow(rows, 10, 6, 'KRRK'); setRow(rows, 11, 6, 'KKKK'); return rows; },
  sad: rows => { setRow(rows, 7, 5, 'L'); setRow(rows, 8, 5, 'L'); setRow(rows, 7, 10, 'L'); setRow(rows, 8, 10, 'L'); setRow(rows, 9, 6, 'KKKK'); setRow(rows, 8, 6, 'K'); setRow(rows, 8, 9, 'K'); return rows; },
};
const SOOT = { S: '#4a4458', s: '#2e2a3a', I: '#4a4458' };
const pcache = new Map();
function look(person, key, pose = 'stand', step = 0, face = '', pal) {
  const k = [key, pose, step, face, pal ? 'p' : ''].join('|');
  if (!pcache.has(k)) {
    let rows;
    if (pose === 'right' || pose === 'left') rows = layers(person, 'walk-' + pose, step);
    else { rows = step === 0 && pose !== 'step' ? standLegs(layers(person, 'walk-down', 0)) : layers(person, 'walk-down', step); if (pose === 'cheer') rows = armsUp(rows); }
    if (face && FACE[face]) rows = FACE[face](rows.slice());
    pcache.set(k, pix(rows, Object.assign({}, PP.frame(person, 'walk-down', 0).palette, { R: '#d6334a' }, pal)));
  }
  return pcache.get(k);
}
// 演員：腳底在 (x, y)，s = 每個像素幾 cqw
class Actor {
  constructor(scene, name, x, y, s = .55, person) {
    this.p = person || (name === '泓' ? PP.boss() : PP.create(name)); this.key = name; this.s = s;
    this.e = at(size(el('div', 'actor'), 16 * s, 20 * s), x, y); this.img = pimg(''); this.e.append(this.img); scene.append(this.e);
    this.x = x; this.y = y; this.pose = 'stand'; this.face = ''; this.pal = null; this.anim = false; this.f = 0; this.render();
    Actor.all.add(this);
  }
  render() { this.img.src = look(this.p, this.key, this.pose, this.anim ? this.f : 0, this.face, this.pal); }
  set(pose, face = this.face, anim = pose !== 'stand') { this.pose = pose; this.face = face; this.anim = anim; this.render(); return this; }
  move(x, y) { this.x = x; this.y = y; at(this.e, x, y); }
  async walkTo(x, ms, back = 'stand') { const x0 = this.x; this.set(x > x0 ? 'right' : 'left', this.face, true); await tween(ms, t => this.move(x0 + (x - x0) * t, this.y)); this.set(back); }
  hop(n = 3, h = 2) { return anim(this.e, Array.from({ length: n * 2 + 1 }, (_, i) => ({ transform: `translateY(${i % 2 ? -h : 0}cqw)` })), 260 * n, { fill: 'none' }); }
  say(text, ms = 1400) { const b = at(el('div', 'bubble', esc(text)), this.x, this.y - 20 * this.s - 1); this.e.parentNode.append(b); if (ms) setTimeout(() => b.remove(), T(ms)); return b; }
  async cheer() { this.set('cheer', 'happy', true); await this.hop(3, 2.4); }
  async sad() { this.set('stand', 'sad'); await anim(this.e, [{ transform: 'none' }, { transform: 'translateY(.6cqw) scaleY(.94)' }], 300); }
}
Actor.all = new Set();
setInterval(() => Actor.all.forEach(a => { if (!a.e.isConnected) return Actor.all.delete(a); if (a.anim) { a.f ^= 1; a.render(); } }), 180);

/* ---------- 音效（即時合成） ---------- */
let AC = null, muted = store.get('kr-reveal-mute', false);
const ac = () => { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch {} } if (AC && AC.state === 'suspended') AC.resume(); return AC; };
function tone(f, d = .08, type = 'square', v = .05, delay = 0, f2) {
  const c = ac(); if (!c || muted) return;
  const t = c.currentTime + delay / 1000, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + .02);
}
function noise(d = .4, v = .25, freq = 900, delay = 0) {
  const c = ac(); if (!c || muted) return;
  const t = c.currentTime + delay / 1000, n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), ch = b.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
  s.buffer = b; fl.type = 'lowpass'; fl.frequency.value = freq; g.gain.value = v;
  s.connect(fl).connect(g).connect(c.destination); s.start(t);
}
const SFX = {
  tick: () => tone(1200, .04, 'square', .04),
  snip: () => { tone(2400, .03, 'square', .05); tone(1600, .05, 'square', .05, 40); },
  drum: n => { for (let i = 0; i < n; i++) noise(.06, .1 + i / n * .2, 500, i * 55); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .18, 'square', .05, i * 110)),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, .25, 'triangle', .08, i * 180)),
  boom: () => { noise(1.2, .6, 380); tone(90, .7, 'sawtooth', .12, 0, 30); },
  whoosh: () => noise(.6, .2, 2400),
  click: () => tone(300, .05, 'square', .06),
  clink: () => { tone(2600, .08, 'sine', .07); tone(3400, .12, 'sine', .05, 60); },
  pop: () => tone(500, .12, 'sine', .1, 0, 1200),
  splash: () => noise(.35, .25, 1600),
  sputter: () => { for (let i = 0; i < 6; i++) noise(.05, .2, 300, i * 90); },
  beat: () => { tone(70, .12, 'sine', .25); tone(60, .12, 'sine', .2, 160); },
  reveal: () => { tone(800, .5, 'sine', .06, 0, 2400); noise(.5, .12, 6000); },
};
$('#mute').onclick = () => { muted = !muted; store.set('kr-reveal-mute', muted); $('#mute').textContent = muted ? '🔇' : '🔊'; $('#mute').setAttribute('aria-pressed', muted); };
$('#mute').textContent = muted ? '🔇' : '🔊';

/* ---------- 共用效果 ---------- */
const stamp = (scene, ok, text, y) => { const s = el('div', 'stamp ' + (ok ? 'ok' : 'bad'), text); if (y != null) s.style.top = U(y); scene.append(s); };
const flash = scene => scene.append(el('div', 'flash'));
function shake() { stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake'); }
// 揭曉前一律先閃一下：白光＋放射光線，光退掉之後才出結果
async function revealFlash(scene) {
  SFX.reveal();
  const f = el('div', 'fx-flash'), r = el('div', 'fx-rays'); scene.append(f, r);
  r.animate([{ rotate: '0deg', scale: .2, opacity: 0 }, { rotate: '40deg', scale: 1, opacity: 1, offset: .5 }, { rotate: '70deg', scale: 1.2, opacity: 0 }], { duration: T(900), fill: 'forwards' });
  await anim(f, [{ opacity: 0 }, { opacity: 1, offset: .35 }, { opacity: 1, offset: .55 }, { opacity: 0 }], 900);
  f.remove(); r.remove();
}
function confetti(scene, n = 50) {
  const cols = ['#ffd166', '#ff7a1a', '#2f9e5b', '#78c3f0', '#e8414f', '#fffaf0', '#b48cff'];
  for (let i = 0; i < n; i++) {
    const c = el('div', 'confetti'); c.style.left = rnd(0, 100) + '%'; c.style.background = pick(cols); scene.append(c);
    c.animate([{ transform: 'translateY(0) rotate(0)' }, { transform: `translateY(${rnd(62, 72)}cqw) translateX(${rnd(-8, 8)}cqw) rotate(${rnd(360, 900)}deg)` }], { duration: T(rnd(1300, 2400)), delay: rnd(0, 400), easing: 'cubic-bezier(.3,.6,.6,1)', fill: 'forwards' });
  }
}
function puff(scene, x, y, r, col = '#d3d1e6', ms = 1200, dx = 0, dy = -4) {
  const p = at(size(el('div', 'puff'), r, r), x, y); p.style.background = col; scene.append(p);
  p.animate([{ transform: 'scale(.3)', opacity: 1 }, { transform: `translate(${dx}cqw, ${dy}cqw) scale(1.4)`, opacity: 0 }], { duration: T(ms), easing: 'ease-out', fill: 'forwards' }).finished.then(() => p.remove());
}
function debris(scene, x, y, n, cols) {
  for (let i = 0; i < n; i++) {
    const d = at(size(el('div', 'part'), rnd(.8, 1.8), rnd(.8, 1.8)), x, y); d.style.background = pick(cols); scene.append(d);
    const vx = rnd(-22, 22), vy = rnd(-26, -8);
    d.animate([{ transform: 'translate(0,0) rotate(0)' }, { transform: `translate(${vx * .6}cqw, ${vy * .7}cqw) rotate(${rnd(200, 600)}deg)`, offset: .45 }, { transform: `translate(${vx}cqw, ${vy * .2 + 22}cqw) rotate(${rnd(600, 1000)}deg)`, opacity: 0 }], { duration: T(rnd(800, 1300)), easing: 'cubic-bezier(.2,.6,.6,1)', fill: 'forwards' });
  }
}
let SZ = '';
const sizeOf = opts => { const m = Math.max(...opts.map(o => o.length)); return m <= 1 ? '' : m <= 4 ? 'mid' : 'long'; };
function tag(text, x, y) { const b = el('button', 'tag pp ' + SZ, esc(text)); b.type = 'button'; if (x != null) at(b, x, y); return b; }
function choose(scene, tags) {
  scene.classList.add('picking');
  return new Promise(res => tags.forEach((t, i) => t.onclick = () => {
    ac(); scene.classList.remove('picking'); scene.classList.add('locked');
    tags.forEach((u, j) => u.classList.add(j === i ? 'chosen' : 'dim'));
    res(i);
  }));
}
function zoom(scene, ox, oy, s, ms) { scene.style.transformOrigin = `${ox}% ${oy}%`; return anim(scene, [{ transform: `scale(${scene._z || 1})` }, { transform: `scale(${s})` }], ms, { easing: 'ease-in-out' }).then(() => { scene._z = s; }); }

/* ======================================================================
   遊戲：play(scene, opts, ans) 先等小朋友選，播動畫，閃光後才揭曉

/* ======================================================================
   新遊戲：是非（OX 翻板）、選擇（班會開票）、題組（小偵探）
   ====================================================================== */
const NPC = ['阿凱', '小芸', '大頭', '米米', '阿哲', '小晴', '胖虎哥', '安安'];
const sp = k => ART.SP[k];
const mkImg = (k, x, y, w, h, cls = '') => { const i = pimg(sp(k), w, h); i.className = 'px ' + cls; at(i, x, y); return i; };
const chalkSnd = () => { noise(.07, .08, 3000); noise(.05, .06, 2600, 70); };

/* ---------- 是非：OX 翻板大挑戰 ---------- */
const OX = { id: 'ox', name: '⭕ OX 翻板大挑戰', how: '站到你覺得對的那一邊！倒數完，錯的那邊地板會翻下去。',
  async play(scene, ans) { // ans：0 = O（對）、1 = X（錯）
    scene.className = 'scene s-ox'; setBG(scene, 'ox');
    const PX = [[5, 46.25], [53.75, 95]], MID = [25.6, 74.4];
    const signs = [mkImg('signO', 14.4, 6, 22.5, 16.25, 'sign'), mkImg('signX', 63.1, 6, 22.5, 16.25, 'sign')];
    const beams = MID.map(x => { const b = mkImg('beam', x, 1, 25, 40, 'beam'); b.style.opacity = 0; return b; });
    const panels = [mkImg('panelO', 5, 40, 41.25, 10, 'trap'), mkImg('panelX', 53.75, 40, 41.25, 10, 'trap')];
    const front = mkImg('oxFront', 0, 50, 100, 12.5, 'front');
    const onair = mkImg('onair', 87, 4.5, 11, 4.4, 'onair'); onair.src = sp('onair')[1]; onair.style.width = U(11);
    const cams = [mkImg('camera', -1, 45, 11, 12.7, 'cam'), mkImg('camera', 90, 45, 11, 12.7, 'cam flip')];
    scene.append(...beams, ...signs, ...panels, front, onair, ...cams);
    onair.animate([{ opacity: 1 }, { opacity: .35 }], { duration: 700, iterations: Infinity, direction: 'alternate', easing: 'steps(2)' });
    // 參賽者：6 個人在兩邊走來走去
    const names = shuffle(NPC).slice(0, 6);
    const SPOTS = [[9, 15, 36, 42], [58, 64, 85, 91]];
    const npcs = names.map((n, i) => { const side = i % 2, a = new Actor(scene, n, SPOTS[side][i >> 1], 46, .5); a.side = side; return a; });
    const idle = a => new Promise(r => { const f = () => a.busy ? setTimeout(f, 40) : r(); f(); });
    const kid = new Actor(scene, '你', 50, 49.5, .6); kid.p = { ...kid.p, accessory: 'cap' }; kid.key = '你cap'; kid.render();
    const arrow = mkImg('arrow', 50, 31.5, 4.5, 3.5, 'arrow'); scene.append(arrow);
    const tags = [tag('O 對', 25.6, 30), tag('X 錯', 74.4, 30)]; tags.forEach(t => t.classList.add('mid', 'oxbtn')); scene.append(...tags);
    let wandering = true;
    (async () => {
      while (wandering) {
        await sleep(rnd(500, 1100)); if (!wandering) break;
        const a = pick(npcs); if (a.busy) continue;
        a.busy = true; const side = Math.random() < .5 ? a.side : 1 - a.side, tx = rnd(PX[side][0] + 3, PX[side][1] - 3);
        a.side = side; await a.walkTo(tx, Math.abs(tx - a.x) * 28 + 200); a.busy = false;
      }
    })();
    const k = await choose(scene, tags);
    wandering = false; tags.forEach(t => anim(t, [{ opacity: 1 }, { opacity: 0 }], 300));
    SFX.click();
    // 你走過去
    const kx = k === 0 ? 25.6 : 74.4;
    const follow = setInterval(() => at(arrow, kid.x, 31.5), 30);
    await kid.walkTo(kx, 900);
    // 其他人最後站定：兩邊至少兩個人
    await sleep(300);
    const sides = shuffle([0, 0, 1, 1, Math.random() < .5 ? 0 : 1, Math.random() < .5 ? 0 : 1]);
    const used = [0, 0], order = [shuffle(SPOTS[0]), shuffle(SPOTS[1])];
    npcs.forEach((a, i) => { a.side = sides[i]; });
    await Promise.all(npcs.map(async a => { await idle(a); const x = order[a.side][used[a.side]++] + rnd(-1, 1); await a.walkTo(x, Math.abs(x - a.x) * 18 + 200); }));
    // 有人最後一刻改變心意
    const ch = pick(npcs); ch.say('等等！我要換邊！', 1200); await sleep(700); SFX.whoosh();
    ch.side = 1 - ch.side; { const x = MID[ch.side] + pick([-1, 1]) * rnd(10, 14); await ch.walkTo(x, Math.abs(x - ch.x) * 14 + 200); }
    // 倒數：光束左右掃、招牌輪流亮
    beams.forEach(b => b.style.opacity = 1);
    const big = at(el('div', 'big', '3'), 50, 13); big.style.fontSize = U(8); scene.append(big);
    kid.set('stand', 'scared');
    for (const n of [3, 2, 1]) {
      big.textContent = n; anim(big, [{ scale: 1.6, opacity: 0 }, { scale: 1, opacity: 1 }], 250);
      SFX.beat(); SFX.drum(8);
      for (let j = 0; j < 4; j++) {
        const s = j % 2; signs[s].src = sp(s ? 'signXlit' : 'signOlit'); signs[1 - s].src = sp(s ? 'signO' : 'signX');
        beams.forEach((b, i) => b.style.rotate = ((j % 2 ? 1 : -1) * (i ? -1 : 1) * 18) + 'deg');
        tone(600 + j * 80 + (3 - n) * 200, .05, 'square', .03);
        await sleep(n === 1 ? 260 : 190);
      }
    }
    big.remove(); signs[0].src = sp('signO'); signs[1].src = sp('signX'); beams.forEach(b => b.style.opacity = 0);
    await sleep(500);
    await revealFlash(scene);
    const ok = k === ans, bad = 1 - ans;
    signs[ans].src = sp(ans ? 'signXlit' : 'signOlit'); anim(signs[ans], [{ scale: 1 }, { scale: 1.12 }, { scale: 1 }], 500);
    beams[ans].style.rotate = '0deg'; beams[ans].style.opacity = 1;
    const losers = npcs.filter(a => a.side === bad).concat(ok ? [] : [kid]);
    const winners = npcs.filter(a => a.side === ans).concat(ok ? [kid] : []);
    losers.forEach(a => a.set('stand', 'scared')); arrow.remove(); clearInterval(follow);
    await sleep(350);
    // 翻板
    SFX.click(); tone(160, .3, 'sawtooth', .08, 0, 60);
    anim(panels[bad], [{ transform: 'scaleY(1)', filter: 'none' }, { transform: 'scaleY(.08)', filter: 'brightness(.35)' }], 380, { easing: 'cubic-bezier(.6,0,1,1)' });
    await sleep(120);
    losers.forEach(a => anim(a.e, [{ transform: 'none' }, { transform: `translateY(-1.5cqw) rotate(${rnd(-8, 8)}deg)`, offset: .2 }, { transform: `translateY(22cqw) rotate(${rnd(-30, 30)}deg)` }], 650, { easing: 'cubic-bezier(.5,0,1,1)' }));
    SFX.whoosh();
    await sleep(620);
    SFX.splash(); noise(.5, .3, 500); shake();
    const cx = (PX[bad][0] + PX[bad][1]) / 2;
    for (let i = 0; i < 10; i++) puff(scene, cx + rnd(-18, 18), 48 + rnd(-1, 2), rnd(5, 9), pick(['#6e4a2a', '#9a6a3f', '#5a3a20']), 900, rnd(-2, 2), -7);
    debris(scene, cx, 46, 26, ['#6e4a2a', '#9a6a3f', '#5a3a20', '#3a2618']);
    winners.forEach(a => a.cheer());
    if (ok) { SFX.win(); confetti(scene); }
    else SFX.lose();
    await sleep(700);
    // 從泥巴裡冒出頭
    const muddy = losers.map(a => { const m = new Actor(scene, a.key, a.x, 53.5, a.s, a.p); m.e.classList.add('mud'); m.set('stand', 'sad'); anim(m.e, [{ transform: 'translateY(4cqw)' }, { transform: 'none' }], 500, { easing: 'ease-out' }); a.e.remove(); return m; });
    await sleep(600);
    if (muddy.length) pick(muddy).say(pick(['噗…', '好多泥巴！', '下次不會錯了']), 1500);
    stamp(scene, ok, ok ? '答對了！' : '掉下去了！', 22);
    return { ok, k };
  } };

/* ---------- 選擇：班會開票 ---------- */
const VOTE = { id: 'vote', name: '🗳️ 班會開票', how: '投票給說對的候選人！一張一張唱票，最後一票才知道誰當選。',
  async play(scene, opts, ans) {
    scene.className = 'scene s-vote'; setBG(scene, 'vote');
    const XS = [25, 45, 65, 85];
    let svg = '<svg class="ov chalkov" viewBox="0 0 100 62.5" aria-hidden="true"></svg>';
    scene.insertAdjacentHTML('beforeend', svg); svg = scene.querySelector('.chalkov');
    const counts = [0, 0, 0, 0], cnt = [];
    XS.forEach((x, i) => {
      const l = at(el('div', 'chalk', `${i + 1}號`), x, 3.6); scene.append(l);
      const c = at(el('div', 'vcount', '0'), x, 18.6); scene.append(c); cnt.push(c);
    });
    const people = shuffle(NPC).slice(0, 5);
    const cands = XS.map((x, i) => new Actor(scene, people[i], x, 39.5, .55));
    scene.append(mkImg('desks', 0, 54.4, 100, 8.75, 'desks'), mkImg('podium', .2, 49.4, 15, 12.5, 'podium'));
    const leader = new Actor(scene, people[4], 7.7, 50.5, .55); leader.p = { ...leader.p, accessory: 'glasses' }; leader.key += 'g'; leader.render();
    const box = mkImg('box', 2.7, 41.5, 10, 9, 'vbox'); scene.append(box);
    const cards = opts.map((o, i) => { const c = el('button', 'vcard pp' + ([...o].length > 18 ? ' long' : ''), `<i>${i + 1}號</i>${esc(o)}`); c.type = 'button'; at(c, XS[i], 41.5); return c; });
    scene.append(...cards);
    cands.forEach((c, i) => setTimeout(() => c.hop(1, 1), T(i * 200)));
    const k = await choose(scene, cards);
    SFX.click();
    // 你的一票飛進票箱
    const mine = mkImg('ballot', XS[k], 46, 6.25, 5, 'ballotfly'); scene.append(mine);
    await tween(700, t => at(mine, XS[k] + (7.7 - XS[k]) * t, 46 - 16 * Math.sin(Math.PI * t) - 4 * t), ease.io);
    await anim(mine, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(2cqw) scale(.5)', opacity: 0 }], 250); mine.remove();
    SFX.pop(); anim(box, [{ scale: 1 }, { scale: '1.08 .92' }, { scale: 1 }], 260, { fill: 'none' });
    cards.forEach((c, i) => { if (i !== k) c.classList.remove('dim'); });
    leader.say('開票囉！', 1100); await sleep(1200);
    // 劇本：對手一路領先，最後打成平手，最後一票揭曉
    const R = k !== ans ? k : pick([0, 1, 2, 3].filter(i => i !== ans)), others = [0, 1, 2, 3].filter(i => i !== ans && i !== R);
    const C = ans, seq = [R, others[0], R, C, R, others[1] ?? others[0], C, R, C, C, R, C];
    const draw = i => {
      const n = ++counts[i], g = n <= 5 ? 0 : 1, s = (n - 1) % 5, gx = XS[i] + (g ? 1.2 : -7.2), gy = 9;
      const L = [[gx + .4, gy, gx + 5.8, gy], [gx + 3.1, gy, gx + 3.1, gy + 6], [gx + 3.1, gy + 3, gx + 5.4, gy + 3], [gx + 1, gy + 2.6, gx + 1, gy + 6], [gx, gy + 6, gx + 6.2, gy + 6]][s];
      const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      ln.setAttribute('x1', L[0]); ln.setAttribute('y1', L[1]); ln.setAttribute('x2', L[2]); ln.setAttribute('y2', L[3]); ln.setAttribute('class', 'stroke');
      svg.append(ln); chalkSnd(); cnt[i].textContent = n;
      anim(cnt[i], [{ scale: 1.6 }, { scale: 1 }], 250, { fill: 'none' });
    };
    const lead = () => { const m = Math.max(...counts); return counts.filter(c => c === m).length === 1 ? counts.indexOf(m) : -1; };
    const readOne = async (i, slow) => {
      const b = mkImg('ballot', 7.7, 42, 6.25, 5, 'ballotfly'); scene.append(b);
      await tween(slow ? 900 : 300, t => at(b, 7.7 + 6 * t, 42 - 4 * t), ease.out);
      let slip = null;
      if (slow) {
        // 最後一票：慢慢打開、鏡頭推近、閃光
        zoom(scene, 12, 70, 1.5, 1400);
        slip = at(el('div', 'slipv pp', '？'), 12, 38); scene.append(slip); b.remove();
        for (let j = 0; j < 6; j++) { SFX.beat(); anim(slip, [{ scale: 1 }, { scale: 1.06 }, { scale: 1 }], 280, { fill: 'none' }); await sleep(420 - j * 30); }
        await revealFlash(scene);
        slip.textContent = `${i + 1}號`; zoom(scene, 12, 70, 1, 500);
      } else { slip = at(el('div', 'slipv pp small', `${i + 1}號`), 12, 40); scene.append(slip); b.remove(); }
      leader.say(`${i + 1}號！`, slow ? 1600 : 520);
      await sleep(slow ? 700 : 380);
      await tween(slow ? 500 : 260, t => at(slip, 12 + (XS[i] - 12) * t, 40 - 26 * t), ease.in); slip.remove();
      const before = lead(); draw(i); const after = lead();
      if (after === i && before !== i) { cands[i].hop(1, 1.4); }
    };
    const banner = el('div', 'commentary', ''); scene.append(banner); banner.hidden = true;
    for (let j = 0; j < seq.length; j++) {
      await readOne(seq[j], false);
      const L = lead();
      if (j === 7) { banner.hidden = false; banner.textContent = `${R + 1}號遙遙領先！`; }
      if (j === 9) banner.textContent = '追上來了，拉鋸戰！';
      if (j === seq.length - 1) { banner.textContent = `${counts[R]} 比 ${counts[C]} 平手！最後一票…`; SFX.drum(12); }
      await sleep(j < 6 ? 180 : j < 10 ? 380 : 650);
      void L;
    }
    cands.forEach(c => c.set('stand', 'scared'));
    await readOne(C, true);
    banner.textContent = `${C + 1}號當選！`;
    const ok = k === ans;
    const ros = mkImg('rosette', XS[C] + 1.5, 31, 5.6, 8, 'rosette'); scene.append(ros);
    anim(ros, [{ scale: 0, rotate: '-40deg' }, { scale: 1.3, rotate: '10deg' }, { scale: 1, rotate: '0deg' }], 500);
    cards[C].classList.add('win'); cards[C].classList.remove('dim');
    cands.forEach((c, i) => i === C ? c.cheer() : c.sad());
    if (ok) { SFX.win(); confetti(scene); } else SFX.lose();
    await sleep(400);
    stamp(scene, ok, ok ? '你投對人了！' : '你投的落選了', 13);
    return { ok, k };
  } };

/* ---------- 題組：小偵探破案 ---------- */
const DETECT = { id: 'detect', name: '🔍 小偵探破案', how: '先讀案件檔案（題目卡裡的文章），再從軟木板上挑出真正的線索！',
  async play(scene, q, onItem) {
    scene.className = 'scene s-detect'; setBG(scene, 'detect');
    const n = q.items.length;
    const bar = at(el('div', 'cluebar', ''), 1.5, 1.5); scene.append(bar);
    const found = [];
    const paint = () => { bar.innerHTML = '線索 ' + q.items.map((_, i) => `<b class="${found[i] === true ? 'got' : found[i] === false ? 'miss' : ''}">${found[i] === true ? '★' : found[i] === false ? '✕' : '?'}</b>`).join(''); };
    paint();
    const det = new Actor(scene, '泓', 16, 58, .7);
    const file = mkImg('file', 21, 34.3, 11, 8.5, 'cfile'); scene.append(file);
    let score = 0;
    const CX = [45.5, 77.5], CY = [11.5, 28.5];
    for (let it = 0; it < n; it++) {
      const item = q.items[it];
      const order = shuffle(item.o.map((_, i) => i)), opts = order.map(i => item.o[i]), ans = order.indexOf(item.a);
      onItem(it, item);
      det.move(16, 58); det.set('stand', '');
      const cards = opts.map((o, i) => {
        const c = el('button', 'ecard pp', esc(o)); c.type = 'button';
        c.style.rotate = rnd(-3, 3) + 'deg'; at(c, CX[i % 2], CY[i >> 1]);
        { const p = pimg(sp('pin'), 3, 3); p.className = 'px pin'; c.append(p); }
        return c;
      });
      scene.append(...cards);
      cards.forEach((c, i) => anim(c, [{ transform: 'translateY(-30cqw)', opacity: 0 }, { transform: 'none', opacity: 1 }], 380, { delay: i * 90, easing: 'cubic-bezier(.3,1.4,.6,1)' }));
      det.say(it === 0 ? '開始調查！' : '下一條線索…', 1000);
      scene.classList.remove('locked');
      const k = await choose(scene, cards);
      SFX.click();
      await det.walkTo(26, 600); det.say('讓我仔細看看…', 1400);
      const lens = mkImg('lens', 30, 50, 16, 16, 'lensE'); scene.append(lens);
      const tx = CX[k % 2], ty = CY[k >> 1];
      await tween(600, t => at(lens, 30 + (tx - 30) * t, 50 + (ty - 50) * t), ease.io);
      cards[k].classList.add('zoomed');
      for (let r = 0; r < 3; r++) {
        SFX.beat();
        await tween(560 - r * 60, t => at(lens, tx + Math.cos(t * Math.PI * 2) * 4, ty + Math.sin(t * Math.PI * 2) * 2.2));
      }
      tone(1400, .05, 'square', .04); await sleep(400);
      await revealFlash(scene);
      lens.remove(); cards[k].classList.remove('zoomed');
      const ok = k === ans; found[it] = ok; paint(); if (ok) score++;
      if (ok) {
        cards[k].classList.add('good'); cards[k].append(el('span', 'emark ok', '線索！'));
        SFX.win(); det.cheer(); for (let i = 0; i < 12; i++) debris(scene, tx, ty, 1, ['#ffd166', '#fff3c4']);
      } else {
        cards[k].append(el('span', 'emark bad', '假線索'));
        SFX.lose(); det.sad(); det.say('咦？不是這個…', 1300);
        await sleep(500);
        anim(cards[k], [{ transform: 'none' }, { transform: `translateY(4cqw) rotate(${rnd(-25, 25)}deg) scale(.8)`, offset: .4 }, { transform: `translateY(${60 - ty}cqw) rotate(${rnd(-80, 80)}deg) scale(.6)`, opacity: 0 }], 900, { easing: 'cubic-bezier(.5,0,1,1)' });
        await sleep(500); cards[ans].classList.add('good', 'hint'); cards[ans].append(el('span', 'emark ok', '在這裡'));
      }
      cards.forEach((c, i) => { if (i !== k && i !== ans) c.classList.add('dim'); });
      await onItem(it, item, ok, item.o[item.a]);
      // 收線索：正確的卡飛進案件檔案
      SFX.whoosh();
      await Promise.all(cards.map((c, i) => i === ans ? anim(c, [{ transform: 'none', opacity: 1 }, { transform: `translate(${26.5 - CX[i % 2]}cqw, ${38 - CY[i >> 1]}cqw) scale(.2)`, opacity: 0 }], 600, { easing: 'ease-in' }) : anim(c, [{ opacity: 1 }, { opacity: 0 }], 300)));
      cards.forEach(c => c.remove());
      anim(file, [{ scale: 1 }, { scale: 1.15 }, { scale: 1 }], 300, { fill: 'none' });
    }
    // 破案：燈暗、聚光燈打在小偵探身上
    det.move(50, 58);
    const dark = el('div', 'spot'); scene.append(dark);
    anim(dark, [{ opacity: 0 }, { opacity: 1 }], 500);
    SFX.drum(14); await sleep(1100);
    await revealFlash(scene);
    const all = score === n;
    if (score >= Math.ceil(n * .6)) { det.cheer(); SFX.win(); if (all) confetti(scene, 70); } else det.sad();
    stamp(scene, score >= Math.ceil(n * .6), all ? '破案了！' : `找到 ${score}/${n} 條線索`, 26);
    return { score, total: n };
  } };

/* ======================================================================
   第三批遊戲：獨木橋、保險箱、送貨卡車、鑰匙開鎖、火車、信鴿、實驗室
   ====================================================================== */
const fitCls = t => t.length <= 4 ? 'f1' : t.length <= 9 ? 'f2' : t.length <= 15 ? 'f3' : t.length <= 24 ? 'f4' : 'f5';
function lbl(text, x, y, w, cls = '') { const b = el('button', `lbl pp ${fitCls(text)} ${cls}`, esc(text)); b.type = 'button'; at(b, x, y); b.style.width = U(w); return b; }
const img = (src, x, y, w, h, cls = '') => { const i = pimg(src, w, h); i.className = 'px ' + cls; at(i, x, y); return i; };
const hide = els => els.forEach(e => anim(e, [{ opacity: 1 }, { opacity: 0 }], 300).then(() => e.style.visibility = 'hidden'));
function rise(scene, src, x, y, n, w = 3) { for (let i = 0; i < n; i++) { const s = img(src, x + rnd(-6, 6), y, w, w, 'fx'); scene.append(s); s.animate([{ transform: 'translateY(0) scale(.4)', opacity: 0 }, { transform: `translate(${rnd(-4, 4)}cqw, -6cqw) scale(1)`, opacity: 1, offset: .3 }, { transform: `translate(${rnd(-6, 6)}cqw, -18cqw) scale(1.1)`, opacity: 0 }], { duration: T(rnd(1200, 1900)), delay: T(i * 120), fill: 'forwards' }); } }
async function heart(n, gap = 420, el2) { for (let i = 0; i < n; i++) { SFX.beat(); if (el2) anim(el2, [{ scale: 1 }, { scale: 1.06 }, { scale: 1 }], 260, { fill: 'none' }); await sleep(gap - i * 25); } }

/* ---------- 是非：獨木橋 ---------- */
const BRIDGE = { id: 'bridge', name: '🌉 吊橋過峽谷', how: '上面的吊橋是 O、下面的是 X。走錯的那座，走到一半木板會斷掉！',
  async play(scene, ans) {
    scene.className = 'scene s-bridge'; setBG(scene, 'bridge');
    const FY = [27.5, 43.75], X0 = 18.75, X1 = 81.25, N = 13, PW = (X1 - X0) / N;
    // 橋面：木板和繩子用同一條曲線，搖晃時一起動（波浪從左傳到右）
    const sag = [0, 0], wob = [0, 0], amp = [0, 0], clock = [0, 0], broken = [new Set(), new Set()];
    const deckY = (b, t, i) => FY[b] + 4 * t * (1 - t) * (1.6 + sag[b] + wob[b]) + Math.sin(clock[b] * 5 - i * .9) * amp[b] * Math.sin(Math.PI * t);
    let svg = '<svg class="ov ropes" viewBox="0 0 100 62.5" aria-hidden="true">';
    FY.forEach((y, b) => { svg += `<path data-b="${b}" data-r="0"/><path data-b="${b}" data-r="1"/><path data-b="${b}" data-r="2" class="hang"/>`; });
    scene.insertAdjacentHTML('beforeend', svg + '</svg>');
    const ropes = [...scene.querySelectorAll('.ropes path')];
    const planks = FY.map((y, b) => Array.from({ length: N }, () => { const p = img(sp('plank'), 0, 0, PW + .2, 2.5, 'plank'); scene.append(p); return p; }));
    const layout = b => {
      const pts = [];
      for (let i = 0; i < N; i++) {
        const t = (i + .5) / N, y = deckY(b, t, i), yl = deckY(b, i / N, i - .5), yr = deckY(b, (i + 1) / N, i + .5);
        pts.push([X0 + (i + .5) * PW, y]);
        if (broken[b].has(i)) continue;
        const p = planks[b][i]; at(p, X0 + i * PW, y - .3); p.style.rotate = (Math.atan2(yr - yl, PW) * 180 / Math.PI) + 'deg';
      }
      const hand = i => { const t = (i + .5) / N; return FY[b] - 6.5 + 4 * t * (1 - t) * (1.2 + sag[b] * .6 + wob[b] * .8) + Math.sin(clock[b] * 5 - i * .9 - .6) * amp[b] * .6 * Math.sin(Math.PI * t); };
      ropes.filter(p => +p.dataset.b === b).forEach(p => {
        const r = +p.dataset.r;
        if (r === 0) p.setAttribute('d', `M${X0} ${FY[b] - .2} ` + pts.map(([x, y]) => `L${x} ${y - .2}`).join(' ') + ` L${X1} ${FY[b] - .2}`);
        else if (r === 1) p.setAttribute('d', `M${X0} ${FY[b] - 6.7} ` + pts.map(([x], i) => `L${x} ${hand(i)}`).join(' ') + ` L${X1} ${FY[b] - 6.7}`);
        else p.setAttribute('d', pts.filter((_, i) => i % 2 === 0 && !broken[b].has(i)).map(([x, y]) => { const i = Math.round((x - X0) / PW - .5); return `M${x} ${y - .3} L${x} ${hand(i)}`; }).join(' '));
      });
    };
    const footAt = (b, x) => { const t = (x - X0) / (X1 - X0); if (t <= 0 || t >= 1) return FY[b]; const i = Math.min(N - 1, Math.floor(t * N)); return deckY(b, t, i + (t * N - i) - .5) - .3; };
    layout(0); layout(1);
    FY.forEach(y => [X0 - 1, X1 - 1.4].forEach(x => scene.append(img(sp('post'), x, y - 7.5, 2.5, 7.5, 'post'))));
    const kid = new Actor(scene, '你', 8, 27.5, .55); kid.p = { ...kid.p, accessory: 'cap' }; kid.key = '你cap'; kid.render();
    const tags = [tag('O 對', 50, 16), tag('X 錯', 50, 34)]; tags.forEach(t => t.classList.add('mid', 'oxbtn')); scene.append(...tags);
    const k = await choose(scene, tags); hide(tags); SFX.click();
    if (k === 1) { const x0 = kid.x; kid.set('stand', ''); await tween(600, t => kid.move(x0 + 4 * t, 27.5 + 16.25 * t - 6 * Math.sin(Math.PI * t)), ease.io); SFX.pop(); }
    const fy = FY[k];
    const footY = x => footAt(k, x);
    // 走路時橋面跟著腳步輕輕晃
    let walking = true; (async () => { while (walking) { clock[k] += .08; amp[k] = .35; layout(k); await sleep(40); } amp[k] = 0; layout(k); })();
    // 一步一步走到中間，木板嘎吱作響
    kid.set('right', '', true);
    await tween(2600, t => { const x = kid.x + (50 - kid.x) * Math.min(1, t * .05 + .02); kid.move(x, footY(x)); if (Math.random() < .04) tone(rnd(140, 200), .08, 'sawtooth', .04); });
    walking = false; await sleep(60);
    kid.move(50, footY(50)); kid.set('stand', 'scared');
    const sweat = at(el('div', 'sweat'), 53, footY(50) - 10); scene.append(sweat);
    // 搖晃
    let live = true; const shakeLoop = (async () => { let t = 0; while (live) { t += .06; clock[k] += .09; amp[k] = Math.min(1.6, .5 + t * .45); wob[k] = Math.sin(t * 9) * (.6 + t * .3); layout(k); kid.move(50, footY(50)); kid.e.style.rotate = Math.sin(clock[k] * 5 - 6) * (2 + t * 2) + 'deg'; if (Math.random() < .08) tone(rnd(120, 190), .09, 'sawtooth', .04); await sleep(40); } })();
    noise(1.4, .12, 700); await heart(4, 480);
    live = false; await shakeLoop; wob[k] = 0; amp[k] = 0; layout(k); kid.move(50, footY(50)); kid.e.style.rotate = '0deg'; sweat.remove();
    await revealFlash(scene);
    const ok = k === ans;
    if (ok) {
      kid.set('right', 'happy', true);
      await tween(1500, t => { const x = 50 + (88 - 50) * t; kid.move(x, footY(x)); });
      kid.move(88, fy); const f = img(sp('flag'), 92, fy - 10, 7.5, 10, 'flagp'); scene.append(f);
      anim(f, [{ transform: 'translateY(4cqw) scaleY(0)' }, { transform: 'none' }], 400, { easing: 'cubic-bezier(.3,1.6,.6,1)' });
      SFX.win(); confetti(scene); kid.cheer(); stamp(scene, true, '安全過橋！', 14);
    } else {
      SFX.snip(); tone(120, .4, 'sawtooth', .1, 0, 40);
      const mid = Math.floor((50 - X0) / PW);
      [mid - 1, mid, mid + 1].forEach(i => broken[k].add(i));
      [mid - 1, mid, mid + 1].forEach((i, j) => { const p = planks[k][i]; if (p) anim(p, [{ transform: 'none' }, { transform: `translate(${rnd(-3, 3)}cqw, 40cqw) rotate(${rnd(-200, 200)}deg)` }], 1100, { delay: j * 60, easing: 'cubic-bezier(.5,0,1,1)' }); });
      sag[k] = 3; layout(k);
      await sleep(120); SFX.whoosh();
      kid.set('stand', 'scared');
      await tween(800, t => kid.move(50, footY(50) + (58 - footY(50)) * t * t));
      SFX.splash(); noise(.6, .3, 900);
      for (let i = 0; i < 10; i++) puff(scene, 50 + rnd(-8, 8), 55, rnd(4, 7), pick(['#a2d8f6', '#78c3f0', '#ffffff']), 900, rnd(-3, 3), -8);
      debris(scene, 50, 54, 14, ['#a2d8f6', '#ffffff', '#78c3f0']);
      // 泡在河裡：救生圈套在腰上，身體下半截在水面下，跟著水波上下漂
      const W = 54.4, s = kid.s;
      const tb = img(sp('tubeBack'), 50 - 6.25, W - 2.8, 12.5, 3.1, 'tubeB'), tf = img(sp('tubeFront'), 50 - 6.25, W - .3, 12.5, 3.1, 'tubeF');
      const wf = img(sp('waterFront'), 0, 53.75, 100, 8.75, 'waterF');
      scene.append(tb, wf, tf);
      kid.move(50, W - 13 * s + 20 * s); kid.set('cheer', 'sad', true);
      const ripple = setInterval(() => { if (!scene.isConnected) return clearInterval(ripple); const r = at(el('div', 'ripple'), 50, W + .6); scene.append(r); r.animate([{ transform: 'scale(.6)', opacity: .9 }, { transform: 'scale(2.4)', opacity: 0 }], { duration: T(1400), fill: 'forwards' }).finished.then(() => r.remove()); }, 700);
      [kid.e, tb, tf].forEach(e => e.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(.7cqw)' }, { transform: 'translateY(0)' }], { duration: T(1200), iterations: Infinity, easing: 'ease-in-out' }));
      SFX.lose(); await sleep(500); kid.say('救命～', 1800); stamp(scene, false, '木板斷了！', 14);
    }
    return { ok, k };
  } };

/* ---------- 數學：保險箱密碼 ---------- */
const SAFE = { id: 'safe', name: '🔐 金庫保險箱', how: '四張紙條是四組密碼，選出正確答案那一組，保險箱才會打開！',
  async play(scene, opts, ans) {
    scene.className = 'scene s-safe'; setBG(scene, 'vault');
    const SX = 6, SY = 16, W = 32.5, H = 36.25;
    scene.append(img(sp('safeIn'), SX + 3.1, SY + 3.1, 26.25, 28.75, 'safein'));
    const door = at(size(el('div', 'sdoor'), W, H), SX, SY); scene.append(door);
    door.append(img(sp('safe'), 0, 0, W, H));
    const lcd = at(size(el('div', 'slcd', '- - - -'), 16.25, 4.4), 8.1, 6.25); door.append(lcd);
    const dial = img(sp('dial'), 5.3, 13.4, 10.6, 10.6, 'dial'), hand = img(sp('handle'), 17.2, 13.4, 10.6, 10.6, 'handle'); door.append(dial, hand);
    const siren = img(sp('siren'), SX + W / 2 - 3.1, SY - 5, 6.25, 5, 'siren'); siren.style.opacity = 0; scene.append(siren);
    const kid = new Actor(scene, '你', 48, 56, .6); kid.p = { ...kid.p, accessory: 'cap' }; kid.key = '你cap'; kid.render();
    const tags = opts.map((o, i) => lbl(o, 75, 4 + i * 12.6, 36, 'note'));
    scene.append(...tags);
    const k = await choose(scene, tags); SFX.click();
    // 紙條飛到保險箱
    const tg = tags[k]; hide(tags.filter((_, i) => i !== k));
    await anim(tg, [{ transform: 'none' }, { transform: `translate(${SX + 16 - 75}cqw, ${SY + 6 - (4 + k * 12.6)}cqw) scale(.35)`, opacity: 0 }], 650, { easing: 'ease-in' });
    kid.walkTo(SX + W + 12, 700);
    // 一個字一個字輸入
    lcd.textContent = ''; const code = opts[k];
    for (const ch of code) { lcd.textContent += ch; tone(1600 + Math.random() * 300, .05, 'square', .04); await sleep(code.length > 6 ? 90 : 170); }
    await sleep(300);
    // 轉密碼盤
    for (const deg of [-200, 140, -90, 60]) { const d0 = parseFloat(dial.style.rotate) || 0; await tween(420, t => { dial.style.rotate = (d0 + deg * t) + 'deg'; if (Math.random() < .3) SFX.tick(); }, ease.io); await sleep(120); }
    // 轉把手：卡、卡、卡…
    for (let i = 1; i <= 3; i++) { SFX.click(); tone(220, .06, 'square', .05); hand.style.rotate = (i * 18) + 'deg'; anim(door, [{ translate: '0 0' }, { translate: '.3cqw 0' }, { translate: '0 0' }], 120, { fill: 'none' }); await heart(1, 520); }
    kid.set('stand', 'scared'); await sleep(300);
    await revealFlash(scene);
    const ok = k === ans;
    if (ok) {
      lcd.textContent = 'OPEN'; lcd.classList.add('ok');
      await tween(400, t => hand.style.rotate = (54 + 126 * t) + 'deg', ease.out); tone(180, .5, 'sawtooth', .05, 0, 90);
      await anim(door, [{ transform: 'perspective(60cqw) rotateY(0)' }, { transform: 'perspective(60cqw) rotateY(-105deg)' }], 900, { easing: 'cubic-bezier(.4,0,.2,1)' });
      const glow = at(size(el('div', 'glow'), 40, 40), SX + 16, SY + 18); scene.append(glow);
      for (let i = 0; i < 22; i++) { const c = img(sp('coin'), SX + 16, SY + 18, 3.4, 3.4, 'fx'); scene.append(c); const vx = rnd(-10, 40), vy = rnd(-28, -10); c.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${vx * .6}cqw, ${vy}cqw)`, offset: .45 }, { transform: `translate(${vx}cqw, ${42 - SY - 18 + rnd(0, 4)}cqw)` }], { duration: T(rnd(900, 1400)), delay: T(i * 30), easing: 'cubic-bezier(.2,.6,.6,1)', fill: 'forwards' }); if (i % 4 === 0) setTimeout(() => SFX.clink(), T(i * 30 + 900)); }
      SFX.win(); kid.cheer(); stamp(scene, true, '打開了！', 14);
    } else {
      lcd.textContent = 'ERROR'; lcd.classList.add('bad'); SFX.lose();
      siren.style.opacity = 1; siren.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(2.2)' }], { duration: T(240), iterations: 12, direction: 'alternate' });
      const red = el('div', 'redalert'); scene.append(red);
      for (let i = 0; i < 6; i++) { tone(880, .18, 'square', .05, i * 300); tone(660, .18, 'square', .05, i * 300 + 150); }
      await sleep(500);
      // 拳擊手套彈出來
      // 從保險箱側邊彈出，正好打在臉上
      const sx = SX + W - 1.5, sy = kid.y - 14 * kid.s, L = Math.max(2, kid.x - 2.5 - 11 - sx);
      const spring = el('div', 'spring'); at(spring, sx, sy); scene.append(spring);
      const gl = img(sp('glove'), sx, sy - 4.7, 11, 9.4, 'glove'); scene.append(gl);
      SFX.pop(); await tween(180, t => { spring.style.width = U(L * t); at(gl, sx + L * t, sy - 4.7); }, ease.in);
      shake(); noise(.2, .35, 600); tone(110, .15, 'square', .1);
      const pow = at(el('div', 'dmg', 'POW!'), kid.x + 2, sy - 6); scene.append(pow); anim(pow, [{ scale: .3 }, { scale: 1.3 }, { scale: 1 }], 250);
      kid.set('stand', 'scared');
      anim(kid.e, [{ transform: 'none' }, { transform: 'translateX(7cqw) rotate(16deg)' }, { transform: 'translateX(6cqw) rotate(8deg)' }], 450, { easing: 'cubic-bezier(.2,.8,.4,1)' });
      await tween(450, t => { const w = L + 5 * ease.out(t) + 1.5 * Math.sin(t * Math.PI * 3) * (1 - t); spring.style.width = U(w); at(gl, sx + w, sy - 4.7); });
      const st = at(el('div', 'dizzy', '✦ ✧ ✦'), kid.x + 6, kid.y - 13.5); scene.append(st);
      await sleep(400); stamp(scene, false, '密碼錯了！', 14);
    }
    return { ok, k };
  } };

/* ---------- 應用題：送貨卡車 ---------- */
const TRUCK = { id: 'truck', name: '🚚 送貨到府', how: '客人訂的是正確答案！把對的那一箱裝上卡車送過去，打開才知道有沒有送對。',
  async play(scene, opts, ans) {
    scene.className = 'scene s-truck'; setBG(scene, 'sky');
    const world = at(size(el('div', 'world'), 420, 25), 0, 37.5); scene.append(world); world.style.backgroundImage = `url(${sp('road')})`;
    world.append(img(sp('depot'), 1, -16.25, 35, 28.75));
    world.append(img(sp('house'), 345, -16.25, 30, 28.75));
    const truck = at(size(el('div', 'truck'), 30, 16.25), 34, 41.8); truck.append(pimg(sp('truck'))); scene.append(truck);
    // 輸送帶上的四箱貨
    const XS = [14, 38, 62, 86];
    const belt = at(size(el('div', 'belt'), 92, 2), 4, 31 - 37.5); world.append(belt); // 輸送帶是倉庫的一部分，卡車開走時一起往後退
    const crates = XS.map(x => { const c = img(sp('crate'), x - 4.5, 23.1, 9, 7.9, 'crate'); scene.append(c); return c; });
    const tags = opts.map((o, i) => lbl(o, XS[i], 4, 22.5));
    scene.append(...tags);
    const k = await choose(scene, tags); SFX.click();
    hide(tags.filter((_, i) => i !== k)); hide(crates.filter((_, i) => i !== k)); belt.classList.add('run');
    // 箱子沿輸送帶到卡車上方，再掉進車斗
    const c = crates[k]; let cx = XS[k] - 4.5;
    await tween(Math.abs(cx - 44) * 22 + 300, t => at(c, cx + (44 - cx) * t, 23.1));
    belt.classList.remove('run');
    await tween(350, t => at(c, 44, 23.1 + 18.7 * t * t)); SFX.pop(); c.style.zIndex = 5;
    anim(truck, [{ scale: 1 }, { scale: '1.04 .94' }, { scale: 1 }], 220, { fill: 'none' });
    hide([tags[k]]); c.style.visibility = 'hidden';
    // 出發：路往後退，卡車上下顛
    SFX.sputter();
    const bump = truck.animate([{ translate: '0 0' }, { translate: '0 -.5cqw' }, { translate: '0 0' }], { duration: T(240), iterations: Infinity });
    await tween(600, t => at(truck, 34 + 6 * t, 41.8), ease.in);
    await tween(2600, t => { world.style.translate = U(-300 * t) + ' 0'; if (Math.random() < .06) noise(.08, .08, 300); }, ease.io);
    await tween(700, t => at(truck, 40 - 8 * t, 41.8), ease.out);
    bump.cancel(); tone(500, .1, 'square', .05); tone(500, .1, 'square', .05, 160);
    // 客人出來收貨
    const cust = new Actor(scene, '王奶奶', 66, 50, .58); cust.e.style.opacity = 0; anim(cust.e, [{ opacity: 0 }, { opacity: 1 }], 300);
    const box = img(sp('crate'), 52, 41.8, 10, 8.75, 'crate'); scene.append(box);
    const lid = img(sp('lid'), 51.5, 40.4, 11, 2.5, 'lid'); scene.append(lid);
    await cust.walkTo(64, 400); cust.say('我的包裹！', 1000); await sleep(900);
    cust.set('stand', '');
    for (let i = 0; i < 4; i++) { anim(lid, [{ translate: '0 0' }, { translate: `0 -${.6 + i * .3}cqw` }, { translate: '0 0' }], 200, { fill: 'none' }); SFX.beat(); await sleep(480 - i * 30); }
    await revealFlash(scene);
    const ok = k === ans;
    anim(lid, [{ transform: 'none' }, { transform: 'translate(6cqw,-14cqw) rotate(200deg)', opacity: 0 }], 600);
    const pop = at(el('div', 'slipv small', esc(opts[k])), 57, 34); scene.append(pop);
    anim(pop, [{ transform: 'translateY(4cqw) scale(.3)', opacity: 0 }, { transform: 'none', opacity: 1 }], 400, { easing: 'cubic-bezier(.3,1.6,.6,1)' });
    if (ok) { rise(scene, sp('star'), 57, 38, 10, 3.4); SFX.win(); confetti(scene); cust.cheer(); cust.say('就是這個！', 1600); stamp(scene, true, '送對了！', 14); }
    else { pop.classList.add('wrong'); puff(scene, 57, 40, 8, '#d3d1e6'); SFX.lose(); await cust.sad(); cust.say('送錯了啦…', 1600); stamp(scene, false, '送錯了！', 14); }
    return { ok, k };
  } };

/* ---------- 語詞：鑰匙開鎖 ---------- */
const LOCK = { id: 'lock', name: '🗝️ 寶藏大門', how: '四把鑰匙只有一把打得開！選對的那一把插進鎖裡轉轉看。',
  async play(scene, opts, ans) {
    scene.className = 'scene s-lock'; setBG(scene, 'door');
    const torches = [15, 85].map(x => { const t = img(sp('torch')[0], x - 2.5, 3, 5, 7.5, 'torch'); scene.append(t); return t; });
    let f = 0; const fl = setInterval(() => { if (!torches[0].isConnected) return clearInterval(fl); f ^= 1; torches.forEach((t, i) => t.src = sp('torch')[f ^ i]); }, 200);
    const lock = img(sp('lockC'), 43.75, 21, 12.5, 15, 'lock'); scene.append(lock);
    const kid = new Actor(scene, '你', 34, 59, .6); kid.p = { ...kid.p, accessory: 'cap' }; kid.key = '你cap'; kid.render();
    const POS = [[17, 17], [17, 38], [83, 17], [83, 38]];
    const keys = POS.map(([x, y], i) => { scene.append(img(sp('hook'), x - 1.9, y - 5.6, 3.75, 3.75, 'hook')); const kk = img(sp('keys')[i], x - 6.9, y - 2.8, 13.75, 5.6, 'key'); kk.style.rotate = '90deg'; scene.append(kk); return kk; });
    keys.forEach((kk, i) => kk.animate([{ rotate: '86deg' }, { rotate: '94deg' }], { duration: 900 + i * 120, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }));
    const tags = opts.map((o, i) => lbl(o, POS[i][0], POS[i][1] + 5, 27));
    scene.append(...tags);
    const k = await choose(scene, tags); SFX.click(); hide(tags);
    const key = keys[k]; key.getAnimations().forEach(a => a.cancel());
    // 鑰匙飛到鎖前面，轉成橫的
    const [x0, y0] = [POS[k][0] - 6.9, POS[k][1] - 2.8];
    // 鑰匙尖對準鎖孔（鎖孔在 50, 31），再推進去：插進去的那一截被鎖孔吃掉
    const KX = 50, KY = 31, KW = 13.75, sx0 = KX - KW - 1.5, sy0 = KY - 2.8, D = 5.5;
    await tween(700, t => { at(key, x0 + (sx0 - x0) * t, y0 + (sy0 - y0) * t); key.style.rotate = (90 - 90 * t) + 'deg'; }, ease.io);
    key.classList.add('in'); key.style.transformOrigin = `100% 50%`;
    await tween(420, t => { const d = (1.5 + D) * t; at(key, sx0 + d, sy0); key.style.clipPath = `inset(0 ${Math.max(0, d - 1.5) / KW * 100}% 0 0)`; }, ease.in);
    SFX.click(); anim(lock, [{ translate: '0 0' }, { translate: '.4cqw 0' }, { translate: '0 0' }], 120, { fill: 'none' });
    // 慢慢轉：卡…卡…
    for (let i = 1; i <= 3; i++) { key.style.transform = `scaleY(${1 - i * .28})`; tone(300 - i * 30, .06, 'square', .06); anim(lock, [{ translate: '0 0' }, { translate: (i % 2 ? .4 : -.4) + 'cqw 0' }, { translate: '0 0' }], 200, { fill: 'none' }); await heart(1, 600); }
    kid.set('stand', 'scared'); await sleep(250);
    await revealFlash(scene);
    const ok = k === ans;
    if (ok) {
      lock.src = sp('lockO'); SFX.clink(); key.remove();
      anim(lock, [{ transform: 'none' }, { transform: 'translateY(-2cqw) rotate(-10deg)', offset: .2 }, { transform: 'translateY(26cqw) rotate(40deg)', opacity: 0 }], 900, { easing: 'cubic-bezier(.5,0,1,1)' });
      await sleep(400);
      const g = el('div', 'doorglow'); scene.append(g); anim(g, [{ opacity: 0 }, { opacity: 1 }], 600);
      const r = el('div', 'rays'); scene.append(r); r.style.top = '30%';
      const ch = img(sp('chest'), 42.5, 34, 15, 11.25, 'chest'); scene.append(ch);
      anim(ch, [{ transform: 'translateY(8cqw) scale(.4)', opacity: 0 }, { transform: 'none', opacity: 1 }], 600, { easing: 'cubic-bezier(.3,1.5,.6,1)' });
      SFX.win(); confetti(scene); kid.cheer(); stamp(scene, true, '門開了！', 14);
    } else {
      SFX.snip(); tone(90, .3, 'sawtooth', .1, 0, 40);
      const a = key, b = key.cloneNode(); scene.append(b);
      a.style.clipPath = 'inset(0 62% 0 0)'; b.style.clipPath = `inset(0 ${D / KW * 100}% 0 38%)`;
      anim(a, [{ transform: 'scaleY(.2)' }, { transform: 'translate(-3cqw, 26cqw) rotate(-160deg)' }], 900, { easing: 'cubic-bezier(.5,0,1,1)' });
      anim(b, [{ transform: 'scaleY(.2)' }, { transform: 'translate(1cqw, 2cqw) rotate(30deg)' }], 300);
      puff(scene, 50, 30, 6, '#8b8aa3'); shake(); SFX.lose();
      await kid.sad(); kid.say('鑰匙斷了…', 1600); stamp(scene, false, '打不開！', 14);
    }
    return { ok, k };
  } };

/* ---------- 句型：火車連車廂 ---------- */
const TRAIN = { id: 'train', name: '🚂 火車過山洞', how: '幫火車頭接上正確的車廂！穿過山洞後，接錯的車廂會脫落。',
  async play(scene, opts, ans) {
    scene.className = 'scene s-train'; setBG(scene, 'rail');
    // 尺寸（cqw）：鐵軌頂端 y=50；側線頂端 y=31.25。輪子底部都對齊軌道。
    const RT = 50, ST = 31.25, LW = 35, LH = 21.25, CW = 23.75, CH = 16.25, XS = [13, 38, 63, 88];
    const cars = XS.map((x, i) => { const c = img(sp('cars')[i], x - CW / 2, ST - CH + .3, CW, CH, 'car'); scene.append(c); return c; });
    const loco = img(sp('loco'), 26, RT - LH + .3, LW, LH, 'loco'); scene.append(loco);
    const driver = new Actor(scene, '阿哲', 0, 0, .45); driver.e.style.zIndex = 5; driver.p = { ...driver.p, accessory: 'cap' }; driver.key += 'cap'; driver.render();
    const pos = el => [parseFloat(el.style.left), parseFloat(el.style.top)];
    const follow = () => { const [x, y] = pos(loco); driver.move(x + 5.6, y + 13.7); };
    follow();
    // 山洞：洞裡的黑、左柱（火車後面）→ 火車 → 洞口陰影 → 右柱和山（最前面）
    const ML = 62, MY = RT - 41.25;
    const tunnel = (left, flip) => ['holeIn', 'mountBack', 'holeShade', 'mountFront'].map(k => { const m = img(sp(k), left, MY, 45, 43.75, 'tn-' + k + (flip ? ' flip' : '')); scene.append(m); return m; });
    let tn = tunnel(110, false);
    const tags = opts.map((o, i) => lbl(o, XS[i], 2, 23.5));
    scene.append(...tags);
    const smoke = setInterval(() => { if (!loco.isConnected) return clearInterval(smoke); const [x, y] = pos(loco); if (x > 60 || x < -20) return; puff(scene, x + 27.5, y + .5, 3.4, '#ffffff', 1400, -2, -6); }, 450);
    const k = await choose(scene, tags); SFX.click(); hide(tags); hide(cars.filter((_, i) => i !== k));
    // 車廂從側線滑下主線，接在車頭後面
    const c = cars[k]; const [cx0, cy0] = pos(c), cx1 = 26 - CW, cy1 = RT - CH + .3;
    await tween(750, t => at(c, cx0 + (cx1 - 3 - cx0) * t, cy0 + (cy1 - cy0) * t - 5 * Math.sin(Math.PI * t)), ease.io);
    await tween(320, t => at(c, cx1 - 3 + 3 * t, cy1), ease.in); SFX.clink(); tone(200, .1, 'square', .08);
    anim(c, [{ translate: '0 0' }, { translate: '.4cqw 0' }, { translate: '0 0' }], 160, { fill: 'none' });
    const tg = at(el('div', 'cartag', esc(opts[k])), cx1 + CW / 2, cy1 - 3.4); c.after(tg);
    driver.say('出發！', 900);
    // 鏡頭往右：山洞從右邊進來
    await tween(900, t => tn.forEach(m => m.style.left = U(110 - (110 - ML) * ease.out(t))));
    [660, 880].forEach((f, i) => tone(f, .35, 'triangle', .07, i * 380)); await sleep(400);
    const parts = [c, loco, tg], base = parts.map(p => parseFloat(p.style.left));
    const bob = [c, loco].map(e => e.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-.25cqw)' }, { transform: 'translateY(0)' }], { duration: T(220), iterations: Infinity }));
    await tween(3000, t => { const d = 80 * t * t; parts.forEach((p, i) => p.style.left = U(base[i] + d)); follow(); if (Math.random() < .08) noise(.05, .1, 400); });
    // 山洞裡：一片黑，只聽到轟隆隆
    const dark = el('div', 'tunnelDark'); scene.append(dark); await anim(dark, [{ opacity: 0 }, { opacity: 1 }], 300);
    for (let i = 0; i < 8; i++) noise(.12, .18, 260, i * 180);
    await heart(4, 460);
    await revealFlash(scene);
    // 山洞另一頭（左右翻轉的山）
    tn.forEach(m => m.remove()); tn = tunnel(-7, true); dark.remove();
    const ok = k === ans;
    loco.style.left = U(-3); follow();
    if (ok) { c.style.left = U(-3 - CW); tg.style.left = U(-3 - CW / 2); } else { c.style.visibility = 'hidden'; tg.style.visibility = 'hidden'; }
    const go = ok ? [loco, c, tg] : [loco], b2 = go.map(p => parseFloat(p.style.left));
    await tween(2000, t => { const d = 55 * ease.out(t); go.forEach((p, i) => p.style.left = U(b2[i] + d)); follow(); });
    bob.forEach(b => b.cancel());
    if (ok) {
      [880, 1100, 1320].forEach((f, i) => tone(f, .25, 'triangle', .07, i * 180)); SFX.win(); confetti(scene); driver.set('stand', 'happy'); driver.hop(3, 1); driver.say('平安到站！', 1500); stamp(scene, true, '平安到站！', 12);
    } else {
      driver.say('車廂呢？', 1300); SFX.lose(); await sleep(900);
      c.style.visibility = 'visible'; c.style.left = U(6); c.style.zIndex = 5;
      await tween(900, t => c.style.left = U(6 + 14 * ease.out(t)));
      SFX.boom(); await anim(c, [{ transform: 'none' }, { transform: 'translateY(2cqw) rotate(16deg)' }], 350, { easing: 'ease-in' });
      puff(scene, 28, 47, 10, '#d3d1e6'); debris(scene, 28, 47, 10, ['#8b8aa3', '#ffd166']); shake();
      driver.set('stand', 'sad'); await sleep(300); stamp(scene, false, '車廂脫落了！', 12);
    }
    return { ok, k };
  } };

/* ---------- 課文理解：信鴿送信 ---------- */
const DOVE = { id: 'dove', name: '🕊️ 信鴿送信', how: '把寫著正確答案的信交給信鴿，奶奶看完才知道你寫得對不對。',
  async play(scene, opts, ans) {
    scene.className = 'scene s-dove'; setBG(scene, 'roof');
    const clouds = [10, 50, 90].map((x, i) => { const c = el('div', 'cloudpx'); c.style.backgroundImage = `url(${sp('cloud')})`; at(size(c, 16, 6), x, 14 + i * 4); scene.append(c); return c; });
    // 地面：左屋頂頂面 y=40.6（66px），陽台地板 y=41.25
    const kid = new Actor(scene, '你', 22, 40.8, .6); kid.p = { ...kid.p, accessory: 'cap' }; kid.key = '你cap'; kid.render();
    const nana = new Actor(scene, '王奶奶', 90, 41.4, .6);
    scene.append(img(sp('railing'), 70, 34.4, 30, 7.5, 'railing'));
    // 鴿子停在鴿舍的洞口（停腳板 y=38.1）
    const DW = 7.2, DH = 5.85, home = [8.4 - DW / 2 + 1, 38.1 - DH];
    const dove = img(sp('dovePerch'), home[0], home[1], DW, DH, 'dove'); scene.append(dove);
    const peck = dove.animate([{ transform: 'none' }, { transform: 'rotate(8deg)', offset: .1 }, { transform: 'none', offset: .2 }], { duration: 2200, iterations: Infinity });
    let fr = 0, flap = false; const fl = setInterval(() => { if (!dove.isConnected) return clearInterval(fl); if (flap) { fr ^= 1; dove.src = sp('dove')[fr]; } }, 120);
    const XS = [14, 38, 62, 86];
    const tags = opts.map((o, i) => lbl(o, XS[i], 2.5, 22.5, 'env'));
    scene.append(...tags);
    const k = await choose(scene, tags); SFX.click(); hide(tags.filter((_, i) => i !== k));
    // 小朋友把信綁在鴿子腳上
    const env = img(sp('env'), XS[k] - 3.75, 8, 7.5, 5.25, 'envp'); scene.append(env); hide([tags[k]]);
    await kid.walkTo(14.5, 500); kid.set('left');
    await tween(600, t => at(env, XS[k] - 3.75 + (home[0] + 2 - XS[k] + 3.75) * t, 8 + (home[1] + 3 - 8) * t), ease.io);
    env.style.width = U(3.6); env.style.height = U(2.5); kid.say('拜託你了！', 900); await sleep(800);
    // 起飛：先跳出洞口，翅膀拍動，飛越城市（雲往後飄）
    peck.cancel(); flap = true; SFX.whoosh(); kid.set('stand', 'happy');
    const [x0, y0] = home, x1 = 77, y1 = 34.6 - DH + .3;
    await tween(3200, t => {
      const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t - 20 * Math.sin(Math.PI * t) + Math.sin(t * 40) * .6;
      at(dove, x, y); at(env, x + 2.2, y + DH - .8);
      clouds.forEach((c, i) => c.style.translate = U(-30 * t * (1 + i * .3)) + ' 0'); if (Math.random() < .05) tone(rnd(900, 1300), .04, 'sine', .03);
    }, ease.io);
    flap = false; dove.src = sp('dovePerch'); SFX.pop(); env.remove();
    const letter = img(sp('envOpen'), 82, 23, 7, 7.7, 'envp'); letter.style.opacity = 0; scene.append(letter);
    nana.say('有信耶！', 900); await sleep(900);
    anim(letter, [{ opacity: 0, transform: 'scale(.5)' }, { opacity: 1, transform: 'scale(1.2)' }], 400); SFX.pop();
    const think = nana.say('嗯……', 0);
    await heart(4, 470, letter);
    think.remove();
    await revealFlash(scene);
    const ok = k === ans;
    const paper = at(el('div', 'slipv pp small', esc(opts[k])), 68, 17); scene.append(paper);
    anim(paper, [{ transform: 'scale(.3)', opacity: 0 }, { transform: 'none', opacity: 1 }], 350);
    if (ok) { rise(scene, sp('heart'), 88, 28, 8, 3.4); SFX.win(); confetti(scene); nana.cheer(); kid.cheer(); nana.say('寫得真好！', 1600); stamp(scene, true, '送到了！', 12); }
    else { paper.classList.add('wrong'); rise(scene, sp('qmark'), 88, 28, 5, 3); SFX.lose(); nana.sad(); nana.say('看不懂耶…', 1600); kid.sad(); dove.animate([{ transform: 'none' }, { transform: 'translateY(-1cqw) rotate(-15deg)' }, { transform: 'none' }], { duration: 500, iterations: 2 }); stamp(scene, false, '送錯信了！', 12); }
    return { ok, k };
  } };

/* ---------- 自然：神奇實驗室 ---------- */
const LAB = { id: 'lab', name: '🧪 神奇實驗室', how: '把寫著正確答案的藥水倒進燒瓶！倒錯的話……會爆炸喔。',
  async play(scene, opts, ans) {
    scene.className = 'scene s-lab'; setBG(scene, 'lab');
    const FX = 54, cols = ART.SP.bottleCols;
    const burner = img(sp('burner'), FX - 6.9, 33.75, 13.75, 8.75, 'burner'); scene.append(burner);
    const flame = at(el('div', 'flame'), FX, 37.6); scene.append(flame);
    const flask = img(ART.SP.flask('#cfeeff', 0), FX - 10, 11.2, 20, 23, 'flask'); scene.append(flask);
    const doc = new Actor(scene, '米米', 38.5, 42.5, .58); doc.p = { ...doc.p, accessory: 'glasses' }; doc.key += 'g'; doc.render();
    const XS = [12, 28, 72, 88];
    const bots = XS.map((x, i) => { const b = img(ART.SP.bottles[i], x - 5, 27.5, 10, 15, 'bottle'); scene.append(b); return b; });
    const tags = opts.map((o, i) => lbl(o, XS[i], 44, 15.5));
    scene.append(...tags);
    const k = await choose(scene, tags); SFX.click(); hide(tags.filter((_, i) => i !== k));
    const b = bots[k], bx = XS[k] - 5, col = cols[k];
    await tween(800, t => at(b, bx + (FX - 2 - bx) * t, 27.5 - 22 * Math.sin(Math.PI * t * .5)), ease.io);
    await tween(300, t => b.style.rotate = (-120 * t) + 'deg');
    const stream = at(size(el('div', 'stream'), 1, 0), FX + .4, 10.4); stream.style.background = col; scene.append(stream);
    SFX.splash();
    await tween(900, t => { stream.style.height = U(Math.min(1, t * 3) * (12 + 8 * (1 - t))); flask.src = ART.SP.flask(col, Math.round(t * 3)); if (t > .6 && !b.dataset.e) { b.dataset.e = 1; b.src = ART.SP.bottleEmpty; } });
    stream.remove(); await tween(300, t => b.style.rotate = (-120 + 120 * t) + 'deg'); anim(b, [{ opacity: 1 }, { opacity: 0 }], 300);
    // 加熱：冒泡、顏色亂變、越晃越大
    flame.classList.add('big'); doc.say('加熱中…', 1000);
    let live = true;
    const bub = setInterval(() => { if (!live) return clearInterval(bub); const s = img(sp('bub'), FX + rnd(-4, 3), 26, 2, 2, 'fx'); scene.append(s); s.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${rnd(-2, 2)}cqw, -18cqw)`, opacity: 0 }], { duration: T(1100), fill: 'forwards' }).finished.then(() => s.remove()); tone(rnd(600, 1200), .04, 'sine', .03); }, 120);
    for (let i = 0; i < 5; i++) { flask.src = ART.SP.flask(cols[(k + i) % 4], 3); flask.animate([{ rotate: '0deg' }, { rotate: (i % 2 ? 1 : -1) * (2 + i) + 'deg' }, { rotate: '0deg' }], { duration: T(300) }); SFX.beat(); await sleep(460 - i * 30); }
    live = false; doc.set('stand', 'scared');
    await revealFlash(scene);
    const ok = k === ans;
    if (ok) {
      const rb = ['#e8414f', '#ff7a1a', '#ffd166', '#2f9e5b', '#3c8dde', '#8a63e8']; let j = 0;
      const rain = setInterval(() => { if (!flask.isConnected || j > 12) return clearInterval(rain); flask.src = ART.SP.flask(rb[j++ % 6], 3); }, 110);
      const spr = img(sp('sprout'), FX - 6.25, -2, 12.5, 13.75, 'sprout'); scene.append(spr);
      anim(spr, [{ transform: 'translateY(10cqw) scale(0)' }, { transform: 'none' }], 700, { easing: 'cubic-bezier(.3,1.5,.6,1)' });
      rise(scene, sp('star'), FX, 10, 12, 3); flame.classList.remove('big');
      SFX.win(); confetti(scene); doc.cheer(); doc.say('實驗成功！', 1600); stamp(scene, true, '實驗成功！', 9);
    } else {
      await anim(flask, [{ scale: 1 }, { scale: 1.25 }, { scale: 1.1 }, { scale: 1.35 }], 600);
      SFX.boom(); flash(scene); shake();
      flask.remove(); flame.remove();
      for (let i = 0; i < 14; i++) setTimeout(() => puff(scene, FX + rnd(-16, 16), 22 + rnd(-10, 10), rnd(8, 14), pick(['#5d5a77', '#4a4458', '#8b8aa3']), 2000, rnd(-3, 3), -6), T(i * 50));
      for (let i = 0; i < 16; i++) { const s = img(sp('shard'), FX, 22, 2.4, 2.4, 'fx'); scene.append(s); const vx = rnd(-30, 30), vy = rnd(-20, -4); s.animate([{ transform: 'none' }, { transform: `translate(${vx}cqw, ${vy + 34}cqw) rotate(${rnd(200, 800)}deg)` }], { duration: T(1000), easing: 'cubic-bezier(.2,.6,.6,1)', fill: 'forwards' }); }
      doc.pal = SOOT; doc.set('stand', 'scared'); SFX.lose();
      await sleep(900); doc.say('咳咳…', 1500); stamp(scene, false, '爆炸了！', 9);
    }
    return { ok, k };
  } };

/* ---------- 遊戲流程 ---------- */
const KINDS = { '全部': null, '是非': 'tf', '選擇': 'mc', '題組': 'group' };
const POOL = { tf: [OX, BRIDGE], mc: [VOTE, SAFE, TRUCK, LOCK, TRAIN, DOVE, LAB], group: [DETECT] };
const ALL = [...POOL.tf, ...POOL.mc, ...POOL.group];
const KIND_OF = g => Object.keys(POOL).find(k => POOL[k].includes(g));
// 隨機時，選擇題會優先挑最搭科目／題型的遊戲（BEST），其他時候各遊戲都可能出任何科目的選擇題
const BEST = { vote: '社會', safe: '數學', truck: '數學應用題', lock: '國語語詞理解', train: '國語句型', dove: '國語課文理解', lab: '自然' };
const FOR = { ox: '是非題', bridge: '是非題', detect: '題組／閱讀測驗', ...Object.fromEntries(Object.entries(BEST).map(([k, v]) => [k, `選擇題・最常配${v}`])) };
// 依科目、題型挑最適合的遊戲，一半機會換別的（同一種不連續出現）
function prefOf(q) { if (q.k !== 'mc') return null; if (q.s === '數學') return q.c === '應用題' ? TRUCK : SAFE; if (q.s === '自然') return LAB; if (q.s === '社會') return VOTE; return { 語詞理解: LOCK, 句型: TRAIN, 課文理解: DOVE }[q.c] || VOTE; }
const bags = {};
function pickGame(q) {
  if (sel.game !== '隨機') return ALL.find(g => g.id === sel.game);
  const last = run.last, p = prefOf(q);
  if (p && p !== last && Math.random() < .55) return p;
  const b = bags[q.k] = (bags[q.k] && bags[q.k].length ? bags[q.k] : shuffle(POOL[q.k]));
  let g = b.shift(); if (g === last && POOL[q.k].length > 1) { b.push(g); g = b.shift(); }
  return g;
}
/* ---------- 題庫：讀 data/index.json 和各單元檔，題目代號「單元檔#題號」（題組小題「#題號.小題」），和複習小書共用錯題本 kr-wrong-v1 ---------- */
const WB = 'kr-wrong-v1';
const wrongBook = () => new Set(store.get(WB, []));
function markWrong(key, wrong) { const w = wrongBook(); if (wrong) w.add(key); else w.delete(key); store.set(WB, [...w]); }
const dataUrl = file => 'data/' + file.split('/').map(encodeURIComponent).join('/');
const DEF_CAT = { mc: '選擇', tf: '是非', group: '題組' };
const unitCache = new Map();
function loadUnit(meta, grade, subject) {
  if (!unitCache.has(meta.file)) unitCache.set(meta.file, fetch(dataUrl(meta.file)).then(r => { if (!r.ok) throw Error(meta.file); return r.json(); }).then(d => {
    const u = `${grade} ${meta.title}`, out = [];
    (d.questions || []).forEach((x, i) => {
      const key = `${meta.file}#${i}`, base = { key, s: subject, u, c: x.cat || DEF_CAT[x.type], w: x.why || '', unit: meta.file };
      if (x.type === 'tf') out.push({ ...base, k: 'tf', q: x.q, a: !!x.answer, p: x.context || '' });
      else if (x.type === 'mc' && (x.options || []).length >= 2) out.push({ ...base, k: 'mc', q: x.q, o: x.options, a: x.answer, p: x.context || '' });
      else if (x.type === 'group' && (x.items || []).length) out.push({ ...base, k: 'group', p: x.passage, items: x.items.map((it, j) => it.type === 'tf'
        ? { key: `${key}.${j}`, q: it.q, o: ['對（O）', '錯（X）'], a: it.answer ? 0 : 1, w: it.why || '' }
        : { key: `${key}.${j}`, q: it.q, o: it.options, a: it.answer, w: it.why || '' }) });
    });
    return out;
  }));
  return unitCache.get(meta.file);
}
let INDEX = null;
let sel = Object.assign({ grade: '', term: '', subject: '全部', unit: '', cat: '全部', n: 10, game: '隨機' }, store.get('kr-reveal-setup', {}));
const SUBJECTS = ['國語', '數學', '自然', '社會'];
const unitsOf = () => {
  const g = INDEX.grades.find(g => g.name === sel.grade); if (!g) return [];
  return g.subjects.filter(s => SUBJECTS.includes(s.name) && (sel.subject === '全部' || s.name === sel.subject))
    .flatMap(s => s.units.map(u => ({ meta: u, subject: s.name }))).filter(x => !sel.term || x.meta.term === sel.term);
};
let run = null;
const kindOf = () => { const g = ALL.find(g => g.id === sel.game); return g ? KIND_OF(g) : KINDS[sel.cat]; };
const hasWrong = (q, w) => q.k === 'group' ? q.items.some(it => w.has(it.key)) : w.has(q.key);
let POOLQ = [], loadTok = 0;
async function loadPool() {
  const tok = ++loadTok, list = unitsOf().filter(x => !sel.unit || x.meta.file === sel.unit);
  const qs = (await Promise.all(list.map(x => loadUnit(x.meta, sel.grade, x.subject)))).flat();
  if (tok === loadTok) POOLQ = qs;
  return tok === loadTok;
}
const filtered = onlyWrong => { const kind = kindOf(), w = wrongBook(); return POOLQ.filter(q => (!kind || q.k === kind) && (!onlyWrong || hasWrong(q, w))); };
function newScene() { stage.innerHTML = ''; stage.classList.remove('shake'); const sc = el('div', 'scene'); stage.append(sc); return sc; }

function showSetup() {
  document.body.classList.remove('playing'); fit();
  $('#qcard').hidden = true; $('#verdict').hidden = true;
  $('#qn').textContent = 0; $('#qt').textContent = '–'; $('#score').textContent = 0;
  attract(); renderSetup();
}
// 指定遊戲時只依題型篩題，不限科目；說明照實寫
function gameNote(g, n, unitWord) {
  const kind = { tf: '是非題', mc: '選擇題', group: '題組' }[KIND_OF(g)], subj = ((BEST[g.id] || '').match(/國語|數學|自然|社會/) || [])[0];
  const hint = KIND_OF(g) === 'mc' && subj && sel.subject !== subj ? `（這個遊戲最適合${BEST[g.id]}的題目，只想練${subj}就把科目選「${subj}」）` : '';
  return `指定「${g.name}」：會出這個範圍${sel.subject === '全部' ? '所有科目' : sel.subject}的${kind}，共 ${n} ${unitWord}${hint}。`;
}
async function renderSetup() {
  const S = $('#setup'); S.hidden = false;
  const grades = INDEX.grades.map(g => g.name);
  if (!grades.includes(sel.grade)) sel.grade = grades[0];
  const terms = [...new Set(INDEX.grades.find(g => g.name === sel.grade).subjects.flatMap(s => s.units.map(u => u.term)).filter(Boolean))];
  if (sel.term && !terms.includes(sel.term)) sel.term = '';
  const units = unitsOf();
  if (sel.unit && !units.some(x => x.meta.file === sel.unit)) sel.unit = '';
  store.set('kr-reveal-setup', sel);
  const chips = (key, vals, lab) => `<div class="row"><span class="lab">${lab}</span>${vals.map(([v, t]) => `<button type="button" class="opt" data-k="${key}" data-v="${esc(v)}" aria-pressed="${String(sel[key]) === String(v)}">${esc(t)}</button>`).join('')}</div>`;
  const pair = a => a.map(v => [v, v]);
  S.innerHTML = `<h2>選好範圍就開始！每種題型有自己的遊戲</h2>
    ${chips('grade', pair(grades), '年級')}
    ${terms.length > 1 ? chips('term', [['', '全部'], ...pair(terms)], '範圍') : ''}
    ${chips('subject', pair(['全部', ...SUBJECTS]), '科目')}
    <div class="row"><label class="lab" for="unitSel">單元</label><select id="unitSel"><option value="">全部單元</option>${units.map(x => `<option value="${esc(x.meta.file)}" ${x.meta.file === sel.unit ? 'selected' : ''}>${sel.subject === '全部' ? x.subject + '・' : ''}${esc(x.meta.title)}</option>`).join('')}</select></div>
    ${chips('cat', pair(Object.keys(KINDS)), '題型')}
    ${chips('n', [[5, '5 題'], [10, '10 題'], [20, '20 題']], '題數')}
    <div class="row"><span class="lab">遊戲</span><button type="button" class="opt" data-k="game" data-v="隨機" aria-pressed="${sel.game === '隨機'}">隨機</button>${ALL.map(g => `<button type="button" class="opt" data-k="game" data-v="${g.id}" aria-pressed="${sel.game === g.id}">${g.name}</button>`).join('')}</div>
    <p class="small" id="avail">題目讀取中…</p>
    <div class="row"><button type="button" class="go" id="start" disabled>開始玩</button><button type="button" class="opt" id="startWrong" disabled>只練錯題</button></div>
    <div class="games">${ALL.map(g => `<div><b>${g.name}</b><span class="for">${FOR[g.id]}</span>${g.how}</div>`).join('')}</div>
    <p class="small">題目來自複習小書的題庫。選完會先播一段動畫，閃光之後才揭曉；答錯的題目會收進錯題本，和複習小書共用。</p>`;
  S.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
    const k = b.dataset.k; sel[k] = k === 'n' ? +b.dataset.v : b.dataset.v;
    if (k === 'cat') sel.game = '隨機';
    if (k === 'grade' || k === 'term' || k === 'subject') sel.unit = '';
    renderSetup();
  });
  $('#unitSel').onchange = e => { sel.unit = e.target.value; renderSetup(); };
  $('#start').onclick = () => { ac(); start(false); };
  $('#startWrong').onclick = () => { ac(); start(true); };
  let ok;
  try { ok = await loadPool(); } catch { $('#avail').textContent = '題目讀取失敗，請檢查網路後再試一次。'; return; }
  if (!ok || !$('#avail')) return;
  const n = filtered(false).length, nw = filtered(true).length, g = ALL.find(g => g.id === sel.game);
  const unitWord = kindOf() === 'group' ? '組' : '題';
  $('#avail').textContent = n ? (g ? gameNote(g, n, unitWord) : `這個範圍有 ${n} ${unitWord}，每題依科目和題型挑遊戲。`) : '這個範圍沒有這種題目，換個題型或單元看看。';
  $('#start').disabled = !n; $('#startWrong').disabled = !nw; $('#startWrong').textContent = `只練錯題（${nw}）`;
}
function attract() {
  const sc = newScene(); sc.className = 'scene s-ox'; setBG(sc, 'ox');
  sc.append(mkImg('signOlit', 14.4, 6, 22.5, 16.25, 'sign'), mkImg('signXlit', 63.1, 6, 22.5, 16.25, 'sign'), mkImg('panelO', 5, 40, 41.25, 10, 'trap'), mkImg('panelX', 53.75, 40, 41.25, 10, 'trap'), mkImg('oxFront', 0, 50, 100, 12.5, 'front'));
  ['泓', '阿凱', '小芸', '大頭', '米米'].forEach((n, i) => { const a = new Actor(sc, n, [12, 30, 50, 70, 88][i], 47, .55); a.anim = true; a.pose = 'step'; a.f = i % 2; });
}
function start(onlyWrong) {
  let qs = shuffle(filtered(onlyWrong));
  if (!onlyWrong) qs = qs.slice(0, sel.n);
  if (!qs.length) return renderSetup();
  run = { qs, i: 0, score: 0, total: 0, wrong: [], last: null, onlyWrong };
  document.body.classList.add('playing');
  $('#setup').hidden = true; $('#qt').textContent = qs.length;
  next();
}
const KLAB = { tf: '是非', mc: '選擇', group: '題組' };
function showQ(g, q, text, passage) {
  $('#qcard').hidden = false;
  $('#gname').textContent = g.name; $('#qsrc').textContent = `${q.s}${q.c || KLAB[q.k]}・${q.u}`;
  $('#qpass').hidden = !passage; if (passage) $('#qpass').textContent = passage;
  $('#qtext').textContent = text; $('#qhow').textContent = g.how;
  fit();
}
function verdict(ok, ansText, why, label) {
  const V = $('#verdict'); V.hidden = false; V.className = 'panel verdict ' + (ok ? 'ok' : 'bad');
  V.innerHTML = `<h2>${ok ? '答對了！' : '這次沒選對'}</h2><p class="ans">正確答案是<b>${esc(ansText)}</b></p>${why ? `<p class="why">${esc(why)}</p>` : ''}<button type="button" class="go" id="nx">${label}</button>`;
  $('#nx').focus({ preventScroll: true });
  if (innerWidth < 600) V.scrollIntoView({ block: 'nearest', behavior: RM ? 'auto' : 'smooth' });
  return new Promise(r => $('#nx').onclick = () => { V.hidden = true; r(); });
}
async function next() {
  const q = run.qs[run.i]; $('#qn').textContent = run.i + 1;
  const g = pickGame(q); run.last = g; const last = run.i === run.qs.length - 1, label = last ? '看成績' : '下一題';
  $('#verdict').hidden = true;
  const sc = newScene();
  if (q.k === 'group') {
    showQ(g, q, '', q.p);
    const { score, total } = await g.play(sc, q, (i, item, ok, ansText) => {
      if (ok === undefined) { $('#qtext').textContent = `線索 ${i + 1}／${q.items.length}：${item.q}`; return; }
      run.total++; markWrong(item.key, !ok); if (ok) { run.score++; } else run.wrong.push({ q: item.q, a: ansText });
      $('#score').textContent = run.score;
      return sleep(1300).then(() => verdict(ok, ansText, item.w, i === q.items.length - 1 ? '看破案結果' : '下一條線索'));
    });
    await sleep(1500);
    await verdict(score === total, `${score}/${total} 條線索`, score === total ? '每一條線索都找對了，名偵探！' : '回頭看看文章裡的關鍵句，下次一定能全部找到。', label).then(() => {});
  } else {
    let opts, ans, ansText;
    if (q.k === 'tf') { ans = q.a ? 0 : 1; ansText = q.a ? 'O（對）' : 'X（錯）'; showQ(g, q, q.q, q.p); }
    else { const order = shuffle(q.o.map((_, i) => i)); opts = order.map(i => q.o[i]); ans = order.indexOf(q.a); ansText = q.o[q.a]; showQ(g, q, q.q, q.p); }
    window.__ans = ans;
    const { ok } = q.k === 'tf' ? await g.play(sc, ans) : await g.play(sc, opts, ans);
    run.total++; markWrong(q.key, !ok); if (ok) run.score++; else run.wrong.push({ q: q.q, a: ansText });
    $('#score').textContent = run.score;
    await sleep(1500);
    await verdict(ok, ansText, q.w, label);
  }
  run.i++; last ? finish() : next();
}
function finish() {
  document.body.classList.remove('playing'); fit();
  $('#qcard').hidden = true; $('#verdict').hidden = true;
  const n = run.total, s = run.score;
  const sc = newScene(); sc.className = 'scene s-vote'; setBG(sc, 'vote');
  const b = at(el('div', 'big', `${s}/${n}`), 55, 13); b.style.fontSize = U(10); sc.append(b);
  const good = s >= n * .6;
  ['泓', '阿凱', '小芸', '大頭'].forEach((nm, i) => { const a = new Actor(sc, nm, 28 + i * 16, 52, .65); good ? a.cheer() : a.set('stand', 'happy'); });
  if (s >= n * .8) { confetti(sc, 70); SFX.win(); }
  const S = $('#setup'); S.hidden = false;
  S.innerHTML = `<h2>${s === n ? '全部答對，太厲害了！' : good ? `答對 ${s} 題，很不錯！` : `答對 ${s} 題，再練一次會更好！`}</h2>
    ${run.wrong.length ? `<p>這幾題再看一次：</p><ol class="wrongs">${run.wrong.map(w => `<li>${esc(w.q.replace(/\n/g, ' '))} 答案：<b>${esc(w.a)}</b></li>`).join('')}</ol>` : ''}
    <div class="row"><button type="button" class="go" id="again">再玩一次</button><button type="button" class="opt" id="back">換範圍</button></div>`;
  $('#again').onclick = () => start(run.onlyWrong); $('#back').onclick = showSetup;
}
// 舞台大小：讓題目＋舞台剛好放進一個螢幕（平板直放、橫放都不用捲動）
function fit() {
  const st = $('#stage'), wide = document.body.classList.contains('playing') && innerWidth >= 960 && innerWidth > innerHeight;
  document.body.classList.toggle('wide', wide);
  const top = wide ? $('.top').offsetHeight + 34 : $('.top').offsetHeight + ($('#qcard').hidden ? 0 : $('#qcard').offsetHeight) + 52;
  const avail = innerHeight - top, colW = st.parentElement.clientWidth;
  st.style.width = Math.max(Math.min(colW, avail * 1.6), Math.min(colW, 460)) + 'px';
  const below = innerHeight - top - st.offsetWidth / 1.6;
  document.body.classList.toggle('tight', wide || below < 240);
}
addEventListener('resize', fit);
fetch('data/index.json').then(r => r.json()).then(ix => { INDEX = ix; showSetup(); })
  .catch(() => { $('#setup').hidden = false; $('#setup').innerHTML = '<h2>題目讀取失敗</h2><p>請檢查網路，再重新整理頁面。</p>'; });
