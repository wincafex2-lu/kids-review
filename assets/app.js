'use strict';
/* 學習複習小書：所有內容都來自 data/ 底下的單元檔，程式不寫死任何年級、科目或單元。
   data/index.json 由 tools/build-index.mjs 自動產生。版面沿用「讀一課」複習小書的樣式。 */

const $ = s => document.querySelector(s);
const { store, esc } = KR;
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const DEFAULT_CAT = { mc: '選擇', tf: '是非', fix: '改錯字', group: '題組' };
const catOf = q => q.cat || DEFAULT_CAT[q.type];
const ALL = '混合';
const ROUND_SIZES = [10, 20, 0];

// 錯題本在 common.js（KR.wrong），和其他頁面共用

let INDEX = null;
const unitCache = new Map();
const state = { grade: null, subject: null, scope: store.get('kr-scope', ''), mode: 'review', unit: null };
let practice = { filter: 'mix', size: store.get('kr-round', 10) };
let run = null;
let confirmClear = false;

/* ---------- 資料 ---------- */
const baseName = f => f.split('/').pop().replace(/\.json$/, '');
function loadUnit(meta) {
  if (!unitCache.has(meta.file)) {
    unitCache.set(meta.file, KR.loadUnitFile(meta.file).then(u => {
      u.meta = meta;
      // 抽題單位：一般題目一題一個；題組整組一起抽
      u.draws = (u.questions || []).map((q, i) => {
        const key = `${meta.file}#${i}`;
        if (q.type === 'group') return (q.items || []).map((s, j) => ({ ...s, key: `${key}.${j}`, cat: catOf(q), passage: q.passage, groupKey: key, unit: u }));
        return [{ ...q, key, cat: catOf(q), unit: u }];
      });
      return u;
    }));
  }
  return unitCache.get(meta.file);
}
const gradeObj = () => INDEX.grades.find(g => g.name === state.grade);
const subjectObj = () => gradeObj()?.subjects.find(s => s.name === state.subject);
const allUnits = () => subjectObj()?.units || [];
const terms = () => [...new Set(allUnits().map(u => u.term).filter(Boolean))];
const scopedUnits = () => allUnits().filter(u => !state.scope || u.term === state.scope);
const unitMeta = () => allUnits().find(u => baseName(u.file) === state.unit);
const countQ = draws => draws.reduce((n, d) => n + d.length, 0);
const scopeLabel = () => state.scope ? state.scope + '範圍' : '全部範圍';

/* ---------- 路由：#/年級/科目/單元或混合/練習 ---------- */
function go(unit = state.unit, mode = state.mode, grade = state.grade, subject = state.subject) {
  const h = '#/' + [grade, subject, unit || '', mode === 'practice' ? '練習' : ''].filter(Boolean).map(encodeURIComponent).join('/');
  // 網址沒變時瀏覽器不會觸發 hashchange（例如切換範圍時），要自己重新整理畫面
  if (location.hash === h) route(); else location.hash = h;
}
function route() {
  const p = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const g = INDEX.grades.find(x => x.name === p[0]) || INDEX.grades.find(x => x.name === store.get('kr-grade')) || INDEX.grades[0];
  if (!g) { $('#reader').innerHTML = '<p class="loading">還沒有任何單元。把單元檔放進 data/年級/科目/ 就會出現。</p>'; return; }
  const s = g.subjects.find(x => x.name === p[1]) || g.subjects.find(x => x.name === store.get('kr-subject')) || g.subjects[0];
  const changed = state.grade !== g.name || state.subject !== s.name;
  state.grade = g.name; state.subject = s.name;
  store.set('kr-grade', g.name); store.set('kr-subject', s.name);
  if (state.scope && !terms().includes(state.scope)) state.scope = '';
  state.mode = p[3] === '練習' || p[2] === '練習' ? 'practice' : 'review';
  let u = p[2] && p[2] !== '練習' ? p[2] : null;
  const list = scopedUnits();
  if (u !== ALL && !allUnits().some(x => baseName(x.file) === u)) u = null;
  if (u === ALL && state.mode !== 'practice') u = null;
  if (!u) u = state.mode === 'practice' ? ALL : (list[0] ? baseName(list[0].file) : null);
  if (changed || state.unit !== u) { run = null; practice.filter = 'mix'; }
  state.unit = u;
  render();
}

/* ---------- 側欄 ---------- */
function unitNum(meta) {
  const f = baseName(meta.file);
  const m = f.match(/^第(\d+)/);
  if (m) return String(Number(m[1])).padStart(2, '0');
  if (/^補充/.test(f) || meta.term === '補充') return '選讀';
  if (/^閱讀/.test(f)) return '閱讀';
  if (/^語文/.test(f)) return '語文';
  return f.slice(0, 2);
}
function renderSidebar() {
  const g = gradeObj();
  $('#subjectSwitch').innerHTML = g.subjects.map(s => `<button data-subject="${esc(s.name)}" aria-pressed="${s.name === state.subject}">${esc(s.name)}</button>`).join('');
  $('#gradeSwitch').innerHTML = INDEX.grades.map(x => `<button data-grade="${esc(x.name)}" aria-pressed="${x.name === state.grade}">${esc(x.name)}</button>`).join('');
  const ts = terms();
  const sc = $('#scopeSwitch');
  sc.hidden = ts.length < 2;
  sc.innerHTML = ['', ...ts].map(t => `<button data-scope="${esc(t)}" aria-pressed="${state.scope === t}">${t ? esc(t) : '全部'}</button>`).join('');
  document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === state.mode)));
  $('#scopeCaption').textContent = `${state.subject} · ${scopeLabel()}`;
  $('#navLabel').textContent = `${state.subject} · ${state.grade}`;
  const list = scopedUnits();
  const items = state.mode === 'practice' ? [{ all: true }, ...list.filter(u => u.questions)] : list;
  $('#lessons').innerHTML = items.map(u => u.all
    ? `<button class="lesson-button" data-unit="${ALL}" aria-current="${state.unit === ALL}"><span class="num">混合</span><span>${esc(scopeLabel())}一起練</span></button>`
    : `<button class="lesson-button" data-unit="${esc(baseName(u.file))}" aria-current="${state.unit === baseName(u.file)}"><span class="num">${esc(unitNum(u))}</span><span>${esc(u.title)}</span></button>`).join('')
    || '<p class="search-empty">這個範圍還沒有單元。</p>';
  const cur = document.querySelector('.lesson-button[aria-current="true"]');
  if (cur && window.innerWidth <= 650) cur.scrollIntoView({ block: 'nearest', inline: 'center' });
}

/* ---------- 重點複習 ---------- */
// 多字詞的注音一個字一格，中間用細直線隔開，避免連在一起看錯
const zySplit = z => String(z).trim().split(/[\s　]+/).map(x => `<span>${esc(x)}</span>`).join('<i aria-hidden="true"></i>');
const splitList = s => String(s ?? '').split(/[、；]/).map(x => x.trim()).filter(Boolean);
function blockBody(b) {
  switch (b.kind) {
    case 'text': return `<div class="summary"><p>${esc(b.body ?? b.text ?? '')}</p></div>`;
    case 'points': return `<ul class="focus-list">${(b.items || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
    case 'words': return `<div class="phrase-grid">${(b.items || []).map(w => `<div class="vocab-card phrase-card"><div class="char-line word-line"><h3>${esc(w.word)}</h3>${w.zhuyin ? `<span class="zhuyin zy-split">${zySplit(w.zhuyin)}</span>` : ''}</div>${w.meaning ? `<p class="phrase-meaning">${esc(w.meaning)}</p>` : ''}${w.example ? `<p class="example"><span>例句</span>${esc(w.example)}</p>` : ''}</div>`).join('')}</div>`;
    case 'qa': return (b.items || []).map((x, i) => `<div class="quiz"><p class="quiz-question"><span>${i + 1}.</span>${esc(x.q)}</p>${x.hint ? `<p class="choice-label">${esc(x.hint)}</p>` : ''}<details><summary>看答案</summary><div class="answer"><p>${esc(x.a)}</p>${x.why ? `<p class="explanation">${esc(x.why)}</p>` : ''}</div></details></div>`).join('');
    case 'table': return tableBody(b);
    default: return `<p>${esc(b.body ?? '')}</p>`;
  }
}
// 例詞與解釋：意思欄若寫成「詞：解釋。詞：解釋。」就每個例詞配一行解釋；否則例詞標籤＋整段意思
function exampleRows(words, meaning) {
  const m = String(meaning ?? '');
  const pos = words.map(w => m.indexOf(w + '：'));
  if (words.length && pos.every((p, i) => p >= 0 && (i === 0 || p > pos[i - 1]))) {
    return `<div class="example-rows">${words.map((w, i) => {
      const text = m.slice(pos[i] + w.length + 1, i + 1 < words.length ? pos[i + 1] : undefined).trim();
      return `<div class="example-row"><span class="example-chip">${esc(w)}</span><span class="meaning">${esc(text)}</span></div>`;
    }).join('')}</div>`;
  }
  return `<div class="example-words">${words.map(w => `<span>${esc(w)}</span>`).join('')}</div>${m ? `<p class="meaning">${esc(m)}</p>` : ''}`;
}
function tableBody(b) {
  const cols = b.columns || [], rows = b.rows || [];
  // 生字表：字／注音／例詞／意思 → 生字卡
  if (cols.length >= 3 && /^字$/.test(cols[0]) && /注音/.test(cols[1])) {
    return `<div class="vocab-grid">${rows.map(r => `<div class="vocab-card"><div class="char-line"><span class="character">${esc(r[0])}</span><span class="zhuyin">${esc(r[1])}</span></div>${exampleRows(splitList(r[2]), r[3])}</div>`).join('')}</div>`;
  }
  // 兩到三欄的辨字表 → 對照卡（第一欄是標題，最後一欄是提示）
  if (cols.length === 2 || cols.length === 3) {
    return rows.map(r => {
      const label = cols.length === 3 ? r[0] : '';
      const items = splitList(cols.length === 3 ? r[1] : r[0]);
      const tip = r[cols.length - 1];
      return `<div class="comparison">${label ? `<div class="comparison-label"><span class="${label.length === 1 ? 'character' : ''}">${esc(label)}</span></div>` : ''}<div class="comparison-items">${items.map(v => `<div class="compare-item"><p class="word">${esc(v)}</p></div>`).join('')}</div>${tip ? `<p class="tip"><strong>${esc(cols[cols.length - 1])}</strong>　${esc(tip)}</p>` : ''}</div>`;
    }).join('');
  }
  return `<div style="overflow-x:auto"><table class="plain-table"><thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
async function renderReview() {
  const meta = unitMeta();
  if (!meta) { $('#reader').innerHTML = '<p class="loading">目前沒有可閱讀的單元。</p>'; return; }
  $('#reader').innerHTML = '<p class="loading">打開單元中…</p>';
  const u = await loadUnit(meta);
  if (state.mode !== 'review' || unitMeta() !== meta) return;
  const blocks = (u.review || []);
  const sections = blocks.map((b, i) => ({ id: 'sec' + (i + 1), title: b.heading || ['重點', '語詞', '問答', '整理'][['text', 'words', 'qa', 'table'].indexOf(b.kind)] || '重點', body: blockBody(b) }));
  const list = scopedUnits(), idx = list.indexOf(meta);
  const prev = list[idx - 1], next = list[idx + 1];
  $('#reader').innerHTML = `
    <div class="lesson-meta">${esc(state.grade)} · ${esc(state.subject)}${u.term ? ' · ' + esc(u.term) : ''}</div>
    <h2 class="lesson-title">${esc(u.title)}</h2>
    ${u.subtitle ? `<p class="section-lead">${esc(u.subtitle)}</p>` : ''}
    ${u.note ? `<p class="notice">${esc(u.note)}</p>` : ''}
    ${sections.length > 1 ? `<nav class="section-nav" aria-label="本課段落">${sections.map(s => `<a href="#${s.id}" data-jump="${s.id}">${esc(s.title)}</a>`).join('')}</nav>` : ''}
    ${sections.map((s, i) => `<section class="study-section" id="${s.id}"><h2><span class="section-number">${String(i + 1).padStart(2, '0')}</span>${esc(s.title)}</h2>${s.body}</section>`).join('')
      || '<p class="notice">這個單元的重點整理還沒放進來，可以先到「題庫練習」做題目。</p>'}
    ${meta.questions ? `<div class="math-actions" style="justify-content:flex-start"><button class="primary-button" data-practice-unit="${esc(baseName(meta.file))}">練習這一課（${meta.questions} 題）</button></div>` : ''}
    ${u.source ? `<div class="sources"><p>整理依據：${esc(u.source)}</p></div>` : ''}
    <div class="page-controls">
      <button data-unit="${prev ? esc(baseName(prev.file)) : ''}" ${prev ? '' : 'disabled'}>← ${prev ? esc(prev.title) : '上一課'}</button>
      <button data-unit="${next ? esc(baseName(next.file)) : ''}" ${next ? '' : 'disabled'}>${next ? esc(next.title) : '下一課'} →</button>
    </div>`;
  document.title = `${u.title}｜${state.subject}・${state.grade}`;
}

/* ---------- 題庫練習 ---------- */
async function practiceUnits() {
  const metas = state.unit === ALL ? scopedUnits() : [unitMeta()].filter(Boolean);
  return Promise.all(metas.filter(m => m.questions).map(loadUnit));
}
async function drawPool(filter = practice.filter) {
  const us = await practiceUnits();
  let draws = us.flatMap(u => u.draws);
  if (filter !== 'mix') draws = draws.filter(d => d[0].cat === filter);
  return draws;
}
const examPlan = () => INDEX.config.exam?.[state.subject] || null;
async function startRound(kind = 'normal') {
  confirmClear = false;
  let draws;
  if (kind === 'wrong') {
    const w = KR.wrong.all();
    draws = (await drawPool('mix')).map(d => d.filter(q => w.has(q.key))).filter(d => d.length);
    draws = shuffle(draws);
  } else if (kind === 'exam') {
    const pool = await drawPool('mix'), plan = examPlan();
    draws = [];
    if (plan) for (const [c, n] of Object.entries(plan)) {
      const picked = []; let got = 0;
      for (const d of shuffle(pool.filter(d => d[0].cat === c))) { if (got >= n) break; picked.push(d); got += d.length > 1 ? 1 : 1; }
      draws.push(...picked);
    } else draws = shuffle(pool).slice(0, INDEX.config.examDefault || 20);
  } else {
    const pool = shuffle(await drawPool());
    const limit = practice.size || Infinity;
    draws = []; let n = 0;
    for (const d of pool) { if (n >= limit) break; draws.push(d); n += d.length; }
  }
  const questions = draws.flat().map(q => ({ ...q, order: q.options ? shuffle(q.options.map((_, i) => i)) : null }));
  run = { kind, unit: state.unit, scope: state.scope, questions, pos: 0, selected: null, submitted: false, score: 0, responses: [], fixFound: false, fixMiss: null };
  renderPractice();
}
async function wrongCount() {
  const us = await practiceUnits();
  const w = KR.wrong.all();
  return us.flatMap(u => u.draws.flat()).filter(q => w.has(q.key)).length;
}
async function renderPractice() {
  const meta = state.unit === ALL ? null : unitMeta();
  const title = meta ? meta.title : `${scopeLabel()}混合練習`;
  if (!run || run.unit !== state.unit || run.scope !== state.scope) { await startRound('normal'); return; }
  const pool = await drawPool('mix');
  const cats = [...new Set(pool.map(d => d[0].cat))];
  const wc = await wrongCount();
  const plan = examPlan();
  const planDesc = plan ? Object.entries(plan).filter(([c]) => cats.includes(c)).map(([c, n]) => `${c} ${n}`).join('、') : '';
  const body = !run.questions.length ? '<p class="notice">這個題型在這個範圍沒有題目，換一個題型試試看。</p>' : run.done ? finishMarkup(wc) : questionMarkup();
  $('#reader').innerHTML = `
    <div class="lesson-meta">${esc(state.grade)} · ${esc(state.subject)}題庫 · ${esc(scopeLabel())}</div>
    <h2 class="lesson-title">${esc(title)}</h2>
    <p class="practice-note">原創練習題 · 非學校考題、非命題預測</p>
    <div class="math-bank-info"><span>此範圍 ${countQ(pool)} 題</span><span>${cats.length} 種題型 · 每回隨機抽題</span></div>
    <div class="exam-filters" role="group" aria-label="選擇題型">
      <button data-filter="mix" aria-pressed="${run.kind === 'normal' && practice.filter === 'mix'}">綜合</button>
      ${cats.map(c => `<button data-filter="${esc(c)}" aria-pressed="${run.kind === 'normal' && practice.filter === c}">${esc(c)}</button>`).join('')}
      ${state.unit === ALL && plan ? `<button data-round="exam" aria-pressed="${run.kind === 'exam'}">模擬考一回</button>` : ''}
    </div>
    <div class="exam-filters" role="group" aria-label="每回題數">${ROUND_SIZES.map(n => `<button data-size="${n}" aria-pressed="${practice.size === n}">${n ? `每回 ${n} 題` : '全部題目'}</button>`).join('')}</div>
    <p class="exam-format-note">${run.kind === 'exam' ? `模擬考依考卷題型出題：${esc(planDesc)}。` : '選好後按「確認答案」才判分；改錯字點了就判分。'}切換題型或題數會重新開始一回。</p>
    ${body}
    <div class="math-local-note"><p>此範圍錯題本：${wc} 題</p>${wc && run.kind !== 'wrong' ? '<button class="text-button" data-round="wrong">改練錯題</button>' : ''}${KR.wrong.all().size ? (confirmClear ? ' <span class="clear-confirm">確定要清空全部錯題嗎？ <button class="text-button" id="clearWrongYes">確定清空</button> <button class="text-button" id="clearWrongNo">取消</button></span>' : ' <button class="text-button" id="clearWrong">清空全部錯題</button>') : ''}<small>錯題只存在這台裝置的瀏覽器，不會上傳。答對一次就會從錯題本移除。</small></div>`;
  document.title = `${title}｜${state.subject}練習・${state.grade}`;
}
function questionMarkup() {
  const q = run.questions[run.pos], n = run.questions.length;
  const done = run.pos + (run.submitted ? 1 : 0);
  const head = `<div class="math-progress"><span>${run.kind === 'wrong' ? '錯題重練' : run.kind === 'exam' ? '模擬考' : esc(practice.filter === 'mix' ? '綜合' : practice.filter)} · 第 ${run.pos + 1} / ${n} 題</span><span>已答對 ${run.score} 題</span></div>
    <div class="progress-track" role="progressbar" aria-label="練習進度" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${done}"><span style="width:${done / n * 100}%"></span></div>`;
  const tags = `<p class="math-tags"><span>${esc(q.unit.title)}</span><span>${esc(q.cat)}</span>${q.type === 'fix' ? '<span>點錯字 → 選正字</span>' : ''}</p>`;
  const ctx = q.passage ? `<div class="exam-context"><strong>${esc(q.cat)}</strong><p>${esc(q.passage)}</p></div>` : q.context ? `<div class="exam-context"><strong>題目資料</strong><p>${esc(q.context)}</p></div>` : '';
  let main = '';
  if (q.type === 'fix') main = fixMarkup(q);
  else {
    const opts = q.type === 'tf' ? [[true, '○', '對'], [false, '×', '錯']] : q.order.map((oi, k) => [oi, String.fromCharCode(65 + k), q.options[oi]]);
    // 選項都很短（單字、注音）時並排成一列，減少高度
    const maxLen = Math.max(...opts.map(o => [...String(o[2])].length));
    const short = q.type !== 'tf' && maxLen <= 4, medium = q.type !== 'tf' && !short && maxLen <= 10;
    const oneChar = short && opts.every(o => [...String(o[2])].length === 1);
    main = `<h3 id="qprompt" tabindex="-1">${esc(q.q)}</h3>
      <div class="math-options ${q.type === 'tf' ? 'truefalse-options' : ''} ${short ? 'grid-options' + (oneChar ? '' : ' grid-words') : medium ? 'two-col-options' : ''}" role="group" aria-label="選擇答案">${opts.map(([v, letter, text]) => {
        const isAns = v === q.answer, isSel = run.selected === v;
        return `<button class="math-option ${isSel ? 'selected' : ''} ${run.submitted && isAns ? 'correct-option' : ''} ${run.submitted && isSel && !isAns ? 'wrong-option' : ''}" data-option="${String(v)}" aria-pressed="${isSel}" ${run.submitted ? 'disabled' : ''}><span class="option-letter">${letter}</span><span class="${short ? (oneChar ? 'fix-char' : 'short-text') : ''}">${esc(text)}</span>${run.submitted && isAns ? '<span class="answer-marker">正解</span>' : ''}</button>`;
      }).join('')}</div>
      ${run.submitted ? '' : `<button class="primary-button math-submit" data-act="submit" ${run.selected === null ? 'disabled' : ''}>確認答案</button>`}`;
  }
  return `${head}<section class="math-question exam-question">${tags}${ctx}${main}${run.submitted ? feedbackMarkup(q) : ''}</section>`;
}
function fixMarkup(q) {
  const chars = [...q.sentence];
  const wrongIdx = chars.indexOf(q.wrong);
  const glyphs = chars.map((ch, i) => {
    if (!/\p{Script=Han}/u.test(ch)) return `<span class="glyph-punctuation">${esc(ch)}</span>`;
    const cls = (run.fixFound || run.submitted) && i === wrongIdx ? 'glyph-found' : run.fixMiss === i ? 'glyph-tried' : '';
    return `<button class="glyph-button ${cls}" data-glyph="${i}" ${run.fixFound || run.submitted ? 'disabled' : ''} aria-label="${esc(ch)}，第${i + 1}個字">${esc(ch)}</button>`;
  }).join('');
  let step2 = '';
  if (run.fixFound) {
    step2 = `<p class="glyph-success" role="status">找對了！「${esc(q.wrong)}」是錯字。</p><p class="correction-step"><span>2</span>選出正確的字</p>
      <div class="math-options fix-options" role="group" aria-label="選出正確的字">${q.order.map((oi, k) => {
        const v = q.options[oi], isAns = v === q.correct, isSel = run.selected === v;
        return `<button class="math-option ${run.submitted && isAns ? 'correct-option' : ''} ${run.submitted && isSel && !isAns ? 'wrong-option' : ''}" data-fixopt="${oi}" ${run.submitted ? 'disabled' : ''}><span class="option-letter">${String.fromCharCode(65 + k)}</span><span class="fix-char">${esc(v)}</span>${run.submitted && isAns ? '<span class="answer-marker">正解</span>' : ''}</button>`;
      }).join('')}</div>`;
  }
  return `<h3 id="qprompt" tabindex="-1">下面這句話有一個錯字，先點出錯字。</h3>
    <div class="correction-stages"><p class="correction-step"><span>1</span>點出句子裡的錯字</p>
    <div class="glyph-sentence" role="group" aria-label="點選句中的錯字">${glyphs}</div>${step2}</div>`;
}
function feedbackMarkup(q) {
  const last = run.responses[run.responses.length - 1];
  let right;
  if (q.type === 'tf') right = q.answer ? '○ 對' : '× 錯';
  else if (q.type === 'fix') right = `「${q.wrong}」改成「${q.correct}」`;
  else right = q.options[q.answer];
  const corrected = q.type === 'fix' ? `<p class="corrected-sentence">訂正後：${esc(q.sentence.replace(q.wrong, q.correct))}</p>` : '';
  const missMsg = q.type === 'fix' && run.fixMiss !== null && !run.fixFound ? '錯字不是這個字，綠色框的才是。' : '';
  return `<div class="math-feedback ${last?.ok ? 'is-correct' : 'is-wrong'}" id="feedback" tabindex="-1" role="status">
      <strong>${last?.ok ? '答對了！' : '這題可以再訂正。'}</strong>${missMsg ? `<p>${missMsg}</p>` : ''}
      <p>正確答案：${esc(right)}</p>${corrected}
      ${q.why ? `<div class="math-explanation">${esc(q.why)}</div>` : ''}
    </div>
    <button class="primary-button math-next" data-act="next">${run.pos + 1 === run.questions.length ? '查看本回成果' : '下一題 →'}</button>`;
}
function finishMarkup(wc) {
  const total = run.questions.length, by = {};
  for (const r of run.responses) { by[r.cat] = by[r.cat] || [0, 0]; by[r.cat][1]++; if (r.ok) by[r.cat][0]++; }
  const wrongs = run.responses.filter(r => !r.ok);
  return `<section class="math-finish"><span class="finish-symbol" aria-hidden="true">✓</span><h3>這一回完成了！</h3>
    <p class="math-score">${run.score}<span> / ${total} 題答對</span></p>
    <div class="exam-breakdown">${Object.entries(by).map(([c, [a, b]]) => `<span>${esc(c)} ${a} / ${b}</span>`).join('')}</div>
    <p>看懂理由，比只記選項更重要。可以再練一回，或回到單元重點。</p>
    <div class="math-actions"><button class="primary-button" data-round="${run.kind === 'exam' ? 'exam' : 'normal'}">再練一回</button><button class="secondary-button" data-round="wrong" ${wc ? '' : 'disabled'}>錯題重練（${wc} 題）</button><button class="secondary-button" data-mode="review">回重點複習</button></div></section>
    ${wrongs.length ? `<div class="study-section"><h2><span class="section-number">訂正</span>這回答錯的題目</h2>${wrongs.map(r => `<div class="quiz"><p class="quiz-question">${esc(r.q.q || r.q.sentence)}</p><div class="answer"><p>你的答案：${esc(r.yours)}　正確答案：<strong>${esc(r.right)}</strong></p>${r.q.why ? `<p class="explanation">${esc(r.q.why)}</p>` : ''}</div></div>`).join('')}</div>` : ''}`;
}
function record(q, ok, yours, right) {
  run.responses.push({ q, ok, cat: q.cat, yours, right });
  if (ok) run.score++;
  KR.wrong.mark(q.key, !ok);
  run.submitted = true;
}
function submit() {
  const q = run.questions[run.pos];
  if (run.submitted || run.selected === null) return;
  const ok = run.selected === q.answer;
  const show = v => q.type === 'tf' ? (v ? '對' : '錯') : q.options[v];
  record(q, ok, show(run.selected), show(q.answer));
  renderPractice().then(() => $('#feedback')?.focus());
}
function pickGlyph(i) {
  const q = run.questions[run.pos];
  if (run.submitted || run.fixFound) return;
  const ch = [...q.sentence][i];
  if (ch === q.wrong) { run.fixFound = true; renderPractice().then(() => $('.fix-options')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })); return; }
  run.fixMiss = i;
  record(q, false, `點了「${ch}」`, `「${q.wrong}」改成「${q.correct}」`);
  renderPractice().then(() => $('#feedback')?.focus());
}
function pickFix(oi) {
  const q = run.questions[run.pos];
  if (run.submitted || !run.fixFound) return;
  const v = q.options[oi];
  run.selected = v;
  record(q, v === q.correct, `「${q.wrong}」改成「${v}」`, `「${q.wrong}」改成「${q.correct}」`);
  renderPractice().then(() => $('#feedback')?.focus());
}
function nextQ() {
  if (run.pos + 1 >= run.questions.length) run.done = true;
  else { run.pos++; run.selected = null; run.submitted = false; run.fixFound = false; run.fixMiss = null; }
  renderPractice().then(() => ($('#qprompt') || $('#reader')).focus({ preventScroll: false }));
  $('#reader').scrollIntoView({ block: 'start' });
}

/* ---------- 畫面 ---------- */
function render() {
  renderSidebar();
  if (state.mode === 'practice') renderPractice(); else renderReview();
}

document.addEventListener('click', e => {
  const b = e.target.closest('button,a[data-jump]'); if (!b) return;
  const d = b.dataset;
  if (d.jump) { e.preventDefault(); document.getElementById(d.jump)?.scrollIntoView({ behavior: 'smooth' }); return; }
  if (d.grade) { const g = INDEX.grades.find(x => x.name === d.grade); const s = g.subjects.find(x => x.name === state.subject) || g.subjects[0]; return go(null, state.mode, g.name, s.name); }
  if (d.subject) return go(null, state.mode, state.grade, d.subject);
  if (d.scope !== undefined) { state.scope = d.scope; store.set('kr-scope', d.scope); run = null; const keep = state.unit === ALL || scopedUnits().some(u => baseName(u.file) === state.unit); if (keep) return render(); const first = scopedUnits()[0]; return go(state.mode === 'practice' ? ALL : (first ? baseName(first.file) : null)); }
  if (d.mode) { return go(d.mode === 'practice' ? (unitMeta()?.questions ? state.unit : ALL) : (state.unit === ALL ? null : state.unit), d.mode); }
  if (d.unit !== undefined) { if (!d.unit) return; go(d.unit); $('#reader').scrollIntoView({ block: 'start' }); return; }
  if (d.practiceUnit) { run = null; return go(d.practiceUnit, 'practice'); }
  if (b.id === 'fontToggle') { const on = !document.body.classList.contains('large-type'); document.body.classList.toggle('large-type', on); b.setAttribute('aria-pressed', String(on)); store.set('kr-large', on); return; }
  // 不用 window.confirm()：Artifact 沙盒會擋掉，改成頁面內確認
  if (b.id === 'clearWrong') { confirmClear = true; return renderPractice(); }
  if (b.id === 'clearWrongNo') { confirmClear = false; return renderPractice(); }
  if (b.id === 'clearWrongYes') { confirmClear = false; KR.wrong.clear(); return renderPractice(); }
  if (!run) return;
  if (d.filter) { practice.filter = d.filter; return startRound('normal'); }
  if (d.size !== undefined) { practice.size = Number(d.size); store.set('kr-round', practice.size); return startRound(run.kind === 'exam' ? 'normal' : run.kind); }
  if (d.round) return startRound(d.round);
  if (d.option !== undefined && !run.submitted) { const q = run.questions[run.pos]; run.selected = q.type === 'tf' ? d.option === 'true' : Number(d.option); return renderPractice(); }
  if (d.glyph !== undefined) return pickGlyph(Number(d.glyph));
  if (d.fixopt !== undefined) return pickFix(Number(d.fixopt));
  if (d.act === 'submit') return submit();
  if (d.act === 'next') return nextQ();
});
document.addEventListener('keydown', e => {
  if (!run || run.done || state.mode !== 'practice' || e.target.matches('input')) return;
  const q = run.questions[run.pos]; if (!q) return;
  if (run.submitted) { if (e.key === 'Enter' && !e.target.closest('button')) nextQ(); return; }
  if (q.type === 'tf' && /^[oO1]$/.test(e.key)) { run.selected = true; renderPractice(); }
  else if (q.type === 'tf' && /^[xX2]$/.test(e.key)) { run.selected = false; renderPractice(); }
  else if (q.type === 'mc' && /^[1-6]$/.test(e.key) && q.order[Number(e.key) - 1] !== undefined) { run.selected = q.order[Number(e.key) - 1]; renderPractice(); }
  else if (q.type === 'fix' && run.fixFound && /^[1-6]$/.test(e.key) && q.order[Number(e.key) - 1] !== undefined) pickFix(q.order[Number(e.key) - 1]);
});
// 側欄固定在畫面上時，在側欄滑動或滾輪不要帶動右邊內容（iOS Safari 不支援用 CSS 擋），
// 只有單元清單本身可以捲，捲到頭或尾也不會再傳到整頁。
(() => {
  const side = $('.sidebar'); let y0 = 0;
  side.addEventListener('touchstart', e => { y0 = e.touches[0].clientY; }, { passive: true });
  side.addEventListener('touchmove', e => {
    if (e.touches.length > 1 || getComputedStyle(side).position !== 'sticky') return;
    const list = e.target.closest('#lessons');
    if (list && list.scrollHeight > list.clientHeight + 1) {
      const dy = e.touches[0].clientY - y0;
      const atTop = list.scrollTop <= 0, atEnd = list.scrollTop + list.clientHeight >= list.scrollHeight - 1;
      if ((dy > 0 && atTop) || (dy < 0 && atEnd)) e.preventDefault();
      return;
    }
    e.preventDefault();
  }, { passive: false });
  // 電腦滑鼠滾輪也一樣：在側欄滾動只捲單元清單，不捲右邊
  side.addEventListener('wheel', e => {
    if (e.ctrlKey || getComputedStyle(side).position !== 'sticky') return;
    const list = e.target.closest('#lessons');
    if (list && list.scrollHeight > list.clientHeight + 1) {
      const atTop = list.scrollTop <= 0, atEnd = list.scrollTop + list.clientHeight >= list.scrollHeight - 1;
      if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atEnd)) e.preventDefault();
      return;
    }
    e.preventDefault();
  }, { passive: false });
})();

/* ---------- 啟動 ---------- */
(async () => {
  if (store.get('kr-large', false)) { document.body.classList.add('large-type'); $('#fontToggle').setAttribute('aria-pressed', 'true'); }
  try {
    INDEX = await KR.loadIndex();
    const title = INDEX.config.siteTitle || '學習複習小書';
    $('#brandTitle').innerHTML = `讀一課<span>${esc(title)}</span>`;
    $('#introEyebrow').textContent = `${INDEX.grades.map(g => g.name.replace('年級', '')).join('・')}年級｜線上閱讀版 · 共 ${INDEX.totalQuestions} 題`;
    window.addEventListener('hashchange', route);
    route();
  } catch (err) {
    $('#reader').innerHTML = `<p class="loading">暫時無法載入複習內容（${esc(err.message)}）。請重新整理頁面再試一次。</p>`;
  }
})();
