'use strict';
/* 知識島冒險：讀 data/index.json 和各單元檔，把每個有題目的單元變成地圖上的一關。
   新增單元檔就會自動多一關，不用改這支程式。題目的作答方式和題庫練習相同（改錯字是點錯字再選正字）。 */

const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const DEFAULT_CAT = { mc: '選擇', tf: '是非', fix: '改錯字', group: '題組' };
const catOf = q => q.cat || DEFAULT_CAT[q.type];

const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } },
};
// 錯題本和題庫練習共用，答錯的題目在「題庫練習 → 改練錯題」也看得到
let wrongBook = new Set(store.get('kr-wrong-v1', []));
const saveWrong = () => store.set('kr-wrong-v1', [...wrongBook]);
const SAVE_KEY = 'kr-adventure-v1';
const save = Object.assign({ hero: null, stars: {}, cards: {}, unlockAll: false }, store.get(SAVE_KEY, {}));
const persist = () => store.set(SAVE_KEY, save);

/* ---------- 遊戲設定 ---------- */
const HEROES = [['🦊', '小狐狸'], ['🐼', '熊貓'], ['🐯', '小老虎'], ['🐰', '兔兔'], ['🐧', '企鵝'], ['🐸', '青蛙']];
const LANDS = { 國語: ['📖', '文字森林'], 數學: ['🔢', '數字山谷'], 自然: ['🌱', '自然祕境'], 社會: ['🏘️', '小鎮街道'], 英語: ['🔤', '字母海灣'] };
const landOf = s => LANDS[s] || ['🏝️', s + '小島'];
const MONSTERS = [['🐙', '糊塗章魚'], ['🦖', '忘東忘西龍'], ['👻', '粗心小幽靈'], ['🤖', '亂按機器人'], ['🦇', '迷糊蝙蝠'], ['🐊', '偷懶鱷魚'],
  ['🦂', '分心蠍子'], ['🐌', '拖拖拉拉蝸牛'], ['🦉', '瞌睡貓頭鷹'], ['👾', '看錯題小怪'], ['🦀', '橫衝直撞蟹'], ['🐗', '急躁山豬']];
const HEARTS = 3, STAGE_HP = 5, BOSS_HP = 8;
const BOSS = '魔王';
const CHEERS_OK = ['命中！', '漂亮的一擊！', '答對了！', '太厲害了！', '打中要害！'];
const CHEERS_NO = ['被反擊了！', '差一點點！', '怪獸閃開了！'];

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
// 路線：依單元的 term（期中、期末、補充…）分開；沒有標籤的放在「冒險路線」
const NO_TERM = '冒險路線';
function routesOf(g, s) {
  const units = (subjectOf(g, s)?.units || []).filter(u => u.questions);
  const names = [...new Set(units.map(u => u.term || NO_TERM))];
  return names.map(name => ({ name, units: units.filter(u => (u.term || NO_TERM) === name) }));
}
const bossKey = (g, s, r) => `${BOSS}:${g}/${s}/${r}`;
const starsOf = k => save.stars[k] || 0;
const routeStars = r => r.units.reduce((n, u) => n + starsOf(u.file), 0);
function unlocked(route, i) {
  if (save.unlockAll || i === 0) return true;
  if (i === route.units.length) return route.units.every(u => starsOf(u.file) > 0);
  return starsOf(route.units[i - 1].file) > 0;
}

/* ---------- 知識卡：從重點複習抽一張 ---------- */
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

/* ---------- 畫面狀態 ---------- */
let view = { grade: null, subject: null, route: null };
let battle = null;

function go(...parts) {
  const h = '#/' + parts.filter(Boolean).map(encodeURIComponent).join('/');
  if (location.hash === h) route(); else location.hash = h;
}
function route() {
  battle = null;
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
  renderMap();
}
const show = (html, focus = true) => { $('#stage').innerHTML = html; if (focus) { $('#stage').focus({ preventScroll: true }); $('#stage').scrollIntoView({ block: 'start' }); } };

/* ---------- 首頁：選角色、年級、島嶼 ---------- */
function renderHome() {
  const g = gradeOf(view.grade);
  const heroPicker = `<section class="adv-panel"><h2 class="adv-h">${save.hero ? '你的冒險夥伴' : '先選一位冒險夥伴'}</h2>
    <div class="hero-pick" role="group" aria-label="選擇冒險夥伴">${HEROES.map(([e, n]) => `<button data-hero="${e}" aria-pressed="${save.hero === e}"><span class="emoji">${e}</span><span>${n}</span></button>`).join('')}</div></section>`;
  const grades = `<div class="grade-switch adv-grades" role="group" aria-label="選擇年級">${INDEX.grades.map(x => `<button data-grade="${esc(x.name)}" aria-pressed="${x.name === view.grade}">${esc(x.name)}</button>`).join('')}</div>`;
  const islands = g.subjects.map(s => {
    const routes = routesOf(g.name, s.name);
    if (!routes.length) return '';
    const [icon, land] = landOf(s.name);
    const stages = routes.reduce((n, r) => n + r.units.length, 0);
    const got = routes.reduce((n, r) => n + routeStars(r), 0);
    const bosses = routes.filter(r => starsOf(bossKey(g.name, s.name, r.name))).length;
    return `<button class="island" data-island="${esc(s.name)}" ${save.hero ? '' : 'disabled'}>
      <span class="island-icon" aria-hidden="true">${icon}</span>
      <span class="island-name">${esc(land)}</span><span class="island-sub">${esc(s.name)} · ${stages} 關＋${routes.length} 個魔王</span>
      <span class="island-stars">⭐ ${got} / ${stages * 3}${bosses ? `　👑 ${bosses}` : ''}</span></button>`;
  }).join('');
  const cardN = Object.keys(save.cards).length;
  show(`<section class="adv-hero-banner">
      <div><span class="eyebrow">${esc(view.grade)} · 知識島冒險</span><h1 class="adv-title">每個單元是一關，<br class="mobile-break">答對就能打倒怪獸！</h1>
      <p>每關有 ${HEARTS} 顆愛心。答對攻擊怪獸，答錯會被反擊，記得看解說。過關可以拿星星和知識卡。</p></div>
      <div class="banner-art" aria-hidden="true">${save.hero || '🧭'}<span>⚔️</span>🐲</div></section>
    ${heroPicker}
    <section class="adv-panel"><h2 class="adv-h">選一座島出發</h2>${grades}
      ${save.hero ? '' : '<p class="adv-hint">選好冒險夥伴後就能出發。</p>'}
      <div class="island-grid">${islands || '<p class="notice">這個年級還沒有題目。</p>'}</div></section>
    <div class="adv-bag-link"><button class="secondary-button" data-bag>🎒 寶物袋（${cardN} 張知識卡）</button></div>`, false);
  document.title = '知識島冒險';
}

/* ---------- 地圖 ---------- */
function renderMap() {
  const { grade: g, subject: s } = view;
  const routes = routesOf(g, s);
  const r = routes.find(x => x.name === view.route);
  const [icon, land] = landOf(s);
  if (!r) return show(`<p class="notice">${esc(land)}還沒有關卡。</p><button class="secondary-button" data-home>回首頁</button>`);
  const nodes = r.units.map((u, i) => {
    const open = unlocked(r, i), st = starsOf(u.file), m = MONSTERS[i % MONSTERS.length];
    return `<li class="map-node ${open ? '' : 'locked'} ${st ? 'cleared' : ''}">
      <button data-stage="${i}" ${open ? '' : 'disabled'} aria-label="第 ${i + 1} 關 ${esc(u.title)}${open ? '' : '（還沒開啟）'}">
        <span class="node-dot" aria-hidden="true">${open ? (st ? m[0] : i + 1) : '🔒'}</span>
        <span class="node-text"><span class="node-num">第 ${i + 1} 關${open && !st ? ' · ' + esc(m[1]) : ''}</span><span class="node-title">${esc(u.title)}</span>
        <span class="node-stars" aria-label="${st} 顆星">${'★'.repeat(st)}<span>${'★'.repeat(3 - st)}</span></span></span></button></li>`;
  });
  const bi = r.units.length, bOpen = unlocked(r, bi), bSt = starsOf(bossKey(g, s, r.name));
  nodes.push(`<li class="map-node boss ${bOpen ? '' : 'locked'} ${bSt ? 'cleared' : ''}">
    <button data-stage="${bi}" ${bOpen ? '' : 'disabled'} aria-label="${esc(r.name)}大魔王${bOpen ? '' : '（打過前面每一關才會開啟）'}">
      <span class="node-dot" aria-hidden="true">${bOpen ? (bSt ? '👑' : '🐲') : '🔒'}</span>
      <span class="node-text"><span class="node-num">最終關</span><span class="node-title">${esc(r.name)}大魔王</span>
      <span class="node-sub">${bOpen ? '混合前面所有單元的題目' : '打過前面每一關才會開啟'}</span>
      <span class="node-stars" aria-label="${bSt} 顆星">${'★'.repeat(bSt)}<span>${'★'.repeat(3 - bSt)}</span></span></span></button></li>`);
  show(`<nav class="adv-crumbs"><button class="text-button" data-home>← 選島</button><span>${esc(g)}</span></nav>
    <div class="map-head"><span class="map-icon" aria-hidden="true">${icon}</span><div><span class="eyebrow">${esc(s)} · ${esc(g)}</span><h1 class="adv-title">${esc(land)}</h1>
    <p class="map-score">⭐ ${routeStars(r)} / ${r.units.length * 3}　${save.hero} 準備出發！</p></div></div>
    ${routes.length > 1 ? `<div class="scope-switch adv-routes" role="group" aria-label="選擇路線">${routes.map(x => `<button data-route="${esc(x.name)}" aria-pressed="${x.name === r.name}">${esc(x.name)}</button>`).join('')}</div>` : ''}
    <ol class="adv-map">${nodes.join('')}</ol>
    <div class="adv-map-foot"><button class="text-button" data-bag>🎒 寶物袋</button>
      <label class="unlock-toggle"><input type="checkbox" id="unlockAll" ${save.unlockAll ? 'checked' : ''}> 全部關卡直接開啟（想先複習某一課時用）</label></div>`);
  document.title = `${land}｜知識島冒險`;
}

/* ---------- 關卡入口 ---------- */
async function openStage(i) {
  const r = routesOf(view.grade, view.subject).find(x => x.name === view.route);
  if (!r || !unlocked(r, i)) return;
  const isBoss = i === r.units.length;
  const metas = isBoss ? r.units : [r.units[i]];
  show('<p class="loading">怪獸正在靠近…</p>');
  let us;
  try { us = await Promise.all(metas.map(loadUnit)); } catch (e) { return show(`<p class="notice">題目載入失敗（${esc(e.message)}），請重新整理再試。</p>`); }
  const m = isBoss ? ['🐲', `${r.name}大魔王`] : MONSTERS[i % MONSTERS.length];
  const meta = metas[0];
  const reviewLink = isBoss ? '' : `<a class="secondary-button" href="index.html#/${[view.grade, view.subject, baseName(meta.file)].map(encodeURIComponent).join('/')}">先看這一課的重點</a>`;
  const hp = Math.min(isBoss ? BOSS_HP : STAGE_HP, us.reduce((n, u) => n + u.items.length, 0));
  battle = { r, i, isBoss, us, monster: m, hp, maxHp: hp, hearts: HEARTS, phase: 'intro' };
  show(`<section class="battle-intro">
      <div class="vs" aria-hidden="true"><span class="vs-hero">${save.hero}</span><span class="vs-x">VS</span><span class="vs-monster ${isBoss ? 'is-boss' : ''}">${m[0]}</span></div>
      <span class="eyebrow">${isBoss ? '最終關' : `第 ${i + 1} 關`} · ${esc(view.subject)}</span>
      <h1 class="adv-title">${esc(isBoss ? `${r.name}大魔王出現了！` : meta.title)}</h1>
      <p>${isBoss ? `魔王會出前面 ${r.units.length} 個單元的題目，要答對 ${hp} 題才打得倒。` : `「${esc(m[1])}」擋在路上！答對 ${hp} 題就能打倒牠。`}你有 ${HEARTS} 顆愛心。</p>
      <div class="math-actions"><button class="primary-button" data-fight>出發！</button>${reviewLink}<button class="secondary-button" data-map>回地圖</button></div>
    </section>`);
}
function startFight() {
  const b = battle;
  if (!b) return;
  // 魔王關：各單元輪流出題，讓每一課都出現；一般關：該單元隨機
  let pool;
  if (b.isBoss) {
    const per = b.us.map(u => shuffle(u.items));
    pool = [];
    for (let k = 0; pool.length < 40 && per.some(x => x[k]); k++) for (const x of shuffle(per)) if (x[k]) pool.push(x[k]);
  } else pool = shuffle(b.us[0].items);
  // 錯題本裡的題目優先出現一題，讓冒險也能順便訂正
  const wi = pool.findIndex(q => wrongBook.has(q.key));
  if (wi > 2) pool.unshift(...pool.splice(wi, 1));
  b.queue = pool.map(q => ({ ...q, order: q.options ? shuffle(q.options.map((_, j) => j)) : null }));
  // 題目比怪獸體力少的單元（例如只有 4 題），怪獸體力就跟題數一樣
  b.hp = b.maxHp = Math.min(b.isBoss ? BOSS_HP : STAGE_HP, b.queue.length);
  b.missed = [];
  b.pos = 0; b.phase = 'q'; b.answered = 0; b.correct = 0;
  resetTurn();
  renderBattle(true);
}
const resetTurn = () => Object.assign(battle, { selected: null, submitted: false, ok: null, fixFound: false, fixMiss: null, fx: '' });

/* ---------- 戰鬥 ---------- */
function hud() {
  const b = battle;
  const hearts = Array.from({ length: HEARTS }, (_, k) => `<span class="${k < b.hearts ? '' : 'lost'}">${k < b.hearts ? '❤️' : '🤍'}</span>`).join('');
  return `<div class="battle-hud">
    <div class="fighter hero-side ${b.fx === 'hurt' ? 'fx-hurt' : b.fx === 'hit' ? 'fx-attack' : ''}"><span class="fighter-emoji" aria-hidden="true">${save.hero}</span>
      <div class="hearts" role="img" aria-label="愛心剩 ${b.hearts} 顆">${hearts}</div></div>
    <div class="fighter monster-side ${b.fx === 'hit' ? 'fx-hit' : b.fx === 'hurt' ? 'fx-attack' : ''} ${b.isBoss ? 'is-boss' : ''}"><span class="fighter-emoji" aria-hidden="true">${b.monster[0]}</span>
      <div class="hp"><span class="hp-name">${esc(b.monster[1])}</span><div class="hp-bar" role="progressbar" aria-label="怪獸體力" aria-valuemin="0" aria-valuemax="${b.maxHp}" aria-valuenow="${b.hp}"><span style="width:${b.hp / b.maxHp * 100}%"></span></div></div></div>
  </div>`;
}
function renderBattle(focusQ = false) {
  const b = battle;
  if (b.phase === 'end') return renderResult();
  const q = b.queue[b.pos];
  const tags = `<p class="math-tags">${b.isBoss ? `<span>${esc(q.unit.title)}</span>` : ''}<span>${esc(q.cat)}</span>${q.type === 'fix' ? '<span>點錯字 → 選正字</span>' : ''}</p>`;
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
        const isAns = v === q.answer, isSel = b.selected === v;
        return `<button class="math-option ${isSel ? 'selected' : ''} ${b.submitted && isAns ? 'correct-option' : ''} ${b.submitted && isSel && !isAns ? 'wrong-option' : ''}" data-option="${String(v)}" aria-pressed="${isSel}" ${b.submitted ? 'disabled' : ''}><span class="option-letter">${letter}</span><span class="${short ? (oneChar ? 'fix-char' : 'short-text') : ''}">${esc(text)}</span>${b.submitted && isAns ? '<span class="answer-marker">正解</span>' : ''}</button>`;
      }).join('')}</div>
      ${b.submitted ? '' : `<button class="primary-button math-submit" data-act="submit" ${b.selected === null ? 'disabled' : ''}>⚔️ 出招！</button>`}`;
  }
  $('#stage').innerHTML = `<div class="battle-top"><button class="text-button" data-quit>撤退</button><span>${b.isBoss ? '最終關' : `第 ${b.i + 1} 關`} · 第 ${b.answered + (b.submitted ? 0 : 1)} 招</span></div>
    ${hud()}
    <section class="math-question exam-question battle-card">${tags}${ctx}${main}${b.submitted ? feedbackMarkup(q) : ''}</section>`;
  if (focusQ) ($('#qprompt') || $('#stage')).focus({ preventScroll: true });
}
function fixMarkup(q) {
  const b = battle, chars = [...q.sentence], wrongIdx = chars.indexOf(q.wrong);
  const glyphs = chars.map((ch, i) => {
    if (!/\p{Script=Han}/u.test(ch)) return `<span class="glyph-punctuation">${esc(ch)}</span>`;
    const cls = (b.fixFound || b.submitted) && i === wrongIdx ? 'glyph-found' : b.fixMiss === i ? 'glyph-tried' : '';
    return `<button class="glyph-button ${cls}" data-glyph="${i}" ${b.fixFound || b.submitted ? 'disabled' : ''} aria-label="${esc(ch)}，第${i + 1}個字">${esc(ch)}</button>`;
  }).join('');
  let step2 = '';
  if (b.fixFound) {
    step2 = `<p class="glyph-success" role="status">找對了！「${esc(q.wrong)}」是錯字。</p><p class="correction-step"><span>2</span>選出正確的字</p>
      <div class="math-options fix-options" role="group" aria-label="選出正確的字">${q.order.map((oi, k) => {
        const v = q.options[oi], isAns = v === q.correct, isSel = b.selected === v;
        return `<button class="math-option ${b.submitted && isAns ? 'correct-option' : ''} ${b.submitted && isSel && !isAns ? 'wrong-option' : ''}" data-fixopt="${oi}" ${b.submitted ? 'disabled' : ''}><span class="option-letter">${String.fromCharCode(65 + k)}</span><span class="fix-char">${esc(v)}</span>${b.submitted && isAns ? '<span class="answer-marker">正解</span>' : ''}</button>`;
      }).join('')}</div>`;
  }
  return `<h3 id="qprompt" tabindex="-1">下面這句話有一個錯字，先點出錯字。</h3>
    <div class="correction-stages"><p class="correction-step"><span>1</span>點出句子裡的錯字</p>
    <div class="glyph-sentence" role="group" aria-label="點選句中的錯字">${glyphs}</div>${step2}</div>`;
}
function feedbackMarkup(q) {
  const b = battle;
  let right;
  if (q.type === 'tf') right = q.answer ? '○ 對' : '× 錯';
  else if (q.type === 'fix') right = `「${q.wrong}」改成「${q.correct}」`;
  else right = q.options[q.answer];
  const corrected = q.type === 'fix' ? `<p class="corrected-sentence">訂正後：${esc(q.sentence.replace(q.wrong, q.correct))}</p>` : '';
  const missMsg = q.type === 'fix' && b.fixMiss !== null && !b.fixFound ? '錯字不是這個字，綠色框的才是。' : '';
  const over = b.hp <= 0 || b.hearts <= 0;
  const next = b.hp <= 0 ? '🎉 怪獸倒下了！看結果' : b.hearts <= 0 ? '看結果' : '繼續戰鬥 →';
  return `<div class="math-feedback ${b.ok ? 'is-correct' : 'is-wrong'}" id="feedback" tabindex="-1" role="status">
      <strong>${b.ok ? `⚔️ ${pick(CHEERS_OK)}` : `💥 ${pick(CHEERS_NO)}愛心少了一顆。`}</strong>${missMsg ? `<p>${missMsg}</p>` : ''}
      ${b.ok ? '' : `<p>正確答案：${esc(right)}</p>`}${corrected}
      ${q.why ? `<div class="math-explanation">${esc(q.why)}</div>` : ''}
    </div>
    <button class="primary-button math-next ${over ? 'is-final' : ''}" data-act="next">${next}</button>`;
}
function judge(q, ok) {
  const b = battle;
  b.submitted = true; b.ok = ok; b.answered++;
  if (ok) { b.correct++; b.hp--; b.fx = 'hit'; wrongBook.delete(q.key); }
  else { b.hearts--; b.fx = 'hurt'; wrongBook.add(q.key); b.missed.push(q); }
  saveWrong();
  renderBattle();
  $('#feedback')?.focus({ preventScroll: true });
  $('#feedback')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
function nextTurn() {
  const b = battle;
  // 題目出完了怪獸還沒倒：把答錯的題目再出一次（選項重新打亂），順便訂正
  if (b.hp > 0 && b.hearts > 0 && b.pos + 1 >= b.queue.length && b.missed.length) b.queue.push(...shuffle(b.missed.splice(0)).map(q => ({ ...q, order: q.options ? shuffle(q.options.map((_, j) => j)) : null })));
  if (b.hp <= 0 || b.hearts <= 0 || b.pos + 1 >= b.queue.length) { b.phase = 'end'; return renderResult(); }
  b.pos++; resetTurn();
  renderBattle(true);
  $('#stage').scrollIntoView({ block: 'start' });
}

/* ---------- 結果 ---------- */
async function renderResult() {
  const b = battle;
  const win = b.hp <= 0;
  const key = b.isBoss ? bossKey(view.grade, view.subject, b.r.name) : b.r.units[b.i].file;
  let card = null, newBest = false;
  if (win && !b.rewarded) {
    b.rewarded = true;
    const stars = Math.max(1, b.hearts);
    if (stars > starsOf(key)) { save.stars[key] = stars; newBest = true; }
    // 過關從這一關的重點複習抽一張還沒收集的知識卡（魔王關從所有單元抽）
    const all = b.us.flatMap(cardsOf);
    const fresh = all.filter(c => !save.cards[c.id]);
    card = pick(fresh.length ? fresh : all) || null;
    if (card && !save.cards[card.id]) save.cards[card.id] = { grade: view.grade, subject: view.subject, unit: card.id.split('#')[0], title: card.title, sub: card.sub, body: card.body, head: card.head, at: Date.now() };
    b.card = card; b.newCard = card && !fresh.length ? false : !!card; b.newBest = newBest;
    persist();
  }
  card = b.card;
  const stars = win ? Math.max(1, b.hearts) : 0;
  const hasNext = win && b.i < b.r.units.length;
  const cardHtml = card ? `<div class="know-card reveal"><span class="know-tag">${b.newCard ? '新的知識卡！' : '知識卡（已經收集過）'}${card.head && card.head !== card.title ? ' · ' + esc(card.head) : ''}</span>
      <h3>${esc(card.title)}${card.sub ? ` <small>${esc(card.sub)}</small>` : ''}</h3><p>${esc(card.body)}</p></div>` : '';
  show(`<section class="battle-result ${win ? 'win' : 'lose'}">
    <div class="result-art" aria-hidden="true">${win ? `${save.hero}🎉` : `${save.hero}💤`}</div>
    <h1 class="adv-title">${win ? (b.isBoss ? '打倒大魔王了！' : '過關了！') : '這次先撤退，休息一下再挑戰！'}</h1>
    ${win ? `<p class="result-stars" aria-label="${stars} 顆星">${'★'.repeat(stars)}<span>${'★'.repeat(3 - stars)}</span></p>` : ''}
    <p>答了 ${b.answered} 題，答對 ${b.correct} 題。${win ? (b.newBest ? '新的最佳紀錄！' : '') : '答錯的題目已經放進錯題本，看懂解說，下次一定打得倒。'}</p>
    ${cardHtml}
    <div class="math-actions">
      ${hasNext ? '<button class="primary-button" data-next-stage>前往下一關 →</button>' : ''}
      <button class="${hasNext ? 'secondary' : 'primary'}-button" data-retry>${win ? '再玩一次' : '再挑戰一次'}</button>
      <button class="secondary-button" data-map>回地圖</button>
      ${!win && !b.isBoss ? `<a class="secondary-button" href="index.html#/${[view.grade, view.subject, baseName(b.r.units[b.i].file)].map(encodeURIComponent).join('/')}">去看重點</a>` : ''}
    </div></section>`);
}

/* ---------- 寶物袋 ---------- */
function renderBag() {
  const cards = Object.values(save.cards).sort((a, b) => a.at - b.at);
  const groups = new Map();
  for (const c of cards) { const k = `${c.grade} · ${c.subject}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(c); }
  const unitTitle = f => { for (const g of INDEX.grades) for (const s of g.subjects) for (const u of s.units) if (u.file === f) return u.title; return ''; };
  show(`<nav class="adv-crumbs"><button class="text-button" data-home>← 回冒險</button></nav>
    <div class="map-head"><span class="map-icon" aria-hidden="true">🎒</span><div><span class="eyebrow">寶物袋</span><h1 class="adv-title">我的知識卡（${cards.length} 張）</h1>
    <p class="map-score">每過一關就能從那一課的重點抽一張卡。</p></div></div>
    ${groups.size ? [...groups].map(([k, cs]) => `<section class="adv-panel"><h2 class="adv-h">${esc(k)}</h2><div class="card-grid">${cs.map(c => `<div class="know-card"><span class="know-tag">${esc(unitTitle(c.unit))}${c.head && c.head !== c.title ? ' · ' + esc(c.head) : ''}</span><h3>${esc(c.title)}${c.sub ? ` <small>${esc(c.sub)}</small>` : ''}</h3><p>${esc(c.body)}</p></div>`).join('')}</div></section>`).join('')
      : '<p class="notice">寶物袋還是空的，快去闖第一關吧！</p>'}`);
  document.title = '寶物袋｜知識島冒險';
}

/* ---------- 操作 ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  const d = t.dataset;
  if (t.id === 'fontToggle') { const on = !document.body.classList.contains('large-type'); document.body.classList.toggle('large-type', on); t.setAttribute('aria-pressed', String(on)); store.set('kr-large', on); return; }
  if (d.hero) { save.hero = d.hero; persist(); return renderHome(); }
  if (d.grade) { view.grade = d.grade; store.set('kr-grade', d.grade); return go(d.grade); }
  if (d.island) return go(view.grade, d.island);
  if (d.home !== undefined) return go(view.grade || INDEX.grades[0].name);
  if (d.bag !== undefined) return go('寶物袋');
  if (d.route) return go(view.grade, view.subject, d.route);
  if (d.map !== undefined) return route();
  if (d.stage !== undefined) return openStage(Number(d.stage));
  if (!battle) return;
  if (d.fight !== undefined || d.retry !== undefined) { if (d.retry !== undefined) return openStage(battle.i).then(startFight); return startFight(); }
  if (d.nextStage !== undefined) return openStage(battle.i + 1);
  if (d.quit !== undefined) { if (battle.answered === 0 || confirm('要撤退回地圖嗎？這一關的進度不會保留。')) route(); return; }
  if (battle.phase !== 'q') return;
  const q = battle.queue[battle.pos];
  if (d.option !== undefined && !battle.submitted) { battle.selected = q.type === 'tf' ? d.option === 'true' : Number(d.option); return renderBattle(); }
  if (d.act === 'submit' && !battle.submitted && battle.selected !== null) return judge(q, battle.selected === q.answer);
  if (d.glyph !== undefined && !battle.submitted && !battle.fixFound) {
    const i = Number(d.glyph);
    if ([...q.sentence][i] === q.wrong) { battle.fixFound = true; renderBattle(); $('.fix-options')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return; }
    battle.fixMiss = i; return judge(q, false);
  }
  if (d.fixopt !== undefined && battle.fixFound && !battle.submitted) { const v = q.options[Number(d.fixopt)]; battle.selected = v; return judge(q, v === q.correct); }
  if (d.act === 'next') return nextTurn();
});
document.addEventListener('change', e => {
  if (e.target.id === 'unlockAll') { save.unlockAll = e.target.checked; persist(); renderMap(); }
});
document.addEventListener('keydown', e => {
  if (!battle || battle.phase !== 'q' || e.target.matches('input')) return;
  const q = battle.queue[battle.pos]; if (!q) return;
  if (battle.submitted) { if (e.key === 'Enter' && !e.target.closest('button')) nextTurn(); return; }
  if (q.type === 'tf' && /^[oO1]$/.test(e.key)) { battle.selected = true; renderBattle(); }
  else if (q.type === 'tf' && /^[xX2]$/.test(e.key)) { battle.selected = false; renderBattle(); }
  else if (q.type === 'mc' && /^[1-6]$/.test(e.key) && q.order[Number(e.key) - 1] !== undefined) { battle.selected = q.order[Number(e.key) - 1]; renderBattle(); }
});

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
