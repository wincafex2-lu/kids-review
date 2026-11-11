/* 點陣人物精緻版（本站自己加的，不是從 Agent 辦公室複製來的）：不改 people-sprites.js，只在畫出來的時候加工。 */
// 人物精緻版：把 16×20 的人物放大成 32×40，頭的邊角修圓，眼睛加大加反光，加腮紅、嘴巴，瀏海和衣服加一階陰影。
// 頭的黑框 2 像素粗，身體和手腳的黑框收成 1 像素（不然手腳只剩一團黑）。plainFace = 沒有套表情時才畫小嘴巴
window.PEOPLE_HD = function (rows, colors, plainFace) {
  // 走路時抬起來的那隻腳，原圖是兩格高的一塊黑；放大後變成一大塊黑，所以上面那格補回腿的顏色（看得出是腳縮起來）
  for (const x0 of [4, 9]) if (rows[17] && rows[17].slice(x0, x0 + 3) === 'KKK' && rows[18].slice(x0, x0 + 3) === 'KKK' && rows[19].slice(x0, x0 + 3) === '...' && !'K.'.includes(rows[17][14 - x0])) {
    rows = rows.slice(); rows[17] = rows[17].slice(0, x0 + 1) + rows[17][14 - x0] + rows[17].slice(x0 + 2);
  }
  const W = 16, H = 20, g0 = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? '.' : rows[y][x];
  const G = Array.from({ length: H * 2 }, () => Array(W * 2).fill('.'));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const P = g0(x, y), A = g0(x, y - 1), B = g0(x + 1, y), C = g0(x - 1, y), D = g0(x, y + 1);
    // 只有頭把邊角修圓；身體、手腳照原圖放大，走路和舉手每一格的形狀才不會被修得忽大忽小
    const head = y < 12 && x >= 2 && x <= 13, ok = c => head && !'CcQq'.includes(P) && !'CcQq'.includes(c);
    G[y * 2][x * 2] = (C === A && C !== D && A !== B && ok(A)) ? A : P; G[y * 2][x * 2 + 1] = (A === B && A !== C && B !== D && ok(B)) ? B : P;
    G[y * 2 + 1][x * 2] = (D === C && D !== B && C !== A && ok(C)) ? C : P; G[y * 2 + 1][x * 2 + 1] = (B === D && B !== A && D !== C && ok(D)) ? D : P;
  }
  const at2 = (x, y) => (G[y] && G[y][x]) || '.', skin = c => c === 'S' || c === 's', put = (x, y, c) => { if (G[y] && x >= 0 && x < W * 2) G[y][x] = c; };
  // 身體的黑框收細：原圖每個黑格放大後是 2×2，靠著顏色的那一半讓給顏色，另一半留黑，
  // 所以頭以下的黑線都只剩 1 像素，手、腳這種只有 1 格寬的地方才不會被黑框蓋成一團黑。
  // 頭的黑框維持 2 像素；舉手時手臂會伸到頭旁邊，那一段只算衣服顏色和最外側的手。
  const cloth = c => 'CcQqPp'.includes(c), isCol = c => c !== 'K' && c !== '.';
  const tint = (x, y) => { const c = g0(x, y); return c !== 'K' && c !== '.' && (y >= 12 || cloth(c) || (c === 'S' && (x < 3 || x > 12))) ? c : ''; };
  const pure = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (g0(x, y) !== 'K') continue;
    const L = tint(x - 1, y), R = tint(x + 1, y), U = tint(x, y - 1), D = tint(x, y + 1), h = ['', ''], v = ['', ''];
    if (!L && !R && !U && !D) { pure.push([x, y]); continue; }   // 四邊都沒有顏色：轉角，等一下再處理
    if (L && R && U && D) continue;                              // 四邊都是顏色：衣服上的鈕扣這類小點，保留原樣
    if (L && R) { if (x < 8) { h[0] = 'k'; h[1] = R; } else { h[0] = L; h[1] = 'k'; } }   // 兩邊都是顏色（手臂和身體中間那條線）：黑線留在外側那一半
    else if (L) { h[0] = L; h[1] = 'k'; } else if (R) { h[0] = 'k'; h[1] = R; }
    // 橫線：身體的線（衣服下襬、手的下緣）黑色留在下半格，整條才會一樣高；下巴那條線黑色留在上半格，和頭的黑框接在一起
    if (y >= 12 ? U : !D && U) { v[0] = U; v[1] = 'k'; } else if (D) { v[0] = 'k'; v[1] = D; }
    for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
      const a = h[sx], b = v[sy], c = a === 'k' || b === 'k' ? '' : a || b;
      if (c) G[y * 2 + sy][x * 2 + sx] = c;
    }
  }
  // 轉角的黑格：旁邊兩條線都讓出半格的那一小格跟著讓；完全碰不到顏色的黑色（線疊在一起多出來的）拿掉
  const fill = [], drop = [];
  for (const [x, y] of pure) for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
    const hx = x * 2 + sx, hy = y * 2 + sy, dx = sx ? 1 : -1, dy = sy ? 1 : -1, a = at2(hx + dx, hy), b = at2(hx, hy + dy);
    if (g0(x + dx, y) === 'K' && g0(x, y + dy) === 'K' && isCol(a) && isCol(b)) fill.push([hx, hy, a]);
  }
  fill.forEach(([x, y, c]) => put(x, y, c));
  for (const [x, y] of pure) if (y >= 11) for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
    const hx = x * 2 + sx, hy = y * 2 + sy; if (at2(hx, hy) !== 'K') continue;
    let near = false; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (isCol(at2(hx + i, hy + j))) near = true;
    if (!near) drop.push([hx, hy]);
  }
  drop.forEach(([x, y]) => put(x, y, '.'));
  const rgb = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)), mixc = (a, b, t) => { const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }, col = Object.assign({}, colors);
  col['1'] = mixc(col.S, '#ec6a78', .45); col['2'] = mixc(col.S, '#5a2a2a', .45); col['3'] = mixc(col.C || '#888888', '#000000', .22); col['4'] = mixc(col.P || '#555555', '#000000', .25); col['5'] = mixc(col.S, col.s || '#000000', .7);
  // 陰影：瀏海或帽子正下方的皮膚、衣服和褲子靠右下黑框的一排
  for (let y = 0; y < H * 2; y++) for (let x = 0; x < W * 2; x++) {
    const c = G[y][x], up = at2(x, y - 1), rt = at2(x + 1, y), dn = at2(x, y + 1);
    if (c === 'S' && y < 16 && up !== 'S' && up !== 's' && up !== '5' && up !== '.') put(x, y, '5');
    else if (c === 'S' && rt === 'K' && y < 22) put(x, y, '5');
    else if (c === 'C' && ((rt === 'K' && !'K.'.includes(at2(x - 4, y))) || dn === 'K')) put(x, y, '3'); // 手臂那種只有 4 格寬的地方不加陰影，不然整條都暗掉
    else if (c === 'P' && (rt === 'K' || dn === 'K')) put(x, y, '4');
  }
  // 眼睛：臉上單獨一點的黑點，放大成 2×3 並加一點反光，外側加腮紅
  const eyes = [];
  for (let y = 5; y <= 8; y++) for (let x = 3; x <= 12; x++) if (g0(x, y) === 'K' && skin(g0(x - 1, y)) && skin(g0(x + 1, y)) && skin(g0(x, y + 1)) && g0(x, y - 1) !== 'K') eyes.push([x, y]);
  if (eyes.length === 2) {
    eyes.forEach(([x, y]) => { const X = x * 2, Y = y * 2; for (let yy = Y - 1; yy <= Y + 1; yy++) { put(X, yy, 'K'); put(X + 1, yy, 'K'); } put(X, Y - 1, 'I'); const bx = x < 8 ? X - 2 : X + 2; if (skin(at2(bx, Y + 3)) || at2(bx, Y + 3) === '5') { put(bx, Y + 3, '1'); put(bx + 1, Y + 3, '1'); } });
    if (plainFace) { const my = eyes[0][1] * 2 + 5; if (skin(at2(15, my)) && skin(at2(16, my))) { put(15, my, '2'); put(16, my, '2'); } }
  }
  // 皇冠（正面）：原圖兩邊的尖角是斜一格出去的，放大後會往外歪；改成直邊、三個尖角重畫
  const cr = rows.findIndex((r, i) => i < 4 && r.slice(3, 13) === 'Y.KKYYKK.Y');
  if (cr >= 0) {
    const y0 = cr * 2, tips = [[[6, 7], [15, 16], [24, 25]], [[6, 8], [14, 17], [23, 25]], [[6, 9], [13, 18], [22, 25]]];
    const gold = (x, y) => y >= 4 ? (y <= 7 && x >= 6 && x <= 25) : y >= 1 && tips[y - 1].some(([a, b]) => x >= a && x <= b);
    col['6'] = mixc(col.Y || '#ffcc4d', '#ffffff', .55);
    for (let y = 0; y < 8; y++) for (let x = 4; x <= 27; x++) {
      let near = false; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (gold(x + dx, y + dy)) near = true;
      let ch = '.';
      if (gold(x, y)) ch = y === 7 ? 'y' : (y >= 5 && y <= 6 && x >= 14 && x <= 17) ? 'R' : (y < 4 && tips[y - 1].some(([a]) => x === a)) || (y === 4 && (x < 10 || (x > 12 && x < 19) || x > 21)) ? '6' : 'Y';
      else if (near || (y >= 1 && (gold(x + 2, y) || gold(x - 2, y))) || y === 2 && x > 5 && x < 26) ch = 'K';
      put(x, y0 + y, ch);
    }
  }
  const c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2; const g = c.getContext('2d');
  G.forEach((row, y) => row.forEach((ch, x) => { if (col[ch]) { g.fillStyle = col[ch]; g.fillRect(x, y, 1, 1); } }));
  return c.toDataURL();
};
