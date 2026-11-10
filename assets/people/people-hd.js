/* 點陣人物精緻版（本站自己加的，不是從 Agent 辦公室複製來的）：不改 people-sprites.js，只在畫出來的時候加工。 */
// 人物精緻版：把 16×20 的人物放大成 32×40，邊角修圓，眼睛加大加反光，加腮紅、嘴巴，瀏海和衣服加一階陰影。
// 黑框變成 2 像素粗，和重繪版的怪獸、道具一致。plainFace = 沒有套表情時才畫小嘴巴
window.PEOPLE_HD = function (rows, colors, plainFace) {
  const W = 16, H = 20, g0 = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? '.' : rows[y][x];
  const G = Array.from({ length: H * 2 }, () => Array(W * 2).fill('.'));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const P = g0(x, y), A = g0(x, y - 1), B = g0(x + 1, y), C = g0(x - 1, y), D = g0(x, y + 1);
    G[y * 2][x * 2] = (C === A && C !== D && A !== B) ? A : P; G[y * 2][x * 2 + 1] = (A === B && A !== C && B !== D) ? B : P;
    G[y * 2 + 1][x * 2] = (D === C && D !== B && C !== A) ? C : P; G[y * 2 + 1][x * 2 + 1] = (B === D && B !== A && D !== C) ? D : P;
  }
  const at2 = (x, y) => (G[y] && G[y][x]) || '.', skin = c => c === 'S' || c === 's', put = (x, y, c) => { if (G[y] && x >= 0 && x < W * 2) G[y][x] = c; };
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
  const c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2; const g = c.getContext('2d');
  G.forEach((row, y) => row.forEach((ch, x) => { if (col[ch]) { g.fillStyle = col[ch]; g.fillRect(x, y, 1, 1); } }));
  return c.toDataURL();
};
