/* 洞穴大冒險：沿用「最後一刻揭曉」的遊戲當洞穴關卡（下面的遊戲本體從 assets/games/games.js 複製），最後打魔王。
   題目讀 data/index.json 和各單元檔；錯題和複習小書共用錯題本（localStorage kr-wrong-v1，題目代號「單元檔#題號」）。 */

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

/* ---------- 國語字音字形：拆炸彈、賽馬、扭蛋機、火箭發射、釣大魚、打怪獸（四個短選項的選擇題） ---------- */
const SIX = [
/* ---------- 1 拆炸彈 ---------- */
{ id: 'bomb', name: '💣 拆炸彈', how: '剪斷寫著正確答案的那條線，才能解除炸彈！',
  async play(scene, opts, ans) {
    scene.className = 'scene s-bomb'; setBG(scene, 'bomb');
    const ys = [15, 25, 35, 45], cols = ['#e8414f', '#3c8dde', '#ffd166', '#2f9e5b'];
    const BX = 19, BY = 28; // 炸彈中心
    let svg = '<svg class="ov" viewBox="0 0 100 62.5" aria-hidden="true"><path id="fuse" d="M20 15 C 22 9, 27 11, 28 6" stroke="#c9b48a" stroke-width="1" fill="none" stroke-dasharray="14" stroke-dashoffset="0"/>';
    ys.forEach((y, i) => {
      const by = BY - 3 + i * 2.4;
      svg += `<g data-w="${i}"><path class="wire" data-h="l" stroke="${cols[i]}" d="M30 ${by} C 44 ${by}, 44 ${y}, 62 ${y}"/><path class="wire" data-h="r" stroke="${cols[i]}" d="M62 ${y} L 91 ${y}"/></g>`;
    });
    svg += '</svg>';
    scene.innerHTML = `<img class="px board" alt="" src="${ART.SP.board}">${svg}<div class="bomb"><img class="px" alt="" src="${ART.SP.bomb}"><span class="led"></span><span class="lcd">0:30</span></div>`;
    const spark = at(el('div', 'spark'), 28, 6); scene.append(spark);
    const lcd = scene.querySelector('.lcd'), led = scene.querySelector('.led'), bomb = scene.querySelector('.bomb'), fuse = scene.querySelector('#fuse');
    const guy = new Actor(scene, '拆彈員', 44, 60, .72); guy.p = { ...guy.p, accessory: 'cap' }; guy.key = '拆彈員cap'; guy.render();
    const tags = opts.map((o, i) => tag(o, 70, ys[i]));
    scene.append(...tags);
    let sec = 30; const iv = setInterval(() => { if (sec > 10) { sec--; lcd.textContent = '0:' + String(sec).padStart(2, '0'); SFX.tick(); } }, 1000);
    const k = await choose(scene, tags);
    clearInterval(iv);
    // 剪刀從右上飛進來，喀嚓兩下
    const y = ys[k], sc = at(el('div', 'scissors', '✂️'), 96, -6); scene.append(sc);
    await tween(420, t => at(sc, 96 + (64 - 96) * t, -6 + (y + 0 + 6) * t), ease.out);
    for (let i = 0; i < 2; i++) { await anim(sc, [{ rotate: '0deg' }, { rotate: '-25deg' }, { rotate: '0deg' }], 180, { fill: 'none' }); SFX.snip(); }
    const g = scene.querySelector(`[data-w="${k}"]`), L = g.querySelector('[data-h="l"]'), R = g.querySelector('[data-h="r"]');
    // 斷掉的兩頭垂下來（彈一下）
    const by = BY - 3 + k * 2.4;
    tween(600, t => { const d = 5 * t; L.setAttribute('d', `M30 ${by} C 44 ${by}, 44 ${y}, ${61 - t} ${y + d}`); R.setAttribute('d', `M${63 + t} ${y + d} Q 76 ${y + d * .2}, 91 ${y}`); }, ease.back);
    debris(scene, 62, y, 8, ['#ffd166', '#fff3c4', cols[k]]);
    anim(sc, [{ opacity: 1 }, { opacity: 0, transform: 'translate(4cqw,-4cqw)' }], 300);
    tags[k].style.transition = 'none';
    anim(tags[k], [{ transform: 'none' }, { transform: `translateY(${50 - y}cqw) rotate(16deg)`, offset: .75 }, { transform: `translateY(${47 - y}cqw) rotate(10deg)` }], 700, { easing: 'cubic-bezier(.5,0,.9,.6)' });
    await sleep(500);
    // 倒數：鏡頭推近炸彈，心跳越來越快
    guy.set('stand', 'scared'); const sweat = at(el('div', 'sweat'), guy.x + 4, guy.y - 14); scene.append(sweat);
    led.classList.add('fast'); zoom(scene, BX, 45, 1.35, 1800);
    for (const s of [5, 4, 3, 2, 1]) {
      lcd.textContent = '0:0' + s; SFX.beat(); tone(880 + (5 - s) * 140, .06, 'square', .05);
      fuse.setAttribute('stroke-dashoffset', -(6 - s) * 2.4); at(spark, 28 - (6 - s) * 1.4, 6 + (6 - s) * 1.6);
      anim(bomb, [{ scale: 1 }, { scale: 1 + (6 - s) * .015 }, { scale: 1 }], 300, { fill: 'none' });
      await sleep(s > 2 ? 560 : 720);
    }
    lcd.textContent = '0:00'; spark.remove(); tone(1800, .05, 'square', .05);
    await sleep(700);
    await revealFlash(scene);
    sweat.remove();
    const ok = k === ans;
    if (ok) {
      lcd.textContent = 'SAFE'; lcd.classList.add('safe'); led.className = 'led safe';
      for (let i = 0; i < 5; i++) puff(scene, 25, 7, 3, '#b9b6d8', 1500, rnd(-2, 2), -6);
      zoom(scene, BX, 45, 1, 600); SFX.win(); confetti(scene); guy.cheer(); stamp(scene, true, '炸彈解除！');
    } else {
      await anim(bomb, [{ scale: 1, filter: 'none' }, { scale: 1.25, filter: 'brightness(1.8) sepia(1) hue-rotate(-30deg)' }], 220);
      SFX.boom(); flash(scene); shake(); zoom(scene, BX, 45, 1, 300);
      const fb = at(el('div', 'fireball'), BX, BY); scene.append(fb);
      fb.animate([{ width: '6cqw', height: '6cqw' }, { width: '80cqw', height: '80cqw', opacity: .9, offset: .5 }, { width: '90cqw', height: '90cqw', opacity: 0 }], { duration: T(1100), easing: 'ease-out', fill: 'forwards' });
      [0, 150, 300].forEach(d => { const r = at(el('div', 'ring'), BX, BY); scene.append(r); r.animate([{ width: '4cqw', height: '4cqw', opacity: 1 }, { width: '110cqw', height: '110cqw', opacity: 0 }], { duration: T(800), delay: d, fill: 'forwards' }); });
      debris(scene, BX, BY, 24, ['#121019', '#5d5a77', '#ff7a1a', '#ffd166']);
      bomb.style.opacity = 0;
      for (let i = 0; i < 12; i++) setTimeout(() => puff(scene, BX + rnd(-14, 24), BY + rnd(-10, 14), rnd(10, 18), '#4a4458', 2200, rnd(-3, 3), -8), T(250 + i * 60));
      guy.pal = SOOT; guy.set('stand', 'scared');
      scene.append(el('div', 'soot'));
      await sleep(900); guy.say('咳咳…', 1600); stamp(scene, false, '轟！炸了');
    }
    return { ok, k };
  } },

/* ---------- 2 賽馬 ---------- */
{ id: 'race', name: '🏇 賽馬大賽', how: '押一匹馬！只有背著正確答案的馬會跑第一名。',
  async play(scene, opts, ans) {
    scene.className = 'scene s-race'; setBG(scene, 'race');
    scene.innerHTML = '<div class="finish"></div><div class="gatebar"></div>';
    const laneTop = i => 12 + i * 11.4, feet = i => laneTop(i) + 10.8;
    opts.forEach((_, i) => { const l = el('div', 'lane'); l.style.top = U(laneTop(i)); scene.append(l); });
    // 觀眾席
    const fans = []; for (let i = 0; i < 12; i++) fans.push(new Actor(scene, '觀眾' + i, 4 + i * 8.4, 11.2, .36));
    fans.forEach((f, i) => { f.anim = i % 2 === 0; f.pose = 'step'; });
    const lamps = [40, 44, 48].map(x => { const l = el('div', 'lamp'); at(l, x, 1.6); scene.append(l); return l; });
    const START = 21;
    const horses = opts.map((o, i) => {
      const h = el('div', 'horse ' + SZ); h.innerHTML = `<span class="bib">${esc(o)}</span>`; const im = pimg(HORSE[i][0]); h.prepend(im); h._im = im;
      at(h, START, feet(i)); scene.append(h); return h;
    });
    const tags = opts.map((o, i) => tag(o, 40, laneTop(i) + 5.7));
    scene.append(...tags);
    const say = el('div', 'commentary', '選一匹馬下注！'); scene.append(say);
    const k = await choose(scene, tags);
    horses[k].classList.add('mine');
    await sleep(300); tags.forEach(t => anim(t, [{ opacity: 1 }, { opacity: 0 }], 250).then(() => t.remove()));
    say.textContent = '各就各位……';
    for (const l of lamps) { l.classList.add('red'); tone(660, .12, 'square', .05); await sleep(500); }
    lamps.forEach(l => { l.classList.remove('red'); l.classList.add('green'); }); tone(1320, .35, 'square', .06);
    anim(scene.querySelector('.gatebar'), [{ transform: 'none', opacity: 1 }, { transform: 'translateY(-60%)', opacity: 0 }], 300);
    say.textContent = '出發！'; fans.forEach(f => f.anim = true);
    // 劇本：選錯的馬一路領先、最後被正確的馬追過；選對的馬先落後、最後衝刺
    const pts = [0, .22, .45, .7, .88, 1];
    const plan = opts.map((_, i) => {
      let v;
      if (i === ans) v = [0, rnd(.16, .19), rnd(.35, .39), .6, .84, 1];
      else if (i === k) v = [0, rnd(.23, .26), rnd(.5, .53), .76, .92, .978];
      else { const e = rnd(.86, .95); v = [0, rnd(.18, .23), rnd(.4, .47), rnd(.6, .69), e - rnd(.05, .08), e]; }
      if (k === ans && i !== ans) { v[3] = Math.max(v[3], rnd(.68, .73)); v[4] = Math.max(v[4], .88); v[5] = Math.min(Math.max(v[5], .94), .985); }
      return v;
    });
    const posAt = (v, t) => { let s = 0; while (s < pts.length - 2 && t > pts[s + 1]) s++; const u = (t - pts[s]) / (pts[s + 1] - pts[s]); const e = u * u * (3 - 2 * u) * .5 + u * .5; return v[s] + (v[s + 1] - v[s]) * e; };
    const FIN = 87.2; let frame = 0, lastF = 0, lastDust = 0, said = 0, zoomed = false;
    await new Promise(res => {
      const t0 = performance.now(); let virt = 0, prev = t0;
      const step = now => {
        // 最後一段放慢（慢動作）
        const dt = now - prev; prev = now; virt += dt * (virt / T(6000) > .9 ? .35 : 1);
        const t = Math.min(1, virt / T(6000));
        horses.forEach((h, i) => at(h, START + posAt(plan[i], t) * (FIN - START), feet(i)));
        if (now - lastF > 90) { lastF = now; frame ^= 1; horses.forEach((h, i) => h._im.src = HORSE[i][(frame + i) % 2]); noise(.03, .1, 700); }
        if (now - lastDust > 140) { lastDust = now; horses.forEach((h, i) => puff(scene, START - 12 + posAt(plan[i], t) * (FIN - START), feet(i) - 1, 2.6, '#e0b88a', 600, -3, -1)); }
        if (t > .35 && said === 0) { said = 1; say.textContent = `「${opts[k]}」${k === ans ? '還在後面追！' : '跑在最前面！'}`; }
        if (t > .75 && said === 1) { said = 2; say.textContent = '最後直線！難分難解！'; SFX.drum(10); }
        if (t > .86 && !zoomed) { zoomed = true; zoom(scene, 86, 60, 1.4, 600); }
        t < 1 ? requestAnimationFrame(step) : res();
      };
      requestAnimationFrame(step);
    });
    fans.forEach(f => f.anim = false);
    // 衝線：拍照判讀
    flash(scene); tone(1800, .08, 'square', .05);
    const ph = el('div', 'photo'); scene.append(ph); say.textContent = '📸 終點照片判讀中……';
    await sleep(1300); ph.remove();
    await revealFlash(scene);
    zoom(scene, 86, 60, 1, 500);
    horses[ans].append(el('span', 'crown', '👑'));
    const ok = k === ans;
    say.textContent = `冠軍是「${opts[ans]}」！`;
    if (ok) { SFX.win(); confetti(scene); fans.forEach(f => f.cheer()); stamp(scene, true, '押中冠軍！'); }
    else { SFX.lose(); fans.forEach((f, i) => i % 3 === 0 ? f.cheer() : f.set('stand', 'sad')); stamp(scene, false, '差一點點！'); }
    return { ok, k };
  } },

/* ---------- 3 扭蛋機 ---------- */
{ id: 'gacha', name: '🪙 扭蛋機', how: '投下刻著正確答案的硬幣，扭到大獎扭蛋！',
  async play(scene, opts, ans) {
    scene.className = 'scene s-gacha'; setBG(scene, 'gacha');
    const cols = ['#e8414f', '#3c8dde', '#ffd166', '#2f9e5b', '#b48cff', '#ff7a1a'];
    let balls = '';
    for (let i = 0; i < 15; i++) balls += `<span class="ball" style="--c:${cols[i % cols.length]};left:${rnd(1, 21).toFixed(1)}cqw;top:${rnd(7, 17).toFixed(1)}cqw"></span>`;
    scene.innerHTML = `<div class="machine"><div class="dome"><div class="glass">${balls}</div><img class="px" alt="" src="${ART.SP.dome}"></div><div class="mbody"><img class="px" alt="" src="${ART.SP.machine}"><img class="px knob" alt="" src="${ART.SP.knob}"></div></div>`;
    const kid = new Actor(scene, '扭蛋小孩', 24, 50.5, .75); kid.set('right', '', false);
    const xs = [12, 33, 67, 88];
    const coins = opts.map((o, i) => { const c = el('button', 'coin ' + SZ, esc(o)); c.type = 'button'; at(c, xs[i], 56); scene.append(c); return c; });
    const k = await choose(scene, coins);
    // 硬幣翻轉飛進投幣口
    const c = coins[k]; c.style.zIndex = 30; const x0 = xs[k], y0 = 56, x1 = 58.1, y1 = 32.6;
    SFX.whoosh();
    await tween(750, (t, raw) => { at(c, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - Math.sin(Math.PI * t) * 14); c.style.transform = `scaleX(${Math.cos(raw * Math.PI * 6).toFixed(2)}) scale(${1 - .45 * t})`; }, ease.io);
    c.style.transform = 'scale(.55) rotate(90deg) scaleY(.4)';
    await anim(c, [{ clipPath: 'inset(0 0 0 0)', transform: 'scale(.55) rotate(90deg) scaleY(.4) translateX(0)' }, { clipPath: 'inset(0 0 0 100%)', transform: 'scale(.55) rotate(90deg) scaleY(.4) translateX(0)' }], 260);
    c.remove(); SFX.clink();
    kid.set('stand'); kid.say('轉轉看！', 1000);
    const knob = scene.querySelector('.knob'), dome = scene.querySelector('.dome');
    const bs = [...dome.querySelectorAll('.ball')];
    for (let i = 1; i <= 3; i++) {
      SFX.click(); tone(180, .06, 'square', .05, 120);
      knob.animate([{ rotate: `${(i - 1) * 120}deg` }, { rotate: `${i * 120 + 12}deg`, offset: .8 }, { rotate: `${i * 120}deg` }], { duration: T(420), fill: 'forwards', easing: 'ease-in-out' });
      bs.forEach(b => b.animate([{ transform: 'none' }, { transform: `translate(${rnd(-3, 3)}cqw, ${rnd(-6, -1)}cqw) rotate(${rnd(-120, 120)}deg)` }, { transform: 'none' }], { duration: T(420), easing: 'ease-out' }));
      await sleep(520);
    }
    // 扭蛋從出口掉出來，彈兩下，滾到前面
    const cap = el('div', 'capsule', `<div class="top" style="--c:${pick(cols)}"></div><div class="bot"></div><div class="prize"></div>`);
    at(cap, 50, 44); scene.append(cap); SFX.pop();
    await anim(cap, [{ transform: 'translateY(-3cqw) scale(.5)' }, { transform: 'translateY(6cqw) scale(.7)', offset: .45 }, { transform: 'translateY(3.5cqw) scale(.7)', offset: .65 }, { transform: 'translateY(6cqw) scale(.7)', offset: .8 }, { transform: 'translateY(5.4cqw) scale(.7)', offset: .9 }, { transform: 'translateY(6cqw) scale(.7)' }], 800, { easing: 'ease-in' });
    tone(300, .05, 'square', .05);
    kid.set('stand', '');
    await anim(cap, [{ transform: 'translateY(6cqw) scale(.7) rotate(0)' }, { transform: 'translateY(-14cqw) scale(2.6) rotate(720deg)' }], 900, { easing: 'cubic-bezier(.3,1.25,.5,1)' });
    const base = 'translateY(-14cqw) scale(2.6)';
    for (const [deg, n] of [[8, 4], [14, 6], [24, 10]]) {
      SFX.drum(n);
      await anim(cap, [0, deg, -deg, deg * .6, 0].map(d => ({ transform: `${base} rotate(${d}deg)` })), 460);
      await sleep(360);
    }
    kid.set('stand', 'scared');
    await sleep(300);
    await revealFlash(scene);
    const ok = k === ans, top = cap.querySelector('.top'), prize = cap.querySelector('.prize');
    prize.textContent = ok ? '⭐' : '';
    if (ok) scene.append(el('div', 'rays'));
    SFX.pop();
    top.animate([{ transform: 'none' }, { transform: 'translate(-30%,-140%) rotate(-60deg)' }], { duration: T(320), fill: 'forwards', easing: 'ease-out' });
    if (ok) {
      prize.animate([{ scale: 0, translate: '-50% -50%' }, { scale: 1.2, translate: '-50% -140%' }], { duration: T(450), fill: 'forwards', easing: 'cubic-bezier(.3,1.7,.5,1)' });
      SFX.win(); confetti(scene); kid.cheer(); stamp(scene, true, '中大獎！', 16);
    } else {
      // 飄出一張小紙條：銘謝惠顧
      const slip = at(el('div', 'slip', '銘謝惠顧'), 50, 34); scene.append(slip);
      slip.animate([{ transform: 'translateY(4cqw) scale(.2) rotate(0)', opacity: 0 }, { transform: 'translateY(-6cqw) scale(1) rotate(-8deg)', opacity: 1, offset: .5 }, { transform: 'translateY(-3cqw) scale(1) rotate(6deg)', opacity: 1 }], { duration: T(1200), fill: 'forwards', easing: 'ease-out' });
      SFX.lose(); kid.sad(); await sleep(700); stamp(scene, false, '沒中…', 16);
    }
    return { ok, k };
  } },

/* ---------- 4 火箭發射 ---------- */
{ id: 'rocket', name: '🚀 火箭發射', how: '選一架火箭！只有載著正確答案的火箭能飛上太空。',
  async play(scene, opts, ans) {
    scene.className = 'scene s-rocket'; setBG(scene, 'rocket');
    scene.innerHTML = '';
    const GY = 52.5, xs = [24, 44, 64, 84];
    const crew = new Actor(scene, '地勤', 9, 55, .7);
    const rockets = opts.map((o, i) => {
      const p = pimg(ART.SP.pad, 13.75, 3.75); p.classList.add('pad'); p.style.left = U(xs[i]); scene.append(p);
      const tw = pimg(ART.SP.tower, 3.75, 22.5); tw.classList.add('tower'); tw.style.left = U(xs[i] + 5); scene.append(tw);
      const r = el('div', 'rocket'); r.append(el('div', 'fire'), pimg(ROCKET[i])); at(r, xs[i] - 4.2, GY - 11.4 - 0.6); scene.append(r);
      return r;
    });
    const tags = opts.map((o, i) => { const w = el('div', 'ptag'); at(w, xs[i], 53.6); const t = tag(o); w.append(t); scene.append(w); return t; });
    const k = await choose(scene, tags);
    const r = rockets[k], fire = r.querySelector('.fire'), X = xs[k];
    rockets.forEach((x, i) => { if (i !== k) anim(x, [{ opacity: 1 }, { opacity: .3 }], 400); });
    const st = { x: 0, y: 0, a: 0 }, apply = () => r.style.transform = `translate(${st.x}cqw, ${st.y}cqw) rotate(${st.a}deg)`;
    const big = el('div', 'big'); scene.append(big);
    crew.say('倒數！', 900);
    for (const n of ['3', '2', '1']) { big.textContent = n; tone(660, .15, 'square', .06); anim(big, [{ scale: 1.6, opacity: 0 }, { scale: 1, opacity: 1 }], 250); await sleep(700); }
    big.remove(); tone(1320, .3, 'square', .06);
    // 點火：底下冒大團白煙，火焰變長，抖動後慢慢升空
    SFX.whoosh(); fire.style.height = U(5);
    for (let i = 0; i < 14; i++) setTimeout(() => puff(scene, X + rnd(-2, 2), GY - .5, rnd(5, 9), '#d3d1e6', 1600, (i % 2 ? 1 : -1) * rnd(5, 12), -2), T(i * 60));
    await tween(500, t => { st.x = Math.sin(t * 60) * .4; apply(); });
    fire.style.height = U(8);
    await tween(1700, t => { st.x = Math.sin(t * 80) * .2; st.y = -24 * t; apply(); fire.style.height = U(8 + Math.random() * 2); }, ease.in);
    // 半空熄火三次（懸念）
    for (let i = 0; i < 3; i++) { fire.style.height = '0'; SFX.sputter(); puff(scene, X, GY - 24 + 1, 3, '#5d5a77', 800, rnd(-2, 2), 2); await sleep(220); fire.style.height = U(6); await sleep(260); }
    fire.style.height = '0';
    await tween(700, t => { st.a = Math.sin(t * 25) * 3 * (1 - t); st.y = -24 + Math.sin(t * Math.PI) * -.6; apply(); });
    crew.set('stand', 'scared');
    await sleep(300);
    await revealFlash(scene);
    const ok = k === ans;
    if (ok) {
      fire.style.height = U(16); fire.style.width = U(5.4); scene.classList.add('warp'); for (let i = 0; i < 30; i++) { const s = el('span', 'star'); s.style.left = rnd(0, 100).toFixed(1) + '%'; s.style.top = rnd(0, 80).toFixed(1) + '%'; s.style.animationDelay = -rnd(0, .35).toFixed(2) + 's'; scene.prepend(s); } SFX.whoosh(); tone(200, 1.2, 'sawtooth', .05, 0, 1400);
      crew.cheer();
      await tween(1000, t => { st.y = -24 - 80 * t; apply(); if (Math.random() < .5) puff(scene, X + rnd(-1, 1), GY - 6 + st.y + 12, 3, '#ffd166', 500, 0, 3); }, ease.in);
      SFX.win(); confetti(scene); stamp(scene, true, '發射成功！');
    } else {
      // 熄火後先停一下，機頭慢慢歪過去，然後一邊轉一邊冒黑煙掉下來
      const dir = k === 3 ? -1 : 1;
      puff(scene, X, GY - 24 + 1, 4, '#2a2640', 1000, 0, 2);
      await tween(800, t => { st.a = dir * 30 * t; st.y = -24 - 1.2 * Math.sin(t * Math.PI); apply(); }, ease.in);
      tone(900, 1.1, 'triangle', .07, 0, 110);
      let vy = 0, va = dir * 90, last = performance.now(), smokeT = 0;
      await new Promise(res => {
        const f = now => {
          const dt = Math.min(.05, (now - last) / 1000) / (RM ? .4 : 1); last = now;
          vy += 70 * dt; st.y += vy * dt; st.x += dir * 9 * dt; va += dir * 140 * dt; st.a = Math.max(-150, Math.min(150, st.a + va * dt)); apply();
          smokeT += dt; if (smokeT > .05) { smokeT = 0; puff(scene, X + st.x, GY - 6 + st.y, rnd(3.5, 5.5), '#6b6880', 1400, rnd(-1, 1), -3); }
          st.y < 1 ? requestAnimationFrame(f) : res();
        };
        requestAnimationFrame(f);
      });
      // 墜地：爆炸、碎片、彈起來，最後躺在地上冒煙
      st.y = 1; apply();
      SFX.boom(); flash(scene); shake();
      const fb = at(el('div', 'fireball'), X + st.x, GY - 2); scene.append(fb);
      fb.animate([{ width: '4cqw', height: '4cqw' }, { width: '26cqw', height: '26cqw', opacity: 1, offset: .4 }, { width: '30cqw', height: '30cqw', opacity: 0 }], { duration: T(800), fill: 'forwards' });
      debris(scene, X + st.x, GY - 3, 18, ['#e8414f', '#f2f4f8', '#5d5a77', '#ffd166']);
      const a0 = st.a, aEnd = dir * 100;
      await tween(500, t => { st.a = a0 + (aEnd - a0) * t; st.y = 1 - Math.sin(t * Math.PI) * 3; apply(); });
      for (let i = 0; i < 14; i++) setTimeout(() => puff(scene, X + st.x + rnd(-2, 2), GY - 3, rnd(4, 7), '#6b6880', 2200, rnd(-1, 2), -14), T(i * 110));
      crew.set('stand', 'sad'); crew.say('啊……', 1500);
      await sleep(600); stamp(scene, false, '噗咻～失敗');
    }
    return { ok, k };
  } },

/* ---------- 5 釣魚 ---------- */
{ id: 'fish', name: '🎣 釣大魚', how: '把魚鉤丟向寫著正確答案的魚影，釣起大魚！',
  async play(scene, opts, ans) {
    scene.className = 'scene s-fish'; setBG(scene, 'fish');
    const W = 18.75; // 水面
    scene.innerHTML = '<div class="wave"></div><svg class="ov" viewBox="0 0 100 62.5" aria-hidden="true"><line id="rod" x1="15.5" y1="11" x2="31" y2="1.5" stroke="#4e3420" stroke-width=".9" stroke-linecap="round"/><path id="ln" fill="none" stroke="#fffaf0" stroke-width=".3"/><path id="ln2" fill="none" stroke="#e6f6ff" stroke-width=".25" opacity=".8"/><path id="hook" fill="none" stroke="#d3d1e6" stroke-width=".5"/></svg>';
    const fisher = new Actor(scene, '釣客', 12, 14.8, .62); fisher.set('right', '', false);
    const rod = scene.querySelector('#rod'), ln = scene.querySelector('#ln'), ln2 = scene.querySelector('#ln2'), hk = scene.querySelector('#hook');
    const tip = { x: 31, y: 1.5 };
    const pos = [[42, 30], [76, 28], [50, 50], [82, 50]];
    const sh = opts.map((o, i) => { const s = el('div', 'shadow'); s.append(pimg(ART.SP.fishShadow, 17.5, 7.5)); at(s, pos[i][0], pos[i][1]); scene.append(s); return s; });
    const tags = opts.map((o, i) => { const t = tag(o); sh[i].append(t); return t; });
    const drawLine = (bx, by, sag = 3) => ln.setAttribute('d', `M${tip.x} ${tip.y} Q ${(tip.x + bx) / 2} ${Math.max(tip.y, by) + sag}, ${bx} ${by}`);
    drawLine(tip.x + 1, tip.y + 6, 0);
    const k = await choose(scene, tags);
    const [fx, fy] = pos[k], hx = fx - 7, hy = fy; // 魚鉤放到魚嘴前面
    // 甩竿：竿子往後一揚，再往前甩出去
    SFX.whoosh();
    await tween(250, t => { rod.setAttribute('x2', 31 - 12 * t); rod.setAttribute('y2', 1.5 - 1 * t); tip.x = 31 - 12 * t; tip.y = 1.5 - t; drawLine(tip.x + 1, tip.y + 6, 0); });
    await tween(200, t => { tip.x = 19 + 12 * t; tip.y = .5 + t; rod.setAttribute('x2', tip.x); rod.setAttribute('y2', tip.y); });
    const bob = el('div', 'part'); size(bob, 2.6, 2.6); bob.style.cssText += 'border-radius:50%;translate:-50% -50%;background:linear-gradient(#e8414f 0 50%,#fffaf0 50%);border:.4cqw solid #1d1b2e;z-index:6';
    scene.append(bob);
    await tween(800, t => { const bx = tip.x + (hx - tip.x) * t, by = tip.y + (W - tip.y) * t - Math.sin(Math.PI * t) * 12; at(bob, bx, by); drawLine(bx, by, 1 + 3 * t); }, ease.lin);
    SFX.splash(); for (let i = 0; i < 6; i++) { const d = at(el('div', 'drop'), hx, W); scene.append(d); d.animate([{ transform: 'none' }, { transform: `translate(${rnd(-5, 5)}cqw, -${rnd(3, 7)}cqw)`, offset: .5 }, { transform: `translate(${rnd(-7, 7)}cqw, 0)`, opacity: 0 }], { duration: T(600), fill: 'forwards' }); }
    // 魚線沉到魚的位置，魚鉤掛在魚嘴前
    await tween(800, t => { const y = W + (hy - W) * t; ln2.setAttribute('d', `M${hx} ${W} L ${hx} ${y}`); hk.setAttribute('d', `M${hx} ${y} l 0 1.2 a .9 .9 0 0 0 1.8 0`); }, ease.out);
    sh.forEach((s, i) => { if (i !== k) anim(s, [{ opacity: 1 }, { opacity: 0 }], 900); });
    anim(tags[k], [{ opacity: 1 }, { opacity: 0 }], 500);
    fisher.set('stand', '');
    // 魚游過來輕咬三下，浮標一次比一次沉
    await anim(sh[k], [{ transform: 'none' }, { transform: 'translateX(-1.5cqw)' }], 600, { easing: 'ease-in-out' });
    for (const [d, n] of [[.8, 3], [1.6, 5], [2.8, 8]]) {
      SFX.drum(n);
      sh[k].animate([{ transform: 'translateX(-1.5cqw)' }, { transform: 'translateX(-2.6cqw)' }, { transform: 'translateX(-1.5cqw)' }], { duration: T(380) });
      await tween(380, t => { const yy = W + Math.sin(Math.PI * t) * d; at(bob, hx, yy); drawLine(hx, yy, 4); });
      await sleep(380);
    }
    fisher.set('stand', 'scared');
    // 大力一拉：浮標沉下去，竿子彎下來
    tone(300, .5, 'square', .05, 0, 900); SFX.splash();
    bob.remove();
    await tween(300, t => { tip.x = 31 - 2 * t; tip.y = 1.5 + 5 * t; rod.setAttribute('x2', tip.x); rod.setAttribute('y2', tip.y); ln.setAttribute('d', `M${tip.x} ${tip.y} L ${hx} ${W}`); });
    await sleep(400);
    await revealFlash(scene);
    const ok = k === ans;
    sh[k].remove(); hk.setAttribute('d', ''); ln2.setAttribute('d', '');
    const cw = ok ? 16 : 10, chh = ok ? 6.9 : 7.1;
    const c = pimg(ok ? FISH : BOOT, cw, chh); const cWrap = el('div', 'catch'); cWrap.append(c); at(cWrap, hx, hy); scene.append(cWrap);
    for (let i = 0; i < 10; i++) { const d = at(el('div', 'drop'), hx + rnd(-4, 4), W); scene.append(d); d.animate([{ transform: 'none' }, { transform: `translate(${rnd(-10, 10)}cqw, -${rnd(8, 16)}cqw)`, offset: .5 }, { transform: `translate(${rnd(-14, 14)}cqw, 2cqw)`, opacity: 0 }], { duration: T(900), fill: 'forwards' }); }
    SFX.splash();
    await tween(800, t => { const y = hy + (6 - hy) * t; at(cWrap, hx, y); tip.y = 6.5 - 4 * t; tip.x = 29 + 2 * t; rod.setAttribute('x2', tip.x); rod.setAttribute('y2', tip.y); ln.setAttribute('d', `M${tip.x} ${tip.y} L ${hx} ${y}`); }, ease.out);
    cWrap.animate([{ rotate: '-12deg' }, { rotate: '12deg' }], { duration: T(300), iterations: 6, direction: 'alternate', easing: 'ease-in-out' });
    if (ok) { c.style.filter = 'drop-shadow(0 0 1.4cqw #ffd166)'; SFX.win(); confetti(scene); fisher.cheer(); stamp(scene, true, '大魚上鉤！'); }
    else { SFX.lose(); fisher.sad(); fisher.say('舊鞋子？', 1600); await sleep(500); stamp(scene, false, '釣到舊鞋子…'); }
    return { ok, k };
  } },

/* ---------- 6 打怪獸 ---------- */
{ id: 'boss', name: '👾 打怪獸', how: '',
  async play(scene, opts, ans) {
    scene.className = 'scene s-boss'; setBG(scene, 'boss');
    const kind = pick(['bullet', 'weapon', 'hero']);
    $('#qhow').textContent = { bullet: '選一顆砲彈裝進大砲！只有正確答案的砲彈打得倒怪獸。', weapon: '選一把武器丟給勇者！只有正確答案的武器打得倒怪獸。', hero: '派一位勇者出戰！只有正確答案的勇者打得倒怪獸。' }[kind];
    scene.innerHTML = '<div class="hp"><b>BOSS</b><i></i></div>';
    const monster = el('div', 'monster idle'); monster.append(pimg(pick(MON))); scene.append(monster);
    const hp = scene.querySelector('.hp i');
    const xs = [8, 20, 32, 44], FEET = 49;
    let items = [], heroes = [], shooter = null;
    if (kind === 'hero') heroes = opts.map((_, i) => new Actor(scene, ['泓', '勇者小安', '勇者阿傑', '勇者小美'][i], xs[i], FEET, .62));
    else {
      items = opts.map((_, i) => {
        const it = at(el('div', 'item'), xs[i], 41);
        if (kind === 'bullet') { const b = el('div', 'ball2'); b.style.setProperty('--c', LANE[i]); it.append(b); }
        else { const w = WEAPON[i]; it.append(pimg(w.src, w.w * .62, w.h * .62)); }
        scene.append(it); return it;
      });
      if (kind === 'bullet') { shooter = at(el('div', 'item'), 54, 43); size(shooter, 11, 8.3); shooter.append(pimg(CANNON, 11, 8.3)); scene.append(shooter); }
      else shooter = new Actor(scene, '泓', 55, FEET, .62).set('right', '', false);
    }
    const tags = opts.map((o, i) => tag(o, xs[i], 55));
    scene.append(...tags);
    const k = await choose(scene, tags);
    (kind === 'hero' ? heroes.map(h => h.e) : items).forEach((e, i) => { if (i !== k) anim(e, [{ opacity: 1 }, { opacity: .25 }], 300); });
    const MX = 70, MY = 36; // 怪獸身上
    const hitFx = (n, lv) => {
      noise(.12, .4, 1200); tone(160, .1, 'square', .06);
      monster.animate([{ transform: 'none', filter: 'none' }, { transform: 'translateX(2cqw)', filter: 'brightness(2.4)' }, { transform: 'none', filter: 'none' }], { duration: T(240) });
      const s = at(el('div', 'slash'), MX + rnd(-3, 3), MY + rnd(-4, 4)); s.style.rotate = rnd(-50, 50) + 'deg'; scene.append(s);
      anim(s, [{ scale: '.2 1', opacity: 1 }, { scale: '1.2 1', opacity: 0 }], 300).then(() => s.remove());
      debris(scene, MX, MY, 6, ['#fff3c4', '#ffd166']);
      const d = at(el('div', 'dmg', `-${n}`), MX + rnd(-6, 6), MY - 10); scene.append(d);
      anim(d, [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-6cqw)', opacity: 0 }], 900).then(() => d.remove());
      hp.style.width = lv + '%';
    };
    // 準備：武器先交給勇者、砲彈先裝進大砲
    if (kind !== 'hero') {
      const it = items[k];
      await tween(600, t => at(it, xs[k] + (52 - xs[k]) * t, 41 - Math.sin(Math.PI * t) * 10 + (kind === 'bullet' ? 2 : 0) * t), ease.io);
      if (kind === 'bullet') { it.style.opacity = 0; SFX.click(); await anim(shooter, [{ transform: 'none' }, { transform: 'scale(1.1,.9)' }, { transform: 'none' }], 250); }
      else { it.style.opacity = 0; shooter.say('收到！', 800); }
    }
    const strike = async (n, lv) => {
      if (kind === 'hero') {
        const h = heroes[k], x0 = h.x;
        await h.walkTo(60, 420);
        h.set('right', '', false); await anim(h.e, [{ transform: 'none' }, { transform: 'translateX(2cqw) rotate(8deg)' }, { transform: 'none' }], 160, { fill: 'none' });
        hitFx(n, lv);
        await h.walkTo(x0, 380);
      } else if (kind === 'bullet') {
        const b = el('div', 'shot'); const ball = el('div', 'ball2'); ball.style.setProperty('--c', LANE[k]); b.append(ball); at(b, 63, 42); scene.append(b);
        SFX.boom(); anim(shooter, [{ transform: 'none' }, { transform: 'translateX(-1.5cqw)' }, { transform: 'none' }], 220, { fill: 'none' });
        puff(scene, 65, 42, 4, '#d3d1e6', 500, 2, -1);
        await tween(260, t => at(b, 63 + (MX - 63) * t, 42 - Math.sin(Math.PI * t) * 3 + (MY - 42) * t));
        b.remove(); hitFx(n, lv); await sleep(380);
      } else {
        const w = WEAPON[k], s = el('div', 'shot'); s.append(pimg(w.src, w.w * .7, w.h * .7)); at(s, 58, 40); scene.append(s);
        shooter.set('right', '', true); SFX.whoosh();
        const spin = w.k === 'hammer' || w.k === 'sword';
        await tween(320, t => { at(s, 58 + (MX - 58) * t, 40 + (MY - 40) * t - Math.sin(Math.PI * t) * (w.k === 'arrow' ? 1 : 5)); s.style.rotate = (spin ? 720 * t : 0) + 'deg'; });
        if (w.k === 'wand') for (let i = 0; i < 5; i++) puff(scene, MX, MY, 3, '#ffd166', 500, rnd(-5, 5), rnd(-5, 5));
        s.remove(); shooter.set('right', '', false); hitFx(n, lv); await sleep(380);
      }
    };
    await strike(30, 70); await strike(40, 30); SFX.drum(10); await sleep(300);
    await strike(25, 5);
    // 只剩一點點血：怪獸搖搖晃晃，最後一擊之前先閃光
    const big = at(el('div', 'big', '!'), 80, 15); big.style.fontSize = U(9); scene.append(big);
    monster.classList.remove('idle');
    anim(monster, [{ rotate: '0deg' }, { rotate: '-4deg' }, { rotate: '4deg' }, { rotate: '0deg' }], 900);
    SFX.drum(14); await sleep(900); big.remove();
    await revealFlash(scene);
    const ok = k === ans;
    if (ok) {
      flash(scene); noise(.5, .5, 2000); hp.style.width = '0%';
      debris(scene, MX, MY, 20, ['#fff3c4', '#ffd166', '#b79cff']);
      await anim(monster, [{ transform: 'none', opacity: 1 }, { transform: 'translate(4cqw, -3cqw) rotate(15deg)', offset: .3 }, { transform: 'translate(40cqw, -40cqw) rotate(540deg) scale(.2)', opacity: 0 }], 1000, { easing: 'ease-in' });
      SFX.win(); confetti(scene);
      (kind === 'hero' ? [heroes[k]] : kind === 'weapon' ? [shooter] : []).forEach(h => h.cheer());
      stamp(scene, true, '打倒怪獸！');
    } else {
      // 怪獸回血、變大、吼一聲把我方震開
      hp.classList.add('heal'); hp.style.width = '100%'; tone(200, .8, 'sawtooth', .08, 0, 90);
      for (let i = 0; i < 8; i++) { const h = at(el('div', 'heart', '+'), MX + rnd(-10, 10), MY + rnd(-6, 10)); scene.append(h); anim(h, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(-10cqw)', opacity: 0 }], 1000).then(() => h.remove()); }
      await anim(monster, [{ scale: 1 }, { scale: 1.2 }, { scale: 1.12 }], 700);
      SFX.boom(); shake();
      const victims = kind === 'hero' ? heroes : kind === 'weapon' ? [shooter] : [];
      victims.forEach(h => { h.set('stand', 'scared'); anim(h.e, [{ transform: 'none' }, { transform: 'translateX(-3cqw) rotate(-12deg)' }, { transform: 'translateX(-2cqw)' }], 500); });
      if (shooter && kind === 'bullet') anim(shooter, [{ transform: 'none' }, { transform: 'translateX(-4cqw) rotate(-20deg)' }], 500);
      await sleep(500); stamp(scene, false, '怪獸回血了！');
    }
    return { ok, k };
  } },
];
const [BOMB, RACE, GACHA, LAUNCH, FISHING, BOSS] = SIX;
// 這六個遊戲畫面只放得下四個短選項（每個最多 6 個字）
SIX.forEach(gm => {
  gm.fits = q => q.k === 'mc' && q.o.length === 4 && Math.max(...q.o.map(o => o.length)) <= 6;
  const play = gm.play; gm.play = (sc, opts, ans) => { SZ = sizeOf(opts); return play.call(gm, sc, opts, ans); };
});


/* ======================================================================
   洞穴大冒險：四個關卡（用「最後一刻揭曉」的遊戲，換成洞穴場景）＋魔王洞
   關卡答對拿寶石；寶石越多，打魔王的傷害越高。魔王戰答對才打得到，答錯會被反擊扣愛心。
   ====================================================================== */
const PXC = v => v * .625; // 背景像素 → cqw
/* ---------- 追趕怪獸（從送貨到府改）：坐上寫著正確答案的車，去追偷走寶石袋的小怪獸 ---------- */
const CHASE = { id: 'chase', name: '🛒 追趕怪獸', how: '小怪獸偷走寶石袋逃跑了！坐上寫著正確答案的車去追，追上了才拿得回來。',
  async play(scene, opts, ans) {
    scene.className = 'scene s-chase'; setBG(scene, 'chase');
    const GY = 35, RAIL = 46.6, VW = 19.2, VH = 12, XS = [14, 38, 62, 86];
    const road = at(size(el('div', 'road'), 100, 27.5), 0, GY); road.style.backgroundImage = `url(${sp('caveRoad')})`; scene.append(road);
    const pillars = [8, 48, 88].map(x => { const pl = img(sp('pillar'), x, 0, 7.5, 37.5, 'pillar'); scene.append(pl); return pl; });
    // 小怪獸抱著寶石袋從左邊跑過去
    const mon = at(size(el('div', 'chasemon'), 12, 10.4), -14, RAIL - 10.4); mon.append(pimg(MON[1])); scene.append(mon);
    const sack = img(sp('sack'), 0, 0, 5, 5, 'sack'); mon.append(sack); sack.style.left = '58%'; sack.style.top = '30%';
    const run1 = mon.animate([{ translate: '0 0' }, { translate: '0 -1cqw' }, { translate: '0 0' }], { duration: T(220), iterations: Infinity });
    await tween(900, t => at(mon, -14 + 56 * t, RAIL - 10.4));
    const b = at(el('div', 'bubble', '寶石袋是我的！'), 48, RAIL - 13); scene.append(b); tone(700, .1, 'square', .05); tone(900, .1, 'square', .05, 120);
    await sleep(900); b.remove();
    await tween(800, t => at(mon, 42 + 70 * t, RAIL - 10.4), ease.in);
    // 四台車
    const rides = XS.map((x, i) => { const r = img(sp('rides')[i], x - VW / 2, RAIL - VH, VW, VH, 'ride'); scene.append(r); anim(r, [{ opacity: 0, translate: '0 2cqw' }, { opacity: 1, translate: '0 0' }], 300); return r; });
    const names = XS.map((x, i) => { const n = at(el('div', 'ridename', sp('rideNames')[i]), x, RAIL + 1.2); scene.append(n); return n; });
    const tags = opts.map((o, i) => lbl(o, XS[i], 6, 22.5));
    scene.append(...tags);
    const k = await choose(scene, tags); SFX.click();
    hide(tags.filter((_, i) => i !== k)); hide(rides.filter((_, i) => i !== k)); hide(names);
    // 主角跑過來跳上車
    const car = rides[k], cx0 = XS[k] - VW / 2;
    const kid = new Actor(scene, '你', -6, RAIL, .5); kid.p = { ...kid.p, accessory: 'cap' }; kid.key = '你cap'; kid.render(); kid.e.style.zIndex = 8;
    await kid.walkTo(XS[k] - 2, Math.abs(XS[k] + 4) * 18);
    SFX.pop(); await tween(280, t => kid.move(XS[k] - 2, RAIL - Math.sin(Math.PI * t) * 6 - 5.5 * t));
    hide([tags[k]]);
    const tg = at(el('div', 'cartag below', esc(opts[k])), XS[k], RAIL + .8); scene.append(tg);
    kid.say('追！', 700); SFX.sputter();
    // 開到左邊起跑點
    const parts = () => [car, kid.e, tg];
    let vx = cx0; const place = x => { vx = x; at(car, x, RAIL - VH); kid.move(x + VW / 2 - 2, RAIL - 5.5); at(tg, x + VW / 2, RAIL + .8); };
    await tween(Math.abs(cx0 - 6) * 18 + 300, t => place(cx0 + (6 - cx0) * ease.io(t)));
    // 追逐：地面和柱子往後退，車子上下顛
    const bob = car.animate([{ translate: '0 0' }, { translate: '0 -.4cqw' }, { translate: '0 0' }], { duration: T(200), iterations: Infinity });
    let off = 0; const scroll = d => { off += d; road.style.backgroundPositionX = U(-off % 100); pillars.forEach((pl, i) => at(pl, ((i * 40 - off * 1.3) % 120 + 120) % 120 - 10, 0)); };
    at(mon, 104, RAIL - 10.4);
    await tween(1600, t => { scroll(1.6); place(6 + 14 * t); at(mon, 104 - 26 * ease.out(t), RAIL - 10.4); if (Math.random() < .08) noise(.06, .1, 400); });
    kid.say('快追上了！', 1000);
    SFX.drum(12);
    await tween(1800, t => { scroll(1.8); place(20 + 22 * t); at(mon, 78 + Math.sin(t * 12) * 1.5, RAIL - 10.4); });
    await revealFlash(scene);
    const ok = k === ans;
    if (ok) {
      await tween(500, t => { scroll(2.2); place(42 + 18 * t); });
      bob.cancel(); run1.cancel(); SFX.clink();
      // 一把抓回寶石袋，小怪獸跌倒
      const sx = 78 + 3.5, sy = RAIL - 7;
      sack.remove(); const s2 = img(sp('sack'), sx, sy, 5, 5, 'sack fx'); scene.append(s2);
      await tween(450, t => at(s2, sx + (vx + VW / 2 - sx) * t, sy - Math.sin(Math.PI * t) * 8 + (RAIL - VH - 6 - sy) * t));
      anim(mon, [{ rotate: '0deg', translate: '0 0' }, { rotate: '-80deg', translate: '2cqw 2cqw' }], 400, { easing: 'ease-in' });
      for (let i = 0; i < 10; i++) { const g = img(sp('gem'), vx + VW / 2, RAIL - VH - 4, 2.6, 2.6, 'fx'); scene.append(g); const dx = rnd(-14, 14); g.animate([{ transform: 'none' }, { transform: `translate(${dx * .5}cqw, -10cqw)`, offset: .45 }, { transform: `translate(${dx}cqw, 4cqw)`, opacity: 0 }], { duration: T(rnd(900, 1300)), fill: 'forwards' }); }
      SFX.win(); confetti(scene); kid.set('cheer', 'happy', true); kid.say('拿回來了！', 1500);
      stamp(scene, true, '追到了！', 14);
    } else {
      // 車子拋錨冒煙，小怪獸跑掉
      bob.cancel(); SFX.sputter();
      for (let i = 0; i < 8; i++) puff(scene, vx + rnd(2, VW - 2), RAIL - VH + 2, rnd(4, 7), pick(['#d3d1e6', '#8b8aa3', '#5d5a77']), 1200, rnd(-2, 2), -6);
      await tween(900, t => { scroll(1.8 * (1 - t)); place(42 + 6 * ease.out(t)); });
      anim(car, [{ rotate: '0deg' }, { rotate: '-6deg' }], 300);
      kid.set('stand', 'sad');
      const b2 = at(el('div', 'bubble', '抓不到我！'), 82, RAIL - 13); scene.append(b2);
      await sleep(600); b2.remove();
      await tween(900, t => at(mon, 78 + 40 * t, RAIL - 10.4), ease.in);
      SFX.lose(); stamp(scene, false, '被牠逃走了！', 14);
    }
    return { ok, k };
  } };
const G_BOMB = SIX.find(g => g.id === 'bomb'), G_FISH = SIX.find(g => g.id === 'fish');
// 洞穴關卡：前面先放是非題的關卡，其餘每次隨機挑；「追趕怪獸」抽到的話放在最後一關（追到魔王洞門口）
const ROOMS = [
  { game: OX, kind: 'tf', icon: 'ox', name: '機關翻板廳', intro: '地板藏著機關！站到對的那一邊，錯的那邊地板會翻下去。' },
  { game: BRIDGE, kind: 'tf', icon: 'bridge', name: '地底峽谷', intro: '兩座吊橋，上面是 O、下面是 X，只有一座走得過去。' },
  { game: TRAIN, kind: 'mc', icon: 'train', name: '礦坑列車', intro: '接上寫著正確答案的車廂，才能穿過隧道！' },
  { game: LOCK, kind: 'mc', icon: 'lock', name: '寶藏石門', intro: '四把鑰匙只有一把打得開石門。' },
  { game: LAB, kind: 'mc', icon: 'lab', name: '地底煉金室', intro: '把寫著正確答案的藥水倒進燒瓶，倒錯會爆炸！' },
  { game: SAFE, kind: 'mc', icon: 'safe', name: '古代金庫', intro: '四張紙條只有一張是金庫的密碼。' },
  { game: G_BOMB, kind: 'mc', icon: 'bomb', name: '礦坑炸藥庫', intro: '炸藥的引信點著了！剪斷寫著正確答案的那條線。' },
  { game: G_FISH, kind: 'mc', icon: 'fish', name: '地底湖', intro: '湖裡有寶石魚！把魚鉤丟向寫著正確答案的魚影。' },
  { game: CHASE, kind: 'mc', icon: 'chase', name: '追趕小怪獸', intro: '小怪獸偷走了寶石袋！坐上寫著正確答案的車去追牠。' },
];
const BOSS_NAME = '洞穴大魔王';
const BOSS_HP = 120, HEARTS = 3;
const dmgOf = gems => 20 + gems * 3;

/* ---------- 題庫：讀 data/index.json 和各單元檔，題目代號「單元檔#題號」，和複習小書共用錯題本 kr-wrong-v1 ---------- */
const WB = 'kr-wrong-v1';
const wrongBook = () => new Set(store.get(WB, []));
function markWrong(key, wrong) { const w = wrongBook(); if (wrong) w.add(key); else w.delete(key); store.set(WB, [...w]); }
const dataUrl = file => 'data/' + file.split('/').map(encodeURIComponent).join('/');
const DEF_CAT = { mc: '選擇', tf: '是非' };
const unitCache = new Map();
function loadUnit(meta, grade, subject) {
  if (!unitCache.has(meta.file)) unitCache.set(meta.file, fetch(dataUrl(meta.file)).then(r => { if (!r.ok) throw Error(meta.file); return r.json(); }).then(d => {
    const u = `${grade} ${meta.title}`, out = [];
    (d.questions || []).forEach((x, i) => {
      const base = { key: `${meta.file}#${i}`, s: subject, u, c: x.cat || DEF_CAT[x.type], w: x.why || '' };
      if (x.type === 'tf') out.push({ ...base, k: 'tf', q: x.q, a: !!x.answer, p: x.context || '' });
      // 礦車、鑰匙最多四個選項
      else if (x.type === 'mc' && (x.options || []).length >= 2 && x.options.length <= 4) out.push({ ...base, k: 'mc', q: x.q, o: x.options, a: x.answer, p: x.context || '' });
    });
    return out;
  }));
  return unitCache.get(meta.file);
}
let INDEX = null;
let sel = Object.assign({ grade: '', term: '', subject: '全部', unit: '', per: 2 }, store.get('kr-cave-setup', {}));
const SUBJECTS = ['國語', '數學', '自然', '社會'];
const unitsOf = () => {
  const g = INDEX.grades.find(g => g.name === sel.grade); if (!g) return [];
  return g.subjects.filter(s => SUBJECTS.includes(s.name) && (sel.subject === '全部' || s.name === sel.subject))
    .flatMap(s => s.units.map(u => ({ meta: u, subject: s.name }))).filter(x => !sel.term || x.meta.term === sel.term);
};
let POOLQ = [], loadTok = 0;
async function loadPool() {
  const tok = ++loadTok, list = unitsOf().filter(x => !sel.unit || x.meta.file === sel.unit);
  const qs = (await Promise.all(list.map(x => loadUnit(x.meta, sel.grade, x.subject)))).flat();
  if (tok === loadTok) POOLQ = qs;
  return tok === loadTok;
}

/* ---------- 冒險狀態 ---------- */
let run = null;
function newScene() { stage.innerHTML = ''; stage.classList.remove('shake'); const sc = el('div', 'scene'); stage.append(sc); return sc; }
function hud() {
  $('#gemico').src = sp('gem');
  $('#room').textContent = run ? (run.at < run.rooms.length ? `第 ${run.at + 1} 關` : '魔王洞') : '洞口';
  $('#gems').textContent = run ? run.gems : 0;
  $('#hearts').innerHTML = Array.from({ length: HEARTS }, (_, i) => `<img class="px" alt="" src="${sp(run && i >= run.hearts ? 'hEmpty' : 'hFull')}">`).join('');
  $('#hearts').setAttribute('aria-label', `愛心 ${run ? run.hearts : HEARTS}`);
}
// 排四個關卡：每關一種不同的遊戲。是非題夠的話前兩關放翻板和吊橋；其餘從選擇題關卡隨機挑題目夠的
const fitsR = (r, q) => q.k === r.kind && (!r.game.fits || r.game.fits(q));
function planRooms(qs, per) {
  const used = new Set(), take = r => shuffle(qs.filter(q => fitsR(r, q) && !used.has(q.key)));
  const enough = r => take(r).length >= per;
  let rooms = [];
  for (const r of shuffle(ROOMS.filter(r => r.kind === 'tf'))) if (rooms.length < 2 && enough(r)) { rooms.push(r); take(r).slice(0, per).forEach(q => used.add(q.key)); }
  const force = (location.hash || '').slice(1); // 測試用：網址加 #chase 這類代號，一定會出那一關
  for (const r of shuffle(ROOMS.filter(r => r.kind === 'mc')).sort((a, b) => (b.icon === force) - (a.icon === force))) if (rooms.length < 4 && enough(r)) { rooms.push(r); take(r).slice(0, per).forEach(q => used.add(q.key)); }
  // 題目太少：放寬成可以重複出題
  for (const r of shuffle(ROOMS)) if (rooms.length < 4 && !rooms.includes(r) && qs.some(q => fitsR(r, q))) rooms.push(r);
  rooms = rooms.filter(r => r.game !== CHASE).concat(rooms.filter(r => r.game === CHASE));
  used.clear();
  return rooms.map(r => { const pool = take(r), list = []; for (let i = 0; i < per; i++) { const q = pool.shift() || pick(qs.filter(q => fitsR(r, q))); used.add(q.key); list.push(q); } return { ...r, qs: list, got: 0 }; });
}
function start() {
  if (!POOLQ.length) return renderSetup();
  const rooms = planRooms(POOLQ, sel.per);
  run = { rooms, at: 0, gems: 0, hearts: HEARTS, bossHP: BOSS_HP, rest: shuffle(POOLQ), used: new Set(), total: 0, score: 0, wrong: [], tries: 1 };
  document.body.classList.add('playing'); $('#setup').hidden = true; hud();
  mapWalk(-1, 0);
}

/* ---------- 洞穴地圖：小探險家沿著隧道走到下一關 ---------- */
const NODE_PATH = [0, 2, 4, 6, 8, 10];
const nodeFeet = i => { const [x, y] = ART.MAP.NODES[i], r = i === 5 ? 13 : i ? 9 : 5; return [PXC(x), PXC(y + r - 2)]; };
function drawMap(sc) {
  sc.className = 'scene s-map'; setBG(sc, 'map');
  const names = run ? [...run.rooms.map(r => r.name), BOSS_NAME] : ['？', '？', '？', '？', BOSS_NAME];
  names.forEach((n, i) => {
    const [x, y] = ART.MAP.NODES[i + 1], done = run && i < run.at, cur = run && i === run.at;
    const lab = at(el('div', 'node' + (done ? ' done' : '') + (cur ? ' cur' : '') + (i === 4 ? ' boss' : ''), `<b>${i === 4 ? '魔王' : i + 1}</b>${esc(n)}${done ? ` <span class="got">${('<img class="px" alt="" src="' + sp('gem') + '">').repeat(run.rooms[i].got)}</span>` : ''}`), PXC(x), PXC(y) - (i === 4 ? 11.5 : 9));
    sc.append(lab);
    const ic = run && i < 4 && sp('motif')[run.rooms[i].icon];
    if (ic) { const m = pimg(ic); m.className = 'px motif'; sc.append(m); m.onload = () => { size(m, m.naturalWidth * .62, m.naturalHeight * .62); at(m, PXC(x) - m.naturalWidth * .31, PXC(y) + 1.2 - m.naturalHeight * .31); }; }
  });
  return sc;
}
async function mapWalk(from, to) {
  document.body.classList.remove('playing'); hud();
  const sc = drawMap(newScene()); fit();
  $('#qcard').hidden = true; $('#verdict').hidden = true;
  const [x0, y0] = nodeFeet(from + 1);
  const kid = new Actor(sc, '你', x0, y0, .36); kid.p = { ...kid.p, accessory: 'cap' }; kid.key = '你cap'; kid.render();
  const torch = img(sp('torch')[0], 0, 0, 2.6, 3.9, 'mtorch'); sc.append(torch);
  let tf = 0; const tfl = setInterval(() => { if (!torch.isConnected) return clearInterval(tfl); tf ^= 1; torch.src = sp('torch')[tf]; }, 200);
  const place = () => at(torch, kid.x + 1.6, kid.y - 7.4);
  place();
  await sleep(500);
  // 沿著隧道一段一段走
  const pts = ART.MAP.PATH.slice(NODE_PATH[from + 1], NODE_PATH[to + 1] + 1).map(([x, y], i, a) => i === a.length - 1 ? nodeFeet(to + 1) : [PXC(x), PXC(y + 3)]);
  pts[0] = [x0, y0];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], d = Math.hypot(bx - ax, by - ay);
    kid.set(bx >= ax ? 'right' : 'left', '', true);
    await tween(d * 70, t => { kid.move(ax + (bx - ax) * t, ay + (by - ay) * t); place(); });
    if (i % 2 === 0) tone(300 + i * 40, .05, 'square', .03);
  }
  kid.set('stand');
  const boss = to === 4;
  const room = boss ? null : run.rooms[to];
  if (boss) { SFX.drum(12); shake(); }
  const V = $('#verdict'); V.hidden = false; V.className = 'panel verdict door';
  V.innerHTML = boss
    ? `<h2>魔王洞到了！</h2><p>${run.gems ? `你帶著 <b>${run.gems} 顆寶石</b>，每打中一次魔王會造成 <b>${dmgOf(run.gems)}</b> 點傷害。` : '沒有寶石也沒關係，答對就能打中魔王！'}答錯的話魔王會反擊，你有 ${HEARTS} 顆愛心。</p><button type="button" class="go" id="nx">衝進魔王洞</button>`
    : `<h2>第 ${to + 1} 關：${esc(room.name)}</h2><p>${esc(room.intro)}共 ${room.qs.length} 題，答對一題得到一顆寶石。</p><button type="button" class="go" id="nx">進入${esc(room.name)}</button>`;
  $('#nx').focus({ preventScroll: true });
  if (innerWidth < 600) V.scrollIntoView({ block: 'nearest', behavior: RM ? 'auto' : 'smooth' });
  await new Promise(r => $('#nx').onclick = () => { ac(); V.hidden = true; r(); });
  boss ? bossFight() : playRoom(to);
}

/* ---------- 題目牌和解說 ---------- */
const KLAB = { tf: '是非', mc: '選擇' };
function showQ(title, how, q) {
  document.body.classList.add('playing'); $('#qcard').hidden = false;
  $('#gname').textContent = title; $('#qsrc').textContent = `${q.s}${q.c || KLAB[q.k]}・${q.u}`;
  $('#qpass').hidden = !q.p; if (q.p) $('#qpass').textContent = q.p;
  $('#qtext').textContent = q.q; $('#qhow').textContent = how;
  fit();
}
function verdict(ok, ansText, why, label, extra = '') {
  const V = $('#verdict'); V.hidden = false; V.className = 'panel verdict ' + (ok ? 'ok' : 'bad');
  V.innerHTML = `<h2>${ok ? '答對了！' : '這次沒選對'}</h2>${extra}<p class="ans">正確答案是<b>${esc(ansText)}</b></p>${why ? `<p class="why">${esc(why)}</p>` : ''}<button type="button" class="go" id="nx">${label}</button>`;
  $('#nx').focus({ preventScroll: true });
  if (innerWidth < 600) V.scrollIntoView({ block: 'nearest', behavior: RM ? 'auto' : 'smooth' });
  return new Promise(r => $('#nx').onclick = () => { V.hidden = true; r(); });
}
function prep(q) {
  if (q.k === 'tf') return { opts: ['O 對', 'X 錯'], ans: q.a ? 0 : 1, ansText: q.a ? 'O（對）' : 'X（錯）' };
  const order = shuffle(q.o.map((_, i) => i));
  return { opts: order.map(i => q.o[i]), ans: order.indexOf(q.a), ansText: q.o[q.a] };
}
function record(q, ok, ansText) { run.total++; run.used.add(q.key); markWrong(q.key, !ok); if (ok) run.score++; else run.wrong.push({ q: q.q, a: ansText }); }
// 答對：寶石從畫面中間飛到右上角
async function gemFly(sc) {
  const g = img(sp('gem'), 47, 24, 6, 6, 'gemfly'); sc.append(g); SFX.clink();
  await anim(g, [{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1.6)', opacity: 1, offset: .3 }, { transform: 'scale(1.3)', offset: .6 }, { transform: 'translate(44cqw, -26cqw) scale(.6)', opacity: .9 }], 1100, { easing: 'ease-in-out' });
  g.remove(); run.gems++; hud(); const c = $('#gems').parentNode; c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); tone(1500, .12, 'sine', .06);
}

/* ---------- 一般關卡 ---------- */
async function playRoom(i) {
  const room = run.rooms[i]; hud();
  for (let j = 0; j < room.qs.length; j++) {
    const q = room.qs[j], { opts, ans, ansText } = prep(q), sc = newScene();
    showQ(`第 ${i + 1} 關 ${room.name}（${j + 1}/${room.qs.length}）`, room.game.how, q);
    window.__ans = ans;
    const { ok } = q.k === 'tf' ? await room.game.play(sc, ans) : await room.game.play(sc, opts, ans);
    record(q, ok, ansText);
    await sleep(900);
    if (ok) { room.got++; await gemFly(sc); }
    await sleep(500);
    await verdict(ok, ansText, q.w, j === room.qs.length - 1 ? '回到地圖' : '下一題', ok ? '<p class="gemline">得到一顆寶石！</p>' : '');
  }
  run.at = i + 1;
  mapWalk(i, i + 1);
}

/* ---------- 魔王戰 ---------- */
// 魔王：放大的怪獸，戴王冠、有血條；整場戰鬥同一個場景，每題只換選項
function bossQ() {
  const w = wrongBook();
  let q = run.rest.find(q => !run.used.has(q.key));
  if (!q) { run.used.clear(); q = shuffle(run.rest).find(q => w.has(q.key)) || pick(run.rest); }
  run.used.add(q.key); return q;
}
async function bossFight() {
  hud();
  const sc = newScene(); sc.className = 'scene s-boss s-lair'; setBG(sc, 'lair');
  sc.insertAdjacentHTML('beforeend', `<div class="hp"><b>${BOSS_NAME}</b><i></i></div>`);
  const hp = sc.querySelector('.hp i'); hp.style.width = (run.bossHP / BOSS_HP * 100) + '%';
  const monster = el('div', 'monster boss'); monster.append(pimg(MON[0])); const crown = pimg(sp('crown')); crown.className = 'px crown'; monster.append(crown); sc.append(monster);
  const kid = new Actor(sc, '你', 26, 49, .62); kid.p = { ...kid.p, accessory: 'cap' }; kid.key = '你cap'; kid.render();
  // 魔王登場
  if (run.bossHP === BOSS_HP && run.tries === 1) {
    $('#qcard').hidden = true;
    monster.style.opacity = 0; SFX.drum(16); await sleep(500);
    shake(); tone(110, .9, 'sawtooth', .1, 0, 60);
    await anim(monster, [{ transform: 'translateY(-30cqw)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1, offset: .7 }, { transform: 'scale(1.08,.9)' }, { transform: 'none', opacity: 1 }], 800, { easing: 'ease-in' });
    monster.style.opacity = 1; SFX.boom(); shake(); debris(sc, 80, 48, 16, ['#5a3a60', '#3a2643', '#8b8aa3']);
    const b = at(el('div', 'bubble', '誰敢闖進我的洞穴！'), 76, 18); sc.append(b);
    kid.set('stand', 'scared'); await sleep(1700); b.remove(); kid.set('stand', '');
  }
  monster.classList.add('idle');
  while (run.bossHP > 0 && run.hearts > 0) {
    const q = bossQ(), { opts, ans, ansText } = prep(q);
    const kind = pick(['cannon', 'weapon', 'magic']);
    const how = { cannon: '選一顆砲彈裝進大砲！答對才打得到魔王。', weapon: '選一把武器丟向魔王！答對才打得到。', magic: '選一道咒語施法！答對魔法才會打中魔王。' }[kind];
    showQ(`魔王洞・${BOSS_NAME}`, how, q);
    window.__ans = ans;
    const ok = await bossTurn(sc, { monster, kid, hp }, opts, ans, kind);
    record(q, ok, ansText);
    await sleep(900);
    const end = run.bossHP <= 0 || run.hearts <= 0;
    await verdict(ok, ansText, q.w, end ? (run.bossHP <= 0 ? '打開寶箱' : '看結果') : '繼續戰鬥', ok ? `<p class="gemline">造成 ${run.lastDmg} 點傷害！魔王剩 ${Math.max(0, run.bossHP)} 點血。</p>` : `<p class="gemline">魔王反擊！剩下 ${run.hearts} 顆愛心。</p>`);
  }
  run.bossHP <= 0 ? victory() : defeat();
}
async function bossTurn(sc, { monster, kid, hp }, opts, ans, kind) {
  const XS = opts.length === 2 ? [30, 70] : opts.length === 3 ? [18, 50, 82] : [13, 38, 63, 88];
  const W = opts.length === 2 ? 34 : 23.5;
  const tags = opts.map((o, i) => { const t = lbl(o, XS[i], 51.2, W, 'bopt'); t.style.setProperty('--c', LANE[i]); return t; });
  sc.append(...tags);
  let cannon = null;
  if (kind === 'cannon') { kid.move(18, 49); cannon = at(el('div', 'item'), 30, 43); size(cannon, 11, 8.3); cannon.append(pimg(CANNON, 11, 8.3)); sc.append(cannon); }
  else kid.move(26, 49);
  kid.set(kind === 'cannon' ? 'stand' : 'right', '', false);
  const k = await choose(sc, tags); SFX.click(); hide(tags.filter((_, i) => i !== k));
  const MX = 74, MY = 34;
  // 準備：選項變成砲彈、武器或咒語，飛到主角身上
  const sx = XS[k], from = [sx, 49];
  let shot;
  if (kind === 'cannon') { shot = el('div', 'shot'); const ball = el('div', 'ball2'); ball.style.setProperty('--c', LANE[k]); shot.append(ball); }
  else if (kind === 'weapon') { const w = pick(WEAPON.filter(w => w.k !== 'wand')); shot = el('div', 'shot'); shot.append(pimg(w.src, w.w * .7, w.h * .7)); shot.dataset.spin = w.k !== 'arrow' ? 1 : ''; }
  else { shot = el('div', 'shot orb'); shot.style.setProperty('--c', LANE[k]); }
  at(shot, from[0], from[1] - 4); sc.append(shot);
  const hold = kind === 'cannon' ? [31, 41] : [30, 38];
  await tween(650, t => at(shot, from[0] + (hold[0] - from[0]) * t, from[1] - 4 + (hold[1] - from[1] + 4) * t - Math.sin(Math.PI * t) * 10), ease.io);
  hide([tags[k]]);
  if (kind === 'cannon') { shot.style.opacity = 0; SFX.click(); await anim(cannon, [{ transform: 'none' }, { transform: 'scale(1.1,.9)' }, { transform: 'none' }], 250); }
  else if (kind === 'magic') { kid.set('cheer', '', false); for (let i = 0; i < 6; i++) puff(sc, 30 + rnd(-3, 3), 36 + rnd(-3, 3), 2.4, LANE[k], 600, rnd(-3, 3), rnd(-4, 0)); tone(900, .4, 'sine', .05, 0, 1800); await sleep(500); }
  else { kid.say('看招！', 700); await sleep(500); }
  // 發射：飛到魔王面前停住，閃光之後才知道有沒有打中
  SFX.drum(10);
  if (kind === 'cannon') { SFX.boom(); anim(cannon, [{ transform: 'none' }, { transform: 'translateX(-1.5cqw)' }, { transform: 'none' }], 220, { fill: 'none' }); puff(sc, 36, 42, 4, '#d3d1e6', 500, 2, -1); shot.style.opacity = 1; }
  else SFX.whoosh();
  const p0 = kind === 'cannon' ? [37, 42] : hold, stop = [MX - 12, MY + 2];
  await tween(700, t => { at(shot, p0[0] + (stop[0] - p0[0]) * t, p0[1] + (stop[1] - p0[1]) * t - Math.sin(Math.PI * t) * 6); if (shot.dataset.spin) shot.style.rotate = 540 * t + 'deg'; }, ease.out);
  const hover = shot.animate([{ translate: '-50% -50%' }, { translate: '-50% -62%' }], { duration: T(220), iterations: Infinity, direction: 'alternate' });
  monster.classList.remove('idle'); anim(monster, [{ rotate: '0deg' }, { rotate: '-3deg' }, { rotate: '3deg' }, { rotate: '0deg' }], 800);
  await sleep(700);
  await revealFlash(sc);
  hover.cancel();
  const ok = k === ans;
  if (ok) {
    await tween(160, t => at(shot, stop[0] + (MX - stop[0]) * t, stop[1] + (MY - stop[1]) * t));
    shot.remove();
    const crit = Math.random() < .2, n = Math.round(dmgOf(run.gems) * (crit ? 1.5 : 1));
    run.lastDmg = n; run.bossHP -= n;
    noise(.18, .5, 1200); tone(160, .12, 'square', .07); flash(sc);
    monster.animate([{ transform: 'none', filter: 'none' }, { transform: 'translateX(3cqw)', filter: 'brightness(2.6)' }, { transform: 'none', filter: 'none' }], { duration: T(320) });
    const s = at(el('div', 'slash'), MX, MY); s.style.rotate = rnd(-50, 50) + 'deg'; sc.append(s); anim(s, [{ scale: '.2 1', opacity: 1 }, { scale: '1.3 1', opacity: 0 }], 320).then(() => s.remove());
    if (kind === 'magic') for (let i = 0; i < 8; i++) puff(sc, MX, MY, 3, LANE[k], 600, rnd(-7, 7), rnd(-7, 7));
    debris(sc, MX, MY, 12, ['#fff3c4', '#ffd166', LANE[k]]);
    const d = at(el('div', 'dmg' + (crit ? ' crit' : ''), (crit ? '會心一擊！' : '') + `-${n}`), MX + 4, MY - 12); sc.append(d);
    anim(d, [{ transform: 'translateY(0) scale(.6)', opacity: 1 }, { transform: 'translateY(-2cqw) scale(1.2)', opacity: 1, offset: .3 }, { transform: 'translateY(-7cqw)', opacity: 0 }], 1300).then(() => d.remove());
    hp.style.width = Math.max(0, run.bossHP / BOSS_HP * 100) + '%';
    kid.cheer();
    if (run.bossHP <= 0) await bossDown(sc, monster, hp);
    else { await sleep(700); monster.classList.add('idle'); stamp(sc, true, '打中了！', 12); }
  } else {
    // 被魔王彈開：砲彈掉下去，魔王衝過來反擊
    SFX.clink(); tone(1800, .1, 'square', .05);
    const sh = at(el('div', 'shield'), MX - 6, MY); sc.append(sh); anim(sh, [{ opacity: 0, scale: .4 }, { opacity: 1, scale: 1, offset: .3 }, { opacity: 0, scale: 1.3 }], 700).then(() => sh.remove());
    await tween(600, t => { at(shot, stop[0] - 14 * t, stop[1] - Math.sin(Math.PI * t) * 8 + 16 * t * t); shot.style.rotate = -400 * t + 'deg'; }, ease.in);
    shot.remove();
    const b = at(el('div', 'bubble', pick(['哈哈，沒打到！', '不痛不癢！', '換我了！'])), 78, 16); sc.append(b);
    await sleep(800); b.remove();
    tone(200, .5, 'sawtooth', .08, 0, 80);
    await anim(monster, [{ transform: 'none' }, { transform: 'translateX(2cqw)', offset: .3 }, { transform: 'translateX(-30cqw) rotate(-8deg)' }], 420, { easing: 'ease-in' });
    SFX.boom(); shake(); flash(sc);
    run.hearts--; hud();
    kid.set('stand', 'scared');
    anim(kid.e, [{ transform: 'none' }, { transform: 'translate(-6cqw, -3cqw) rotate(-20deg)', offset: .4 }, { transform: 'translate(-8cqw, 0) rotate(-10deg)' }], 600);
    const hb = img(sp('hEmpty'), kid.x - 2, kid.y - 18, 4, 3.5, 'fx'); sc.append(hb); anim(hb, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(-5cqw)', opacity: 0 }], 1200).then(() => hb.remove());
    await anim(monster, [{ transform: 'translateX(-30cqw) rotate(-8deg)' }, { transform: 'none' }], 600, { easing: 'ease-out' });
    monster.classList.add('idle');
    await sleep(300); kid.e.getAnimations().forEach(a => a.cancel());
    if (run.hearts <= 0) { kid.set('stand', 'sad'); anim(kid.e, [{ transform: 'none' }, { transform: 'translateY(.5cqw) rotate(-90deg)' }], 600); SFX.lose(); stamp(sc, false, '被打倒了…', 12); }
    else { kid.set('stand', 'sad'); SFX.lose(); stamp(sc, false, '被反擊了！', 12); }
  }
  if (cannon) { await sleep(400); cannon.remove(); }
  tags.forEach(t => t.remove()); sc.classList.remove('locked');
  sc.querySelectorAll('.stamp').forEach(s => setTimeout(() => s.remove(), T(1800)));
  return ok;
}
async function bossDown(sc, monster, hp) {
  monster.classList.remove('idle'); SFX.drum(18);
  await anim(monster, [{ transform: 'none' }, { transform: 'translateX(-1cqw)' }, { transform: 'translateX(1cqw)' }, { transform: 'translateX(-1cqw)' }, { transform: 'none' }], 900);
  await revealFlash(sc);
  SFX.boom(); shake(); flash(sc);
  for (let i = 0; i < 14; i++) puff(sc, 80 + rnd(-12, 12), 36 + rnd(-10, 10), rnd(5, 9), pick(['#d3d1e6', '#b79cff', '#fff3c4']), 1300, rnd(-4, 4), -6);
  debris(sc, 80, 36, 30, ['#fff3c4', '#ffd166', '#b79cff', '#78e0f0']);
  await anim(monster, [{ transform: 'none', opacity: 1 }, { transform: 'scale(1.15)', filter: 'brightness(3)', offset: .3 }, { transform: 'scale(.1) rotate(180deg)', opacity: 0 }], 900, { easing: 'ease-in' });
  monster.remove(); hp.parentNode.remove();
  // 寶石雨
  for (let i = 0; i < 16; i++) { const g = img(sp('gem'), 80 + rnd(-6, 6), 30, 3.4, 3.4, 'fx'); sc.append(g); const vx = rnd(-20, 20); g.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${vx * .5}cqw, -12cqw)`, offset: .4 }, { transform: `translate(${vx}cqw, 16cqw)` }], { duration: T(rnd(900, 1300)), easing: 'cubic-bezier(.3,.6,.6,1)', fill: 'forwards' }); }
  SFX.win(); confetti(sc, 60); stamp(sc, true, '打倒魔王！', 14);
}

/* ---------- 結局 ---------- */
async function victory() {
  document.body.classList.remove('playing'); fit();
  $('#qcard').hidden = true; $('#verdict').hidden = true;
  const sc = newScene(); sc.className = 'scene s-lair'; setBG(sc, 'lair');
  const chest = img(sp('bigChest'), 50 - 9.4, 33, 18.75, 15, 'bigchest'); sc.append(chest);
  const kid = new Actor(sc, '你', 30, 49, .66); kid.p = { ...kid.p, accessory: 'cap' }; kid.key = '你cap'; kid.render();
  await sleep(400); SFX.drum(10); await anim(chest, [{ transform: 'none' }, { transform: 'translateY(-.6cqw) rotate(-3deg)' }, { transform: 'translateY(-.6cqw) rotate(3deg)' }, { transform: 'none' }], 700);
  await revealFlash(sc);
  chest.src = sp('bigChestOpen'); chest.style.height = U(18.75); chest.style.top = U(30.25);
  const glow = at(size(el('div', 'chestglow'), 30, 30), 50, 38); sc.append(glow);
  for (let i = 0; i < 20; i++) { const g = img(sp(i % 3 ? 'gem' : 'star'), 50, 36, 3.2, 3.2, 'fx'); sc.append(g); const vx = rnd(-26, 26); g.animate([{ transform: 'translate(-50%,0)' }, { transform: `translate(${vx * .5}cqw, -20cqw)`, offset: .45 }, { transform: `translate(${vx}cqw, 10cqw)`, opacity: 0 }], { duration: T(rnd(1200, 1800)), delay: T(i * 40), easing: 'cubic-bezier(.3,.6,.6,1)', fill: 'forwards' }); }
  const crown = img(sp('crown'), 30 - 3.25, 49 - 20 * .66 - 2.6, 6.5, 4, 'fx'); sc.append(crown);
  anim(crown, [{ transform: 'translateY(-20cqw)', opacity: 0 }, { transform: 'none', opacity: 1 }], 900, { easing: 'ease-out' });
  kid.cheer(); SFX.win(); confetti(sc, 80);
  const S = $('#setup'); S.hidden = false;
  S.innerHTML = `<h2>恭喜！你打倒了${BOSS_NAME}，拿到洞穴寶藏！</h2>
    <p>答對 <b>${run.score}</b>／${run.total} 題，帶了 <b>${run.gems}</b> 顆寶石，剩下 <b>${run.hearts}</b> 顆愛心。${run.tries > 1 ? `（挑戰魔王 ${run.tries} 次）` : ''}</p>
    ${wrongList()}
    <div class="row"><button type="button" class="go" id="again">再冒險一次</button><button type="button" class="opt" id="back">換範圍</button></div>`;
  $('#again').onclick = () => { ac(); start(); }; $('#back').onclick = showSetup;
  run = null; hud();
}
function wrongList() { return run.wrong.length ? `<p>這幾題再看一次（已收進錯題本）：</p><ol class="wrongs">${run.wrong.map(w => `<li>${esc(w.q.replace(/\n/g, ' '))} 答案：<b>${esc(w.a)}</b></li>`).join('')}</ol>` : '<p>一題都沒錯，太厲害了！</p>'; }
function defeat() {
  $('#qcard').hidden = true;
  const S = $('#setup'); S.hidden = false;
  S.innerHTML = `<h2>被${BOSS_NAME}打倒了…</h2>
    <p>別灰心！魔王還剩 <b>${run.bossHP}</b> 點血。休息一下，愛心補滿，寶石還在，再挑戰一次吧。</p>
    ${wrongList()}
    <div class="row"><button type="button" class="go" id="retry">再挑戰魔王</button><button type="button" class="opt" id="back">回洞口重來</button></div>`;
  $('#retry').onclick = () => { ac(); S.hidden = true; run.hearts = HEARTS; run.tries++; run.wrong = []; bossFight(); };
  $('#back').onclick = showSetup;
}

/* ---------- 開始畫面 ---------- */
function showSetup() {
  run = null; hud();
  document.body.classList.remove('playing'); fit();
  $('#qcard').hidden = true; $('#verdict').hidden = true;
  attract(); renderSetup();
}
function attract() {
  const sc = drawMap(newScene());
  const [x, y] = nodeFeet(0);
  const kid = new Actor(sc, '你', x, y, .36); kid.p = { ...kid.p, accessory: 'cap' }; kid.key = '你cap'; kid.render(); kid.anim = true; kid.pose = 'step';
  const m = el('div', 'monster mapboss idle'); m.append(pimg(MON[0])); sc.append(m);
}
async function renderSetup() {
  const S = $('#setup'); S.hidden = false;
  const grades = INDEX.grades.map(g => g.name);
  if (!grades.includes(sel.grade)) sel.grade = grades[0];
  const terms = [...new Set(INDEX.grades.find(g => g.name === sel.grade).subjects.flatMap(s => s.units.map(u => u.term)).filter(Boolean))];
  if (sel.term && !terms.includes(sel.term)) sel.term = '';
  const units = unitsOf();
  if (sel.unit && !units.some(x => x.meta.file === sel.unit)) sel.unit = '';
  store.set('kr-cave-setup', sel);
  const chips = (key, vals, lab) => `<div class="row"><span class="lab">${lab}</span>${vals.map(([v, t]) => `<button type="button" class="opt" data-k="${key}" data-v="${esc(v)}" aria-pressed="${String(sel[key]) === String(v)}">${esc(t)}</button>`).join('')}</div>`;
  const pair = a => a.map(v => [v, v]);
  S.innerHTML = `<h2>洞穴深處住著${BOSS_NAME}，闖過四個關卡去打倒牠！</h2>
    <p class="small">每關答對一題得到一顆寶石；寶石越多，打魔王越痛。魔王戰答對才打得中，答錯會被反擊扣愛心。</p>
    ${chips('grade', pair(grades), '年級')}
    ${terms.length > 1 ? chips('term', [['', '全部'], ...pair(terms)], '範圍') : ''}
    ${chips('subject', pair(['全部', ...SUBJECTS]), '科目')}
    <div class="row"><label class="lab" for="unitSel">單元</label><select id="unitSel"><option value="">全部單元</option>${units.map(x => `<option value="${esc(x.meta.file)}" ${x.meta.file === sel.unit ? 'selected' : ''}>${sel.subject === '全部' ? x.subject + '・' : ''}${esc(x.meta.title)}</option>`).join('')}</select></div>
    ${chips('per', [[2, '每關 2 題'], [3, '每關 3 題']], '關卡')}
    <p class="small" id="avail">題目讀取中…</p>
    <div class="row"><button type="button" class="go" id="start" disabled>出發探險</button></div>
    <p class="small">每次冒險從下面九個洞穴關卡挑四個不同的（有是非題時先過翻板廳和峽谷），最後是魔王洞。</p>
    <div class="games">${ROOMS.map(r => `<div><b>${r.name}</b><span class="for">${r.kind === 'tf' ? '是非題' : '選擇題'}</span>${r.intro}</div>`).join('')}<div><b>魔王洞・${BOSS_NAME}</b><span class="for">是非、選擇都有</span>選砲彈、武器或咒語攻擊。閃光之後才知道打中了沒有！</div></div>
    <p class="small">題目來自複習小書的是非題和選擇題；答錯的題目會收進錯題本，和複習小書共用。</p>`;
  S.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
    const k = b.dataset.k; sel[k] = k === 'per' ? +b.dataset.v : b.dataset.v;
    if (k === 'grade' || k === 'term' || k === 'subject') sel.unit = '';
    renderSetup();
  });
  $('#unitSel').onchange = e => { sel.unit = e.target.value; renderSetup(); };
  $('#start').onclick = () => { ac(); start(); };
  let ok;
  try { ok = await loadPool(); } catch { $('#avail').textContent = '題目讀取失敗，請檢查網路後再試一次。'; return; }
  if (!ok || !$('#avail')) return;
  const nt = POOLQ.filter(q => q.k === 'tf').length, nm = POOLQ.filter(q => q.k === 'mc').length, need = sel.per * 4 + 3;
  $('#avail').textContent = nt + nm >= need ? `這個範圍有是非題 ${nt} 題、選擇題 ${nm} 題。` : nt + nm ? `這個範圍只有 ${nt + nm} 題，題目會重複出現，可以多選幾個單元。` : '這個範圍沒有是非題或選擇題，換個科目或單元看看。';
  $('#start').disabled = !(nt + nm);
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
hud();
fetch('data/index.json').then(r => r.json()).then(ix => { INDEX = ix; showSetup(); })
  .catch(() => { $('#setup').hidden = false; $('#setup').innerHTML = '<h2>題目讀取失敗</h2><p>請檢查網路，再重新整理頁面。</p>'; });
