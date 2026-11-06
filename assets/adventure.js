'use strict';
/* 知識島冒險（走地圖 RPG）：讀 data/index.json 和各單元檔，每個有題目的單元是一個區域。
   在地圖上走動，碰到怪獸就用答題戰鬥；打倒區域裡所有怪獸，往下一區的門就會打開。
   新增單元檔就會自動多一個區域，不用改這支程式。改錯字是點錯字再選正字。 */

const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = (a, rnd = Math.random) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a, rnd = Math.random) => a[Math.floor(rnd() * a.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const DEFAULT_CAT = { mc: '選擇', tf: '是非', fix: '改錯字', group: '題組' };
const catOf = q => q.cat || DEFAULT_CAT[q.type];
const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } },
};
// 錯題本和題庫練習共用，答錯的題目在「題庫練習 → 改練錯題」也看得到
let wrongBook = new Set(store.get('kr-wrong-v1', []));
const saveWrong = () => store.set('kr-wrong-v1', [...wrongBook]);
const SAVE_KEY = 'kr-adventure-v1';
const save = Object.assign({ hero: null, lv: 1, xp: 0, gold: 0, hp: null, inv: { apple: 1, potion: 0, scroll: 1 }, sword: 0, shield: 0, hats: [], hat: '', stars: {}, cards: {}, unlockAll: false, mute: false }, store.get(SAVE_KEY, {}));
const persist = () => store.set(SAVE_KEY, save);

/* ---------- 遊戲數值 ---------- */
const HEROES = [['🦊', '小狐狸'], ['🐼', '熊貓'], ['🐯', '小老虎'], ['🐰', '兔兔'], ['🐧', '企鵝'], ['🐸', '青蛙']];
const MONSTERS = [['🐙', '糊塗章魚'], ['🦖', '忘東忘西龍'], ['👻', '粗心小幽靈'], ['🤖', '亂按機器人'], ['🦇', '迷糊蝙蝠'], ['🐊', '偷懶鱷魚'],
  ['🦂', '分心蠍子'], ['🐌', '拖拖拉拉蝸牛'], ['🦉', '瞌睡貓頭鷹'], ['👾', '看錯題小怪'], ['🦀', '橫衝直撞蟹'], ['🐗', '急躁山豬'], ['🕷️', '纏纏蜘蛛'], ['🐍', '繞圈圈蛇']];
const SWORDS = [['赤手空拳', 0, 0], ['🗡️ 木劍', 3, 40], ['⚔️ 鐵劍', 6, 120], ['🔱 勇者之劍', 10, 260]];
const SHIELDS = [['沒有盾牌', 0, 0], ['🪵 木盾', 2, 40], ['🛡️ 鐵盾', 4, 120], ['💠 水晶盾', 6, 260]];
const ITEMS = { apple: ['🍎', '蘋果', '回復 15 體力', 8], potion: ['🧪', '神奇藥水', '體力全滿', 25], scroll: ['📜', '提示卷軸', '選擇題刪掉兩個錯的選項', 12] };
const HATS = [['🎩', '紳士帽', 40], ['🧢', '棒球帽', 30], ['🎀', '蝴蝶結', 30], ['🕶️', '酷墨鏡', 60], ['🪖', '頭盔', 80], ['👑', '國王皇冠', 300]];
const maxHp = () => 30 + (save.lv - 1) * 6;
const atk = () => 10 + (save.lv - 1) * 2 + SWORDS[save.sword][1];
const xpNeed = () => 40 + (save.lv - 1) * 30;
if (save.hp === null || save.hp > maxHp() || save.hp <= 0) save.hp = maxHp();

/* ---------- 地形主題 ---------- */
const THEMES = {
  國語: { land: '文字森林', icon: '📖', g1: '#a6d98f', g2: '#9cd085', block: ['🌲', '🌳', '🌲', '🪨'], deco: ['🌼', '🍄', '🌿'], water: '#6fb7e0' },
  數學: { land: '數字山谷', icon: '🔢', g1: '#ecd9a8', g2: '#e4cf98', block: ['🪨', '🌵', '⛰️', '🪨'], deco: ['🔸', '🌾'], water: '#7cc0d8' },
  自然: { land: '自然祕境', icon: '🌱', g1: '#b2e2a3', g2: '#a6d996', block: ['🌴', '🌳', '🌻', '🪨'], deco: ['🌸', '🌷', '🍀'], water: '#5fb0d8' },
  社會: { land: '小鎮街道', icon: '🏘️', g1: '#e1dcd2', g2: '#d8d2c6', block: ['🏠', '🏡', '🌳', '🏪', '🏫'], deco: ['🌷', '🚲'], water: '#7ab8d8' },
  英語: { land: '字母海灣', icon: '🔤', g1: '#f1e2b8', g2: '#e9d8aa', block: ['🌴', '🪨', '🐚'], deco: ['🐚', '⭐'], water: '#4ea8d8' },
};
const themeOf = s => THEMES[s] || { land: s + '小島', icon: '🏝️', g1: '#a6d98f', g2: '#9cd085', block: ['🌳', '🪨'], deco: ['🌼'], water: '#6fb7e0' };
const COLS = 16, ROWS = 10, T = 48;

/* ---------- 音效（不用音檔，直接合成） ---------- */
let actx = null;
function tone(freq, dur = 0.12, type = 'square', vol = 0.06, delay = 0) {
  if (save.mute) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime + delay;
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(actx.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  } catch { }
}
const SFX = {
  hit: () => { tone(520, 0.08); tone(780, 0.1, 'square', 0.05, 0.06); },
  crit: () => { [660, 880, 1320].forEach((f, i) => tone(f, 0.12, 'square', 0.06, i * 0.05)); },
  hurt: () => { tone(200, 0.18, 'sawtooth', 0.07); tone(140, 0.2, 'sawtooth', 0.05, 0.08); },
  coin: () => { tone(988, 0.06, 'square', 0.04); tone(1319, 0.14, 'square', 0.04, 0.06); },
  win: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.08, i * 0.1)); },
  lvl: () => { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.14, 'triangle', 0.08, i * 0.07)); },
  door: () => { tone(330, 0.1, 'triangle'); tone(494, 0.18, 'triangle', 0.06, 0.1); },
  bump: () => tone(110, 0.06, 'triangle', 0.05),
  start: () => { tone(300, 0.08); tone(450, 0.08, 'square', 0.05, 0.08); tone(600, 0.12, 'square', 0.05, 0.16); },
};

/* ---------- 資料 ---------- */
let INDEX = null;
const unitCache = new Map();
const dataUrl = file => 'data/' + file.split('/').map(encodeURIComponent).join('/');
const baseName = f => f.split('/').pop().replace(/\.json$/, '');
function loadUnit(meta) {
  if (!unitCache.has(meta.file)) {
    unitCache.set(meta.file, fetch(dataUrl(meta.file)).then(r => { if (!r.ok) throw Error(meta.file); return r.json(); }).then(u => {
      u.meta = meta;
      // 題組拆成一小題一小題，每小題都帶著文章；key 和題庫練習的錯題本一致
      u.items = (u.questions || []).flatMap((q, i) => {
        const key = `${meta.file}#${i}`;
        if (q.type === 'group') return (q.items || []).map((s, j) => ({ ...s, key: `${key}.${j}`, cat: catOf(q), passage: q.passage, unit: u }));
        return [{ ...q, key, cat: catOf(q), unit: u }];
      });
      return u;
    }));
  }
  return unitCache.get(meta.file);
}
const gradeOf = g => INDEX.grades.find(x => x.name === g);
const subjectOf = (g, s) => gradeOf(g)?.subjects.find(x => x.name === s);
const NO_TERM = '冒險路線';
function routesOf(g, s) {
  const units = (subjectOf(g, s)?.units || []).filter(u => u.questions);
  const names = [...new Set(units.map(u => u.term || NO_TERM))];
  return names.map(name => ({ name, units: units.filter(u => (u.term || NO_TERM) === name) }));
}
const bossKey = (g, s, r) => `魔王:${g}/${s}/${r}`;
const starsOf = k => save.stars[k] || 0;
const routeStars = r => r.units.reduce((n, u) => n + starsOf(u.file), 0);
function unlocked(route, i) {
  if (save.unlockAll || i === 0) return true;
  if (i === route.units.length) return route.units.every(u => starsOf(u.file) > 0);
  return starsOf(route.units[i - 1].file) > 0;
}
const reviewHref = meta => `index.html#/${[view.grade, view.subject, baseName(meta.file)].map(encodeURIComponent).join('/')}`;

/* ---------- 知識卡：從重點複習抽 ---------- */
const splitList = s => String(s ?? '').split(/[、；]/).map(x => x.trim()).filter(Boolean);
function cardsOf(u) {
  const out = [];
  (u.review || []).forEach((b, bi) => {
    const id = j => `${u.meta.file}#${bi}.${j}`;
    const head = b.heading || '';
    if (b.kind === 'words') (b.items || []).forEach((w, j) => w.word && w.meaning && out.push({ id: id(j), title: w.word, sub: w.zhuyin || '', body: w.meaning, head }));
    else if (b.kind === 'points') (b.items || []).forEach((x, j) => x && out.push({ id: id(j), title: head || '重點', sub: '', body: x, head }));
    else if (b.kind === 'qa') (b.items || []).forEach((x, j) => out.push({ id: id(j), title: x.q, sub: '', body: x.a + (x.why ? `（${x.why}）` : ''), head }));
    else if (b.kind === 'table' && Array.isArray(b.columns) && Array.isArray(b.rows)) {
      const isChar = /^字$/.test(b.columns[0]) && /注音/.test(b.columns[1] || '');
      b.rows.forEach((r, j) => {
        if (isChar) out.push({ id: id(j), title: r[0], sub: r[1] || '', body: [splitList(r[2]).join('、'), r[3]].filter(Boolean).join('：'), head });
        else if (r.length >= 2) out.push({ id: id(j), title: String(r[0]), sub: '', body: r.slice(1).map((c, k) => `${b.columns[k + 1] || ''}${b.columns[k + 1] ? '：' : ''}${c}`).join('；'), head });
      });
    }
  });
  return out.filter(c => c.body);
}
function grantCard(us) {
  const all = us.flatMap(cardsOf), fresh = all.filter(c => !save.cards[c.id]);
  const c = pick(fresh.length ? fresh : all);
  if (!c) return null;
  const isNew = !save.cards[c.id];
  if (isNew) save.cards[c.id] = { grade: view.grade, subject: view.subject, unit: c.id.split('#')[0], title: c.title, sub: c.sub, body: c.body, head: c.head, at: Date.now() };
  persist();
  return { ...c, isNew };
}
const cardHtml = (c, tag) => `<div class="know-card reveal"><span class="know-tag">${esc(tag)}${c.head && c.head !== c.title ? ' · ' + esc(c.head) : ''}</span>
  <h3>${esc(c.title)}${c.sub ? ` <small>${esc(c.sub)}</small>` : ''}</h3><p>${esc(c.body)}</p></div>`;

/* ---------- 畫面切換 ---------- */
let view = { grade: null, subject: null, route: null };
let world = null;   // 探索中的區域
let fight = null;   // 戰鬥中
function go(...parts) {
  const h = '#/' + parts.filter(x => x !== null && x !== undefined && x !== '').map(x => encodeURIComponent(String(x))).join('/');
  if (location.hash === h) route(); else location.hash = h;
}
function route() {
  stopWorld(); fight = null;
  const p = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (p[0] === '寶物袋') return renderBag();
  const g = gradeOf(p[0]) || gradeOf(store.get('kr-grade')) || INDEX.grades[0];
  if (!g) { $('#stage').innerHTML = '<p class="loading">還沒有任何單元。</p>'; return; }
  view.grade = g.name;
  if (!save.hero || !p[1]) return renderHome();
  const s = subjectOf(g.name, p[1]);
  if (!s) return renderHome();
  view.subject = s.name;
  const routes = routesOf(g.name, s.name);
  view.route = (routes.find(r => r.name === p[2]) || routes[0])?.name || null;
  if (p[3] !== undefined && /^\d+$/.test(p[3])) return enterArea(Number(p[3]));
  renderMap();
}
const show = (html, focus = true) => { $('#stage').innerHTML = html; if (focus) { $('#stage').focus({ preventScroll: true }); $('#stage').scrollIntoView({ block: 'start' }); } };
const curRoute = () => routesOf(view.grade, view.subject).find(x => x.name === view.route);

/* ---------- 首頁 ---------- */
function renderHome() {
  const g = gradeOf(view.grade);
  const heroPicker = `<section class="adv-panel"><h2 class="adv-h">${save.hero ? '你的冒險夥伴' : '先選一位冒險夥伴'}</h2>
    <div class="hero-pick" role="group" aria-label="選擇冒險夥伴">${HEROES.map(([e, n]) => `<button data-hero="${e}" aria-pressed="${save.hero === e}"><span class="emoji">${e}</span><span>${n}</span></button>`).join('')}</div>
    ${save.hero ? `<p class="hero-stats">Lv.${save.lv}　❤️ ${save.hp}/${maxHp()}　⚔️ 攻擊 ${atk()}　💰 ${save.gold}${save.hat ? '　' + save.hat : ''}</p>` : ''}</section>`;
  const grades = `<div class="grade-switch adv-grades" role="group" aria-label="選擇年級">${INDEX.grades.map(x => `<button data-grade="${esc(x.name)}" aria-pressed="${x.name === view.grade}">${esc(x.name)}</button>`).join('')}</div>`;
  const islands = g.subjects.map(s => {
    const routes = routesOf(g.name, s.name);
    if (!routes.length) return '';
    const th = themeOf(s.name);
    const areas = routes.reduce((n, r) => n + r.units.length, 0);
    const got = routes.reduce((n, r) => n + routeStars(r), 0);
    const bosses = routes.filter(r => starsOf(bossKey(g.name, s.name, r.name))).length;
    return `<button class="island" data-island="${esc(s.name)}" ${save.hero ? '' : 'disabled'}>
      <span class="island-icon" aria-hidden="true">${th.icon}</span>
      <span class="island-name">${esc(th.land)}</span><span class="island-sub">${esc(s.name)} · ${areas} 個區域＋${routes.length} 座魔王城</span>
      <span class="island-stars">⭐ ${got} / ${areas * 3}${bosses ? `　👑 ${bosses}` : ''}</span></button>`;
  }).join('');
  show(`<section class="adv-hero-banner">
      <div><span class="eyebrow">${esc(view.grade)} · 知識島冒險</span><h1 class="adv-title">走進地圖，<br class="mobile-break">打倒怪獸，一路升級！</h1>
      <p>用方向鍵、螢幕上的方向盤，或直接點地圖走路。碰到怪獸就開打：答對出招、連續答對有連擊加成。打怪、開寶箱賺金幣，到商店買武器、藥水和帽子。</p></div>
      <div class="banner-art" aria-hidden="true">${save.hero || '🧭'}<span>⚔️</span>🐲</div></section>
    ${heroPicker}
    <section class="adv-panel"><h2 class="adv-h">選一座島出發</h2>${grades}
      ${save.hero ? '' : '<p class="adv-hint">選好冒險夥伴後就能出發。</p>'}
      <div class="island-grid">${islands || '<p class="notice">這個年級還沒有題目。</p>'}</div></section>
    <div class="adv-bag-link"><button class="secondary-button" data-bag>🎒 寶物袋（${Object.keys(save.cards).length} 張知識卡）</button></div>`, false);
  document.title = '知識島冒險';
}

/* ---------- 世界地圖（區域清單） ---------- */
function renderMap() {
  const { grade: g, subject: s } = view;
  const routes = routesOf(g, s);
  const r = routes.find(x => x.name === view.route);
  const th = themeOf(s);
  if (!r) return show(`<p class="notice">${esc(th.land)}還沒有區域。</p><button class="secondary-button" data-home>回首頁</button>`);
  const nodes = r.units.map((u, i) => {
    const open = unlocked(r, i), st = starsOf(u.file);
    return `<li class="map-node ${open ? '' : 'locked'} ${st ? 'cleared' : ''}">
      <button data-area="${i}" ${open ? '' : 'disabled'} aria-label="第 ${i + 1} 區 ${esc(u.title)}${open ? '' : '（還沒開啟）'}">
        <span class="node-dot" aria-hidden="true">${open ? (st ? '🚩' : i + 1) : '🔒'}</span>
        <span class="node-text"><span class="node-num">第 ${i + 1} 區</span><span class="node-title">${esc(u.title)}</span>
        <span class="node-stars" aria-label="${st} 顆星">${'★'.repeat(st)}<span>${'★'.repeat(3 - st)}</span></span></span></button></li>`;
  });
  const bi = r.units.length, bOpen = unlocked(r, bi), bSt = starsOf(bossKey(g, s, r.name));
  nodes.push(`<li class="map-node boss ${bOpen ? '' : 'locked'} ${bSt ? 'cleared' : ''}">
    <button data-area="${bi}" ${bOpen ? '' : 'disabled'} aria-label="${esc(r.name)}魔王城${bOpen ? '' : '（走過前面每一區才會開啟）'}">
      <span class="node-dot" aria-hidden="true">${bOpen ? (bSt ? '👑' : '🏰') : '🔒'}</span>
      <span class="node-text"><span class="node-num">最終區</span><span class="node-title">${esc(r.name)}魔王城</span>
      <span class="node-sub">${bOpen ? '大魔王會出前面所有單元的題目' : '走過前面每一區才會開啟'}</span>
      <span class="node-stars" aria-label="${bSt} 顆星">${'★'.repeat(bSt)}<span>${'★'.repeat(3 - bSt)}</span></span></span></button></li>`);
  show(`<nav class="adv-crumbs"><button class="text-button" data-home>← 選島</button><span>${esc(g)}</span></nav>
    <div class="map-head"><span class="map-icon" aria-hidden="true">${th.icon}</span><div><span class="eyebrow">${esc(s)} · ${esc(g)}</span><h1 class="adv-title">${esc(th.land)}</h1>
    <p class="map-score">⭐ ${routeStars(r)} / ${r.units.length * 3}　${save.hero} Lv.${save.lv}　💰 ${save.gold}</p></div></div>
    ${routes.length > 1 ? `<div class="scope-switch adv-routes" role="group" aria-label="選擇路線">${routes.map(x => `<button data-route="${esc(x.name)}" aria-pressed="${x.name === r.name}">${esc(x.name)}</button>`).join('')}</div>` : ''}
    <ol class="adv-map">${nodes.join('')}</ol>
    <div class="adv-map-foot"><button class="text-button" data-bag>🎒 寶物袋</button>
      <label class="unlock-toggle"><input type="checkbox" id="unlockAll" ${save.unlockAll ? 'checked' : ''}> 全部區域直接開啟（想先複習某一課時用）</label></div>`);
  document.title = `${th.land}｜知識島冒險`;
}

/* ---------- 區域產生（同一個區域每次長得一樣） ---------- */
function seeded(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
  return () => { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
function connected(grid, from) {
  const seen = new Set([from.join()]), q = [from];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || seen.has(k) || grid[ny][nx]) continue;
      seen.add(k); q.push([nx, ny]);
    }
  }
  return seen;
}
function buildArea(key, theme, isBoss) {
  const rnd = seeded(key);
  const entry = [0, 1 + Math.floor(rnd() * (ROWS - 2))], exit = [COLS - 1, 1 + Math.floor(rnd() * (ROWS - 2))];
  // 0 = 可走，'w' = 水，其他字串 = 障礙物
  const grid = Array.from({ length: ROWS }, (_, y) => Array.from({ length: COLS }, (_, x) => (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) ? pick(theme.block, rnd) : 0));
  grid[entry[1]][entry[0]] = 0; grid[exit[1]][exit[0]] = 0;
  const near = (x, y, p) => Math.abs(x - p[0]) + Math.abs(y - p[1]) < 3;
  const ok = () => { const s = connected(grid, entry); return s.has(exit.join()) && s.size >= (COLS - 2) * (ROWS - 2) * 0.6; };
  // 一小片水池
  if (!isBoss && rnd() < 0.85) {
    const cx = 4 + Math.floor(rnd() * 8), cy = 3 + Math.floor(rnd() * 4);
    for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 2; x++) if (rnd() < 0.75 && grid[y]?.[x] === 0 && x > 1 && x < COLS - 2) { grid[y][x] = 'w'; if (!ok()) grid[y][x] = 0; }
  }
  for (let n = 0; n < (isBoss ? 10 : 24); n++) {
    const x = 1 + Math.floor(rnd() * (COLS - 2)), y = 1 + Math.floor(rnd() * (ROWS - 2));
    if (grid[y][x] || near(x, y, entry) || near(x, y, exit)) continue;
    grid[y][x] = pick(theme.block, rnd);
    if (!ok()) grid[y][x] = 0;
  }
  const reach = [...connected(grid, entry)].map(k => k.split(',').map(Number)).filter(([x]) => x > 0 && x < COLS - 1);
  return { grid, entry, exit, reach };
}

/* ---------- 探索 ---------- */
async function enterArea(i, fromRight = false) {
  const r = curRoute();
  if (!r || !unlocked(r, i)) return renderMap();
  const isBoss = i === r.units.length;
  const metas = isBoss ? r.units : [r.units[i]];
  show('<p class="loading">地圖展開中…</p>');
  let us;
  try { us = await Promise.all(metas.map(loadUnit)); } catch (e) { return show(`<p class="notice">題目載入失敗（${esc(e.message)}），請重新整理再試。</p>`); }
  const th = themeOf(view.subject);
  const key = isBoss ? bossKey(view.grade, view.subject, r.name) : metas[0].file;
  const map = buildArea(key, th, isBoss);
  const rnd = seeded(key + '#deco');
  map.deco = Array.from({ length: 10 }, () => [...pick(map.reach, rnd), pick(th.deco, rnd)]);
  // 題目：魔王城各單元輪流；一般區域該單元打亂。錯題本裡的題目先出一題
  let pool;
  if (isBoss) { const per = us.map(u => shuffle(u.items)); pool = []; for (let k = 0; per.some(x => x[k]); k++) for (const x of shuffle(per)) if (x[k]) pool.push(x[k]); }
  else pool = shuffle(us[0].items);
  const wi = pool.findIndex(q => wrongBook.has(q.key));
  if (wi > 0) pool.unshift(...pool.splice(wi, 1));
  // 怪獸：題目越多怪獸越多（2～4 隻），越後面的區域越強
  const spots = shuffle(map.reach.filter(([x]) => x >= 4 && x <= COLS - 3));
  const mons = [];
  if (isBoss) {
    const x = map.exit[0] - 2, y = map.exit[1];
    map.grid[y][x] = 0; map.grid[y][x + 1] = 0;
    mons.push({ id: 0, x, y, e: '🐲', name: `${r.name}大魔王`, hp: 150 + i * 4, max: 150 + i * 4, dmg: 11, boss: true });
  } else {
    const n = clamp(Math.floor(pool.length / 4), 2, 4);
    for (let k = 0; k < n && spots[k]; k++) {
      const m = MONSTERS[(i * 3 + k) % MONSTERS.length], hp = 24 + i * 4 + k * 2;
      mons.push({ id: k, x: spots[k][0], y: spots[k][1], e: m[0], name: m[1], hp, max: hp, dmg: 6 + Math.floor(i / 2) });
    }
  }
  const chestSpot = isBoss ? null : spots.slice(mons.length).find(([x]) => x >= 3);
  const px = fromRight ? map.exit[0] - 1 : map.entry[0] + 1, py = fromRight ? map.exit[1] : map.entry[1];
  map.grid[py][px] = 0;
  world = { r, i, isBoss, us, key, th, map, mons, chest: chestSpot ? { x: chestSpot[0], y: chestSpot[1], open: false } : null, pool, qpos: 0,
    p: { x: px, y: py, moving: null, face: fromRight ? -1 : 1 }, path: [], held: null, answered: 0, correct: 0, gateOpen: starsOf(key) > 0, floats: [], t: 0, raf: 0, last: 0, monTimer: 0 };
  renderWorld();
  toast(isBoss ? `🏰 ${r.name}魔王城！大魔王守在門前` : `第 ${i + 1} 區：${metas[0].title}`);
  SFX.start();
}
function stopWorld() { if (world?.raf) cancelAnimationFrame(world.raf); world = null; }
function hudHtml() {
  const w = world;
  return `<div class="rpg-hud">
    <div class="rpg-me"><span class="rpg-face" aria-hidden="true">${save.hero}</span><div class="rpg-bars">
      <span class="rpg-lv">Lv.${save.lv}</span>
      <div class="bar hp-bar2" role="progressbar" aria-label="體力" aria-valuenow="${save.hp}" aria-valuemin="0" aria-valuemax="${maxHp()}"><span style="width:${save.hp / maxHp() * 100}%"></span><b>❤️ ${save.hp}/${maxHp()}</b></div>
      <div class="bar xp-bar" role="progressbar" aria-label="經驗值" aria-valuenow="${save.xp}" aria-valuemin="0" aria-valuemax="${xpNeed()}"><span style="width:${save.xp / xpNeed() * 100}%"></span><b>EXP ${save.xp}/${xpNeed()}</b></div></div></div>
    <div class="rpg-gold">💰 ${save.gold}</div>
    <div class="rpg-goal">${w.mons.length ? `👾 剩 ${w.mons.length} 隻怪獸` : ''}${w.gateOpen ? `${w.mons.length ? '　' : ''}🚪 門開了` : ''}</div>
    <div class="rpg-buttons"><button class="icon-btn" data-shop title="商店">🏪<span>商店</span></button><button class="icon-btn" data-items title="背包">🎒<span>背包</span></button><button class="icon-btn" data-worldmap title="世界地圖">🗺️<span>地圖</span></button><button class="icon-btn" data-mute title="音效">${save.mute ? '🔇' : '🔊'}<span>音效</span></button></div>
  </div>`;
}
function renderWorld() {
  const w = world;
  show(`<div class="rpg">
    <div id="hud">${hudHtml()}</div>
    <div class="rpg-screen"><canvas id="cv" width="${COLS * T}" height="${ROWS * T}" aria-label="冒險地圖：用方向鍵、方向盤或點地圖移動"></canvas><div id="toast" class="rpg-toast" role="status"></div></div>
    <div class="rpg-controls">
      <div class="dpad" aria-label="方向盤"><button data-dir="up" aria-label="上">▲</button><button data-dir="left" aria-label="左">◀</button><button data-dir="down" aria-label="下">▼</button><button data-dir="right" aria-label="右">▶</button></div>
      <div class="rpg-tips"><p><strong>${w.isBoss ? `${esc(w.r.name)}魔王城` : `第 ${w.i + 1} 區 · ${esc(w.us[0].meta.title)}`}</strong></p>
      <p>👾 碰到怪獸就開打　🎁 寶箱有金幣和知識卡　🚪 打倒全部怪獸才會開門</p>
      ${w.isBoss ? '' : `<a class="text-button" href="${reviewHref(w.us[0].meta)}" target="_blank" rel="noopener">📖 看這一課的重點</a>`}</div>
    </div></div>
    <div id="overlay" class="rpg-overlay" hidden></div>`, false);
  $('#cv').addEventListener('pointerdown', onCanvasTap);
  w.ctx = $('#cv').getContext('2d');
  w.last = performance.now();
  const loop = now => { if (world !== w) return; tick(Math.min(64, now - w.last)); w.last = now; if (world !== w) return; draw(); w.raf = requestAnimationFrame(loop); };
  w.raf = requestAnimationFrame(loop);
  document.title = `${w.th.land}｜知識島冒險`;
}
const refreshHud = () => { if (world && $('#hud')) $('#hud').innerHTML = hudHtml(); };
let toastTimer = 0;
function toast(msg, ms = 2400) { const t = $('#toast'); if (!t) return; t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms); }
const overlayOpen = () => { const o = $('#overlay'); return !!o && !o.hidden; };

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const blocked = (x, y) => x < 0 || y < 0 || x >= COLS || y >= ROWS || !!world.map.grid[y][x];
function onCanvasTap(e) {
  if (!world || overlayOpen()) return;
  const r = e.currentTarget.getBoundingClientRect();
  const tx = Math.floor((e.clientX - r.left) / r.width * COLS), ty = Math.floor((e.clientY - r.top) / r.height * ROWS);
  world.held = null;
  world.path = findPath(world.p.x, world.p.y, tx, ty);
  if (!world.path.length && !(tx === world.p.x && ty === world.p.y)) SFX.bump();
}
// 找路：怪獸、寶箱、門所在的格子可以當終點（走過去就會開打、打開或通過）
function findPath(sx, sy, tx, ty) {
  const w = world;
  const prev = new Map([[sx + ',' + sy, null]]), q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift();
    if (x === tx && y === ty) { const out = []; let k = x + ',' + y; while (prev.get(k)) { out.unshift(k.split(',').map(Number)); k = prev.get(k); } return out; }
    for (const [dx, dy] of Object.values(DIRS)) {
      const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
      if (prev.has(k)) continue;
      const isGoal = nx === tx && ny === ty;
      const thing = w.mons.some(m => m.x === nx && m.y === ny) || (w.chest && !w.chest.open && w.chest.x === nx && w.chest.y === ny)
        || (nx === w.map.entry[0] && ny === w.map.entry[1]) || (nx === w.map.exit[0] && ny === w.map.exit[1]);
      if (blocked(nx, ny) || (thing && !isGoal)) continue;
      prev.set(k, x + ',' + y); q.push([nx, ny]);
    }
  }
  return [];
}
function tryStep(dx, dy) {
  const w = world, p = w.p, nx = p.x + dx, ny = p.y + dy;
  if (dx) p.face = dx;
  const m = w.mons.find(m => m.x === nx && m.y === ny);
  if (m) { w.path = []; w.held = null; return startFight(m); }
  if (w.chest && !w.chest.open && w.chest.x === nx && w.chest.y === ny) { w.path = []; w.held = null; return openChest(); }
  if (nx === w.map.entry[0] && ny === w.map.entry[1]) {
    w.path = []; w.held = null;
    if (w.i > 0) return goArea(w.i - 1, true);
    return go(view.grade, view.subject, view.route);
  }
  if (nx === w.map.exit[0] && ny === w.map.exit[1]) {
    w.path = []; w.held = null;
    if (!w.gateOpen) { SFX.bump(); return toast(`🔒 門鎖著，還有 ${w.mons.length} 隻怪獸`); }
    if (w.isBoss) return go(view.grade, view.subject, view.route);
    SFX.door();
    return goArea(w.i + 1, false);
  }
  if (blocked(nx, ny)) { w.path = []; return; }
  p.moving = { fx: p.x, fy: p.y, t: 0 }; p.x = nx; p.y = ny;
}
function goArea(i, fromRight) {
  const r = world.r;
  if (!unlocked(r, i)) { toast('🔒 前面的區域還沒過關'); return; }
  history.replaceState(null, '', '#/' + [view.grade, view.subject, view.route, String(i)].map(encodeURIComponent).join('/'));
  stopWorld();
  enterArea(i, fromRight);
}
function tick(dt) {
  const w = world;
  w.floats = w.floats.filter(f => (f.t += dt) < 1200);
  if (fight || overlayOpen()) return;
  w.t += dt;
  const p = w.p;
  if (p.moving && (p.moving.t += dt / 130) >= 1) p.moving = null;
  if (!p.moving) {
    if (w.held) tryStep(...DIRS[w.held]);
    else if (w.path.length) { const [nx, ny] = w.path.shift(); tryStep(nx - p.x, ny - p.y); }
  }
  if (world !== w || fight) return;
  // 怪獸慢慢晃，碰到主角就開打
  w.monTimer += dt;
  if (w.monTimer > 900) {
    w.monTimer = 0;
    for (const m of w.mons) {
      if (m.boss || Math.random() < 0.45) continue;
      const [dx, dy] = pick(Object.values(DIRS)), nx = m.x + dx, ny = m.y + dy;
      if (blocked(nx, ny) || nx <= 1 || nx >= COLS - 2 || w.mons.some(o => o.x === nx && o.y === ny) || (w.chest && w.chest.x === nx && w.chest.y === ny)) continue;
      if (nx === p.x && ny === p.y) { if (!p.moving) { w.path = []; w.held = null; startFight(m); return; } continue; }
      m.mv = { fx: m.x, fy: m.y, t: 0 }; m.x = nx; m.y = ny;
    }
  }
  for (const m of w.mons) if (m.mv && (m.mv.t += dt / 300) >= 1) m.mv = null;
}
function draw() {
  const w = world, c = w.ctx, th = w.th;
  c.clearRect(0, 0, COLS * T, ROWS * T);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    c.fillStyle = (x + y) % 2 ? th.g1 : th.g2; c.fillRect(x * T, y * T, T, T);
    if (w.isBoss) { c.fillStyle = 'rgba(70,20,50,.3)'; c.fillRect(x * T, y * T, T, T); }
  }
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000';
  c.globalAlpha = 0.6; c.font = `${T * 0.36}px ${EMOJI}`;
  for (const [x, y, e] of w.map.deco) c.fillText(e, x * T + T * 0.72, y * T + T * 0.74);
  c.globalAlpha = 1;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const g = w.map.grid[y][x];
    if (g === 'w') {
      c.fillStyle = th.water; c.fillRect(x * T, y * T, T, T);
      c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 2; c.beginPath();
      const o = Math.sin(w.t / 400 + x + y) * 3;
      c.moveTo(x * T + 10, y * T + 22 + o); c.quadraticCurveTo(x * T + 18, y * T + 15 + o, x * T + 26, y * T + 22 + o); c.stroke();
    } else if (g) { c.fillStyle = '#000'; c.font = `${T * 0.82}px ${EMOJI}`; c.fillText(g, x * T + T / 2, y * T + T / 2 + 2); }
  }
  // 入口和出口
  const [ex, ey] = w.map.entry, [gx, gy] = w.map.exit;
  c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(ex * T, ey * T, T, T);
  c.fillStyle = '#000'; c.font = `${T * 0.5}px ${EMOJI}`; c.fillText(w.i > 0 ? '⬅️' : '🏁', ex * T + T / 2, ey * T + T / 2);
  c.fillStyle = w.gateOpen ? 'rgba(255,225,110,.8)' : 'rgba(90,70,60,.55)'; c.fillRect(gx * T, gy * T, T, T);
  c.fillStyle = '#000'; c.font = `${T * 0.72}px ${EMOJI}`; c.fillText(w.gateOpen ? (w.isBoss ? '🏆' : '🚪') : '🔒', gx * T + T / 2, gy * T + T / 2 + 2);
  if (w.gateOpen) { c.globalAlpha = 0.5 + Math.sin(w.t / 200) * 0.4; c.font = `${T * 0.4}px ${EMOJI}`; c.fillText('✨', gx * T + T * 0.2, gy * T + T * 0.2); c.globalAlpha = 1; }
  if (w.chest) { c.fillStyle = '#000'; c.font = `${T * 0.7}px ${EMOJI}`; c.fillText(w.chest.open ? '📭' : '🎁', w.chest.x * T + T / 2, w.chest.y * T + T / 2 + (w.chest.open ? 0 : Math.sin(w.t / 300) * 3)); }
  const shadow = (x, y, s) => { c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(x * T + T / 2, y * T + T * 0.88, T * 0.28 * s, T * 0.08 * s, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#000'; };
  for (const m of w.mons) {
    const k = m.mv ? m.mv.t : 1, x = m.mv ? m.mv.fx + (m.x - m.mv.fx) * k : m.x, y = m.mv ? m.mv.fy + (m.y - m.mv.fy) * k : m.y;
    const s = m.boss ? 1.7 : 0.82;
    shadow(x, y, m.boss ? 1.6 : 1);
    c.font = `${T * s}px ${EMOJI}`; c.fillText(m.e, x * T + T / 2, y * T + T / 2 + Math.sin(w.t / 250 + m.id) * 3 - (m.boss ? 10 : 0));
  }
  const p = w.p, k = p.moving ? p.moving.t : 1;
  const x = p.moving ? p.moving.fx + (p.x - p.moving.fx) * k : p.x, y = p.moving ? p.moving.fy + (p.y - p.moving.fy) * k : p.y;
  const hop = p.moving ? -Math.sin(k * Math.PI) * 6 : 0;
  shadow(x, y, 1);
  c.save(); c.translate(x * T + T / 2, y * T + T / 2 + hop); if (p.face < 0) c.scale(-1, 1);
  c.font = `${T * 0.86}px ${EMOJI}`; c.fillText(save.hero, 0, 0); c.restore();
  if (save.hat) { c.font = `${T * 0.44}px ${EMOJI}`; c.fillText(save.hat, x * T + T / 2, y * T + 5 + hop); }
  for (const f of w.floats) { c.globalAlpha = Math.max(0, 1 - f.t / 1200); c.font = `bold 22px sans-serif`; c.lineWidth = 4; c.strokeStyle = 'white'; c.strokeText(f.text, f.x * T + T / 2, f.y * T - f.t / 30); c.fillStyle = f.color; c.fillText(f.text, f.x * T + T / 2, f.y * T - f.t / 30); c.globalAlpha = 1; }
}
function openChest() {
  const w = world;
  w.chest.open = true;
  const gold = 15 + Math.floor(Math.random() * 20);
  save.gold += gold; SFX.coin();
  const card = grantCard(w.us);
  persist(); refreshHud();
  w.floats.push({ x: w.chest.x, y: w.chest.y, text: `+${gold}`, color: '#a26a00', t: 0 });
  overlay(`<div class="pop-panel"><div class="pop-art" aria-hidden="true">🎁✨</div><h2 class="adv-title">打開寶箱！</h2><p>得到 💰 ${gold} 金幣${card ? '和一張知識卡' : ''}。</p>
    ${card ? cardHtml(card, card.isNew ? '新的知識卡！' : '知識卡（已經收集過）') : ''}
    <div class="math-actions"><button class="primary-button" data-close>繼續探索</button></div></div>`);
}

/* ---------- 疊在地圖上的視窗 ---------- */
function overlay(html, focus = true) {
  const o = $('#overlay'); if (!o) return;
  const wasOpen = !o.hidden;
  o.innerHTML = `<div class="rpg-dialog" role="dialog" aria-modal="true">${html}</div>`; o.hidden = false;
  if (world) world.held = null;
  if (focus || !wasOpen) { o.scrollTop = 0; (o.querySelector('#qprompt,h2') || o).setAttribute('tabindex', '-1'); (o.querySelector('#qprompt,h2') || o).focus({ preventScroll: true }); }
}
function closeOverlay() { const o = $('#overlay'); if (o) { o.hidden = true; o.innerHTML = ''; } refreshHud(); }

/* ---------- 戰鬥 ---------- */
function nextQuestion() {
  const w = world;
  if (w.qpos >= w.pool.length) w.pool.push(...shuffle(w.pool.slice(0, w.qpos)));
  const q = w.pool[w.qpos++];
  return { ...q, order: q.options ? shuffle(q.options.map((_, j) => j)) : null };
}
function startFight(m) {
  fight = { m, q: nextQuestion(), combo: 0, selected: null, submitted: false, ok: null, fixFound: false, fixMiss: null, hidden: [], t0: Date.now(), fx: '', log: '', over: null };
  SFX.start();
  renderFight(true);
}
function renderFight(focus = false) {
  const f = fight, m = f.m, q = f.q;
  const tags = `<p class="math-tags">${world.isBoss ? `<span>${esc(q.unit.title)}</span>` : ''}<span>${esc(q.cat)}</span>${q.type === 'fix' ? '<span>點錯字 → 選正字</span>' : ''}</p>`;
  const ctx = q.passage ? `<div class="exam-context"><strong>${esc(q.cat)}</strong><p>${esc(q.passage)}</p></div>` : q.context ? `<div class="exam-context"><strong>題目資料</strong><p>${esc(q.context)}</p></div>` : '';
  let main;
  if (q.type === 'fix') main = fixMarkup(q);
  else {
    const opts = q.type === 'tf' ? [[true, '○', '對'], [false, '×', '錯']] : q.order.map((oi, k) => [oi, String.fromCharCode(65 + k), q.options[oi]]);
    const maxLen = Math.max(...opts.map(o => [...String(o[2])].length));
    const short = q.type !== 'tf' && maxLen <= 4, medium = q.type !== 'tf' && !short && maxLen <= 10;
    const oneChar = short && opts.every(o => [...String(o[2])].length === 1);
    main = `<h3 id="qprompt" tabindex="-1">${esc(q.q)}</h3>
      <div class="math-options ${q.type === 'tf' ? 'truefalse-options' : ''} ${short ? 'grid-options' + (oneChar ? '' : ' grid-words') : medium ? 'two-col-options' : ''}" role="group" aria-label="選擇答案">${opts.map(([v, letter, text]) => {
        const isAns = v === q.answer, isSel = f.selected === v, gone = f.hidden.includes(v);
        return `<button class="math-option ${isSel ? 'selected' : ''} ${gone ? 'scrolled-out' : ''} ${f.submitted && isAns ? 'correct-option' : ''} ${f.submitted && isSel && !isAns ? 'wrong-option' : ''}" data-option="${String(v)}" aria-pressed="${isSel}" ${f.submitted || gone ? 'disabled' : ''}><span class="option-letter">${letter}</span><span class="${short ? (oneChar ? 'fix-char' : 'short-text') : ''}">${esc(text)}</span>${f.submitted && isAns ? '<span class="answer-marker">正解</span>' : ''}</button>`;
      }).join('')}</div>
      ${f.submitted ? '' : `<button class="primary-button math-submit" data-act="submit" ${f.selected === null ? 'disabled' : ''}>⚔️ 出招！</button>`}`;
  }
  const items = f.submitted ? '' : `<div class="fight-items">${Object.entries(ITEMS).map(([k, [e, n]]) => `<button class="item-btn" data-use="${k}" ${save.inv[k] ? '' : 'disabled'} title="${n}">${e}<span>${n} ×${save.inv[k] || 0}</span></button>`).join('')}<button class="item-btn" data-run title="逃跑">🏃<span>逃跑</span></button></div>`;
  const meFx = f.fx === 'hurt' ? 'fx-hurt' : f.fx ? 'fx-attack' : '', foeFx = f.fx === 'hit' || f.fx === 'crit' ? 'fx-hit' : f.fx === 'hurt' ? 'fx-attack-left' : '';
  overlay(`<div class="fight">
    <div class="fight-scene ${m.boss ? 'is-boss' : ''} ${f.fx === 'crit' ? 'flash' : ''}">
      <div class="fighter-box me ${meFx}">
        <span class="fighter-emoji" aria-hidden="true">${save.hat ? `<i class="hat">${save.hat}</i>` : ''}${save.hero}</span>
        <div class="mini-bar"><span class="hpfill me-fill" style="width:${save.hp / maxHp() * 100}%"></span></div><small>Lv.${save.lv}　❤️ ${save.hp}/${maxHp()}</small></div>
      <div class="fight-mid">${f.combo > 1 ? `<span class="combo">🔥 ${f.combo} 連擊</span>` : ''}${f.log ? `<span class="dmg ${f.fx}">${esc(f.log)}</span>` : '<span class="vs-x">VS</span>'}</div>
      <div class="fighter-box foe ${foeFx}">
        <span class="fighter-emoji" aria-hidden="true">${m.e}</span>
        <div class="mini-bar"><span class="hpfill" style="width:${m.hp / m.max * 100}%"></span></div><small>${esc(m.name)}　${m.hp}/${m.max}</small></div>
    </div>
    <section class="math-question exam-question battle-card">${tags}${ctx}${main}${f.submitted ? feedbackMarkup(q) : ''}</section>
    ${items}</div>`, focus);
}
function fixMarkup(q) {
  const f = fight, chars = [...q.sentence], wrongIdx = chars.indexOf(q.wrong);
  const glyphs = chars.map((ch, i) => {
    if (!/\p{Script=Han}/u.test(ch)) return `<span class="glyph-punctuation">${esc(ch)}</span>`;
    const cls = (f.fixFound || f.submitted) && i === wrongIdx ? 'glyph-found' : f.fixMiss === i ? 'glyph-tried' : '';
    return `<button class="glyph-button ${cls}" data-glyph="${i}" ${f.fixFound || f.submitted ? 'disabled' : ''} aria-label="${esc(ch)}，第${i + 1}個字">${esc(ch)}</button>`;
  }).join('');
  let step2 = '';
  if (f.fixFound) {
    step2 = `<p class="glyph-success" role="status">找對了！「${esc(q.wrong)}」是錯字。</p><p class="correction-step"><span>2</span>選出正確的字</p>
      <div class="math-options fix-options" role="group" aria-label="選出正確的字">${q.order.map((oi, k) => {
        const v = q.options[oi], isAns = v === q.correct, isSel = f.selected === v;
        return `<button class="math-option ${f.submitted && isAns ? 'correct-option' : ''} ${f.submitted && isSel && !isAns ? 'wrong-option' : ''}" data-fixopt="${oi}" ${f.submitted ? 'disabled' : ''}><span class="option-letter">${String.fromCharCode(65 + k)}</span><span class="fix-char">${esc(v)}</span>${f.submitted && isAns ? '<span class="answer-marker">正解</span>' : ''}</button>`;
      }).join('')}</div>`;
  }
  return `<h3 id="qprompt" tabindex="-1">下面這句話有一個錯字，先點出錯字。</h3>
    <div class="correction-stages"><p class="correction-step"><span>1</span>點出句子裡的錯字</p>
    <div class="glyph-sentence" role="group" aria-label="點選句中的錯字">${glyphs}</div>${step2}</div>`;
}
function feedbackMarkup(q) {
  const f = fight;
  let right;
  if (q.type === 'tf') right = q.answer ? '○ 對' : '× 錯';
  else if (q.type === 'fix') right = `「${q.wrong}」改成「${q.correct}」`;
  else right = q.options[q.answer];
  const corrected = q.type === 'fix' ? `<p class="corrected-sentence">訂正後：${esc(q.sentence.replace(q.wrong, q.correct))}</p>` : '';
  const missMsg = q.type === 'fix' && f.fixMiss !== null && !f.fixFound ? '錯字不是這個字，綠色框的才是。' : '';
  const next = f.over === 'win' ? '🎉 打倒了！領取獎勵' : f.over === 'lose' ? '看結果' : '下一招 →';
  return `<div class="math-feedback ${f.ok ? 'is-correct' : 'is-wrong'}" id="feedback" tabindex="-1" role="status">
      <strong>${f.ok ? f.bonus : `💥 被反擊了！體力 −${f.taken}`}</strong>${missMsg ? `<p>${missMsg}</p>` : ''}
      ${f.ok ? '' : `<p>正確答案：${esc(right)}</p>`}${corrected}
      ${q.why ? `<div class="math-explanation">${esc(q.why)}</div>` : ''}
    </div>
    <button class="primary-button math-next ${f.over ? 'is-final' : ''}" data-act="next">${next}</button>`;
}
let lvlMsg = '';
function gainXp(n) {
  save.xp += n;
  while (save.xp >= xpNeed()) { save.xp -= xpNeed(); save.lv++; save.hp = maxHp(); lvlMsg = `⬆️ 升級了！Lv.${save.lv}：體力上限 ${maxHp()}、攻擊 ${atk()}，體力全滿！`; }
}
function judge(ok) {
  const f = fight, m = f.m, q = f.q, w = world;
  f.submitted = true; f.ok = ok; w.answered++;
  if (ok) {
    w.correct++; f.combo++;
    const crit = Math.random() < 0.12 + Math.min(0.2, f.combo * 0.03);
    const dmg = Math.round(atk() * (1 + 0.25 * Math.min(f.combo - 1, 4)) * (crit ? 2 : 1) * (0.9 + Math.random() * 0.2));
    m.hp = Math.max(0, m.hp - dmg);
    f.fx = crit ? 'crit' : 'hit'; f.log = `−${dmg}`;
    f.bonus = crit ? `💥 會心一擊！傷害加倍 −${dmg}` : f.combo > 1 ? `🔥 ${f.combo} 連擊！傷害提高 −${dmg}` : `⚔️ 命中！−${dmg}`;
    if (Date.now() - f.t0 < 12000) { save.gold += 2; f.bonus += '　⚡ 快攻 +2 💰'; }
    gainXp(10);
    wrongBook.delete(q.key);
    crit ? SFX.crit() : SFX.hit();
    if (m.hp <= 0) f.over = 'win';
  } else {
    f.combo = 0;
    const dmg = Math.max(2, m.dmg - SHIELDS[save.shield][1]);
    save.hp = Math.max(0, save.hp - dmg); f.taken = dmg;
    f.fx = 'hurt'; f.log = `−${dmg} ❤️`;
    wrongBook.add(q.key);
    w.pool.splice(Math.min(w.pool.length, w.qpos + 3), 0, q); // 答錯的題目過幾題再出一次
    SFX.hurt();
    if (save.hp <= 0) f.over = 'lose';
  }
  saveWrong(); persist();
  renderFight();
  $('#feedback')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
function afterAnswer() {
  const f = fight;
  if (f.over === 'win') return winFight();
  if (f.over === 'lose') return loseFight();
  Object.assign(f, { q: nextQuestion(), selected: null, submitted: false, ok: null, fixFound: false, fixMiss: null, hidden: [], t0: Date.now(), fx: '', log: '' });
  renderFight(true);
}
function winFight() {
  const f = fight, w = world, m = f.m;
  const gold = m.boss ? 120 : 8 + Math.floor(Math.random() * 8) + w.i;
  save.gold += gold; gainXp(m.boss ? 80 : 15);
  w.mons = w.mons.filter(x => x !== m);
  let extra = '';
  const allDone = !w.mons.length;
  if (allDone) {
    w.gateOpen = true;
    const acc = w.correct / Math.max(1, w.answered), stars = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : 1;
    const before = starsOf(w.key);
    if (stars > before) save.stars[w.key] = stars;
    extra = `<p class="result-stars" aria-label="${stars} 顆星">${'★'.repeat(stars)}<span>${'★'.repeat(3 - stars)}</span></p>
      <p>${w.isBoss ? '大魔王被打倒了！你是這座島的英雄！' : '這一區的怪獸全部打倒了，右邊的門打開了！'}答對率 ${Math.round(acc * 100)}%${stars > before && before ? '，新的最佳紀錄！' : ''}</p>`;
    if (w.isBoss) { const c = grantCard(w.us); if (c) extra += cardHtml(c, c.isNew ? '魔王的寶物：新的知識卡！' : '魔王的寶物'); }
  }
  persist();
  const lv = lvlMsg; lvlMsg = '';
  fight = null;
  lv ? SFX.lvl() : SFX.win();
  w.floats.push({ x: m.x, y: m.y, text: `+${gold}`, color: '#a26a00', t: 0 });
  overlay(`<div class="pop-panel"><div class="pop-art" aria-hidden="true">${save.hero}🎉</div><h2 class="adv-title">${w.isBoss && allDone ? '打倒大魔王了！' : `打倒${esc(m.name)}！`}</h2>
    <p>得到 💰 ${gold} 金幣、${m.boss ? 80 : 15} 經驗值。</p>${lv ? `<p class="lvl-up">${esc(lv)}</p>` : ''}${extra}
    <div class="math-actions">${w.isBoss && allDone ? '<button class="primary-button" data-worldmap>帶著寶物回地圖</button>' : '<button class="primary-button" data-close>繼續探索</button>'}</div></div>`);
}
function loseFight() {
  const w = world;
  fight = null; lvlMsg = '';
  save.hp = maxHp();
  persist();
  const [ex, ey] = w.map.entry; Object.assign(w.p, { x: ex + 1, y: ey, moving: null, face: 1 }); w.path = [];
  overlay(`<div class="pop-panel"><div class="pop-art" aria-hidden="true">${save.hero}💫</div><h2 class="adv-title">昏倒了…</h2>
    <p>回到區域入口休息，體力已經補滿。打倒的怪獸不會回來，答錯的題目都收進錯題本了。</p>
    <div class="math-actions"><button class="primary-button" data-close>再出發！</button>${w.isBoss ? '' : `<a class="secondary-button" href="${reviewHref(w.us[0].meta)}" target="_blank" rel="noopener">📖 先看重點</a>`}</div></div>`);
}
function useItem(k) {
  const f = fight;
  if (!save.inv[k]) return;
  if (k === 'apple' || k === 'potion') {
    if (save.hp >= maxHp()) return note('體力已經是滿的');
    save.hp = k === 'apple' ? Math.min(maxHp(), save.hp + 15) : maxHp();
  } else if (k === 'scroll') {
    if (!f || f.q.type !== 'mc' || f.q.options.length < 3 || f.hidden.length) return note('提示卷軸只能在選擇題用一次');
    f.hidden = shuffle(f.q.order.filter(v => v !== f.q.answer)).slice(0, 2);
    if (f.hidden.includes(f.selected)) f.selected = null;
  }
  save.inv[k]--; persist(); SFX.coin();
  if (f) renderFight(); else renderItems();
}
function note(msg) { const o = $('#overlay .fight-items') || $('#overlay .pop-panel'); if (!o) return; let n = o.querySelector('.inline-note'); if (!n) { n = document.createElement('p'); n.className = 'inline-note'; n.setAttribute('role', 'status'); o.append(n); } n.textContent = msg; }

/* ---------- 商店與背包 ---------- */
function renderShop() {
  const row = (label, desc, price, attr, owned = false) => `<div class="shop-row"><div><strong>${label}</strong><small>${esc(desc)}</small></div>
    ${owned ? '<span class="owned">最強了</span>' : `<button class="secondary-button" ${attr} ${save.gold < price ? 'disabled' : ''}>💰 ${price}</button>`}</div>`;
  const ns = SWORDS[save.sword + 1], nh = SHIELDS[save.shield + 1];
  overlay(`<div class="pop-panel shop"><h2 class="adv-title">🏪 冒險商店</h2><p>你有 💰 ${save.gold} 金幣。答對、打怪、開寶箱都能賺金幣。</p>
    <h3 class="shop-h">道具</h3>${Object.entries(ITEMS).map(([k, [e, n, d, p]]) => row(`${e} ${n}（有 ${save.inv[k] || 0} 個）`, d, p, `data-buy="${k}"`)).join('')}
    <h3 class="shop-h">裝備</h3>
    ${ns ? row(ns[0], `攻擊 +${ns[1]}（現在：${SWORDS[save.sword][0]}）`, ns[2], 'data-buy="sword"') : row(SWORDS[save.sword][0], '已經是最強的劍', 0, '', true)}
    ${nh ? row(nh[0], `被打少 ${nh[1]} 點（現在：${SHIELDS[save.shield][0]}）`, nh[2], 'data-buy="shield"') : row(SHIELDS[save.shield][0], '已經是最強的盾', 0, '', true)}
    <h3 class="shop-h">造型（戴在頭上）</h3><div class="hat-grid">${HATS.map(([e, n, p]) => save.hats.includes(e)
      ? `<button class="hat-btn" data-wear="${e}" aria-pressed="${save.hat === e}"><b>${e}</b><span>${save.hat === e ? '戴著' : '戴上'}</span></button>`
      : `<button class="hat-btn" data-buy="hat:${e}" ${save.gold < p ? 'disabled' : ''}><b>${e}</b><span>${n} 💰${p}</span></button>`).join('')}
      ${save.hat ? '<button class="hat-btn" data-wear=""><b>🙂</b><span>脫下</span></button>' : ''}</div>
    <div class="math-actions"><button class="primary-button" data-close>離開商店</button></div></div>`, false);
}
function buy(what) {
  let price;
  if (ITEMS[what]) { price = ITEMS[what][3]; if (save.gold < price) return; save.inv[what] = (save.inv[what] || 0) + 1; }
  else if (what === 'sword') { const s = SWORDS[save.sword + 1]; if (!s || save.gold < s[2]) return; price = s[2]; save.sword++; }
  else if (what === 'shield') { const s = SHIELDS[save.shield + 1]; if (!s || save.gold < s[2]) return; price = s[2]; save.shield++; }
  else if (what.startsWith('hat:')) { const h = HATS.find(x => x[0] === what.slice(4)); if (!h || save.gold < h[2] || save.hats.includes(h[0])) return; price = h[2]; save.hats.push(h[0]); save.hat = h[0]; }
  else return;
  save.gold -= price; persist(); SFX.coin(); refreshHud(); renderShop();
}
function renderItems() {
  overlay(`<div class="pop-panel"><h2 class="adv-title">🎒 背包</h2>
    <p>Lv.${save.lv}　❤️ ${save.hp}/${maxHp()}　⚔️ 攻擊 ${atk()}（${SWORDS[save.sword][0]}）　🛡️ ${SHIELDS[save.shield][0]}</p>
    ${Object.entries(ITEMS).map(([k, [e, n, d]]) => `<div class="shop-row"><div><strong>${e} ${n} ×${save.inv[k] || 0}</strong><small>${esc(d)}</small></div>${k === 'scroll' ? '<small>戰鬥時使用</small>' : `<button class="secondary-button" data-use="${k}" ${save.inv[k] ? '' : 'disabled'}>使用</button>`}</div>`).join('')}
    <p>知識卡 ${Object.keys(save.cards).length} 張</p>
    <div class="math-actions"><button class="primary-button" data-close>關閉</button><button class="secondary-button" data-bag>看全部知識卡</button></div></div>`, false);
  refreshHud();
}

/* ---------- 寶物袋 ---------- */
function renderBag() {
  const cards = Object.values(save.cards).sort((a, b) => a.at - b.at);
  const groups = new Map();
  for (const c of cards) { const k = `${c.grade} · ${c.subject}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(c); }
  const unitTitle = f => { for (const g of INDEX.grades) for (const s of g.subjects) for (const u of s.units) if (u.file === f) return u.title; return ''; };
  show(`<nav class="adv-crumbs"><button class="text-button" data-home>← 回冒險</button></nav>
    <div class="map-head"><span class="map-icon" aria-hidden="true">🎒</span><div><span class="eyebrow">寶物袋</span><h1 class="adv-title">我的知識卡（${cards.length} 張）</h1>
    <p class="map-score">打開寶箱、打倒大魔王都能拿到知識卡。</p></div></div>
    ${groups.size ? [...groups].map(([k, cs]) => `<section class="adv-panel"><h2 class="adv-h">${esc(k)}</h2><div class="card-grid">${cs.map(c => `<div class="know-card"><span class="know-tag">${esc(unitTitle(c.unit))}${c.head && c.head !== c.title ? ' · ' + esc(c.head) : ''}</span><h3>${esc(c.title)}${c.sub ? ` <small>${esc(c.sub)}</small>` : ''}</h3><p>${esc(c.body)}</p></div>`).join('')}</div></section>`).join('')
      : '<p class="notice">寶物袋還是空的，快去打開第一個寶箱吧！</p>'}`);
  document.title = '寶物袋｜知識島冒險';
}

/* ---------- 操作 ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  const d = t.dataset;
  if (t.id === 'fontToggle') { const on = !document.body.classList.contains('large-type'); document.body.classList.toggle('large-type', on); t.setAttribute('aria-pressed', String(on)); store.set('kr-large', on); return; }
  if (d.dir) return;
  if (d.hero) { save.hero = d.hero; persist(); return renderHome(); }
  if (d.grade) { view.grade = d.grade; store.set('kr-grade', d.grade); return go(d.grade); }
  if (d.island) return go(view.grade, d.island);
  if (d.home !== undefined) return go(view.grade || INDEX.grades[0].name);
  if (d.bag !== undefined) return go('寶物袋');
  if (d.route) return go(view.grade, view.subject, d.route);
  if (d.area !== undefined) return go(view.grade, view.subject, view.route, d.area);
  if (d.worldmap !== undefined) { if (fight) return; return go(view.grade, view.subject, view.route); }
  if (d.mute !== undefined) { save.mute = !save.mute; persist(); return refreshHud(); }
  if (d.shop !== undefined) { if (!fight) renderShop(); return; }
  if (d.items !== undefined) { if (!fight) renderItems(); return; }
  if (d.buy) return buy(d.buy);
  if (d.wear !== undefined) { save.hat = d.wear; persist(); return renderShop(); }
  if (d.use) return useItem(d.use);
  if (d.close !== undefined) return closeOverlay();
  if (!fight) return;
  const f = fight, q = f.q;
  if (d.run !== undefined) {
    fight = null; closeOverlay();
    const p = world.p, back = [[-1, 0], [0, -1], [0, 1], [1, 0]].find(([dx, dy]) => !blocked(p.x + dx, p.y + dy) && !world.mons.some(m => m.x === p.x + dx && m.y === p.y + dy));
    if (back) { p.moving = { fx: p.x, fy: p.y, t: 0 }; p.x += back[0]; p.y += back[1]; }
    return toast('🏃 逃走了！怪獸還在附近');
  }
  if (d.act === 'next' && f.submitted) return afterAnswer();
  if (f.submitted) return;
  if (d.option !== undefined) { f.selected = q.type === 'tf' ? d.option === 'true' : Number(d.option); return renderFight(); }
  if (d.act === 'submit' && f.selected !== null) return judge(f.selected === q.answer);
  if (d.glyph !== undefined && !f.fixFound) {
    const i = Number(d.glyph);
    if ([...q.sentence][i] === q.wrong) { f.fixFound = true; renderFight(); $('.fix-options')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return; }
    f.fixMiss = i; return judge(false);
  }
  if (d.fixopt !== undefined && f.fixFound) { const v = q.options[Number(d.fixopt)]; f.selected = v; return judge(v === q.correct); }
});
document.addEventListener('change', e => {
  if (e.target.id === 'unlockAll') { save.unlockAll = e.target.checked; persist(); renderMap(); }
});
// 方向盤：按住就一直走
const releaseDir = () => { if (world) world.held = null; };
document.addEventListener('pointerdown', e => {
  const b = e.target.closest('[data-dir]');
  if (!b || !world || overlayOpen()) return;
  e.preventDefault(); world.path = []; world.held = b.dataset.dir;
  if (!world.p.moving) tryStep(...DIRS[b.dataset.dir]);
});
['pointerup', 'pointercancel'].forEach(n => document.addEventListener(n, releaseDir));
document.addEventListener('contextmenu', e => { if (e.target.closest('[data-dir]')) e.preventDefault(); });
const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
document.addEventListener('keydown', e => {
  if (e.target.matches('input')) return;
  if (world && !overlayOpen() && KEYS[e.key]) { e.preventDefault(); world.path = []; world.held = KEYS[e.key]; return; }
  if (!fight) { if (e.key === 'Escape' && world && overlayOpen()) closeOverlay(); return; }
  const f = fight, q = f.q;
  if (f.submitted) { if (e.key === 'Enter' && !e.target.closest('button')) afterAnswer(); return; }
  if (q.type === 'tf' && /^[oO1]$/.test(e.key)) { f.selected = true; renderFight(); }
  else if (q.type === 'tf' && /^[xX2]$/.test(e.key)) { f.selected = false; renderFight(); }
  else if (q.type === 'mc' && /^[1-6]$/.test(e.key) && q.order[Number(e.key) - 1] !== undefined && !f.hidden.includes(q.order[Number(e.key) - 1])) { f.selected = q.order[Number(e.key) - 1]; renderFight(); }
});
document.addEventListener('keyup', e => { if (world && KEYS[e.key] === world.held) releaseDir(); });
window.addEventListener('blur', releaseDir);

/* ---------- 啟動 ---------- */
(async () => {
  if (store.get('kr-large', false)) { document.body.classList.add('large-type'); $('#fontToggle').setAttribute('aria-pressed', 'true'); }
  try {
    INDEX = await fetch('data/index.json', { cache: 'no-cache' }).then(r => { if (!r.ok) throw Error('data/index.json'); return r.json(); });
    window.addEventListener('hashchange', route);
    route();
  } catch (err) {
    $('#stage').innerHTML = `<p class="loading">暫時無法載入冒險地圖（${esc(err.message)}）。請重新整理頁面再試一次。</p>`;
  }
})();
