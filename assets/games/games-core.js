/* 小遊戲共用本體：點陣人物、音效、動畫工具和全部的遊戲（是非、選擇、題組、國語字音字形）。
   games.html（最後一刻揭曉）和 cave.html（洞穴大冒險）都載入這個檔，再各自載入自己的遊戲流程（games.js／cave.js）。
   要改遊戲本身只改這裡，兩邊會一起更新。 */
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
const { esc, store } = KR; // common.js
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
/* ART.HD 是重繪版角色（assets/games/art2.js）；沒載入時用舊的點陣圖 */
const HD = ART.HD || {};
const MON = HD.mon || SPRITES.monsterPal.map(p => pix(SPRITES.monster, p));
const LANE = ['#e8414f', '#3c8dde', '#ffd166', '#2f9e5b'];
const HORSE = HD.horse || LANE.map(c => SPRITES.horse.map(r => pixShaded(r, { k: '#1d1b2e', c, f: '#f5c79a', j: c, r: '#fffaf0', b: '#9a6a3f', n: '#6e4a2a', d: '#3a2618' })));
const ROCKET = HD.rocket || LANE.map(c => pixShaded(SPRITES.rocket, { k: '#1d1b2e', r: c, w: '#f2f4f8', s: '#b9b6d8', g: '#5d5a77', b: '#78c3f0' }));
const WEAPON = ['sword', 'arrow', 'hammer', 'wand'].map(k => HD.weapon ? { k, ...HD.weapon[k] } : { k, src: pixShaded(SPRITES[k], SPAL.weapon), w: SPRITES[k][0].length, h: SPRITES[k].length });
const CANNON = HD.cannon || pixShaded(SPRITES.cannon, SPAL.cannon), FISH = HD.fish || pixShaded(SPRITES.fish, SPAL.fish), BOOT = HD.boot || pixShaded(SPRITES.boot, SPAL.boot);
// 砲彈：有重繪版就用點陣圖，沒有就用 CSS 畫的圓球
const ballEl = i => { const b = el('div', 'ball2'); if (HD.balls) { b.classList.add('pxball'); b.style.backgroundImage = `url(${HD.balls[i]})`; } else b.style.setProperty('--c', LANE[i]); return b; };
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
    pcache.set(k, (window.PEOPLE_HD || pix)(rows, Object.assign({}, PP.frame(person, 'walk-down', 0).palette, { R: '#d6334a' }, pal), !face));
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
  // side：'r'／'l' 指定對話框放在人物的右邊／左邊（頭頂上有別的東西時用）
  say(text, ms = 1400, side = '') { const b = at(el('div', 'bubble', esc(text)), this.x, this.y - 20 * this.s - 1); const par = this.e.parentNode; par.append(b);
    // 靠近畫面邊緣時把對話框推回畫面裡，尖角仍指著說話的人；頭頂放不下（人站在畫面最上面）就改放在頭的旁邊
    if (par.classList.contains('scene') && par.clientWidth) {
      const k = 100 / par.clientWidth, w = b.offsetWidth * k, h = b.offsetHeight * k, top = this.y - 20 * this.s - 1;
      if (side || top - h < .6) {
        const right = side ? side === 'r' : this.x + 9 * this.s + w + 2 < 99.4 || this.x < 50, x = right ? this.x + 9 * this.s + 1.6 + w / 2 : this.x - 9 * this.s - 1.6 - w / 2;
        b.classList.add(right ? 'tail-l' : 'tail-r'); b.style.left = U(Math.max(w / 2 + .6, Math.min(99.4 - w / 2, x))); b.style.top = U(Math.max(h + .6, this.y - 12 * this.s + h / 2));
      } else { const x = Math.max(w / 2 + .6, Math.min(99.4 - w / 2, this.x)); if (x !== this.x) { b.style.left = U(x); b.style.setProperty('--tail', U(this.x - x)); } }
    }
    if (ms) setTimeout(() => b.remove(), T(ms)); return b; }
  async cheer() { this.set('cheer', 'happy', true); await this.hop(3, 2.4); }
  async sad() { this.set('stand', 'sad'); await anim(this.e, [{ transform: 'none' }, { transform: 'translateY(.6cqw) scaleY(.94)' }], 300); }
}
Actor.all = new Set();
setInterval(() => Actor.all.forEach(a => { if (!a.e.isConnected) return Actor.all.delete(a); if (a.anim) { a.f ^= 1; a.render(); } }), 180);

/* ---------- 音效（即時合成，引擎在 assets/sfx.js） ---------- */
const KS = window.KRSFX; let muted = store.get('kr-reveal-mute', false);
const ac = () => KS.ctx();
// 這裡的 delay 單位是毫秒（引擎用秒）
const tone = (f, d = .08, type = 'square', v = .05, delay = 0, f2) => { if (!muted) KS.tone(f, d, type, v, delay / 1000, f2); };
const noise = (d = .4, v = .25, freq = 900, delay = 0) => { if (!muted) KS.noise(d, v, freq, delay / 1000); };
const SFX = Object.fromEntries(Object.entries(KS.lib).map(([k, fn]) => [k, (...a) => { if (!muted) fn(...a); }]));
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
/* 反轉演出：答對時偶爾先演「看起來要失敗了」，最後一刻才逆轉成功（大約三題一次，不會連續兩題都出現）。
   只在答對時出現，所以結果不會騙人。window.KR_TWIST = true／false 可以強制開或關（測試用）。 */
let twistGap = 9;
function twist(ok) {
  twistGap++; KS.setBig(false);
  if (!ok) return false;
  const on = window.KR_TWIST != null ? !!window.KR_TWIST : twistGap > 1 && Math.random() < .3;
  if (on) { twistGap = 0; KS.setBig(true); } // 逆轉成功時，答對的音樂換成更熱鬧的版本
  return on;
}
// 畫面下方的旁白條（再叫一次就換字；unnote 拿掉）
function note(scene, text) { let b = scene.querySelector('.commentary'); if (!b) { b = el('div', 'commentary'); scene.append(b); } b.hidden = false; b.textContent = text; return b; }
const unnote = scene => scene.querySelector('.commentary')?.remove();
const uhoh = () => SFX.uhoh();

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
    const nO = pick([2, 3, 3, 4]), sides = shuffle([0, 1, 2, 3, 4, 5].map(i => i < nO ? 0 : 1));   // 兩邊人數每次不一樣：2–4、3–3、4–2
    const used = [0, 0], order = [shuffle(SPOTS[0]), shuffle(SPOTS[1])];
    npcs.forEach((a, i) => { a.side = sides[i]; });
    await Promise.all(npcs.map(async a => { await idle(a); const x = order[a.side][used[a.side]++] + rnd(-1, 1); await a.walkTo(x, Math.abs(x - a.x) * 18 + 200); }));
    // 倒數前的小插曲，每次不一樣：沒人動、一個人換邊、兩個人接連換邊、有人走到一半又折回去、兩個人鬥嘴
    const swap = async (a, line) => { a.say(line, 1200); await sleep(700); SFX.whoosh(); a.side = 1 - a.side; const x = MID[a.side] + pick([-1, 1]) * rnd(10, 14); await a.walkTo(x, Math.abs(x - a.x) * 14 + 200); };
    const beat = pick(['none', 'one', 'one', 'two', 'back', 'talk']), [n1, n2] = shuffle(npcs);
    if (beat === 'one') await swap(n1, pick(['等等！我要換邊！', '我改變主意了！', '還是那邊比較對！']));
    else if (beat === 'two') { await swap(n1, '等等！我要換邊！'); await swap(n2, pick(['那我也要換！', '等我一下！'])); }
    else if (beat === 'back') { n1.say('我想換邊…', 900); await sleep(600); const x0 = n1.x; await n1.walkTo(50, Math.abs(50 - x0) * 14 + 200); n1.say(pick(['算了，我相信自己！', '不對，還是原來那邊！']), 1100); await sleep(500); await n1.walkTo(x0, Math.abs(50 - x0) * 14 + 200); }
    else if (beat === 'talk') { n1.say(pick(['這題我有把握！', '一定是這邊啦！', '好緊張…']), 1200); await sleep(600); n2.say(pick(['真的嗎？', '我覺得是這邊！', '噓——要倒數了！']), 1200); await sleep(900); }
    else await sleep(400);
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
    if (twist(ok)) {
      // 反轉：錯的那邊招牌先亮起來、自己腳下的地板晃了一下，原來是燈號跳錯
      signs[bad].src = sp(bad ? 'signXlit' : 'signOlit'); beams[bad].style.rotate = '0deg'; beams[bad].style.opacity = 1; uhoh();
      kid.set('stand', 'scared'); kid.say('咦？！', 1000);
      await anim(panels[ans], [0, .5, -.3, .6, -.2, 0].map(d => ({ translate: `0 ${d}cqw` })), 900, { fill: 'none' });
      note(scene, '等等……燈號跳錯了！'); await sleep(800);
      signs[bad].src = sp(bad ? 'signX' : 'signO'); beams[bad].style.opacity = 0; tone(1200, .12, 'square', .05); await sleep(350); unnote(scene);
    }
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
    // 劇本每次不一樣，但最後一票之前一定打成平手，最後一票才揭曉
    const R = k !== ans ? k : pick([0, 1, 2, 3].filter(i => i !== ans)), others = [0, 1, 2, 3].filter(i => i !== ans && i !== R);
    const C = ans, o0 = others[0], o1 = others[1] ?? others[0];
    const seq = pick([
      [R, o0, R, C, R, o1, C, R, C, C, R, C],   // 對手一路領先，最後被追平
      [C, o0, C, R, C, o1, R, C, R, R],         // 一開始領先，被對手追平
      [o0, R, C, o0, R, C, o0, R, C, R, C],     // 三個人咬得很緊
      [R, C, R, C, o0, R, C, o1, R, C],         // 你一票我一票
      [o0, o1, R, R, R, C, R, C, C, C],         // 對手衝很快，最後連追三票
    ]);
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
      // 開出來的票亮在唱票的人右邊，才不會蓋到他頭上的「幾號！」
      const sx = slow ? 22 : 20, sy = slow ? 36 : 38;
      await tween(slow ? 900 : 300, t => at(b, 7.7 + 9.2 * t, 42 - 6.5 * t), ease.out);
      let slip = null;
      if (slow) {
        // 最後一票：慢慢打開、鏡頭推近、閃光
        zoom(scene, 16, 70, 1.5, 1400);
        slip = at(el('div', 'slipv pp', '？'), sx, sy); scene.append(slip); b.remove();
        for (let j = 0; j < 6; j++) { SFX.beat(); anim(slip, [{ scale: 1 }, { scale: 1.06 }, { scale: 1 }], 280, { fill: 'none' }); await sleep(420 - j * 30); }
        await revealFlash(scene);
        slip.textContent = `${i + 1}號`; zoom(scene, 16, 70, 1, 500);
      } else { slip = at(el('div', 'slipv pp small', `${i + 1}號`), sx, sy); scene.append(slip); b.remove(); }
      leader.say(`${i + 1}號！`, slow ? 1600 : 520);
      await sleep(slow ? 700 : 380);
      await tween(slow ? 500 : 260, t => at(slip, sx + (XS[i] - sx) * t, sy - (sy - 14) * t), ease.in); slip.remove();
      const before = lead(); draw(i); const after = lead();
      if (after === i && before !== i) { cands[i].hop(1, 1.4); }
    };
    const banner = el('div', 'commentary', ''); scene.append(banner); banner.hidden = true;
    for (let j = 0; j < seq.length; j++) {
      await readOne(seq[j], false);
      const L = lead();
      // 旁白跟著票數走
      const top = Math.max(...counts), second = [...counts].sort((a, b) => b - a)[1];
      if (j === seq.length - 1) { banner.hidden = false; banner.textContent = `${counts[R]} 比 ${counts[C]} 平手！最後一票…`; SFX.drum(12); }
      else if (j >= 4) { banner.hidden = false; banner.textContent = L >= 0 ? `${L + 1}號${top - second >= 2 ? '遙遙領先！' : '暫時領先！'}` : counts.filter(c => c === top).length >= 3 ? '三個人同票！' : '追平了，拉鋸戰！'; }
      await sleep(j < seq.length - 6 ? 180 : j < seq.length - 2 ? 380 : 650);
    }
    const ok = k === ans;
    if (twist(ok)) {
      // 反轉：「最後一票」開出來是對手，眼看要落選了，結果票箱底還壓著兩張
      await readOne(R, false); banner.textContent = `${R + 1}號多一票，要當選了嗎…`; cands[R].hop(2, 1.4); uhoh(); await sleep(1400);
      leader.say('等等！箱子底還有兩張！', 1500); anim(box, [{ rotate: '0deg' }, { rotate: '-8deg' }, { rotate: '8deg' }, { rotate: '0deg' }], 500, { fill: 'none' }); await sleep(1600);
      await readOne(C, false); banner.textContent = '又平手了！這次真的是最後一票…'; SFX.drum(12); await sleep(700);
    }
    cands.forEach(c => c.set('stand', 'scared'));
    await readOne(C, true);
    banner.textContent = `${C + 1}號當選！`;
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
      if (twist(ok)) {
        // 反轉：才要往前走，前面那片木板就斷了，差點掉下去，跳過缺口才過關
        const gap = Math.floor((50 - X0) / PW) + 1, pl = planks[k][gap];
        SFX.snip(); tone(120, .4, 'sawtooth', .1, 0, 40); broken[k].add(gap);
        anim(pl, [{ transform: 'none' }, { transform: `translate(${rnd(-3, 3)}cqw, 40cqw) rotate(${rnd(-200, 200)}deg)` }], 1100, { easing: 'cubic-bezier(.5,0,1,1)' });
        sag[k] = 1.5; layout(k); kid.move(50, footY(50)); kid.set('stand', 'scared'); kid.say('哇！木板斷了！', 1100); shake();
        await anim(kid.e, [{ rotate: '0deg' }, { rotate: '10deg' }, { rotate: '-8deg' }, { rotate: '6deg' }, { rotate: '0deg' }], 1200, { fill: 'none' });
        SFX.pop(); const x1 = X0 + (gap + 1.6) * PW;
        await tween(520, t => { const x = 50 + (x1 - 50) * t; kid.move(x, footY(x) - Math.sin(Math.PI * t) * 7); });
        sag[k] = 0; layout(k);
      }
      kid.set('right', 'happy', true);
      { const xa = kid.x; await tween(1500, t => { const x = xa + (88 - xa) * t; kid.move(x, footY(x)); }); }
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
      if (twist(ok)) {
        // 反轉：先跳出 ERROR、警報燈閃了幾下，重新檢查後才變成 OPEN
        lcd.textContent = 'ERROR'; lcd.classList.add('bad'); uhoh(); siren.style.opacity = 1;
        siren.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(2.2)' }], { duration: T(240), iterations: 4, direction: 'alternate' });
        kid.say('怎麼會？', 1000); await sleep(1200);
        lcd.classList.remove('bad'); for (const d of ['-', '- -', '- - -', '- - - -']) { lcd.textContent = d; SFX.tick(); await sleep(240); }
        siren.style.opacity = 0;
      }
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
    if (twist(ok)) {
      // 反轉：箱子打開看起來是空的，原來東西壓在最底下
      cust.set('stand', 'scared'); cust.say('咦？空的？', 1100); uhoh(); await sleep(1400);
      anim(box, [{ rotate: '0deg' }, { rotate: '-6deg' }, { rotate: '6deg' }, { rotate: '0deg' }], 400, { fill: 'none' }); SFX.pop(); cust.say('啊，壓在最底下！', 1000); await sleep(1100);
    }
    const pop = at(el('div', 'slipv small', esc(opts[k])), 57, 34); scene.append(pop);
    anim(pop, [{ transform: 'translateY(4cqw) scale(.3)', opacity: 0 }, { transform: 'none', opacity: 1 }], 400, { easing: 'cubic-bezier(.3,1.6,.6,1)' });
    if (ok) { rise(scene, sp('star'), 57, 38, 10, 3.4); SFX.win(); confetti(scene); cust.cheer(); cust.say('就是這個！', 1600, 'r'); stamp(scene, true, '送對了！', 14); }   // 箱子裡跳出來的答案在頭頂上，台詞放旁邊才不會被蓋住
    else { pop.classList.add('wrong'); puff(scene, 57, 40, 8, '#d3d1e6'); SFX.lose(); await cust.sad(); cust.say('送錯了啦…', 1600, 'r'); stamp(scene, false, '送錯了！', 14); }
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
      if (twist(ok)) {
        // 反轉：轉到底鎖還是不開，用力拍一下才彈開
        uhoh(); anim(lock, [0, .5, -.5, .4, -.3, 0].map(d => ({ translate: d + 'cqw 0' })), 500, { fill: 'none' }); kid.set('stand', 'sad'); kid.say('卡住了？', 1000); await sleep(1200);
        await kid.walkTo(41, 350); SFX.click(); tone(160, .1, 'square', .08); anim(kid.e, [{ transform: 'none' }, { transform: 'translateX(1.5cqw) rotate(8deg)' }, { transform: 'none' }], 220, { fill: 'none' }); shake(); await sleep(400);
      }
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
    const ok = k === ans, tw = twist(ok), alone = !ok || tw;   // 反轉時火車頭先自己出洞
    loco.style.left = U(-3); follow();
    if (!alone) { c.style.left = U(-3 - CW); tg.style.left = U(-3 - CW / 2); } else { c.style.visibility = 'hidden'; tg.style.visibility = 'hidden'; }
    const go = alone ? [loco] : [loco, c, tg], b2 = go.map(p => parseFloat(p.style.left));
    await tween(2000, t => { const d = 55 * ease.out(t); go.forEach((p, i) => p.style.left = U(b2[i] + d)); follow(); });
    bob.forEach(b => b.cancel());
    if (ok) {
      if (tw) {
        // 反轉：出了山洞車廂不見了，原來只是慢了一點，自己滑出來接上
        driver.set('stand', 'scared'); driver.say('車廂呢？', 1100); uhoh(); await sleep(1300);
        const lx = parseFloat(loco.style.left); c.style.visibility = 'visible'; c.style.zIndex = 5;
        await tween(1100, t => { c.style.left = U(4 + (lx - CW - 4) * ease.out(t)); });
        tg.style.left = U(lx - CW / 2); tg.style.visibility = 'visible';
        SFX.clink(); tone(200, .1, 'square', .08); anim(c, [{ translate: '0 0' }, { translate: '.4cqw 0' }, { translate: '0 0' }], 160, { fill: 'none' }); await sleep(300);
      }
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
    if (twist(ok)) {
      // 反轉：奶奶看不懂，原來是信拿反了
      paper.style.rotate = '180deg'; rise(scene, sp('qmark'), 90, 28, 4, 3); nana.set('stand', 'sad'); nana.say('看不懂耶…', 1100, 'l'); uhoh(); await sleep(1400);
      SFX.whoosh(); await anim(paper, [{ rotate: '180deg' }, { rotate: '0deg' }], 450); nana.say('啊，拿反了！', 1000); await sleep(1000);
    }
    // 愛心、問號從奶奶頭上冒出來，所以這幾句台詞放在她左邊，才不會被蓋住
    if (ok) { rise(scene, sp('heart'), 90, 28, 8, 3.4); SFX.win(); confetti(scene); nana.cheer(); kid.cheer(); nana.say('寫得真好！', 1600, 'l'); stamp(scene, true, '送到了！', 12); }
    else { paper.classList.add('wrong'); rise(scene, sp('qmark'), 90, 28, 5, 3); SFX.lose(); nana.sad(); nana.say('看不懂耶…', 1600, 'l'); kid.sad(); dove.animate([{ transform: 'none' }, { transform: 'translateY(-1cqw) rotate(-15deg)' }, { transform: 'none' }], { duration: 500, iterations: 2 }); stamp(scene, false, '送錯信了！', 12); }
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
      if (twist(ok)) {
        // 反轉：燒瓶越脹越大、冒黑煙，眼看要爆炸，結果只「噗」一聲
        uhoh(); doc.say('要爆炸了？！', 1100);
        for (let i = 0; i < 4; i++) setTimeout(() => puff(scene, FX + rnd(-4, 4), 14, rnd(4, 7), '#5d5a77', 1200, rnd(-2, 2), -6), T(i * 180));
        await anim(flask, [{ scale: 1 }, { scale: 1.25 }, { scale: 1.1 }, { scale: 1.35 }], 1000);
        SFX.pop(); puff(scene, FX, 12, 9, '#ffffff', 700, 0, -5); await anim(flask, [{ scale: 1.35 }, { scale: .95 }, { scale: 1 }], 350); await sleep(250);
      }
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
      // 每條線疊四層：黑框、暗面、本色、亮線，看起來才像有厚度的電線。剪斷時只改 defs 裡的路徑，四層會一起動
      const c = cols[i], lay = h => `<use href="#w${i}${h}" class="wire wo"/><use href="#w${i}${h}" class="wire" stroke="${ART.mix(c, '#000000', .38)}"/><use href="#w${i}${h}" class="wire wm" stroke="${c}"/><use href="#w${i}${h}" class="wire wh" stroke="${ART.mix(c, '#ffffff', .6)}"/>`;
      svg += `<g data-w="${i}"><defs><path id="w${i}l" data-h="l" d="M30 ${by} C 44 ${by}, 44 ${y}, 62 ${y}"/><path id="w${i}r" data-h="r" d="M62 ${y} L 91 ${y}"/></defs>${lay('l')}${lay('r')}</g>`;
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
      if (twist(ok)) {
        // 反轉：歸零後炸彈脹大發紅，眼看要炸了，又慢慢縮回去
        const hot = 'brightness(1.8) sepia(1) hue-rotate(-30deg)';
        uhoh(); await anim(bomb, [{ scale: 1, filter: 'none' }, { scale: 1.22, filter: hot }], 500); guy.say('完了！', 800); await sleep(800);
        tone(500, .3, 'sine', .06, 0, 120); await anim(bomb, [{ scale: 1.22, filter: hot }, { scale: .96, filter: 'none' }, { scale: 1, filter: 'none' }], 450); await sleep(300);
      }
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
    // 每次的過程不一樣。答對：chase 先落後再追過、lead 一路領先、pack 並排到最後、stumble（反轉）中途絆倒掉到最後再奇蹟衝刺。
    // 答錯：fade 領先被追過、never 一直在中間、duel 和冠軍並排差一點。
    const tw = twist(k === ans), plot = tw ? 'stumble' : pick(k === ans ? ['chase', 'chase', 'lead', 'pack'] : ['fade', 'fade', 'never', 'duel']);
    const plan = opts.map((_, i) => {
      let v;
      if (i === ans) v = plot === 'stumble' ? [0, rnd(.2, .23), .36, .47, .8, 1] : plot === 'lead' || plot === 'never' ? [0, rnd(.24, .27), rnd(.5, .53), .75, .91, 1] : plot === 'pack' || plot === 'duel' ? [0, rnd(.2, .22), rnd(.43, .46), .7, .89, 1] : [0, rnd(.16, .19), rnd(.35, .39), .6, .84, 1];
      else if (i === k) v = plot === 'never' ? [0, rnd(.17, .2), rnd(.38, .42), .62, .82, .93] : plot === 'duel' ? [0, rnd(.2, .22), rnd(.44, .47), .71, .9, .985] : [0, rnd(.23, .26), rnd(.5, .53), .76, .92, .978];
      else { const e = rnd(.86, .95); v = [0, rnd(.18, .23), rnd(.4, .47), rnd(.6, .69), e - rnd(.05, .08), e]; }
      if (k === ans && i !== ans) { v[3] = Math.max(v[3], rnd(.68, .73)); v[4] = Math.max(v[4], .88); v[5] = Math.min(Math.max(v[5], .94), .985); }
      return v;
    });
    const posAt = (v, t) => { let s = 0; while (s < pts.length - 2 && t > pts[s + 1]) s++; const u = (t - pts[s]) / (pts[s + 1] - pts[s]); const e = u * u * (3 - 2 * u) * .5 + u * .5; return v[s] + (v[s + 1] - v[s]) * e; };
    const FIN = 87.2; let frame = 0, lastF = 0, lastDust = 0, said = 0, zoomed = false, fell = false, back = false;
    await new Promise(res => {
      const t0 = performance.now(); let virt = 0, prev = t0;
      const step = now => {
        // 最後一段放慢（慢動作）
        const dt = now - prev; prev = now; virt += dt * (virt / T(6000) > .9 ? .35 : 1);
        const t = Math.min(1, virt / T(6000));
        horses.forEach((h, i) => at(h, START + posAt(plan[i], t) * (FIN - START), feet(i)));
        if (now - lastF > 90) { lastF = now; frame ^= 1; horses.forEach((h, i) => h._im.src = HORSE[i][(frame + i) % 2]); noise(.03, .1, 700); }
        if (now - lastDust > 140) { lastDust = now; horses.forEach((h, i) => puff(scene, START - 12 + posAt(plan[i], t) * (FIN - START), feet(i) - 1, 2.6, '#e0b88a', 600, -3, -1)); }
        if (t > .35 && said === 0) { said = 1; const ps = plan.map(v => posAt(v, t)), me = ps[k]; say.textContent = `「${opts[k]}」${me >= Math.max(...ps) ? '跑在最前面！' : me <= Math.min(...ps) ? '落在最後面！' : '緊緊跟著！'}`; }
        if (plot === 'stumble' && t > .47 && !fell) { fell = true; uhoh(); say.textContent = `糟糕！「${opts[k]}」絆了一下！`; horses[k]._im.animate([{ rotate: '0deg' }, { rotate: '24deg' }, { rotate: '-8deg' }, { rotate: '0deg' }], { duration: T(700) }); puff(scene, START + posAt(plan[k], t) * (FIN - START), feet(k) - 1, 6, '#e0b88a', 800, 0, -3); }
        if (plot === 'stumble' && t > .9 && !back) { back = true; say.textContent = `「${opts[k]}」從最後面衝上來了！`; }
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
    const ok = k === ans, tw = twist(ok), top = cap.querySelector('.top'), prize = cap.querySelector('.prize');
    prize.textContent = ok && !tw ? '⭐' : '';
    if (ok && !tw) scene.append(el('div', 'rays'));
    SFX.pop();
    top.animate([{ transform: 'none' }, { transform: 'translate(-30%,-140%) rotate(-60deg)' }], { duration: T(320), fill: 'forwards', easing: 'ease-out' });
    if (ok) {
      if (tw) {
        // 反轉：打開是空的，搖一搖才發現大獎卡在裡面
        kid.set('stand', 'sad'); kid.say('空的？！', 1000); uhoh(); await sleep(1300);
        await anim(cap, [0, 10, -10, 6, 0].map(d => ({ transform: `${base} rotate(${d}deg)` })), 420); SFX.clink(); await sleep(250);
        prize.textContent = '⭐'; scene.append(el('div', 'rays')); kid.say('卡在裡面！', 900);
      }
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
      if (twist(ok)) {
        // 反轉：熄火後機頭歪掉、開始往下掉，掉到一半重新點火拉起來
        const dir = k === 3 ? -1 : 1; uhoh(); puff(scene, X, GY - 23, 4, '#2a2640', 1000, 0, 2);
        await tween(700, t => { st.a = dir * 28 * t; st.y = -24 - 1.2 * Math.sin(t * Math.PI); apply(); }, ease.in);
        crew.say('要掉下來了！', 900);
        await tween(650, t => { st.y = -24 + 12 * t * t; st.a = dir * (28 + 30 * t); apply(); if (Math.random() < .4) puff(scene, X + st.x, GY - 6 + st.y, 4, '#6b6880', 900, rnd(-1, 1), -3); });
        SFX.whoosh(); fire.style.height = U(8); tone(300, .5, 'sawtooth', .06, 0, 900);
        await tween(600, t => { const e = ease.out(t); st.a = dir * 58 * (1 - e); st.y = -12 - 12 * e; apply(); });
      }
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
    const ok = k === ans, tw = twist(ok), boot = !ok || tw;   // 反轉時先釣起舊鞋子
    sh[k].remove(); hk.setAttribute('d', ''); ln2.setAttribute('d', '');
    const cw = boot ? 10 : 16, chh = boot ? 7.1 : 6.9;
    let c = pimg(boot ? BOOT : FISH, cw, chh); const cWrap = el('div', 'catch'); cWrap.append(c); at(cWrap, hx, hy); scene.append(cWrap);
    for (let i = 0; i < 10; i++) { const d = at(el('div', 'drop'), hx + rnd(-4, 4), W); scene.append(d); d.animate([{ transform: 'none' }, { transform: `translate(${rnd(-10, 10)}cqw, -${rnd(8, 16)}cqw)`, offset: .5 }, { transform: `translate(${rnd(-14, 14)}cqw, 2cqw)`, opacity: 0 }], { duration: T(900), fill: 'forwards' }); }
    SFX.splash();
    await tween(800, t => { const y = hy + (6 - hy) * t; at(cWrap, hx, y); tip.y = 6.5 - 4 * t; tip.x = 29 + 2 * t; rod.setAttribute('x2', tip.x); rod.setAttribute('y2', tip.y); ln.setAttribute('d', `M${tip.x} ${tip.y} L ${hx} ${y}`); }, ease.out);
    cWrap.animate([{ rotate: '-12deg' }, { rotate: '12deg' }], { duration: T(300), iterations: 6, direction: 'alternate', easing: 'ease-in-out' });
    if (tw) {
      // 反轉：釣起來是舊鞋子，結果大魚咬著鞋子跟著跳出水面
      fisher.set('stand', 'sad'); fisher.say('舊鞋子？', 1100); uhoh(); await sleep(1400);
      const f2 = el('div', 'catch'); c = pimg(FISH, 16, 6.9); f2.append(c); at(f2, hx, W + 6); scene.append(f2); SFX.splash();
      for (let i = 0; i < 10; i++) { const d = at(el('div', 'drop'), hx + rnd(-4, 4), W); scene.append(d); d.animate([{ transform: 'none' }, { transform: `translate(${rnd(-10, 10)}cqw, -${rnd(8, 16)}cqw)`, offset: .5 }, { transform: `translate(${rnd(-14, 14)}cqw, 2cqw)`, opacity: 0 }], { duration: T(900), fill: 'forwards' }); }
      await tween(500, t => at(f2, hx, W + 6 + (12.4 - W - 6) * ease.out(t)));
      f2.animate([{ rotate: '-8deg' }, { rotate: '8deg' }], { duration: T(300), iterations: 6, direction: 'alternate', easing: 'ease-in-out' });
      fisher.say('大魚咬著鞋子！', 1200);
    }
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
        if (kind === 'bullet') { it.append(ballEl(i)); }
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
        const b = el('div', 'shot'); b.append(ballEl(k)); at(b, 63, 42); scene.append(b);
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
      if (twist(ok)) {
        // 反轉：怪獸先回了一些血、還變大，結果只是逞強，慢半拍才倒下
        hp.classList.add('heal'); hp.style.width = '45%'; uhoh(); tone(200, .6, 'sawtooth', .07, 0, 90);
        for (let i = 0; i < 5; i++) { const h = at(el('div', 'heart', '+'), MX + rnd(-10, 10), MY + rnd(-6, 10)); scene.append(h); anim(h, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(-10cqw)', opacity: 0 }], 1000).then(() => h.remove()); }
        note(scene, '怪獸回血了？！'); await anim(monster, [{ scale: 1 }, { scale: 1.15 }, { scale: 1.08 }], 700); await sleep(800);
        hp.classList.remove('heal'); note(scene, '……牠只是在逞強！'); await anim(monster, [{ scale: 1.08, rotate: '0deg' }, { scale: 1, rotate: '-6deg' }, { scale: 1, rotate: '6deg' }, { scale: 1, rotate: '0deg' }], 800); unnote(scene);
      }
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

