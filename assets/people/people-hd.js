/* 點陣人物精緻版（本站自己加的，不是從 Agent 辦公室複製來的）：不改 people-sprites.js，只在畫出來的時候加工。 */
// 人物精緻版：把 16×20 的人物放大成 32×40，頭的邊角修圓，眼睛加大加反光，加腮紅、嘴巴，瀏海和衣服加一階陰影。
// 頭的黑框 2 像素粗，身體和手腳的黑框收成 1 像素（不然手腳只剩一團黑）。plainFace = 沒有套表情時才畫小嘴巴
window.PEOPLE_HD = function (rows, colors, plainFace) {
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
  // 身體的黑框收細：頭以下的黑框從 2 像素收成 1 像素，讓出來的地方補上旁邊的顏色，
  // 手、腳這種只有 1 格寬的地方才不會被黑框蓋住，看起來一團黑
  // 頭的黑框維持 2 像素；舉手時手臂會伸到頭旁邊，那一段只處理衣服顏色和最外側的手
  const ink = c => c === 'K', cloth = c => 'CcQqPp'.includes(c);
  const fill = (c, x, y) => c !== 'K' && c !== '.' && (y >= 24 || cloth(c) || (c === 'S' && (x < 6 || x > 25)));
  for (const [dx, dy] of [[1, 0], [0, 1]]) {
    const S0 = G.map(r => r.slice()), s = (x, y) => (S0[y] && S0[y][x]) || '.';
    for (let y = 0; y < H * 2; y++) for (let x = 0; x < W * 2; x++) {
      if (!ink(s(x, y))) continue;
      const a = s(x - dx, y - dy), b = s(x + dx, y + dy);
      if (fill(a, x, y) && ink(b)) G[y][x] = a;                                    // 左／上是顏色：往右／下長一格
      else if (fill(b, x, y) && ink(a) && s(x - 2 * dx, y - 2 * dy) === '.') G[y][x] = b; // 最外圈的左／上黑框：往外長一格
    }
  }
  const rgb = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)), mixc = (a, b, t) => { const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }, col = Object.assign({}, colors);
  col['1'] = mixc(col.S, '#ec6a78', .45); col['2'] = mixc(col.S, '#5a2a2a', .45); col['3'] = mixc(col.C || '#888888', '#000000', .22); col['4'] = mixc(col.P || '#555555', '#000000', .25); col['5'] = mixc(col.S, col.s || '#000000', .7);
  // 陰影：瀏海或帽子正下方的皮膚、衣服和褲子靠右下黑框的一排
  for (let y = 0; y < H * 2; y++) for (let x = 0; x < W * 2; x++) {
    const c = G[y][x], up = at2(x, y - 1), rt = at2(x + 1, y), dn = at2(x, y + 1);
    if (c === 'S' && y < 16 && up !== 'S' && up !== 's' && up !== '5' && up !== '.') put(x, y, '5');
    else if (c === 'S' && rt === 'K' && y < 22) put(x, y, '5');
    else if (c === 'C' && (rt === 'K' || dn === 'K')) put(x, y, '3');
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
