/* 洞穴大冒險：遊戲流程。遊戲本體（關卡用的小遊戲）在 assets/games/games-core.js，要先載入；洞穴場景圖在 cave-art.js。
   題目讀 data/index.json 和各單元檔；錯題和複習小書共用錯題本（localStorage kr-wrong-v1，題目代號「單元檔#題號」）。 */
'use strict';
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
// 錯題本、讀題庫在 common.js（KR），和其他頁面共用
const wrongBook = KR.wrong.all, markWrong = KR.wrong.mark;
const DEF_CAT = { mc: '選擇', tf: '是非' };
const unitCache = new Map();
function loadUnit(meta, grade, subject) {
  if (!unitCache.has(meta.file)) unitCache.set(meta.file, KR.loadUnitFile(meta.file).then(d => {
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
KR.loadIndex().then(ix => { INDEX = ix; showSetup(); })
  .catch(() => { $('#setup').hidden = false; $('#setup').innerHTML = '<h2>題目讀取失敗</h2><p>請檢查網路，再重新整理頁面。</p>'; });
