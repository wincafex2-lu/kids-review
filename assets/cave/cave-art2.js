/* 洞穴大冒險重繪版背景（原創，程式逐點畫）。320×200，比 cave-art.js 細一倍。
   要放在 cave-art.js 之後載入：只換 ART.BG 的洞穴背景，地面、懸崖、鐵軌、架子的位置都和原本一樣（座標乘 2）。
   規則：放選項和角色的地面、水面一律平塗，細節只留在遠處的岩壁。 */
(() => {
  if (!ART.HD) return;
  const { Cv, mix } = ART.HD, { BG } = ART, INK = '#1d1b2e';

  // 岩壁：大石塊，對比壓低；glow(x, y) 回傳 [顏色, 0–1]，讓燈和水晶附近亮一點
  function wall(P, y0, y1, pal, line, glow) {
    // 不規則的石塊（最近點分格），不排成一列一列，才像天然岩壁
    const gw = 24, gh = 15, cols = Math.ceil(320 / gw) + 2, rows = Math.ceil((y1 - y0) / gh) + 2, seeds = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) seeds.push([(i - 1 + .15 + P.R() * .7) * gw, y0 + (j - 1 + .15 + P.R() * .7) * gh, pal[P.R() * pal.length | 0]]);
    const steps = {};
    for (let y = y0; y < y1; y++) for (let x = 0; x < 320; x++) {
      const ci = Math.floor(x / gw) + 1, cj = Math.floor((y - y0) / gh) + 1; let d1 = 1e9, d2 = 1e9, best = null;
      for (let j = cj - 1; j <= cj + 1; j++) for (let i = ci - 1; i <= ci + 1; i++) { if (i < 0 || j < 0 || i >= cols || j >= rows) continue; const sd = seeds[j * cols + i], d = Math.hypot((x - sd[0]) * .8, (y - sd[1]) * 1.25); if (d < d1) { d2 = d1; d1 = d; best = sd; } else if (d < d2) d2 = d; }
      const e = d2 - d1; let c = e < 1.3 ? mix(line, best[2], .3) : e < 3.6 ? (y < best[1] ? mix(best[2], '#ffffff', .12) : mix(best[2], '#000000', .2)) : best[2];
      if (glow && e >= 1.3) { const [gc, ga] = glow(best[0], best[1]), q = Math.min(5, Math.round(ga * 10)); if (q > 0) { const k = c + gc + q; c = steps[k] || (steps[k] = mix(c, gc, q * .1)); } }   // 整顆石頭一起變亮，不用細點混色
      P.set(x, y, c);
    }
  }
  // 鐘乳石（從 y0 往下垂）
  function stal(P, x, y0, len, w, col, hi) { for (let k = 0; k < len; k++) { const t = 1 - k / len, half = Math.max(.5, w / 2 * t * (.6 + .4 * t)); P.rect(Math.round(x - half), y0 + k, Math.max(1, Math.round(half * 2)), 1, col); P.set(Math.round(x - half), y0 + k, hi); } }
  function ceiling(P, n, maxLen, col, hi, y0 = 0) { for (let i = 0; i < n; i++) stal(P, 6 + (i + P.R() * .8) * (310 / n), y0, 6 + (P.R() * maxLen | 0), 5 + (P.R() * 7 | 0), col, hi); }
  // 石筍（底在 yb）
  function mite(P, x, yb, len, w, ramp) { for (let k = 0; k < len; k++) { const t = (k + 1) / len, half = Math.max(.5, w / 2 * t); for (let xx = Math.round(x - half); xx < x + half; xx++) P.set(xx, yb - len + k, xx < x - half * .3 ? ramp[2] : xx > x + half * .4 ? ramp[0] : ramp[1]); } }
  // 光暈（抖色）
  function halo(P, cx, cy, r, col, a = .6) { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { const d = Math.hypot(x + .5 - cx, y + .5 - cy); if (d < r) P.veil(x, y, col, (1 - d / r) ** 1.6 * a); } }
  // 發光水晶簇：幾根稜柱，左亮右暗
  function crystal(P, x, yb, s, col, glowA = .45) {
    const lite = mix(col, '#ffffff', .6), dark = mix(col, '#1a1040', .45);
    if (glowA) halo(P, x + 2 * s, yb - 9 * s, 20 * s, mix(col, '#1a1040', .35), glowA);
    [[-7, 12, 3.2, -.25], [0, 21, 4.2, 0], [7, 15, 3.4, .22], [12, 8, 2.4, .4]].forEach(([dx, hh, ww, lean]) => {
      const bx = x + dx * s, h2 = hh * s, w2 = Math.max(1.5, ww * s), tx = bx + lean * h2, ty = yb - h2;
      P.poly([[bx - w2, yb], [tx - w2, ty + w2 * 1.2], [tx, ty], [tx, yb]], lite); P.poly([[tx, ty], [tx + w2, ty + w2 * 1.2], [bx + w2, yb], [tx, yb]], col);
      P.line(bx + w2 - 1, yb - 1, tx + w2 - 1, ty + w2 * 1.2, dark); P.line(tx, ty + 1, tx, yb - 1, mix(col, '#ffffff', .25)); P.set(tx, ty, '#ffffff'); P.set(tx - 1, ty + 2, '#ffffff');
    });
  }
  // 發光小蘑菇
  function shroom(P, x, yb, col) { P.rect(x, yb - 5, 2, 5, '#e6e1d3'); P.rect(x + 1, yb - 5, 1, 5, '#b9b29c'); P.ell(x + 1, yb - 6, 4.5, 2.6, col); P.rect(x - 3, yb - 5, 8, 1, mix(col, '#000000', .3)); P.set(x - 1, yb - 7, mix(col, '#ffffff', .7)); P.set(x, yb - 8, mix(col, '#ffffff', .7)); }
  // 礦坑吊燈
  function lantern(P, x, y, chain) { P.rect(x, y - chain, 1, chain, '#0f0c18'); halo(P, x, y + 6, 26, '#8a6a3a', .5); P.rect(x - 4, y, 9, 2, INK); P.rect(x - 3, y + 2, 7, 8, INK); P.rect(x - 2, y + 3, 5, 6, '#ffd166'); P.rect(x - 2, y + 3, 2, 3, '#fff3c4'); P.rect(x - 1, y + 6, 3, 2, '#ff9b3d'); P.rect(x - 4, y + 10, 9, 1, INK); }
  // 木頭支柱和橫樑
  const post = (P, x, y0, y1) => { P.rect(x, y0, 9, y1 - y0, '#3a2618'); P.rect(x + 1, y0, 6, y1 - y0, '#7a5030'); P.rect(x + 1, y0, 2, y1 - y0, '#a06c40'); for (let y = y0 + 9; y < y1; y += 17) { P.rect(x + 3, y, 1, 6, '#5a3a20'); P.rect(x + 5, y + 7, 1, 4, '#5a3a20'); } };
  const beam = (P, y, x0 = 0, x1 = 320) => { P.rect(x0, y, x1 - x0, 7, '#3a2618'); P.rect(x0, y + 1, x1 - x0, 4, '#7a5030'); P.rect(x0, y + 1, x1 - x0, 1, '#a06c40'); for (let x = x0 + 12; x < x1; x += 46) P.rect(x, y + 3, 9, 1, '#5a3a20'); };
  const dist = (x, y, a, b) => Math.hypot(x - a, y - b);
  const near = (pts, r, col) => (x, y) => { let a = 0; for (const [px, py] of pts) a = Math.max(a, 1 - dist(x, y, px, py) / r); return [col, a * .5]; };

  const VIOLET = ['#3a3250', '#40375a', '#463c62', '#372f4c'];

  /* ---------- 機關翻板廳 ---------- */
  function ox() {
    const P = Cv(320, 200, 31);
    wall(P, 0, 128, VIOLET, '#231d33', near([[12, 108], [306, 108], [160, 30]], 70, '#6a8ab0'));
    ceiling(P, 20, 18, '#17122a', '#3d3360');
    // 掛 O、X 牌子的石台
    [44, 200].forEach(x => { P.rect(x, 68, 78, 8, INK); P.rect(x + 1, 68, 76, 6, '#6b5f80'); P.rect(x + 1, 68, 76, 2, '#9a8fb4'); P.rect(x + 1, 73, 76, 1, '#4b4160'); });
    // 中間的石頭面具
    P.ell(160, 32, 19, 19, INK); P.ball(160, 32, 17, 17, ['#463c62', '#5d5274', '#74688c', '#8c80a4']);
    [[150, 26], [164, 26]].forEach(([x, y]) => { P.rect(x - 1, y - 1, 8, 8, '#2a2438'); P.rect(x, y, 6, 6, '#ffd166'); P.rect(x, y, 6, 2, '#fff3c4'); P.rect(x + 2, y + 2, 2, 3, '#c96a2a'); });
    P.rect(153, 41, 14, 2, INK); P.rect(155, 43, 2, 2, INK); P.rect(163, 43, 2, 2, INK);
    crystal(P, 10, 126, 1, '#78e0f0'); crystal(P, 304, 126, 1.1, '#b48cff');
    // 地面、兩個坑、中間石台（位置和原版一樣）
    P.rect(0, 128, 320, 72, '#2a2438'); P.rect(0, 128, 320, 2, '#4b4160');
    [16, 172].forEach(x0 => {
      P.grad(x0, 128, 132, 22, ['#07060c', '#0f0b16', '#1c1420', '#2a1e2c'], (u, v) => v);
      P.rect(x0, 150, 132, 10, '#3d2f3a'); P.rect(x0, 150, 132, 2, '#5a4658'); for (let i = 0; i < 11; i++) { P.ell(x0 + 8 + i * 12, 151, 4, 2, '#4a3a48'); P.set(x0 + 6 + i * 12, 150, '#6e5a6c'); }
    });
    P.rect(148, 128, 24, 32, '#5d5274'); P.rect(148, 128, 24, 2, '#9a8fb4'); P.rect(148, 130, 2, 30, '#74688c'); P.rect(170, 130, 2, 30, '#3a3250'); for (let y = 136; y < 160; y += 8) P.rect(150, y, 20, 1, '#4b4160');
    return P.url();
  }

  /* ---------- 地底峽谷 ---------- */
  function bridge() {
    const P = Cv(320, 200, 61);
    P.grad(0, 0, 320, 112, ['#100d1c', '#151126', '#1b1630', '#221c3b', '#2a2346'], (u, v) => v);
    // 遠處發光的洞窟
    // 遠處石柱（上下連起來）
    [[84, 12], [122, 7], [190, 9], [226, 14]].forEach(([x, w]) => { for (let y = 0; y < 116; y++) { const k = Math.abs(y - 58) / 58, half = w / 2 * (.55 + .45 * k * k); P.rect(Math.round(x - half), y, Math.round(half * 2), 1, '#2a2340'); P.set(Math.round(x - half), y, '#3d3458'); } });
    // 遠處岩稜
    let j = 0; for (let x = 0; x < 320; x++) { j += (P.R() - .5) * 2.6; j = Math.max(-4, Math.min(4, j)); const top = Math.round(104 - 14 * (.5 + .5 * Math.sin(x * .05 + 1)) + j); for (let y = top; y < 114; y++) P.set(x, y, y - top < 2 ? '#3a3154' : '#262038'); }
    ceiling(P, 26, 26, '#0c0a16', '#2a2340');
    for (let i = 0; i < 9; i++) { const x = 66 + i * 22 + (P.R() * 10 | 0), y = 34 + (P.R() * 56 | 0), c = i % 2 ? '#78e0f0' : '#b48cff', m = ART.mix(c, '#14101f', .5); P.rect(x - 2, y, 5, 1, m); P.rect(x, y - 2, 1, 5, m); P.rect(x - 1, y, 3, 1, c); P.rect(x, y - 1, 1, 3, c); }
    // 峽谷深處：平塗三層
    P.rect(0, 112, 320, 24, '#221c30'); P.rect(0, 136, 320, 20, '#191424'); P.rect(0, 156, 320, 16, '#110d1a');
   
    // 地底河
    P.rect(0, 172, 320, 28, '#1f7a8a'); P.rect(0, 172, 320, 2, '#a0f0f5'); P.rect(0, 174, 320, 1, '#4fb8c8');
    for (let y = 179; y < 200; y += 6) for (let x = ((y / 6) % 2) * 14 + 66; x < 256; x += 30) { P.rect(x, y, 9, 1, '#5fd0dc'); P.rect(x + 2, y + 1, 5, 1, '#3a9aaa'); }
    // 岩崖（上下兩層平台），頂上一層發光苔
    const cliff = (x0, x1, top, edge) => {
      P.rect(x0, top, x1 - x0, 200 - top, '#4b4160');
      for (let y = top + 12; y < 200; y += 13) for (let x = x0; x < x1; x++) P.set(x, y + Math.round(Math.sin(x * .2 + y) * 1.2), '#3d3452');
      for (let i = 0; i < (x1 - x0) * .4; i++) { const x = x0 + P.R() * (x1 - x0 - 5), y = top + 9 + P.R() * (188 - top); P.rect(x, y, 5, 2, P.R() < .5 ? '#3a3249' : '#5d5274'); }
      if (edge === 'r') { P.rect(x1 - 3, top, 3, 200 - top, '#2a2438'); P.rect(x1 - 5, top, 2, 200 - top, '#3a3249'); } else { P.rect(x0, top, 3, 200 - top, '#2a2438'); P.rect(x0 + 3, top, 2, 200 - top, '#5d5274'); }
      P.rect(x0, top, x1 - x0, 6, '#3e7a6a'); P.rect(x0, top, x1 - x0, 2, '#8fe8c8'); for (let x = x0; x < x1; x += 4) P.rect(x + 1, top + 6, 2, 1 + ((x * 7) % 3), '#2d5a50');
    };
    cliff(0, 60, 88, 'r'); cliff(260, 320, 88, 'l'); cliff(0, 60, 140, 'r'); cliff(260, 320, 140, 'l');
    crystal(P, 14, 88, .9, '#78e0f0', .3); crystal(P, 302, 88, 1, '#b48cff', .3); crystal(P, 308, 140, .6, '#8fe0a2', .25);
    shroom(P, 44, 88, '#ffd166'); shroom(P, 274, 88, '#ff8fb1'); shroom(P, 10, 140, '#ffd166');
    return P.url();
  }

  /* ---------- 礦坑列車 ---------- */
  function rail() {
    const P = Cv(320, 200, 101);
    const L = [[56, 34], [152, 34], [248, 34]];
    wall(P, 0, 98, ['#2f2840', '#352e47', '#3a3249', '#2c2539'], '#191524', near(L, 46, '#a8803a'));
    ceiling(P, 18, 14, '#0f0c18', '#2f2840', 0);
    // 礦坑支架和吊燈
    [6, 102, 198, 300].forEach(x => post(P, x, 14, 98)); beam(P, 12);
    L.forEach(([x, y]) => lantern(P, x, y - 8, 8));
    crystal(P, 80, 96, .6, '#78e0f0', .3); crystal(P, 230, 96, .7, '#b48cff', .3);
    // 側線（上方等待的車廂）：石台＋鐵軌
    P.rect(0, 96, 320, 12, '#3d354e'); P.rect(0, 96, 320, 1, '#6b5f80'); P.rect(0, 106, 320, 2, INK);
    for (let x = 0; x < 320; x += 10) { P.rect(x, 98, 6, 6, '#6e4a2a'); P.rect(x, 98, 6, 1, '#8a5a35'); }
    P.rect(0, 98, 320, 2, '#d3d1e6'); P.rect(0, 100, 320, 1, '#8b8aa3'); P.rect(0, 102, 320, 2, '#a7a4c4');
    // 地面：平塗兩層
    P.rect(0, 108, 320, 92, '#3a3249'); P.rect(0, 108, 320, 14, '#413850');
    // 主線
    P.rect(0, 160, 320, 8, '#5d5274'); for (let x = 0; x < 320; x += 3) P.set(x + ((x * 7) % 2), 163 + ((x * 5) % 3), '#4b4160');
    for (let x = 0; x < 320; x += 10) { P.rect(x, 158, 6, 12, '#6e4a2a'); P.rect(x, 158, 6, 1, '#9a6a3f'); P.rect(x + 5, 159, 1, 11, '#4e3420'); }
    P.rect(0, 160, 320, 2, '#e6e4f5'); P.rect(0, 162, 320, 1, '#6b6890'); P.rect(0, 166, 320, 2, '#d3d1e6'); P.rect(0, 168, 320, 1, '#6b6890');
    return P.url();
  }

  /* ---------- 寶藏石門 ---------- */
  function door() {
    const P = Cv(320, 200, 91);
    wall(P, 0, 164, ['#4a4058', '#544a62', '#463c56', '#4f455e'], '#2a2438', near([[48, 20], [272, 20]], 60, '#c8843a'));
    ceiling(P, 12, 12, '#231d33', '#5d5274');
    // 石拱門
    const arch = (r, y) => y < 48 ? Math.sqrt(Math.max(0, r * r - (48 - y) ** 2)) : r;
    for (let y = 0; y < 164; y++) { const o = arch(52, y), m = arch(44, y); P.rect(160 - o, y, o * 2, 1, '#8b8aa3'); P.rect(160 - o, y, 2, 1, '#b9b6d8'); P.rect(160 + o - 2, y, 2, 1, '#5d5a77'); P.rect(160 - m, y, m * 2, 1, '#2a1a10'); }
    for (let a = 0; a <= 8; a++) { const t = Math.PI + a / 8 * Math.PI; P.line(160 + Math.cos(t) * 44, 48 + Math.sin(t) * 44, 160 + Math.cos(t) * 52, 48 + Math.sin(t) * 52, '#5d5a77'); }
    for (let y = 60; y < 164; y += 18) { P.rect(108, y, 8, 1, '#5d5a77'); P.rect(204, y, 8, 1, '#5d5a77'); }
    // 大木門
    for (let y = 8; y < 164; y++) { const half = arch(40, y); for (let x = Math.ceil(160 - half); x < 160 + half; x++) { const k = Math.floor((x - 120) / 10), e = (x - 120) % 10; P.set(x, y, e === 0 ? '#5a3a20' : e === 1 ? '#b07a45' : e === 9 ? '#7a4e2c' : k % 2 ? '#8a5a32' : '#9a6a3f'); } }
    for (let i = 0; i < 26; i++) { const x = 124 + P.R() * 72, y = 30 + P.R() * 126; P.rect(x, y, 1, 4 + P.R() * 6, '#6e4a2a'); }
    P.rect(158, 10, 4, 154, '#3a2618'); P.rect(158, 10, 1, 154, '#6e4a2a');
    [60, 112].forEach(y => { P.rect(120, y, 80, 7, '#2a2640'); P.rect(120, y, 80, 2, '#9a97b8'); P.rect(120, y + 2, 80, 3, '#5d5a77'); for (let x = 125; x < 200; x += 12) { P.rect(x, y + 2, 2, 2, '#e6e4f5'); P.set(x + 1, y + 3, '#2a2640'); } });
    // 拱頂的紅寶石
    P.ell(160, 3, 7, 7, INK); P.ball(160, 3, 5.5, 5.5, ['#8a1730', '#d6334a', '#ff6a7a', '#ffc0c8']);
    // 火把座
    [48, 272].forEach(x => { P.rect(x - 2, 28, 5, 16, '#3a2618'); P.rect(x - 2, 28, 1, 16, '#6e4a2a'); P.rect(x - 6, 24, 13, 6, '#5d5a77'); P.rect(x - 6, 24, 13, 1, '#b9b6d8'); P.rect(x - 6, 29, 13, 1, '#35324e'); });
    crystal(P, 14, 164, .9, '#78e0f0', .3); crystal(P, 300, 164, .9, '#b48cff', .3);
    // 石板地（平塗）
    P.rect(0, 164, 320, 36, '#2a2438'); P.rect(0, 164, 320, 2, '#5d5274');
    for (let x = 0; x < 320; x += 32) { P.rect(x, 166, 31, 16, '#3d354e'); P.rect(x, 166, 31, 1, '#4b4160'); P.rect(x + 16, 184, 31, 16, '#3d354e'); P.rect(x + 16, 184, 31, 1, '#4b4160'); }
    return P.url();
  }

  /* ---------- 魔王洞 ---------- */
  function lair() {
    const P = Cv(320, 200, 71);
    const cracks = [[50, 36], [108, 50], [170, 40], [226, 54], [284, 38]];
    wall(P, 0, 148, ['#2e1d36', '#35223e', '#2a1a31', '#3a2643'], '#170c1f', (x, y) => { let a = 0; for (const [cx] of cracks) a = Math.max(a, 1 - Math.abs(x - cx) / 34); return ['#c8502a', a * (.15 + .3 * y / 148)]; });
    // 岩漿裂縫
    cracks.forEach(([x0, y0]) => { let x = x0, y = y0; const pts = [[x, y]]; while (y < 132) { x += (P.R() - .45) * 9; y += 6 + P.R() * 7; pts.push([x, y]); } P.path(pts, '#8a2a1a', 4); P.path(pts, '#ff7a1a', 2.4); P.path(pts, '#ffd166', 1); });
    ceiling(P, 24, 30, '#10081a', '#3a2643');
    // 地平線的火光
    for (let y = 118; y < 148; y++) for (let x = 0; x < 320; x++) P.veil(x, y, '#7a2a2a', ((y - 118) / 30) * .55);
    // 右後方的寶藏堆（魔王背後，遠景）
    for (let i = 0; i < 70; i++) { const u = P.R(), x = 216 + u * 96, top = 148 - 16 * Math.sin(u * Math.PI); const y = top + P.R() * (148 - top); P.ell(x, y, 3, 2, '#7a4e00'); P.ell(x, y - 1, 2.4, 1.5, P.R() < .3 ? '#fff3c4' : '#ffd166'); }
    P.rect(246, 126, 6, 6, '#e8414f'); P.set(247, 127, '#ffc0c8'); P.rect(280, 134, 5, 5, '#78e0f0'); P.set(281, 135, '#ffffff');
    [[14, 16, 9], [48, 10, 7], [96, 13, 8], [150, 9, 6], [196, 14, 8]].forEach(([x, l, w]) => mite(P, x, 148, l, w, ['#24162b', '#3a2643', '#5a3a60']));
    crystal(P, 28, 148, 1, '#b48cff', .35); crystal(P, 300, 148, .8, '#e8414f', .35);
    // 地面：平塗三層
    P.rect(0, 148, 320, 52, '#2a1a31'); P.rect(0, 148, 320, 2, '#5a3a60'); P.rect(0, 150, 320, 12, '#33213b'); P.rect(0, 186, 320, 14, '#24162b');
    return P.url();
  }

  /* ---------- 洞穴地圖（剖面圖）：節點和路線用 ART.MAP，座標乘 2 ---------- */
  function map() {
    const P = Cv(320, 200, 23), { NODES, PATH } = ART.MAP, depth = y => Math.max(0, (y - 20) / 180);
    // 地面上
    P.grad(0, 0, 320, 20, ['#78c3f0', '#96d2f5', '#b6e0f8'], (u, v) => v);
    [[70, 4], [210, 6]].forEach(([x, y]) => { P.ell(x, y + 4, 12, 4, '#ffffff'); P.ell(x + 9, y + 2, 8, 4, '#ffffff'); P.rect(x - 12, y + 7, 30, 1, '#d3eefb'); });
    for (let x = 60; x < 320; x += 26) { for (let i = 0; i < 12; i++) { const half = Math.round(1 + i * .45 * (.5 + .5 * ((i % 4) / 4))); P.rect(x - half, 8 + i, half * 2 + 1, 1, '#2f7a3a'); P.set(x - half, 8 + i, '#5aa63c'); } }
    // 土層：一層一層平塗，越深越暗
    const strata = ['#6a503c', '#5c4638', '#4e3c36', '#413234', '#352a32', '#2a2230', '#211b2a'];
    strata.forEach((c, i) => { const y0 = 20 + i * 26; P.rect(0, y0, 320, 26, c); if (i) for (let x = 0; x < 320; x++) { const w = Math.round(Math.sin(x * .07 + i * 2) * 2); P.rect(x, y0 - 2 + w, 1, 3, (x + i) % 2 ? c : strata[i - 1]); } });
    P.rect(0, 20, 320, 4, '#5aa63c'); P.rect(0, 20, 320, 2, '#9ae88a'); for (let x = 0; x < 320; x += 5) P.rect(x + 1, 24, 2, 1 + ((x * 7) % 3), '#3e8f3a');
    for (let i = 0; i < 60; i++) { const x = P.R() * 320, y = 30 + P.R() * 166, d = depth(y); P.ell(x, y, 2 + P.R() * 3, 1.5 + P.R() * 2, mix('#8a745e', '#3a3249', d)); P.set(x - 1, y - 1, mix('#a89078', '#55496a', d)); }
    // 隧道和洞室
    const tube = (r, col) => { for (let i = 0; i < PATH.length - 1; i++) P.line(PATH[i][0] * 2, PATH[i][1] * 2, PATH[i + 1][0] * 2, PATH[i + 1][1] * 2, col, r * 2); };
    tube(10, '#0f0b18'); tube(8, '#241d30'); tube(6, '#30283e');
    NODES.forEach(([x, y], i) => {
      const boss = i === 5, r = (boss ? 13 : i ? 9 : 5) * 2, cx = x * 2, cy = y * 2;
      P.ell(cx, cy, r + 2, r + 2, '#0f0b18'); P.ell(cx, cy, r, r, boss ? '#3d1f3f' : '#241d30'); P.ell(cx, cy + 2, r - 2, r - 2, boss ? '#4a2448' : '#30283e');
      if (boss) halo(P, cx, cy + 6, r - 2, '#c8502a', .5);
      // 洞室的平地板
      for (let yy = cy + Math.round(r * .55); yy <= cy + r - 1; yy++) { const half = Math.sqrt(Math.max(0, (r - 1) ** 2 - (yy - cy) ** 2)); P.rect(cx - half, yy, half * 2, 1, boss ? '#2a1733' : '#1c1626'); }
      if (i) for (let k = 0; k < (boss ? 5 : 3); k++) stal(P, cx - r * .6 + k * (r * 1.2 / (boss ? 4 : 2)), cy - Math.round(Math.sqrt(Math.max(0, r * r - (r * .6 - k * (r * 1.2 / (boss ? 4 : 2))) ** 2))) + 1, 5 + (k % 2) * 3, 4, '#0f0b18', '#30283e');
    });
    // 洞口
    P.rect(13, 16, 22, 12, '#0f0b18'); P.rect(11, 14, 3, 12, '#8a6a4a'); P.rect(34, 14, 3, 12, '#8a6a4a'); P.rect(10, 12, 28, 3, '#a8845c'); P.rect(10, 12, 28, 1, '#c8a47c');
    [[88, 104, '#78e0f0'], [280, 48, '#b48cff'], [40, 140, '#8fe0a2'], [300, 120, '#78e0f0'], [112, 172, '#b48cff'], [192, 28, '#8fe0a2']].forEach(([x, y, c]) => crystal(P, x, y, .45, c, .25));
    return P.url();
  }

  /* ---------- 地底煉金室：桌面 y=136、層架位置和實驗室一樣 ---------- */
  function lab() {
    const P = Cv(320, 200, 121);
    wall(P, 0, 136, VIOLET, '#211b2f', near([[38, 36]], 70, '#5ab0c8'));
    ceiling(P, 10, 12, '#17122a', '#3d3360');
    // 發光的水晶洞（取代窗戶）
    P.ell(38, 34, 23, 23, INK); P.ell(38, 34, 21, 21, '#5d5274'); P.ell(38, 34, 18, 18, '#12303e'); halo(P, 38, 36, 18, '#3a9ab0', .8);
    crystal(P, 32, 51, .8, '#78e0f0', 0); crystal(P, 48, 50, .5, '#b48cff', 0);
    // 刻著符號的石板（取代黑板）
    P.rect(88, 12, 100, 52, INK); P.rect(90, 14, 96, 48, '#74688c'); P.rect(92, 16, 92, 44, '#5d5274'); P.rect(92, 16, 92, 1, '#4b4160'); P.rect(90, 14, 96, 1, '#9a8fb4');
    const rune = '#8fe0d0'; for (let t = 0; t < 60; t++) { const th = t / 60 * Math.PI * 2; P.set(112 + Math.cos(th) * 11, 37 + Math.sin(th) * 11, rune); P.set(112 + Math.cos(th) * 6, 37 + Math.sin(th) * 6, rune); }
    P.poly([[112, 30], [118, 41], [106, 41]], rune); P.poly([[112, 33], [115, 39], [109, 39]], '#5d5274'); P.rect(134, 24, 38, 2, rune); P.rect(134, 34, 24, 2, rune); P.rect(134, 44, 42, 2, rune); P.rect(164, 32, 8, 6, rune); P.rect(166, 34, 4, 2, '#5d5274');
    // 層架與藥水瓶
    for (const sy of [32, 68]) { P.rect(220, sy, 92, 4, '#5a3a20'); P.rect(220, sy, 92, 1, '#9a6a3f'); P.rect(220, sy + 4, 92, 2, '#1d1829'); for (let i = 0; i < 6; i++) { const x = 226 + i * 14, c = ['#e8414f', '#3c8dde', '#ffd166', '#2f9e5b', '#b48cff', '#ff9b6b'][(i + sy) % 6], hh = 10 + (i % 3) * 4; P.rect(x, sy - hh, 10, hh, INK); P.rect(x + 2, sy - hh + 2, 6, hh - 2, '#cfe6f0'); P.rect(x + 2, sy - hh + 5, 6, hh - 5, c); P.rect(x + 2, sy - hh + 5, 2, hh - 5, mix(c, '#ffffff', .4)); P.rect(x + 3, sy - hh - 3, 4, 3, INK); P.rect(x + 4, sy - hh - 2, 2, 2, '#b8834e'); } }
    // 石桌（桌面和桌身都平塗）
    P.rect(0, 136, 320, 12, INK); P.rect(0, 136, 320, 8, '#8b8aa3'); P.rect(0, 136, 320, 2, '#c8c5e0'); P.rect(0, 144, 320, 2, '#5d5a77');
    P.rect(0, 148, 320, 52, '#3a3249'); for (let x = 0; x < 320; x += 80) { P.rect(x + 4, 152, 72, 44, '#2f2840'); P.rect(x + 4, 152, 72, 1, '#4b4160'); P.rect(x + 4, 195, 72, 1, '#231d33'); }
    return P.url();
  }

  /* ---------- 古代金庫：架子、金條位置和金庫一樣 ---------- */
  function vault() {
    const P = Cv(320, 200, 11), { Mask, paint } = ART.HD;
    wall(P, 0, 156, ['#3d354e', '#443b57', '#4b4160', '#3a3249'], '#272133', near([[256, 60]], 80, '#b8903a'));
    ceiling(P, 12, 12, '#1d1829', '#4f4566');
    for (const sy of [36, 80]) { P.rect(200, sy, 112, 4, '#5d5274'); P.rect(200, sy, 112, 1, '#9a8fb4'); P.rect(200, sy + 4, 112, 2, '#1d1829'); for (let i = 0; i < 6; i++) { const x = 208 + i * 16, M = Mask(320, 200); M.poly([[x + 2, sy - 8], [x + 12, sy - 8], [x + 14, sy], [x, sy]]); paint(P, M, ['#8a5a10', '#d49a1e', '#ffd166', '#fff3c4'], { d1: 1, d2: 2, h1: 1 }); } }
    for (let i = 0; i < 5; i++) { const x = 212 + i * 20; P.ell(x, 116, 7, 7, '#7a4e00'); P.ball(x, 116, 6, 6, ['#c98a00', '#f2b632', '#ffd166', '#fff3c4']); P.rect(x - 1, 113, 2, 6, '#c98a00'); }
    P.rect(200, 124, 112, 4, '#5d5274'); P.rect(200, 124, 112, 1, '#9a8fb4'); P.rect(200, 128, 112, 2, '#1d1829');
    crystal(P, 150, 156, .7, '#78e0f0', .3); crystal(P, 186, 156, .5, '#b48cff', .25);
    // 石板地（平塗）
    P.rect(0, 156, 320, 44, '#2a2438'); P.rect(0, 156, 320, 2, '#5d5274');
    for (let x = 0; x < 320; x += 32) { P.rect(x, 158, 31, 20, '#3d354e'); P.rect(x, 158, 31, 1, '#4b4160'); P.rect(x + 16, 180, 31, 20, '#3d354e'); P.rect(x + 16, 180, 31, 1, '#4b4160'); }
    return P.url();
  }

  /* ---------- 礦坑炸藥庫 ---------- */
  function bomb() {
    const P = Cv(320, 200, 11);
    const cone = (x, y) => y > 26 && Math.abs(x - 158) < 16 + (y - 26) * .62;
    wall(P, 0, 168, ['#3d354e', '#443b57', '#4b4160', '#3a3249'], '#272133', (x, y) => ['#c8a060', cone(x, y) ? .22 : 0]);
    post(P, 2, 0, 168); post(P, 309, 0, 168); beam(P, 0);
    // 吊燈
    P.rect(157, 7, 2, 10, INK); P.poly([[146, 24], [150, 16], [166, 16], [170, 24]], '#5d5a77'); P.rect(150, 16, 16, 1, '#a7a4c4'); P.rect(146, 23, 24, 1, '#35324e'); P.rect(152, 24, 12, 3, '#fff3c4'); P.rect(154, 27, 8, 1, '#ffe08a');
    // 警告木牌
    P.rect(112, 10, 36, 26, INK); P.rect(114, 12, 32, 22, '#9a6a3f'); P.rect(114, 12, 32, 2, '#c08a55'); P.rect(114, 22, 32, 1, '#7a4e2c');
    P.poly([[130, 14], [140, 32], [120, 32]], INK); P.poly([[130, 17], [137.5, 30.5], [122.5, 30.5]], '#ffd166'); P.rect(129, 21, 2, 5, INK); P.rect(129, 27, 2, 2, INK);
    crystal(P, 30, 166, .7, '#78e0f0', .3);
    // 地面：警告條＋岩石地（平塗）
    for (let y = 168; y < 174; y++) for (let x = 0; x < 320; x++) P.set(x, y, ((x + (y - 168)) >> 3) % 2 ? INK : '#ffd166');
    P.rect(0, 167, 320, 1, INK); P.rect(0, 174, 320, 26, '#2a2438'); P.rect(0, 174, 320, 2, '#5d5274');
    return P.url();
  }

  /* ---------- 地底湖：水面 y=60、碼頭位置和釣大魚一樣 ---------- */
  function fish() {
    const P = Cv(320, 200, 59);
    P.grad(0, 0, 320, 60, ['#100d1c', '#16122a', '#1d1836', '#252044'], (u, v) => v);
    wall(P, 0, 40, ['#2f2840', '#352e47', '#2c2539'], '#191524', near([[250, 44]], 80, '#4a9ab0'));
    for (let x = 0; x < 320; x++) { const d = Math.round(Math.sin(x * .09) * 3 + Math.sin(x * .23) * 2); P.rect(x, 38 + d, 1, 6, '#191524'); }
    ceiling(P, 22, 24, '#0c0a16', '#2f2840', 40);
    halo(P, 252, 52, 44, '#2f6a80', .7);
    // 遠岸的岩石和水晶
    P.rect(84, 54, 236, 6, '#231d33'); for (let x = 84; x < 320; x += 3) P.set(x, 53 + ((x * 5) % 2), '#231d33');
    crystal(P, 240, 60, 1, '#78e0f0', 0); crystal(P, 280, 60, .7, '#b48cff', 0); crystal(P, 140, 60, .5, '#8fe0a2', 0);
    // 地底湖：幾層平塗
    const sea = ['#237a8c', '#1e6c7e', '#195e70', '#155162', '#124554', '#0f3a48'], ys = [60, 70, 86, 108, 136, 168, 200];
    sea.forEach((c, i) => { P.rect(0, ys[i], 320, ys[i + 1] - ys[i], c); });
    P.rect(0, 60, 320, 1, '#8fe8f0');
    // 水晶倒影（只在遠處水面）
    for (let y = 62; y < 92; y += 3) { const w = 16 - (y - 62) * .4; P.rect(243 - w / 2 + Math.sin(y) * 3, y, w, 1, y < 74 ? '#8fe8f0' : '#4fb8c8'); }
    [[10, 16], [22, 11], [300, 14], [312, 10]].forEach(([x, hh]) => { for (let y = 0; y < hh; y++) { const sx = x + Math.round(Math.sin(y / 2.5) * 1.5); P.set(sx, 199 - y, y % 2 ? '#3e8f6a' : '#2d5a50'); P.set(sx + 1, 199 - y, '#1f4a40'); } });
    // 石頭碼頭
    [12, 52].forEach(x => { P.rect(x, 60, 6, 38, '#4b4160'); P.rect(x, 60, 2, 38, '#6b5f80'); P.rect(x + 5, 60, 1, 38, '#2a2438'); P.rect(x, 82, 6, 16, '#1f4a58'); P.rect(x - 2, 80, 10, 2, '#8fe8f0'); });
    P.rect(0, 46, 78, 16, '#5d5274'); P.rect(0, 46, 78, 2, '#9a8fb4'); P.rect(0, 59, 78, 3, '#3a3249'); P.rect(78, 46, 2, 16, '#2a2438');
    for (let x = 14; x < 78; x += 20) { P.rect(x, 48, 1, 6, '#4b4160'); P.rect(x - 9, 54, 1, 5, '#4b4160'); } P.rect(0, 54, 78, 1, '#4b4160');
    return P.url();
  }

  /* ---------- 追趕怪獸：隧道（下面的地面是另外捲動的圖） ---------- */
  function chase() {
    const P = Cv(320, 200, 141);
    wall(P, 0, 112, ['#2f2840', '#352e47', '#3a3249', '#2c2539'], '#191524');
    ceiling(P, 20, 22, '#0f0c18', '#2f2840');
    P.rect(0, 112, 320, 88, '#2a2438');
    return P.url();
  }

  /* ---------- 礦坑列車的四台車（64×40，舊圖兩倍；輪子底部在最後一列），車頭朝右 ---------- */
  const rideWheels = (P, xs) => xs.forEach(x => { P.ell(x, 32.5, 5, 5, '#5d5a77'); P.ell(x, 33.5, 5, 4, '#46435e'); P.ell(x, 32.5, 2.8, 2.8, '#d3d1e6'); P.ell(x, 32.5, 1.1, 1.1, INK); });
  const ride = draw => { const P = Cv(64, 40); draw(P); P.outline(INK, 2); return P.url(); };
  ART.SP.rides = [
    // 礦車：梯形鐵斗裝滿礦石
    ride(P => {
      [[13, '#9a8a7a', '#b9ab9b'], [23, '#78e0f0', '#d6f7fc'], [33, '#9a8a7a', '#b9ab9b'], [43, '#78e0f0', '#d6f7fc'], [52, '#9a8a7a', '#b9ab9b']].forEach(([x, c, h]) => { P.ell(x, 7, 5, 4.4, c); P.rect(x - 3, 4, 3, 2, h); });
      rideWheels(P, [17, 47]);
      P.poly([[5, 12], [59, 12], [54, 29], [10, 29]], '#8b8aa3'); P.poly([[9, 23], [55, 23], [54, 29], [10, 29]], '#5d5a77');
      P.rect(4, 9, 56, 4, '#c9c7dc'); P.rect(4, 12, 56, 1, '#8b8aa3');
      P.rect(19, 13, 2, 16, '#5d5a77'); P.rect(43, 13, 2, 16, '#5d5a77');
    }),
    // 鑽地車：黃色車身，前面一支大鑽頭
    ride(P => {
      rideWheels(P, [13, 35]);
      P.rect(8, 4, 14, 9, '#5d5a77'); P.rect(11, 6, 8, 4, '#9fd4f5'); P.rect(11, 6, 8, 1, '#e6f6ff');
      P.rect(3, 12, 40, 16, '#ffd166'); P.rect(3, 12, 40, 2, '#fff3c4'); P.rect(3, 23, 40, 5, '#c98a00');
      for (let x = 6; x < 40; x += 9) P.rect(x, 24, 4, 4, INK);
      P.poly([[45, 10], [61, 20], [45, 30]], x => Math.floor((x - 45) / 3) % 2 ? '#8b8aa3' : '#d3d1e6'); P.rect(43, 10, 3, 20, '#5d5a77');
    }),
    // 吉普車：綠色、防滾架、車頭燈
    ride(P => {
      P.rect(8, 2, 3, 14, '#8b8aa3'); P.rect(8, 2, 27, 3, '#8b8aa3'); P.rect(32, 2, 3, 14, '#8b8aa3'); P.rect(8, 2, 27, 1, '#d3d1e6');
      P.poly([[38, 6], [41, 6], [44, 16], [38, 16]], '#9fd4f5');
      rideWheels(P, [15, 49]);
      P.rect(3, 16, 58, 12, '#2f9e5b'); P.rect(3, 16, 58, 2, '#8fe0a2'); P.rect(3, 24, 58, 4, '#1f6e3e');
      P.rect(43, 13, 18, 4, '#2f9e5b'); P.rect(43, 13, 18, 1, '#8fe0a2');
      P.rect(58, 19, 3, 4, '#fff3c4'); P.rect(5, 19, 9, 4, '#5d5a77'); P.rect(32, 18, 1, 9, '#1f6e3e');
    }),
    // 火箭推車：紅色車身、尖頭、後面噴嘴
    ride(P => {
      P.poly([[18, 10], [11, 3], [20, 3], [28, 10]], '#a12a3c');
      rideWheels(P, [23, 47]);
      P.poly([[14, 13], [5, 10], [5, 28], [14, 25]], '#5d5a77'); P.rect(5, 10, 3, 18, '#8b8aa3');
      P.rect(14, 10, 38, 18, '#e8414f'); P.rect(14, 10, 38, 2, '#ff9a9a'); P.rect(14, 23, 38, 5, '#a12a3c');
      P.poly([[52, 10], [62, 19], [52, 28]], '#e8414f'); P.poly([[52, 23], [58, 23], [52, 28]], '#a12a3c'); P.rect(52, 10, 3, 2, '#ff9a9a');
      P.ell(33, 17.5, 5, 5, INK); P.ell(33, 17.5, 3.4, 3.4, '#9fd4f5'); P.rect(31, 15, 2, 2, '#e6f6ff');
    }),
  ];
  Object.assign(ART.SP, ART.HD.tunnel('cave')); ART.SP.beam = ART.HD.spBeam('rgba(160,240,255,.28)');
  Object.assign(BG, { ox: ox(), bridge: bridge(), rail: rail(), door: door(), lair: lair(), map: map(), lab: lab(), vault: vault(), bomb: bomb(), fish: fish(), chase: chase() });
})();
