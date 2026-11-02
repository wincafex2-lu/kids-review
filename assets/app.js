'use strict';
/* 小朋友複習小書：所有內容都來自 data/ 底下的單元檔，程式不寫死任何年級、科目或單元。
   data/index.json 由 tools/build-index.mjs 自動產生。 */

const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const KEYS = ['①', '②', '③', '④', '⑤', '⑥'];
const DEFAULT_CAT = { mc: '選擇', tf: '是非', fix: '改錯字', group: '題組' };
const catOf = q => q.cat || DEFAULT_CAT[q.type];

let INDEX = null;
const unitCache = new Map();
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } },
};
let wrongBook = new Set(store.get('kr-wrong-v1', []));
const saveWrong = () => store.set('kr-wrong-v1', [...wrongBook]);

let view = { grade: null, subject: null, tab: 'read', term: '' };
let setup = { ranges: new Set(), cat: 'mix', count: 10 };
let run = null;

/* ---------- 資料 ---------- */
const dataUrl = file => 'data/' + file.split('/').map(encodeURIComponent).join('/');
async function loadUnit(meta) {
  if (!unitCache.has(meta.file)) {
    unitCache.set(meta.file, fetch(dataUrl(meta.file)).then(r => { if (!r.ok) throw Error(meta.file); return r.json(); }).then(u => {
      u.meta = meta;
      u.items = (u.questions || []).map((q, i) => {
        const key = `${meta.file}#${i}`;
        if (q.type === 'group') return { ...q, key, unit: u, cat: catOf(q), items: q.items.map((s, j) => ({ ...s, key: `${key}.${j}`, unit: u, groupKey: key, passage: q.passage, groupCat: catOf(q) })) };
        return { ...q, key, unit: u, cat: catOf(q) };
      });
      return u;
    }));
  }
  return unitCache.get(meta.file);
}
const grade = () => INDEX.grades.find(g => g.name === view.grade);
const subject = () => grade()?.subjects.find(s => s.name === view.subject);
const units = () => subject()?.units || [];

/* ---------- 路由 ---------- */
function parseHash() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  return { g: parts[0], s: parts[1], u: parts[2], tab: parts[3] };
}
function go(...parts) { location.hash = '#/' + parts.filter(Boolean).map(encodeURIComponent).join('/'); }
async function route() {
  run = null;
  const h = parseHash();
  const g = INDEX.grades.find(x => x.name === h.g) || INDEX.grades.find(x => x.name === store.get('kr-grade')) || INDEX.grades[0];
  if (!g) { $('#app').innerHTML = '<div class="card empty">還沒有任何單元。把單元檔放進 data/年級/科目/ 就會出現。</div>'; return; }
  const s = g.subjects.find(x => x.name === h.s) || g.subjects.find(x => x.name === store.get('kr-subject')) || g.subjects[0];
  if (view.grade !== g.name || view.subject !== s.name) setup.ranges = new Set();
  view.grade = g.name; view.subject = s.name;
  store.set('kr-grade', g.name); store.set('kr-subject', s.name);
  if (h.u) {
    const meta = s.units.find(u => baseName(u.file) === h.u);
    if (meta) return renderUnit(meta);
  }
  view.tab = h.tab === 'practice' || h.u === 'practice' ? 'practice' : 'read';
  renderSubject();
}
const baseName = f => f.split('/').pop().replace(/\.json$/, '');

/* ---------- 首頁：年級／科目／單元 ---------- */
function pickers() {
  const g = grade();
  return `
  <section class="card stack">
    <div><div class="label">年級</div><div class="seg" role="group" aria-label="年級">${INDEX.grades.map(x => `<button data-go-grade="${esc(x.name)}" aria-pressed="${x.name === view.grade}">${esc(x.name)}</button>`).join('')}</div></div>
    <div><div class="label">科目</div><div class="seg" role="group" aria-label="科目">${g.subjects.map(x => `<button data-go-subject="${esc(x.name)}" aria-pressed="${x.name === view.subject}">${esc(x.name)}</button>`).join('')}</div></div>
  </section>`;
}
function renderSubject() {
  const list = units();
  const tabs = `<div class="tabs" role="tablist">
      <button role="tab" data-tab="read" aria-selected="${view.tab === 'read'}">讀重點</button>
      <button role="tab" data-tab="practice" aria-selected="${view.tab === 'practice'}">做練習</button></div>`;
  let body;
  const terms = [...new Set(list.map(u => u.term).filter(Boolean))];
  if (view.term && !terms.includes(view.term)) view.term = '';
  const termBar = terms.length > 1 ? `<div class="seg" role="group" aria-label="範圍">${['', ...terms].map(t => `<button data-term="${esc(t)}" aria-pressed="${(view.term || '') === t}">${t || '全部'}</button>`).join('')}</div>` : '';
  if (view.tab === 'read') {
    const shown = list.filter(u => !view.term || u.term === view.term);
    body = `${termBar}<div class="units">${shown.map(u => `<a class="unit" href="#/${[view.grade, view.subject, baseName(u.file)].map(encodeURIComponent).join('/')}">
        <span class="t">${esc(u.title)}${u.subtitle ? `<span class="hint"> ${esc(u.subtitle)}</span>` : ''}</span>
        <span class="m">${u.term ? `<span class="term">${esc(u.term)}</span> ` : ''}${u.reviewBlocks ? '重點整理' : '只有練習題'} · ${u.questions} 題</span></a>`).join('')}</div>`;
  } else body = '<div id="practice"></div>';
  $('#app').innerHTML = `<div class="stack">${pickers()}${tabs}${body}</div>`;
  if (view.tab === 'practice') renderPractice();
}

/* ---------- 單元頁：讀重點 ---------- */
async function renderUnit(meta) {
  $('#app').innerHTML = '<div class="loading">打開單元中…</div>';
  const u = await loadUnit(meta);
  const blocks = (u.review || []).map(renderBlock).join('') || '<div class="card empty">這一課的重點整理還沒放進來，可以先做練習。</div>';
  $('#app').innerHTML = `<div class="stack">
    <div class="crumb"><a href="#/${[view.grade, view.subject].map(encodeURIComponent).join('/')}">${esc(view.grade)} · ${esc(view.subject)}</a></div>
    <h2>${esc(u.title)}</h2>
    ${u.subtitle ? `<div class="sub">${esc(u.subtitle)}</div>` : ''}
    ${u.source || u.term ? `<div class="hint">${esc([u.source, u.term && u.term + '範圍'].filter(Boolean).join(' · '))}</div>` : ''}
    ${u.note ? `<div class="note">${esc(u.note)}</div>` : ''}
    ${blocks}
    <div class="row">${meta.questions ? `<button class="primary" data-practice-unit="${esc(meta.file)}">練習這一課（${meta.questions} 題）</button>` : ''}</div>
  </div>`;
}
function renderBlock(b) {
  const h = b.heading ? `<h3>${esc(b.heading)}</h3>` : '';
  switch (b.kind) {
    case 'points': return `<section class="card block">${h}<ul>${(b.items || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>`;
    case 'words': return `<section class="card block">${h}<div class="words">${(b.items || []).map(w => `<div class="word"><b>${esc(w.word)}${w.zhuyin ? `<small class="zy">${esc(w.zhuyin)}</small>` : ''}</b><span>${esc(w.meaning)}${w.example ? `<br><span class="hint">例：${esc(w.example)}</span>` : ''}</span></div>`).join('')}</div></section>`;
    case 'table': return `<section class="card block">${h}<div class="tablewrap"><table><thead><tr>${(b.columns || []).map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${(b.rows || []).map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;
    case 'qa': return `<section class="card block">${h}<div class="qa">${(b.items || []).map(x => `<details><summary>${esc(x.q)}${x.hint ? `<span class="hint">（${esc(x.hint)}）</span>` : ''}</summary><div class="ans"><b>${esc(x.a)}</b>${x.why ? `<span class="hint">${esc(x.why)}</span>` : ''}</div></details>`).join('')}</div></section>`;
    default: return `<section class="card block">${h}<p>${esc(b.body ?? b.text ?? '')}</p></section>`;
  }
}

/* ---------- 練習設定 ---------- */
function examPlan() { return INDEX.config.exam?.[view.subject] || null; }
async function poolFor(files, cat) {
  const metas = units().filter(u => files.has(u.file));
  const us = await Promise.all(metas.map(loadUnit));
  let items = us.flatMap(u => u.items);
  if (cat !== 'mix') items = items.filter(i => i.cat === cat);
  return items;
}
const countQ = items => items.reduce((n, i) => n + (i.type === 'group' ? i.items.length : 1), 0);
async function renderPractice() {
  const list = units();
  if (!setup.ranges.size || ![...setup.ranges].every(f => list.some(u => u.file === f))) setup.ranges = new Set(list.map(u => u.file));
  const cats = new Set();
  for (const u of list) if (setup.ranges.has(u.file)) Object.keys(u.cats).forEach(c => cats.add(c));
  if (setup.cat !== 'mix' && !cats.has(setup.cat)) setup.cat = 'mix';
  const pool = await poolFor(setup.ranges, setup.cat);
  const ids = new Set(list.map(u => u.file));
  const wc = [...wrongBook].filter(k => ids.has(k.split('#')[0])).length;
  const plan = examPlan();
  const planDesc = plan ? Object.entries(plan).filter(([c]) => cats.has(c)).map(([c, n]) => `${c} ${n}`).join('、') : `隨機 ${INDEX.config.examDefault || 20} 題`;
  const el = $('#practice'); if (!el) return;
  el.innerHTML = `<section class="card stack">
    <div><div class="label">範圍（點一下可取消或加回）</div>
      <div class="row">${list.map(u => `<button class="chip" data-range="${esc(u.file)}" aria-pressed="${setup.ranges.has(u.file)}">${esc(u.title)}</button>`).join('')}
      <button class="text" id="allRange">${setup.ranges.size === list.length ? '只留一個' : '全選'}</button>
      ${[...new Set(list.map(u => u.term).filter(Boolean))].map(t => `<button class="text" data-term-range="${esc(t)}">只選${esc(t)}</button>`).join('')}</div></div>
    <div><div class="label">題型</div><div class="seg" role="group" aria-label="題型">
      <button data-cat="mix" aria-pressed="${setup.cat === 'mix'}">綜合</button>
      ${[...cats].map(c => `<button data-cat="${esc(c)}" aria-pressed="${setup.cat === c}">${esc(c)}</button>`).join('')}</div></div>
    <div><div class="label">題數</div><div class="seg" role="group" aria-label="題數">${[10, 20, 0].map(n => `<button data-count="${n}" aria-pressed="${setup.count === n}">${n || '全部'}</button>`).join('')}</div></div>
    <div class="row">
      <button class="primary" id="start" ${pool.length ? '' : 'disabled'}>開始練習</button>
      <button class="ghost" id="exam">模擬考一回</button>
      ${wc ? `<button class="ghost" id="retryWrong">錯題重練（${wc} 題）</button>` : ''}
    </div>
    <div class="hint">這個範圍共有 ${countQ(pool)} 個小題可以抽。模擬考：${esc(planDesc)}。</div>
    ${wrongBook.size ? `<div class="hint">錯題本累計 ${wrongBook.size} 題 <button class="text" id="clearWrong">清空錯題本</button></div>` : ''}
  </section>`;
}

/* ---------- 出題 ---------- */
function prep(it) {
  const c = { ...it };
  if (it.type === 'mc' || it.type === 'fix') c.order = shuffle(it.options.map((_, i) => i));
  if (it.type === 'group') c.items = it.items.map(prep);
  return c;
}
function startRun(items, label) {
  if (!items.length) return;
  run = { label, items: items.map(prep), pos: 0, sub: 0, done: false, score: 0, wrong: [], locked: false, fixPick: null };
  run.total = countQ(run.items);
  renderQuiz();
}
async function startNormal(files = setup.ranges, cat = setup.cat) {
  const pool = await poolFor(files, cat);
  const n = setup.count || pool.length;
  startRun(shuffle(pool).slice(0, n), `${view.subject}練習`);
}
async function startExam() {
  const pool = await poolFor(setup.ranges, 'mix');
  const plan = examPlan();
  let items = [];
  if (plan) { for (const [c, n] of Object.entries(plan)) items.push(...shuffle(pool.filter(i => i.cat === c)).slice(0, n)); }
  else items = shuffle(pool).slice(0, INDEX.config.examDefault || 20);
  startRun(items, `${view.subject}模擬考`);
}
function regroup(flat) {
  const groups = new Map(), out = [];
  for (const it of flat) {
    if (it.groupKey) {
      if (!groups.has(it.groupKey)) { const g = { key: it.groupKey, type: 'group', cat: it.groupCat, passage: it.passage, unit: it.unit, items: [] }; groups.set(it.groupKey, g); out.push(g); }
      groups.get(it.groupKey).items.push(it);
    } else out.push(it);
  }
  return out;
}
async function startWrong() {
  const list = units().filter(u => [...wrongBook].some(k => k.startsWith(u.file + '#')));
  const us = await Promise.all(list.map(loadUnit));
  const flat = us.flatMap(u => u.items.flatMap(i => i.type === 'group' ? i.items : [i])).filter(i => wrongBook.has(i.key));
  startRun(shuffle(regroup(flat)), '錯題重練');
}

/* ---------- 作答畫面 ---------- */
const current = () => { const it = run.items[run.pos]; return it.type === 'group' ? it.items[run.sub] : it; };
function renderQuiz() {
  const it = run.items[run.pos], q = current();
  const answered = countQ(run.items.slice(0, run.pos)) + (it.type === 'group' ? run.sub : 0);
  let body = '';
  if (it.type === 'group') body += `<div class="context"><span class="tag" style="margin-right:8px">${esc(it.cat)}</span>${esc(it.passage)}</div>
      <div class="meta"><span>第 ${run.sub + 1} 小題，共 ${it.items.length} 小題</span></div>`;
  else body += `<div><span class="tag">${esc(q.cat)}</span></div>`;
  if (q.type === 'fix') {
    body += `<p class="q">下面這句話有一個錯字，先點出錯字。</p>
      <div class="chars">${[...q.sentence].map((ch, i) => /\p{Script=Han}/u.test(ch) ? `<button data-ch="${i}">${esc(ch)}</button>` : `<span style="align-self:center">${esc(ch)}</span>`).join('')}</div>
      <div id="fixStep2"></div>`;
  } else {
    if (q.context) body += `<div class="context">${esc(q.context)}</div>`;
    body += `<p class="q">${esc(q.q)}</p>`;
    if (q.type === 'tf') body += `<div class="tf opts"><button class="opt" data-ans="true">○ 對</button><button class="opt" data-ans="false">✕ 錯</button></div>`;
    else body += `<div class="opts">${q.order.map((oi, k) => `<button class="opt" data-ans="${oi}"><span class="k">${KEYS[k]}</span><span>${esc(q.options[oi])}</span></button>`).join('')}</div>`;
  }
  $('#app').innerHTML = `<div class="stack">
    <div class="meta"><span>${esc(run.label)} · ${esc(it.unit.title)}</span><span>第 ${answered + 1} / ${run.total} 題 · 已答對 ${run.score}</span></div>
    <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${run.total}" aria-valuenow="${answered}"><span style="width:${Math.round(answered / run.total * 100)}%"></span></div>
    <section class="card stack">${body}<div id="fb"></div><div class="row" id="nav"><button class="text" id="quit">結束練習</button></div></section>
  </div>`;
  run.locked = false; run.fixPick = null;
}
function record(q, ok, val) {
  if (ok) { run.score++; wrongBook.delete(q.key); } else { run.wrong.push({ q, val }); wrongBook.add(q.key); }
  saveWrong();
}
const isLast = () => { const it = run.items[run.pos]; return (it.type !== 'group' || run.sub === it.items.length - 1) && run.pos === run.items.length - 1; };
function feedback(ok, right, why) {
  $('#fb').innerHTML = `<div class="fb" data-kind="${ok ? 'ok' : 'bad'}"><b>${ok ? '答對了！' : '再想想。正確答案是：' + esc(right)}</b>${why ? `<p>${esc(why)}</p>` : ''}</div>`;
  $('#nav').innerHTML = `<button class="primary" id="next">${isLast() ? '看成績' : '下一題'}</button><button class="text" id="quit">結束練習</button>`;
  $('#next').focus();
}
function answer(val) {
  if (run.locked) return; run.locked = true;
  const q = current(), ok = val === q.answer;
  record(q, ok, val);
  document.querySelectorAll('.opts .opt').forEach(b => { b.disabled = true; const v = q.type === 'tf' ? b.dataset.ans === 'true' : Number(b.dataset.ans); if (v === q.answer) b.dataset.state = 'ok'; else if (v === val) b.dataset.state = 'bad'; });
  feedback(ok, q.type === 'tf' ? (q.answer ? '○ 對' : '✕ 錯') : q.options[q.answer], q.why);
}
function fixPick(idx) {
  if (run.locked) return; const q = current(), ch = [...q.sentence][idx];
  document.querySelectorAll('.chars button').forEach(b => b.disabled = true);
  if (ch !== q.wrong) {
    run.locked = true;
    document.querySelectorAll('.chars button').forEach(b => { const i = Number(b.dataset.ch); if ([...q.sentence][i] === q.wrong) b.dataset.state = 'ok'; else if (i === idx) b.dataset.state = 'bad'; });
    record(q, false, `點了「${ch}」`);
    return feedback(false, `錯字是「${q.wrong}」，應改成「${q.correct}」`, q.why);
  }
  document.querySelector(`.chars button[data-ch="${idx}"]`).dataset.state = 'pick';
  run.fixPick = idx;
  $('#fixStep2').innerHTML = `<p class="hint">找對了！「${esc(ch)}」是錯字。請選出正確的字：</p>
    <div class="opts">${q.order.map((oi, k) => `<button class="opt" data-fix="${oi}"><span class="k">${KEYS[k]}</span><span>${esc(q.options[oi])}</span></button>`).join('')}</div>`;
}
function fixChoose(oi) {
  if (run.locked) return; run.locked = true;
  const q = current(), pick = q.options[oi], ok = pick === q.correct;
  document.querySelectorAll('.opts .opt').forEach(b => { b.disabled = true; const v = q.options[Number(b.dataset.fix)]; if (v === q.correct) b.dataset.state = 'ok'; else if (Number(b.dataset.fix) === oi) b.dataset.state = 'bad'; });
  record(q, ok, `「${q.wrong}」改成「${pick}」`);
  feedback(ok, `「${q.wrong}」改成「${q.correct}」`, q.why);
}
function next() {
  const it = run.items[run.pos];
  if (it.type === 'group' && run.sub < it.items.length - 1) run.sub++; else { run.pos++; run.sub = 0; }
  if (run.pos >= run.items.length) return finish();
  renderQuiz();
}
function describe(q, val) {
  if (q.type === 'tf') return [val ? '對' : '錯', q.answer ? '對' : '錯'];
  if (q.type === 'fix') return [val, `「${q.wrong}」改成「${q.correct}」`];
  return [q.options[val], q.options[q.answer]];
}
function finish() {
  run.done = true;
  const pct = Math.round(run.score / run.total * 100);
  const msg = pct === 100 ? '全部答對，太厲害了！' : pct >= 80 ? '很棒，再把錯的幾題看一遍就更穩了。' : pct >= 60 ? '有進步空間，先讀懂錯題的原因，再練一次。' : '先回去讀重點，再來挑戰一回。';
  $('#app').innerHTML = `<div class="stack">
    <section class="card stack">
      <div class="meta"><span>${esc(run.label)}</span><span>${esc(view.grade)} · ${esc(view.subject)}</span></div>
      <div class="score">${run.score}<small> / ${run.total} 題答對 · ${pct} 分</small></div>
      <p style="margin:0">${msg}</p>
      <div class="row">${run.wrong.length ? `<button class="primary" id="redo">只練這回的錯題（${run.wrong.length}）</button>` : ''}<button class="ghost" id="again">再來一回</button><button class="ghost" id="home">回到練習設定</button></div>
    </section>
    ${run.wrong.length ? `<section class="card wrong"><div class="label">這回答錯的題目</div>${run.wrong.map(w => {
      const [yours, right] = describe(w.q, w.val);
      return `<div class="item">${w.q.passage ? `<div class="hint">${esc(w.q.groupCat)}：${esc(w.q.passage.slice(0, 40))}…</div>` : ''}${w.q.context ? `<div class="hint">${esc(w.q.context)}</div>` : ''}<div class="qq">${esc(w.q.q || w.q.sentence)}</div><div class="aa">你的答案：<s>${esc(yours)}</s>　正確答案：<b>${esc(right)}</b></div>${w.q.why ? `<div class="hint">${esc(w.q.why)}</div>` : ''}</div>`;
    }).join('')}</section>` : ''}
  </div>`;
}

/* ---------- 事件 ---------- */
let lastStart = null;
document.addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  const d = b.dataset;
  if (d.goGrade) { const g = INDEX.grades.find(x => x.name === d.goGrade); const s = g.subjects.find(x => x.name === view.subject) || g.subjects[0]; return go(g.name, s.name, view.tab === 'practice' ? 'practice' : ''); }
  if (d.goSubject) return go(view.grade, d.goSubject, view.tab === 'practice' ? 'practice' : '');
  if (d.tab) return go(view.grade, view.subject, d.tab === 'practice' ? 'practice' : '');
  if (d.range) { if (setup.ranges.has(d.range)) { if (setup.ranges.size > 1) setup.ranges.delete(d.range); } else setup.ranges.add(d.range); return renderPractice(); }
  if (b.id === 'allRange') { const l = units(); setup.ranges = setup.ranges.size === l.length ? new Set([l[0].file]) : new Set(l.map(u => u.file)); return renderPractice(); }
  if (d.term !== undefined) { view.term = d.term; return renderSubject(); }
  if (d.termRange) { setup.ranges = new Set(units().filter(u => u.term === d.termRange).map(u => u.file)); return renderPractice(); }
  if (d.cat) { setup.cat = d.cat; return renderPractice(); }
  if (d.count !== undefined) { setup.count = Number(d.count); return renderPractice(); }
  if (d.practiceUnit) { lastStart = () => startNormal(new Set([d.practiceUnit]), 'mix'); return lastStart(); }
  if (b.id === 'start') { lastStart = () => startNormal(); return lastStart(); }
  if (b.id === 'exam') { lastStart = startExam; return startExam(); }
  if (b.id === 'retryWrong') { lastStart = startWrong; return startWrong(); }
  if (b.id === 'clearWrong') { if (confirm('確定要清空錯題本嗎？')) { wrongBook.clear(); saveWrong(); } return renderPractice(); }
  if (run && !run.done) {
    if (d.ch !== undefined) return fixPick(Number(d.ch));
    if (d.fix !== undefined) return fixChoose(Number(d.fix));
    if (d.ans !== undefined) { const q = current(); return answer(q.type === 'tf' ? d.ans === 'true' : Number(d.ans)); }
    if (b.id === 'next') return next();
  }
  if (b.id === 'quit' || b.id === 'home') { run = null; view.tab = 'practice'; return renderSubject(); }
  if (b.id === 'again' && lastStart) return lastStart();
  if (b.id === 'redo') return startRun(shuffle(regroup(run.wrong.map(w => w.q))), '錯題重練');
});
document.addEventListener('keydown', e => {
  if (!run || run.done) return;
  if (!run.locked) {
    const q = current();
    if (q.type === 'tf' && /^[oO1]$/.test(e.key)) answer(true);
    else if (q.type === 'tf' && /^[xX2]$/.test(e.key)) answer(false);
    else if (q.type === 'mc' && /^[1-6]$/.test(e.key) && q.order[Number(e.key) - 1] !== undefined) answer(q.order[Number(e.key) - 1]);
    else if (q.type === 'fix' && run.fixPick !== null && /^[1-6]$/.test(e.key) && q.order[Number(e.key) - 1] !== undefined) fixChoose(q.order[Number(e.key) - 1]);
  } else if (e.key === 'Enter') next();
});

/* ---------- 字級 ---------- */
const SIZES = [17, 19, 21];
let sizeIdx = store.get('kr-size', 0);
const applySize = () => { document.documentElement.style.setProperty('--base', SIZES[sizeIdx] + 'px'); const b = $('#fontSize'); if (b) b.textContent = '字級 ' + ['A', 'A＋', 'A＋＋'][sizeIdx]; };
applySize();
document.getElementById('fontSize')?.addEventListener('click', e => { e.stopPropagation(); sizeIdx = (sizeIdx + 1) % SIZES.length; store.set('kr-size', sizeIdx); applySize(); });

/* ---------- 啟動 ---------- */
(async () => {
  try {
    INDEX = await fetch('data/index.json', { cache: 'no-cache' }).then(r => { if (!r.ok) throw Error('data/index.json'); return r.json(); });
    const title = INDEX.config.siteTitle || '複習小書';
    document.title = title; $('#brand').textContent = title;
    $('#bankInfo').textContent = `共 ${INDEX.totalQuestions} 小題`;
    window.addEventListener('hashchange', route);
    route();
  } catch (err) {
    $('#app').innerHTML = `<div class="card">內容載入失敗（${esc(err.message)}）。請重新整理頁面再試一次。</div>`;
  }
})();
