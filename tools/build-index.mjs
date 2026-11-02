// 掃描 data/ 底下所有單元檔，檢查格式，產生 data/index.json。
// 用法：node tools/build-index.mjs        （有錯誤時會列出檔名與原因，並以失敗結束）
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DATA = join(ROOT, 'data');
const errors = [];
const err = (file, msg) => errors.push(`✗ ${file}：${msg}`);

const config = JSON.parse(await readFile(join(DATA, 'config.json'), 'utf8'));
const TYPES = ['mc', 'tf', 'fix', 'group'];

async function walk(dir) {
  const out = [];
  for (const name of (await readdir(dir)).sort()) {
    if (name.startsWith('.') || name.startsWith('_')) continue;
    const p = join(dir, name);
    if ((await stat(p)).isDirectory()) out.push(...await walk(p));
    else if (name.endsWith('.json') && dir !== DATA) out.push(p);
  }
  return out;
}

function checkQuestion(file, q, where, inGroup) {
  if (!q || typeof q !== 'object') return err(file, `${where} 不是題目物件`);
  if (!TYPES.includes(q.type)) return err(file, `${where} 的 type 必須是 ${TYPES.join('/')}，現在是「${q.type}」`);
  if (inGroup && (q.type === 'group' || q.type === 'fix')) return err(file, `${where} 題組裡只能放 mc 或 tf`);
  if (q.type === 'mc') {
    if (!q.q) err(file, `${where} 缺少題目 q`);
    if (!Array.isArray(q.options) || q.options.length < 2) return err(file, `${where} options 至少要 2 個選項`);
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) err(file, `${where} answer 要是選項的編號（從 0 開始），現在是 ${q.answer}`);
    if (new Set(q.options).size !== q.options.length) err(file, `${where} 選項有重複`);
  } else if (q.type === 'tf') {
    if (!q.q) err(file, `${where} 缺少題目 q`);
    if (typeof q.answer !== 'boolean') err(file, `${where} 是非題 answer 要寫 true 或 false`);
  } else if (q.type === 'fix') {
    if (!q.sentence || !q.wrong || !q.correct) return err(file, `${where} 改錯字要有 sentence、wrong、correct`);
    const n = [...q.sentence].filter(c => c === q.wrong).length;
    if (n !== 1) err(file, `${where} 錯字「${q.wrong}」在句子裡出現 ${n} 次，必須剛好 1 次`);
    if (!Array.isArray(q.options) || !q.options.includes(q.correct)) err(file, `${where} options 必須包含正確字「${q.correct}」`);
    if (q.wrong === q.correct) err(file, `${where} 錯字和正確字一樣`);
  } else if (q.type === 'group') {
    if (!q.passage) err(file, `${where} 題組缺少 passage（文章或情境）`);
    if (!Array.isArray(q.items) || !q.items.length) return err(file, `${where} 題組缺少 items`);
    q.items.forEach((it, i) => checkQuestion(file, it, `${where} 第 ${i + 1} 小題`, true));
  }
}

const tree = new Map();
let total = 0;
for (const path of await walk(DATA)) {
  const rel = relative(DATA, path).split(sep);
  const file = rel.join('/');
  if (rel.length !== 3) { err(file, '單元檔要放在 data/年級/科目/ 底下'); continue; }
  const [grade, subject, fname] = rel;
  let u;
  try { u = JSON.parse(await readFile(path, 'utf8')); } catch (e) { err(file, `JSON 格式錯誤（${e.message}）`); continue; }
  if (!u.title) err(file, '缺少 title（單元名稱）');
  if (u.review !== undefined && !Array.isArray(u.review)) err(file, 'review 要是陣列');
  (Array.isArray(u.review) ? u.review : []).forEach((b, i) => {
    const w = `重點第 ${i + 1} 塊`;
    if (!['points', 'words', 'text', 'table'].includes(b?.kind)) return err(file, `${w} 的 kind 必須是 points/words/text/table，現在是「${b?.kind}」`);
    if ((b.kind === 'points' || b.kind === 'words') && !Array.isArray(b.items)) err(file, `${w} 缺少 items 清單`);
    if (b.kind === 'words' && Array.isArray(b.items) && b.items.some(x => !x?.word)) err(file, `${w} 每個語詞都要有 word`);
    if (b.kind === 'text' && !b.body) err(file, `${w} 缺少 body`);
    if (b.kind === 'table' && (!Array.isArray(b.columns) || !Array.isArray(b.rows))) err(file, `${w} 表格要有 columns 和 rows`);
  });
  if (u.questions !== undefined && !Array.isArray(u.questions)) { err(file, 'questions 要是陣列'); continue; }
  const qs = u.questions || [];
  qs.forEach((q, i) => checkQuestion(file, q, `第 ${i + 1} 題`, false));
  const counts = {};
  let n = 0;
  for (const q of qs) { const c = q.cat || ({ mc: '選擇', tf: '是非', fix: '改錯字', group: '題組' })[q.type]; counts[c] = (counts[c] || 0) + 1; n += q.type === 'group' ? (q.items?.length || 0) : 1; }
  total += n;
  const m = fname.match(/^(\d+)/);
  if (!tree.has(grade)) tree.set(grade, new Map());
  const g = tree.get(grade);
  if (!g.has(subject)) g.set(subject, []);
  g.get(subject).push({
    file, title: u.title || fname, order: u.order ?? (m ? Number(m[1]) : 999),
    source: u.source || '', term: u.term || '',
    reviewBlocks: (u.review || []).length, questions: n, cats: counts,
  });
}

const byOrder = list => (a, b) => {
  const ia = list.indexOf(a), ib = list.indexOf(b);
  return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.localeCompare(b, 'zh-Hant');
};
const grades = [...tree.keys()].sort(byOrder(config.gradeOrder || [])).map(gname => ({
  name: gname,
  subjects: [...tree.get(gname).keys()].sort(byOrder(config.subjectOrder || [])).map(sname => ({
    name: sname,
    units: tree.get(gname).get(sname).sort((a, b) => a.order - b.order || a.file.localeCompare(b.file)),
  })),
}));

if (errors.length) {
  console.error(`題庫檢查發現 ${errors.length} 個問題：\n` + errors.join('\n'));
  process.exit(1);
}
const index = { generated: new Date().toISOString(), totalQuestions: total, config, grades };
await writeFile(join(DATA, 'index.json'), JSON.stringify(index, null, 1) + '\n');
const units = grades.reduce((n, g) => n + g.subjects.reduce((m, s) => m + s.units.length, 0), 0);
console.log(`✓ 檢查通過：${grades.length} 個年級、${units} 個單元、${total} 小題，已產生 data/index.json`);
