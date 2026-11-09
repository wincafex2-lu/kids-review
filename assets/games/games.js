/* 最後一刻揭曉：遊戲流程（範圍選擇、出題、記分）。遊戲本體在 games-core.js，要先載入。
   是非（OX 翻板、吊橋）、選擇（開票、保險箱、送貨、寶藏門、火車、信鴿、實驗室，國語字音字形另有拆炸彈、賽馬、扭蛋機、火箭、釣魚、打怪獸）、題組（小偵探）。
   題目讀 data/index.json 和各單元檔；錯題和複習小書共用錯題本（localStorage kr-wrong-v1，題目代號「單元檔#題號」，題組小題「單元檔#題號.小題」）。 */
'use strict';
/* ---------- 遊戲流程 ---------- */
const KINDS = { '全部': null, '是非': 'tf', '選擇': 'mc', '題組': 'group' };
const POOL = { tf: [OX, BRIDGE], mc: [VOTE, SAFE, TRUCK, LOCK, TRAIN, DOVE, LAB, ...SIX], group: [DETECT] };
const ALL = [...POOL.tf, ...POOL.mc, ...POOL.group];
const KIND_OF = g => Object.keys(POOL).find(k => POOL[k].includes(g));
// 隨機時，選擇題會優先挑最搭科目／題型的遊戲（BEST），其他時候各遊戲都可能出任何科目的選擇題
const BEST = { vote: '社會', safe: '數學', truck: '數學應用題', lock: '國語語詞理解', train: '國語句型', dove: '國語課文理解', lab: '自然' };
const FOR = { ox: '是非題', bridge: '是非題', detect: '題組／閱讀測驗', ...Object.fromEntries(Object.entries(BEST).map(([k, v]) => [k, `選擇題・最常配${v}`])) };
for (const id of ['bomb', 'race', 'gacha', 'rocket', 'fish', 'boss']) FOR[id] = '選擇題・國語字音字形';
const SIX_CATS = ['同音字', '形近字', '字音／多音', '選詞填句'];
const fitsG = (g, q) => !g.fits || g.fits(q);
// 依科目、題型挑最適合的遊戲，一半機會換別的（同一種不連續出現）
function prefOf(q) { if (q.k !== 'mc') return null; if (q.s === '國語' && SIX_CATS.includes(q.c)) { const c = SIX.filter(g => g.fits(q) && g !== run.last); if (c.length) return pick(c); } if (q.s === '數學') return q.c === '應用題' ? TRUCK : SAFE; if (q.s === '自然') return LAB; if (q.s === '社會') return VOTE; return { 語詞理解: LOCK, 句型: TRAIN, 課文理解: DOVE }[q.c] || VOTE; }
const bags = {};
function pickGame(q) {
  if (sel.game !== '隨機') return ALL.find(g => g.id === sel.game);
  const last = run.last, p = prefOf(q);
  if (p && p !== last && Math.random() < .55) return p;
  let b = bags[q.k]; if (!b || !b.some(g => fitsG(g, q))) b = bags[q.k] = shuffle(POOL[q.k]);
  let i = b.findIndex(g => fitsG(g, q) && g !== last); if (i < 0) i = b.findIndex(g => fitsG(g, q));
  return b.splice(i, 1)[0];
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
const filtered = onlyWrong => { const kind = kindOf(), w = wrongBook(), G = ALL.find(g => g.id === sel.game); return POOLQ.filter(q => (!kind || q.k === kind) && (!G || (G.fits ? G.fits(q) && q.s === '國語' && SIX_CATS.includes(q.c) : true)) && (!onlyWrong || hasWrong(q, w))); };
function newScene() { stage.innerHTML = ''; stage.classList.remove('shake'); const sc = el('div', 'scene'); stage.append(sc); return sc; }

function showSetup() {
  document.body.classList.remove('playing'); fit();
  $('#qcard').hidden = true; $('#verdict').hidden = true;
  $('#qn').textContent = 0; $('#qt').textContent = '–'; $('#score').textContent = 0;
  attract(); renderSetup();
}
// 指定遊戲時只依題型篩題，不限科目；說明照實寫
function gameNote(g, n, unitWord) {
  if (g.fits) return `指定「${g.name}」：只出國語的同音字、形近字、字音／多音、選詞填句（四個短選項的題目），共 ${n} ${unitWord}。`;
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
    <p class="small">想闖關打魔王？到 <a href="cave.html">⛏️ 洞穴大冒險</a>。想練改錯字？到 <a href="spy.html">🕵️ 找出間諜</a>。</p>
    ${chips('grade', pair(grades), '年級')}
    ${terms.length > 1 ? chips('term', [['', '全部'], ...pair(terms)], '範圍') : ''}
    ${chips('subject', pair(['全部', ...SUBJECTS]), '科目')}
    <div class="row"><label class="lab" for="unitSel">單元</label><select id="unitSel"><option value="">全部單元</option>${units.map(x => `<option value="${esc(x.meta.file)}" ${x.meta.file === sel.unit ? 'selected' : ''}>${sel.subject === '全部' ? x.subject + '・' : ''}${esc(x.meta.title)}</option>`).join('')}</select></div>
    ${chips('cat', pair(Object.keys(KINDS)), '題型')}
    ${chips('n', [[5, '5 題'], [10, '10 題'], [20, '20 題']], '題數')}
    <div class="row"><span class="lab">遊戲</span><button type="button" class="opt" data-k="game" data-v="隨機" aria-pressed="${sel.game === '隨機'}">隨機</button>${ALL.map(g => `<button type="button" class="opt" data-k="game" data-v="${g.id}" aria-pressed="${sel.game === g.id}">${g.name}</button>`).join('')}</div>
    <p class="small" id="avail">題目讀取中…</p>
    <div class="row"><button type="button" class="go" id="start" disabled>開始玩</button><button type="button" class="opt" id="startWrong" disabled>只練錯題</button></div>
    <div class="games">${ALL.map(g => `<div><b>${g.name}</b><span class="for">${FOR[g.id]}</span>${g.how || '怪獸出現！隨機要選砲彈、武器或勇者去攻擊。'}</div>`).join('')}<a class="spylink" href="cave.html"><b>⛏️ 洞穴大冒險</b><span class="for">是非・選擇，闖四關打魔王</span>闖過四個洞穴關卡收集寶石，最後答對題目打倒洞穴大魔王。點這裡進入 →</a><a class="spylink" href="spy.html"><b>🕵️ 找出間諜</b><span class="for">國語改錯字</span>隊員舉牌排成句子，找出舉錯字的間諜。點這裡進入 →</a></div>
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
