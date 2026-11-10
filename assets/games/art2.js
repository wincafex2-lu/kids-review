/* 小遊戲重繪版美術（原創，程式逐點畫）。背景 320×200，比舊版細一倍；角色有立體明暗和自動描邊。
   要放在 games-core.js 之後載入：會換掉 ART.BG 的背景，以及 MON（怪獸）、HORSE（賽馬）。 */
(() => {
  const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const cache = {};
  const rgb = c => cache[c] || (cache[c] = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)));
  const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const INK = '#1d1b2e';

  function Cv(w, h, seed = 7) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'), im = g.createImageData(w, h), d = im.data;
    let s = seed;
    const P = {
      w, h,
      R() { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; },
      set(x, y, col) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= w || y >= h || !col) return; const i = (y * w + x) * 4, r = rgb(col); d[i] = r[0]; d[i + 1] = r[1]; d[i + 2] = r[2]; d[i + 3] = 255; },
      has(x, y) { return x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0; },
      rect(x, y, ww, hh, col) { x = Math.round(x); y = Math.round(y); for (let yy = y; yy < y + Math.round(hh); yy++) for (let xx = x; xx < x + Math.round(ww); xx++) P.set(xx, yy, col); },
      // 從色階挑顏色：t 0–1，交界用 4×4 有序抖色
      pick(ramp, t) { return ramp[Math.round(Math.max(0, Math.min(.9999, t)) * (ramp.length - 1))]; },
      grad(x, y, ww, hh, ramp, fn) { for (let yy = y; yy < y + hh; yy++) for (let xx = x; xx < x + ww; xx++) { const u = (xx - x) / ww, v = (yy - y) / hh; P.set(xx, yy, P.pick(ramp, fn ? fn(u, v, xx, yy) : v, xx, yy)); } },
      // 抖色疊一層（a 0–1 是覆蓋比例）
      veil(x, y, col, a) { if (a > .5) P.set(x, y, col); },
      ell(cx, cy, rx, ry, col) { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1) P.set(x, y, col); },
      // 立體球：ramp 由暗到亮，光從 (lx, ly) 方向來
      ball(cx, cy, rx, ry, ramp, lx = -.55, ly = -.7, dither = false) {
        const L = Math.hypot(lx, ly);
        for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
          const nx = (x + .5 - cx) / rx, ny = (y + .5 - cy) / ry, rr = nx * nx + ny * ny; if (rr > 1) continue;
          const t = .5 + .5 * (nx * lx + ny * ly) / L - (rr > .72 ? .12 : 0);
          P.set(x, y, P.pick(ramp, t, x, y, dither));
        }
      },
      poly(pts, col) {
        const ys = pts.map(p => p[1]), xs = pts.map(p => p[0]);
        for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.max(...xs); x++) {
          let inside = false; const px = x + .5, py = y + .5;
          for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside; }
          if (inside) P.set(x, y, typeof col === 'function' ? col(x, y) : col);
        }
      },
      line(x0, y0, x1, y1, col, th = 1) { const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) || 1; for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; if (th <= 1) P.set(x, y, col); else P.ell(x, y, th / 2, th / 2, col); } },
      path(pts, col, th) { for (let i = 1; i < pts.length; i++) P.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], col, th); },
      // 幫整張圖描一圈外框
      outline(col = INK, th = 1) { if (th > 1) P.outline(col, th - 1); const add = []; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!P.has(x, y) && (P.has(x - 1, y) || P.has(x + 1, y) || P.has(x, y - 1) || P.has(x, y + 1))) add.push([x, y]); add.forEach(([x, y]) => P.set(x, y, col)); },
      clear(x, y, ww, hh) { for (let yy = Math.max(0, y); yy < Math.min(h, y + hh); yy++) for (let xx = Math.max(0, x); xx < Math.min(w, x + ww); xx++) d[(yy * w + xx) * 4 + 3] = 0; },
      url() { g.putImageData(im, 0, 0); return c.toDataURL(); },
    };
    return P;
  }
  // 星空：稀疏的大星星（十字形）和小星星，不撒滿天細點
  function stars(P, w, h, cols, bgc, cw = 40, ch = 28) {
    for (let gy = 0; gy * ch < h; gy++) for (let gx = 0; gx * cw < w; gx++) {
      const x = gx * cw + 5 + (P.R() * (cw - 10) | 0), y = gy * ch + 4 + (P.R() * (ch - 8) | 0), c = cols[P.R() * cols.length | 0];
      if (y >= h - 2) continue;
      if ((gx + gy * 2) % 3 === 0) { const m = mix(c, bgc, .5); P.rect(x - 2, y, 5, 1, m); P.rect(x, y - 2, 1, 5, m); P.rect(x - 1, y, 3, 1, c); P.rect(x, y - 1, 1, 3, c); }
      else P.set(x, y, c);
    }
  }
  const ramp4 = (base, dark = '#150f2e', light = '#ffffff') => [mix(base, dark, .5), mix(base, dark, .22), base, mix(base, light, .32)];

  /* ================= OX 翻板：招牌、翻板、ON AIR 燈箱 ================= */
  const markO = (P, cx, cy, rx, ry, th, c, sh) => { for (let y = Math.floor(cy - ry); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const k = (dy) => { const o = ((x + .5 - cx) / rx) ** 2 + ((y + .5 - dy) / ry) ** 2, i = ((x + .5 - cx) / (rx - th)) ** 2 + ((y + .5 - dy) / (ry - th)) ** 2; return o <= 1 && i > 1; }; if (k(cy)) P.set(x, y, c); else if (sh && k(cy + 2)) P.set(x, y, sh); } };
  const markX = (P, cx, cy, rx, ry, th, c, sh) => { const bar = (d, col, oy) => P.poly([[cx - rx * d, cy - ry + oy], [cx - rx * d + th * d, cy - ry + oy], [cx + rx * d, cy + ry + oy], [cx + rx * d - th * d, cy + ry + oy]], col); if (sh) { bar(1, sh, 2); bar(-1, sh, 2); } bar(1, c, 0); bar(-1, c, 0); };
  // 大招牌（72×52）：粗框＋亮面／暗面，亮燈時整面變亮
  function spSign(mark, col, lit) {
    const P = Cv(72, 52);
    const rim = lit ? col : mix(col, INK, .5), face = lit ? '#fffaf0' : '#2c2845';
    P.rect(0, 0, 72, 52, INK);
    P.rect(2, 2, 68, 48, rim); P.rect(2, 2, 68, 2, mix(rim, '#ffffff', lit ? .45 : .2)); P.rect(2, 46, 68, 4, mix(rim, '#000000', .3));
    P.rect(7, 7, 58, 38, INK); P.rect(8, 8, 56, 36, face); P.rect(8, 8, 56, 3, lit ? '#ffffff' : '#3a3559'); P.rect(8, 41, 56, 3, lit ? '#eadfc8' : '#221f38');
    const c = lit ? col : mix(col, INK, .35), sh = lit ? mix(col, '#000000', .35) : mix(col, INK, .65);
    if (mark === 'O') markO(P, 36, 25, 15, 15, 5, c, sh); else markX(P, 36, 25, 14, 14, 7, c, sh);
    return P.url();
  }
  // 翻板（132×32）：兩色方格、白色記號
  function spPanel(base, mark) {
    const P = Cv(132, 32), lt = mix(base, '#ffffff', .2), dk = mix(base, '#000000', .3);
    P.rect(0, 0, 132, 32, INK);
    for (let y = 0; y < 2; y++) for (let x = 0; x < 8; x++) P.rect(2 + x * 16, 2 + y * 14, 16, 14, (x + y) % 2 ? base : lt);
    P.rect(2, 2, 128, 2, mix(base, '#ffffff', .5)); P.rect(2, 27, 128, 3, dk);
    if (mark === 'O') markO(P, 66, 15, 22, 11, 4, '#fffaf0', dk); else markX(P, 66, 15, 20, 10, 8, '#fffaf0', dk);
    return P.url();
  }
  // ON AIR 燈箱（40×16）
  function spOnAir(on) {
    const P = Cv(40, 16), t = on ? '#fff3c4' : '#8f4a5a';
    P.rect(0, 0, 40, 16, INK); P.rect(1, 1, 38, 14, on ? '#e8414f' : '#5a2030'); P.rect(1, 1, 38, 2, on ? '#ff7a8a' : '#6e2c40'); P.rect(1, 13, 38, 2, on ? '#b0263a' : '#431626');
    const F = { O: ['.kk.', 'k..k', 'k..k', 'k..k', 'k..k', 'k..k', '.kk.'], N: ['k..k', 'kk.k', 'kk.k', 'k.kk', 'k.kk', 'k..k', 'k..k'], A: ['.kk.', 'k..k', 'k..k', 'kkkk', 'k..k', 'k..k', 'k..k'], I: ['kkk', '.k.', '.k.', '.k.', '.k.', '.k.', 'kkk'], R: ['kkk.', 'k..k', 'k..k', 'kkk.', 'k.k.', 'k..k', 'k..k'] };
    let x = 7; for (const ch of 'ON AIR') { if (ch === ' ') { x += 3; continue; } F[ch].forEach((r, y) => [...r].forEach((c, i) => { if (c === 'k') P.set(x + i, 5 + y, t); })); x += F[ch][0].length + 1; }
    return P.url();
  }

  /* ================= 打怪獸：月夜城堡草原 ================= */
  function bgBoss() {
    const P = Cv(320, 200, 71);
    const sky = ['#0c0a22', '#120f34', '#1a1549', '#261c60', '#372573', '#522f84', '#77408f', '#a25896', '#d27f95'];
    P.grad(0, 0, 320, 106, sky, (u, v) => Math.pow(v, 1.7));
    // 星星
    stars(P, 320, 84, ['#fffaf0', '#fff3c4', '#b9d8ff'], '#1a1549');
    // 月亮＋月暈
    const mx = 132, my = 36, mr = 17;
    for (let y = my - 40; y < my + 40; y++) for (let x = mx - 40; x < mx + 40; x++) { const dd = Math.hypot(x + .5 - mx, y + .5 - my); if (dd < mr + 22) P.veil(x, y, dd < mr + 9 ? '#6f5fb0' : '#4a3a8c', Math.max(0, 1 - (dd - mr) / 22) * .75); }
    P.ball(mx, my, mr, mr, ['#cdbb86', '#e6d79f', '#f6ecbb', '#fff8dc', '#fffdf2'], -.5, -.6, true);
    [[-6, -5, 4, 3.4], [5, 3, 3.2, 2.8], [-3, 7, 2.4, 2], [7, -8, 2, 1.8], [-10, 3, 1.6, 1.5]].forEach(([dx, dy, a, b]) => { P.ell(mx + dx, my + dy, a, b, '#d9c990'); P.ell(mx + dx + .6, my + dy + .6, a * .72, b * .72, '#e9dba6'); });
    // 飄過月亮的薄雲
    [[70, 46, 34, 3], [176, 30, 30, 3], [150, 52, 22, 2], [250, 20, 40, 3], [20, 22, 26, 2]].forEach(([cx, cy, rx, ry]) => { for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) { const k = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2; if (k < 1) P.veil(x, y, y < cy ? '#5a4a9c' : '#2a1f5c', (1 - k) * .9); } });
    // 遠山兩層
    const ridge = (base, amp, ph, fill, rim) => { let j = 0; for (let x = 0; x < 320; x++) { j += (P.R() - .5) * 2.4; j = Math.max(-4, Math.min(4, j)); const top = Math.round(base - amp * (.55 + .45 * Math.sin(x * .031 + ph)) * (.6 + .4 * Math.sin(x * .083 + ph * 2)) + j); for (let y = top; y < 108; y++) P.set(x, y, y - top < 2 ? rim : fill); } };
    ridge(92, 26, 1.3, '#3a2c74', '#5b4a9a');
    ridge(100, 16, 4.1, '#241b55', '#3a2c74');
    // 城堡山丘
    P.ell(62, 118, 92, 24, '#15102f');
    // 城堡（月光從右邊照，右緣亮）
    const CA = '#191335', CL = '#4a3d86', CD = '#0f0b24';
    const block = (x, y, ww, hh) => { P.rect(x, y, ww, hh, CA); P.rect(x + ww - 2, y, 2, hh, CL); P.rect(x, y, 1, hh, CD); for (let i = 0; i < 26; i++) { const bx = x + 2 + (P.R() * (ww - 7) | 0), by = y + 3 + (P.R() * (hh - 5) | 0); P.rect(bx, by, 3, 1, '#231b48'); } };
    const merlon = (x, y, ww) => { for (let k = 0; k < ww; k += 4) P.rect(x + k, y - 3, 2, 3, k + 4 >= ww ? CL : CA); };
    const cone = (x, y, ww, hh, col) => { for (let i = 0; i < hh; i++) { const half = (i + 1) / hh * (ww / 2 + 2); P.rect(x + ww / 2 - half, y - hh + i, half * 2, 1, col); P.set(x + ww / 2 + half - 1, y - hh + i, '#b0546e'); } };
    const win = (x, y) => { P.rect(x - 1, y - 1, 5, 7, '#7a3d1f'); P.rect(x, y, 3, 5, '#ffd166'); P.rect(x, y, 3, 1, '#fff3c4'); P.set(x + 1, y + 2, '#ff9b3d'); P.set(x + 1, y + 4, '#ff9b3d'); };
    block(30, 70, 64, 36); merlon(30, 70, 64);
    block(22, 56, 16, 50); cone(22, 56, 16, 14, '#6b2d4f');
    block(84, 60, 16, 46); cone(84, 60, 16, 12, '#6b2d4f');
    block(52, 40, 20, 66); cone(52, 40, 20, 18, '#7a3358');
    P.rect(61, 12, 1, 12, '#8b8aa3'); P.poly([[62, 12], [72, 15], [62, 19]], '#e8414f'); P.rect(62, 12, 9, 1, '#ff8a8a');
    win(28, 64); win(90, 68); win(60, 48); win(60, 62); win(42, 80); win(76, 80);
    // 城門
    P.ell(62, 98, 7, 9, '#3a1d12'); P.rect(55, 98, 14, 9, '#3a1d12'); P.ell(62, 99, 5, 7, '#ffb347'); P.rect(57, 99, 10, 8, '#ffb347'); P.rect(59, 101, 6, 6, '#ffe08a'); for (let y = 93; y < 107; y += 3) P.rect(57, y, 10, 1, '#c96a2a'); P.rect(61, 92, 1, 15, '#c96a2a');
    // 樹林剪影
    const pine = (x, base, hh, col, lit) => { for (let i = 0; i < hh; i++) { const half = Math.round(1 + (i / hh) * (hh * .3) * (.5 + .5 * ((i % 6) / 6))); P.rect(x - half, base - hh + i, half * 2 + 1, 1, col); P.set(x - half, base - hh + i, lit); } P.rect(x, base, 1, 3, '#0f0b24'); };
    for (let x = 104; x < 326; x += 7 + (P.R() * 7 | 0)) pine(x, 104, 14 + (P.R() * 12 | 0), '#152a3c', '#2d5560');
    for (let x = 110; x < 326; x += 9 + (P.R() * 9 | 0)) pine(x, 108, 10 + (P.R() * 8 | 0), '#0f1f2e', '#22424e');
    for (let x = 0; x < 26; x += 8) pine(x, 108, 16 + (P.R() * 8 | 0), '#0f1f2e', '#22424e');
    // 草原：選項和角色站的地方保持乾淨，只用三層平塗；細節都留在地平線附近
    P.rect(0, 106, 320, 94, '#2f7446');
    P.grad(0, 106, 320, 16, ['#4a9a62', '#3d8854', '#2f7446'], (u, v) => v);
    P.grad(0, 184, 320, 16, ['#2f7446', '#28663e'], (u, v) => v);
    // 城門前一小段泥土路，很快就淡掉
    for (let y = 106; y < 122; y++) { const v = (y - 106) / 16, cx = 62 + 10 * v, half = 4 + 5 * v; for (let x = Math.round(cx - half); x < cx + half; x++) P.veil(x, y, v < .5 ? '#8a7460' : '#6f6a52', 1 - v * v); }
    // 地平線上的小草叢和兩顆石頭（都在選項上方很遠的地方）
    for (let x = 4; x < 320; x += 9 + (P.R() * 10 | 0)) { const y = 107 + (P.R() * 4 | 0); P.set(x, y, '#5fb070'); P.set(x - 1, y - 1, '#5fb070'); P.set(x + 1, y - 1, '#5fb070'); }
    const rock = (x, y, rx, ry) => { P.ball(x, y, rx, ry, ['#3a3558', '#56507a', '#7a759c', '#a7a4c4'], .5, -.7, false); P.rect(x - rx + 1, y + ry - 1, rx * 2 - 2, 1, '#245a38'); };
    rock(176, 112, 5, 3.5); rock(8, 114, 6, 4);
    return P.url();
  }

  /* ================= 賽馬：草地賽道、看台 ================= */
  function bgRace() {
    const P = Cv(320, 200, 23);
    P.grad(0, 0, 320, 8, ['#6db9ee', '#8ccdf3', '#b2e0f8']);
    // 看台內部
    P.grad(0, 8, 320, 26, ['#201d3a', '#2a2748', '#343058']);
    // 後排小觀眾
    const shirts = ['#e8414f', '#3c8dde', '#ffd166', '#2f9e5b', '#b48cff', '#ff9b6b', '#fffaf0', '#56c7c1'], skins = ['#f5c79a', '#e0a878', '#c98a5a', '#ffd9b3'], hairs = ['#2a1c12', '#4e3420', '#1d1b2e', '#8a5a35', '#d9a441'];
    for (let r = 0; r < 3; r++) { P.rect(0, 16 + r * 6, 320, 1, '#46426e'); for (let x = 2 + (r % 2) * 3; x < 318; x += 6) { if (P.R() < .14) continue; const y = 11 + r * 6 + (P.R() < .25 ? -1 : 0), sh = shirts[P.R() * shirts.length | 0]; P.rect(x, y, 3, 1, hairs[P.R() * hairs.length | 0]); P.rect(x, y + 1, 3, 2, skins[P.R() * skins.length | 0]); P.rect(x - 1, y + 3, 5, 3, sh); P.rect(x - 1, y + 3, 5, 1, mix(sh, '#ffffff', .3)); if (P.R() < .18) { P.rect(x + 4, y - 2, 1, 5, '#8b8aa3'); P.rect(x + 5, y - 2, 3, 2, shirts[P.R() * shirts.length | 0]); } } }
    // 屋頂遮雨棚：紅白條、波浪邊、底下陰影
    for (let x = 0; x < 320; x++) { const red = (x >> 4) % 2 === 0, c = red ? '#e8414f' : '#fffaf0', hi = red ? '#ff7a7a' : '#ffffff', lo = red ? '#b02a3c' : '#d9cfb4'; P.set(x, 2, '#7a1730'); P.set(x, 3, hi); for (let y = 4; y < 8; y++) P.set(x, y, c); P.set(x, 8, lo); const sc = Math.round(1.5 + 1.5 * Math.cos((x % 16) / 16 * Math.PI * 2 + Math.PI)); for (let y = 9; y < 9 + sc; y++) P.set(x, y, y === 8 + sc ? lo : c); }
    for (let x = 6; x < 320; x += 48) { P.rect(x, 0, 1, 3, '#5d5a77'); P.poly([[x + 1, 0], [x + 8, 1.5], [x + 1, 3]], ['#ffd166', '#2f9e5b', '#3c8dde', '#b48cff'][(x / 48 | 0) % 4]); }
    for (let x = 30; x < 320; x += 64) { P.rect(x, 9, 4, 26, '#8b8aa3'); P.rect(x, 9, 1, 26, '#d3d1e6'); P.rect(x + 3, 9, 1, 26, '#5d5a77'); }
    // 前牆廣告看板
    P.rect(0, 33, 320, 7, '#fffaf0'); P.rect(0, 33, 320, 1, '#ffffff'); P.rect(0, 39, 320, 1, '#b9b6d8');
    for (let x = 4, i = 0; x < 320; x += 40, i++) { const c = ['#2f9e5b', '#ffd166', '#3c8dde', '#e8414f', '#b48cff'][i % 5]; P.rect(x, 34, 32, 5, c); P.rect(x, 34, 32, 1, mix(c, '#ffffff', .35)); P.rect(x + 4, 36, 10, 1, '#fffaf0'); P.rect(x + 17, 36, 4, 1, '#fffaf0'); P.rect(x + 24, 36, 5, 1, '#fffaf0'); }
    // 草地賽道：平塗的寬條割草紋，不加雜點，選項牌和馬才清楚
    for (let y = 40; y < 186; y++) for (let x = 0; x < 320; x++) P.set(x, y, (x >> 5) % 2 ? '#5cba56' : '#63c05b');
    P.rect(0, 40, 320, 2, '#3f9a44'); P.rect(0, 42, 320, 1, '#4fae4c');
    // 內圈：白欄杆＋花圃
    P.grad(0, 186, 320, 14, ['#2f8a3c', '#267334', '#1c5c2c']);
    for (let x = 0; x < 320; x += 9) { const r = 4 + (P.R() * 2 | 0); P.ball(x + 4, 196, r + 1, r, ['#174a26', '#1f6630', '#2f8a3c', '#4aa84a'], -.4, -.8, true); }
    for (let x = 0, i = 0; x < 320; x += 18, i++) { const c = ['#ff8fb1', '#ffd166', '#fffaf0', '#ff6b6b'][i % 4]; P.rect(x + 3, 191, 3, 3, c); P.rect(x + 3, 193, 3, 1, mix(c, '#000000', .2)); P.set(x + 4, 192, '#e8a23a'); }
    P.rect(0, 184, 320, 2, '#fffaf0'); P.rect(0, 186, 320, 1, '#b9b6d8');
    for (let x = 8; x < 320; x += 24) { P.rect(x, 184, 2, 8, '#fffaf0'); P.rect(x + 2, 186, 1, 6, '#b9b6d8'); }
    return P.url();
  }

  /* ---------- 剪影遮罩＋方向光上色：先畫出一個部位的形狀，再依「離右下邊多近、離左上邊多近」分成暗、中、亮 ---------- */
  function Mask(w, h) {
    const m = new Uint8Array(w * h);
    const M = {
      m, w, h,
      set(x, y) { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && y >= 0 && x < w && y < h) m[y * w + x] = 1; },
      get(x, y) { return x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] === 1; },
      ell(cx, cy, rx, ry) { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1) M.set(x, y); return M; },
      rect(x, y, ww, hh) { for (let yy = y; yy < y + hh; yy++) for (let xx = x; xx < x + ww; xx++) M.set(xx, yy); return M; },
      poly(pts) {
        const ys = pts.map(p => p[1]), xs = pts.map(p => p[0]);
        for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.max(...xs); x++) {
          let inside = false; const px = x + .5, py = y + .5;
          for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside; }
          if (inside) M.set(x, y);
        } return M;
      },
      // 沿著二次曲線的粗管子（半徑從 r0 變到 r1）
      tube(a, b, c, r0, r1) { for (let i = 0; i <= 80; i++) { const t = i / 80, u = 1 - t, x = u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], y = u * u * a[1] + 2 * u * t * b[1] + t * t * c[1], r = r0 + (r1 - r0) * t; M.ell(x, y, r, r); } return M; },
      and(o) { for (let i = 0; i < m.length; i++) m[i] = m[i] && o.m[i] ? 1 : 0; return M; },
      not(o) { for (let i = 0; i < m.length; i++) if (o.m[i]) m[i] = 0; return M; },
    };
    return M;
  }
  // ramp：[最暗, 暗, 中, 亮]
  function paint(P, M, ramp, { d1 = 1, d2 = 3, h1 = 2 } = {}) {
    const run = (x, y, dx, dy) => { let k = 1; while (k < 12 && M.get(x + dx * k, y + dy * k)) k++; return k; };
    for (let y = 0; y < M.h; y++) for (let x = 0; x < M.w; x++) if (M.get(x, y)) {
      const br = Math.min(run(x, y, 1, 1), run(x, y, 0, 1) + 1, run(x, y, 1, 0) + 1), tl = Math.min(run(x, y, -1, -1), run(x, y, 0, -1) + 1, run(x, y, -1, 0) + 1);
      P.set(x, y, ramp[br <= d1 ? 0 : br <= d2 ? 1 : tl <= h1 ? 3 : 2]);
    }
    return M;
  }
  const rampOf = (base, dark = '#120c2a', light = '#fff7e0') => [mix(base, dark, .58), mix(base, dark, .28), base, mix(base, light, .38)];

  /* ================= 怪獸：坐著的小飛龍（面向左）96×84 ================= */
  function monster(pal) {
    const W = 96, H = 84, P = Cv(W, H);
    const B = rampOf(pal.m), WG = rampOf(pal.wing), BE = rampOf(pal.b, pal.m, '#ffffff'), HN = rampOf(pal.h, '#6a4a20', '#ffffff');
    const part = (fn, ramp, o) => { const M = Mask(W, H); fn(M); return paint(P, M, ramp, o); };
    const BIG = { d1: 2, d2: 6, h1: 3 }, MID = { d1: 1, d2: 4, h1: 2 }, SM = { d1: 1, d2: 2, h1: 1 };
    // 翅膀（在身體後面）：皮膜＋骨架
    part(M => M.poly([[54, 40], [60, 4], [70, 19], [83, 6], [84, 23], [95, 22], [88, 40], [74, 46]]), WG, MID);
    [[60, 5], [83, 7], [94, 23]].forEach(([x, y]) => P.line(56, 38, x, y, WG[3]));
    [[60, 5], [83, 7], [94, 23]].forEach(([x, y]) => P.line(57, 39, x + 1, y + 1, WG[0]));
    part(M => M.ell(60, 5, 2, 2).ell(83, 7, 2, 2).ell(94, 23, 1.6, 1.6), HN, SM);
    // 尾巴＋尾尖
    part(M => M.poly([[80, 50], [86, 38], [94, 49], [88, 53]]), HN, SM);
    part(M => M.tube([60, 70], [84, 82], [91, 64], 8, 4).tube([91, 64], [93, 56], [87, 50], 4, 2.2), B, MID);
    // 背鰭
    [[42, 20, 5], [49, 29, 6], [58, 36, 6], [67, 44, 6], [75, 55, 5]].forEach(([x, y, s]) => part(M => M.poly([[x - s, y + s * .4], [x + s * .9, y - s], [x + s, y + s]]), HN, SM));
    // 後腿、後腳
    part(M => M.ell(65, 63, 14, 15), B, BIG);
    // 身體＋脖子
    const body = part(M => M.ell(49, 56, 20, 21).tube([45, 44], [37, 35], [31, 22], 13, 9), B, BIG);
    // 鱗片
    [[58, 44], [63, 50], [56, 52], [61, 58], [54, 60], [59, 66], [44, 30], [47, 37], [41, 37]].forEach(([x, y]) => { P.set(x, y, B[1]); P.set(x + 1, y + 1, B[1]); P.set(x + 2, y, B[1]); });
    // 肚皮：從喉嚨到肚子一節一節
    const belly = Mask(W, H); belly.ell(38, 61, 11, 17).tube([37, 47], [29, 37], [25, 26], 6.5, 4).and(body); paint(P, belly, BE, MID);
    for (let y = 28; y < 80; y += 5) for (let x = 0; x < W; x++) if (belly.get(x, y)) { P.set(x, y, BE[0]); if (belly.get(x, y + 1)) P.set(x, y + 1, BE[3]); }
    // 後腿輪廓再蓋一次（壓在身體前面）
    part(M => M.ell(66, 65, 11, 12), B, BIG);
    // 腳
    const foot = (x, y, r) => { part(M => M.ell(x, y, r, 4.5), B, MID); [-r + 1, -r + 5, -r + 9].forEach(k => { P.rect(x + k, y + 1, 3, 3, '#fffdf2'); P.set(x + k, y + 1, B[0]); P.set(x + k + 2, y + 3, '#cfc8b0'); P.set(x + k, y + 4, INK); }); };
    foot(61, 79, 11); foot(37, 79, 9);
    // 下巴、嘴巴裡面
    part(M => M.ell(18, 31, 9.5, 4.2), B, SM);
    P.poly([[6, 25], [27, 25], [27, 30], [9, 30]], pal.r); P.rect(12, 29, 12, 1, mix(pal.r, '#ffb3c0', .55));
    // 頭：頭顱＋鼻吻
    part(M => M.ell(30, 17, 12, 10.5).ell(15, 20, 11.5, 7), B, MID);
    // 牙齒
    [7, 11, 15, 19, 23].forEach(x => { P.rect(x, 26, 3, 2, '#fffdf2'); P.set(x + 1, 28, '#fffdf2'); P.set(x + 2, 27, '#cfc8b0'); });
    [9, 21].forEach(x => { P.rect(x, 29, 2, 2, '#fffdf2'); P.set(x, 28, '#fffdf2'); });
    // 鼻孔、鼻樑亮點
    P.rect(6, 17, 2, 2, B[0]); P.set(8, 18, B[0]); P.rect(11, 15, 5, 1, B[3]);
    // 角、耳鰭
    part(M => M.poly([[33, 9], [48, 1], [45, 7], [41, 14]]), HN, SM);
    part(M => M.poly([[25, 8], [35, 0], [34, 5], [31, 10]]), HN, SM);
    part(M => M.poly([[38, 17], [49, 14], [48, 20], [43, 25]]), WG, SM); P.line(39, 18, 47, 16, WG[3]);
    // 眼睛：黃色眼珠、直的瞳孔、兇兇的眉骨
    P.poly([[20, 13], [27, 10.5], [31, 14], [28, 19], [22, 18.5]], INK);
    P.poly([[21, 14], [27, 12], [30, 14.5], [27, 18], [22.5, 17.5]], pal.eye); P.rect(22, 17, 5, 1, mix(pal.eye, '#c96a2a', .5));
    P.rect(24, 13, 2, 5, INK); P.set(23, 14, '#ffffff'); P.set(23, 13, '#ffffff');
    P.line(18, 13.5, 31, 9.5, INK, 2.2); P.line(19, 12, 30, 8.5, B[3]);
    // 臉頰
    P.ell(33, 24, 3, 1.8, pal.c);
    // 前手
    part(M => M.tube([46, 50], [35, 53], [28, 62], 5.5, 4.2), B, MID);
    [[23, 60], [24, 64], [27, 66]].forEach(([x, y]) => { P.rect(x, y, 3, 2, '#fffdf2'); P.set(x - 1, y + 1, '#fffdf2'); P.set(x + 2, y + 1, '#cfc8b0'); });
    P.outline(INK, 2);
    return P.url();
  }
  const MONPAL = [
    { m: '#7d5be0', wing: '#e0568f', b: '#f3e4c8', h: '#ffe9a8', r: '#a81f3c', c: '#ff8fb1', eye: '#ffe066' },
    { m: '#3fa864', wing: '#e89a3a', b: '#f2efc4', h: '#fff0b8', r: '#a81f3c', c: '#ffb3a0', eye: '#ffe066' },
    { m: '#e2573e', wing: '#f2b13a', b: '#ffe9c2', h: '#f5f0e6', r: '#7a1730', c: '#ffc79a', eye: '#fff07a' },
    { m: '#3b8fd6', wing: '#7a5be0', b: '#e6f2f0', h: '#ffd978', r: '#a81f3c', c: '#ffb3cf', eye: '#ffe066' },
  ];

  /* ================= 可愛怪獸（面向左）96×84：果凍怪、獨眼毛球、小恐龍、小幽靈、小惡魔 ================= */
  const BIGO = { d1: 2, d2: 7, h1: 4 }, MIDO = { d1: 1, d2: 4, h1: 2 }, SMO = { d1: 1, d2: 2, h1: 1 };
  function critter(fn) { const W = 96, H = 84, P = Cv(W, H); const part = (f, ramp, o) => { const M = Mask(W, H); f(M); return paint(P, M, ramp, o); }; fn(P, part); P.outline(INK, 2); return P.url(); }
  // 黑亮的豆豆眼
  const bean = (P, x, y, rx, ry) => { P.ell(x, y, rx, ry, INK); P.rect(Math.round(x - rx * .55), Math.round(y - ry * .6), 2, 2, '#ffffff'); P.set(Math.round(x + rx * .3), Math.round(y + ry * .35), '#b9b6d8'); };
  const blush = (P, x, y, c) => { P.ell(x, y, 4.5, 2.6, c); P.set(x - 2, y, mix(c, '#ffffff', .5)); P.set(x + 1, y, mix(c, '#ffffff', .5)); };
  const cute = {
    // A 果凍怪：圓圓的果凍身體、頭上長小芽、開心大嘴
    slime: c => critter((P, part) => {
      const B = rampOf(c, '#101040', '#ffffff');
      const LF = rampOf('#5cc46a');
      part(M => M.rect(47, 14, 3, 12), LF, SMO); part(M => M.ell(40, 12, 8, 4.5), LF, SMO); part(M => M.ell(57, 10, 8, 4.5), LF, SMO); P.line(35, 12, 45, 12, LF[1]); P.line(52, 10, 62, 10, LF[1]);
      part(M => M.ell(48, 58, 37, 24).ell(48, 48, 30, 26).not(Mask(96, 84).rect(0, 81, 96, 3)), B, BIGO);
      P.ell(27, 38, 6, 3.5, '#ffffff'); P.ell(37, 33, 2, 1.5, '#ffffff');
      bean(P, 28, 58, 4, 5.5); bean(P, 52, 58, 4, 5.5);
      blush(P, 19, 66, '#ff9ab8'); blush(P, 61, 66, '#ff9ab8');
      P.poly([[33, 63], [47, 63], [46, 69], [40, 72], [34, 69]], INK); P.poly([[34, 64], [46, 64], [45, 68], [40, 70.5], [35, 68]], '#a81f3c'); P.ell(40, 69, 3.5, 1.8, '#ff8aa0');
    }),
    // B 獨眼毛球：一顆大眼睛、炸毛、小角、鳥腳
    fuzz: c => critter((P, part) => {
      const B = rampOf(c), HN = rampOf('#ffe9a8', '#6a4a20', '#ffffff'), FT = rampOf('#ff9b3d');
      part(M => M.poly([[30, 18], [26, 2], [38, 14]]).poly([[66, 18], [72, 2], [59, 14]]), HN, SMO);
      [[34, 79], [60, 79]].forEach(([x, y]) => { part(M => M.rect(x - 1, y - 8, 3, 8), FT, SMO); part(M => M.ell(x - 2, y + 1, 7, 3), FT, SMO); });
      part(M => { M.ell(48, 44, 30, 28); for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, r0 = 27, r1 = 35 + (i % 2) * 3, w = .13; M.poly([[48 + Math.cos(a - w) * r0, 44 + Math.sin(a - w) * r0 * .93], [48 + Math.cos(a + .05) * r1, 44 + Math.sin(a + .05) * r1 * .93], [48 + Math.cos(a + w) * r0, 44 + Math.sin(a + w) * r0 * .93]]); } }, B, BIGO);
      P.ell(40, 40, 16, 16, INK); P.ell(40, 40, 14, 14, '#ffffff'); P.ell(42, 44, 12, 9, '#e6e2f5'); P.ell(39.5, 38.5, 13, 11, '#ffffff');
      P.ell(36, 42, 8, 8, '#3fb8c8'); P.ell(36, 42, 8, 8, '#2a8fa0'); P.ell(35, 41, 6.5, 6.5, '#48c7d6'); P.ell(35, 42, 4, 4, INK); P.rect(31, 37, 3, 3, '#ffffff'); P.set(38, 45, '#ffffff');
      P.poly([[30, 60], [52, 60], [49, 66], [33, 66]], INK); P.poly([[31, 61], [51, 61], [48.5, 65], [33.5, 65]], '#a81f3c');
      [33, 39, 45].forEach(x => { P.rect(x, 61, 3, 2, '#fffdf2'); P.set(x + 1, 63, '#fffdf2'); });
      blush(P, 62, 54, '#ff9ab8');
    }),
    // C 小恐龍：大頭、短手、背上圓圓的背板
    dino: c => critter((P, part) => {
      const B = rampOf(c), BE = rampOf('#fff1c9', c, '#ffffff'), PL = rampOf('#ff9b3d');
      part(M => M.tube([70, 68], [90, 80], [93, 58], 9, 2.5), B, MIDO);
      [[52, 13, 6], [64, 22, 6.5], [75, 36, 6.5], [82, 51, 5.5]].forEach(([x, y, r]) => part(M => M.ell(x, y, r, r), PL, SMO));
      [[50, 79], [70, 79]].forEach(([x, y]) => { part(M => M.ell(x, y, 9.5, 4.5), B, MIDO); [-8, -4].forEach(k => P.rect(x + k, y + 1, 2, 3, '#fffdf2')); });
      const body = part(M => M.ell(61, 60, 20, 20), B, BIGO);
      const belly = Mask(96, 84); belly.ell(52, 66, 11, 14).and(body); paint(P, belly, BE, MIDO);
      part(M => M.ell(36, 33, 26, 22).ell(19, 43, 16, 12), B, BIGO);
      part(M => M.ell(41, 62, 6, 4.5), B, SMO); P.rect(35, 63, 2, 2, '#fffdf2'); P.rect(36, 65, 2, 2, '#fffdf2');
      bean(P, 30, 32, 4.5, 6.5); P.rect(5, 38, 2, 2, B[0]); P.rect(10, 37, 2, 2, B[0]);
      blush(P, 37, 45, '#ff9ab8');
      P.path([[6, 49], [12, 51.5], [20, 52], [27, 50]], INK, 1.6); P.rect(13, 52, 3, 3, '#fffdf2'); P.set(14, 55, '#fffdf2');
      P.ell(26, 16, 5, 2.5, B[3]);
    }),
    // D 小幽靈：飄飄的下襬、吐舌頭、舉著兩隻小手
    ghost: c => critter((P, part) => {
      const B = [mix(c, '#3a2f7a', .55), mix(c, '#3a2f7a', .2), c, '#ffffff'];
      part(M => M.ell(13, 44, 8, 6).ell(83, 40, 8, 6), B, SMO);
      part(M => M.ell(48, 36, 30, 30).rect(18, 36, 61, 34).ell(28, 70, 10, 9).ell(48, 71, 10, 9).ell(68, 70, 10, 9), B, BIGO);
      bean(P, 34, 34, 5, 7); bean(P, 56, 34, 5, 7);
      blush(P, 25, 45, '#ff9ab8'); blush(P, 65, 45, '#ff9ab8');
      P.ell(45, 50, 7.5, 6, INK); P.ell(45, 50, 6, 4.6, '#7a1730'); P.ell(45, 56, 4.6, 5.5, INK); P.ell(45, 55.5, 3.4, 4.6, '#ff8aa0'); P.rect(45, 53, 1, 6, '#e06a86');
    }),
    // E 小惡魔：圓圓的身體、小角、蝙蝠翅膀、箭頭尾巴、一顆虎牙
    imp: c => critter((P, part) => {
      const B = rampOf(c), WG = rampOf(mix(c, '#2a1050', .45)), HN = rampOf('#fff0c4', '#6a4a20', '#ffffff'), BE = rampOf(mix(c, '#fff1c9', .7), c, '#ffffff');
      part(M => M.poly([[24, 44], [2, 24], [8, 40], [0, 44], [9, 50], [4, 58], [26, 58]]).poly([[70, 44], [92, 24], [86, 40], [95, 44], [85, 50], [90, 58], [68, 58]]), WG, MIDO);
      part(M => M.tube([68, 68], [90, 76], [88, 58], 2.4, 2).poly([[82, 58], [88, 47], [94, 58], [88, 55]]), WG, SMO);
      part(M => M.poly([[25, 30], [18, 9], [34, 24]]).poly([[69, 30], [76, 9], [60, 24]]), HN, SMO);
      [[36, 79], [58, 79]].forEach(([x, y]) => part(M => M.ell(x, y, 8.5, 4.5), B, MIDO));
      const body = part(M => M.ell(47, 50, 28, 27), B, BIGO);
      const belly = Mask(96, 84); belly.ell(45, 66, 14, 10).and(body); paint(P, belly, BE, MIDO);
      bean(P, 34, 46, 4.5, 6); bean(P, 56, 46, 4.5, 6);
      P.line(27, 37, 37, 40, INK, 2); P.line(63, 37, 53, 40, INK, 2);
      blush(P, 25, 55, '#ffb0c8'); blush(P, 65, 55, '#ffb0c8');
      P.path([[36, 56], [40, 59.5], [46, 60.5], [52, 59.5], [56, 56]], INK, 1.8); P.rect(38, 59, 3, 3, '#fffdf2'); P.set(39, 62, '#fffdf2');
    }),
  };
  // 每款四種顏色
  const CUTE = {
    slime: ['#4fb8e8', '#ff8fb1', '#5fd0a8', '#ffc94a'],
    fuzz: ['#8a63e8', '#2fb5a6', '#ff8a4a', '#f06aa8'],
    dino: ['#5cc46a', '#4aa8e8', '#ff9a52', '#a57be0'],
    ghost: ['#eef0ff', '#d9f7ea', '#ffe3ee', '#fff5c9'],
    imp: ['#ef5b6b', '#9a63e8', '#3fa8c8', '#ff8a3a'],
  };

  /* ================= 武器（都指向右邊）、砲彈、大砲 ================= */
  const STEEL = ['#4a5068', '#8a93a8', '#c5ccda', '#f4f7fb'], GOLD = ['#8a5a10', '#d49a1e', '#ffd166', '#fff3c4'], WOOD = ['#3a2416', '#6e4526', '#9a6a3f', '#c99560'], IRON = ['#16142a', '#35324e', '#5d5a77', '#9a97b8'];
  function sprite(w, h, fn) { const P = Cv(w, h); const part = (f, ramp, o) => { const M = Mask(w, h); f(M); return paint(P, M, ramp, o); }; fn(P, part); P.outline(); return { src: P.url(), w: w / 2.7, h: h / 2.7 }; }
  const SM1 = { d1: 1, d2: 2, h1: 1 };
  const weapons = {
    sword: sprite(46, 18, (P, part) => {
      part(M => M.poly([[15, 6], [39, 6], [45, 9], [39, 12], [15, 12]]), STEEL, SM1);
      P.rect(16, 9, 22, 1, STEEL[1]); P.rect(16, 8, 22, 1, STEEL[3]); P.rect(16, 6, 23, 1, '#ffffff'); P.set(40, 7, '#ffffff'); P.set(41, 8, '#ffffff');
      part(M => M.rect(4, 7, 9, 4), WOOD, SM1); [5, 8, 11].forEach(x => P.rect(x, 7, 1, 4, WOOD[0]));
      part(M => M.rect(12, 1, 4, 16).ell(14, 2, 2.5, 2.5).ell(14, 16, 2.5, 2.5), GOLD, SM1);
      part(M => M.ell(3, 9, 3, 3), GOLD, SM1);
      P.rect(13, 8, 2, 2, '#e8414f'); P.set(13, 8, '#ff9aa6');
    }),
    arrow: sprite(44, 13, (P, part) => {
      part(M => M.poly([[1, 0], [10, 0], [14, 6], [5, 6]]).poly([[1, 13], [10, 13], [14, 7], [5, 7]]), ['#8f1f33', '#c2283f', '#e8414f', '#ff8a8a'], SM1);
      P.line(4, 1, 8, 5, '#fffaf0'); P.line(7, 1, 11, 5, '#fffaf0'); P.line(4, 11, 8, 7, '#fffaf0'); P.line(7, 11, 11, 7, '#fffaf0');
      part(M => M.rect(3, 5, 32, 3), WOOD, SM1); P.rect(4, 5, 30, 1, WOOD[3]);
      part(M => M.rect(30, 4, 3, 5), GOLD, SM1);
      part(M => M.poly([[32, 0], [44, 6.5], [32, 13], [35, 6.5]]), STEEL, SM1); P.line(34, 2, 41, 6, '#ffffff');
    }),
    hammer: sprite(42, 24, (P, part) => {
      part(M => M.rect(3, 10, 26, 4), WOOD, SM1); [7, 10, 13].forEach(x => P.rect(x, 10, 1, 4, WOOD[0])); P.rect(15, 10, 12, 1, WOOD[3]);
      part(M => M.ell(2, 12, 2.6, 3), GOLD, SM1);
      part(M => M.rect(27, 2, 13, 20), STEEL, { d1: 1, d2: 3, h1: 2 });
      part(M => M.rect(25, 0, 4, 24), IRON, SM1); part(M => M.rect(38, 0, 4, 24), IRON, SM1);
      part(M => M.poly([[33.5, 8], [37, 12], [33.5, 16], [30, 12]]), GOLD, SM1);
    }),
    wand: sprite(44, 22, (P, part) => {
      part(M => M.rect(1, 10, 26, 3), ['#2a1740', '#4a2a70', '#6b3fa0', '#a57be0'], SM1); [5, 11, 17, 23].forEach(x => { P.rect(x, 10, 2, 3, GOLD[2]); P.set(x, 10, GOLD[3]); });
      part(M => M.rect(25, 8, 3, 7), GOLD, SM1);
      const star = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4 : 9.5; star.push([34 + Math.cos(a) * r, 11.5 + Math.sin(a) * r]); }
      part(M => M.poly(star), GOLD, SM1); P.ell(33, 10, 1.6, 1.6, '#fffdf2');
      [[42, 2], [26, 3], [42, 19]].forEach(([x, y]) => { P.set(x, y, '#ffffff'); P.set(x - 1, y, '#fff3c4'); P.set(x + 1, y, '#fff3c4'); P.set(x, y - 1, '#fff3c4'); P.set(x, y + 1, '#fff3c4'); });
    }),
  };
  // 砲彈：亮面漆球，腰上一圈鉚釘鐵箍
  function shell(col) {
    const P = Cv(28, 28), R5 = [mix(col, '#120c2a', .62), mix(col, '#120c2a', .34), col, mix(col, '#ffffff', .3), mix(col, '#ffffff', .6)];
    P.ball(14, 14, 12, 12, R5, -.55, -.65, true);
    for (let x = 2; x < 26; x++) { const k = (x - 14) / 12, yb = 15 + Math.round(3.2 * (1 - k * k)); for (let d = -1; d <= 1; d++) if (P.has(x, yb + d) && (k * k + ((yb + d - 14) / 12) ** 2) < .9) P.set(x, yb + d, d < 0 ? IRON[3] : d > 0 ? IRON[0] : IRON[2]); if (x % 5 === 2) P.set(x, yb, '#fff3c4'); }
    P.ell(9, 8, 3, 2, '#ffffff'); P.set(12, 6, '#ffffff'); P.set(6, 11, R5[4]);
    for (let a = .3; a < 1.3; a += .08) P.set(14 + Math.cos(a) * 11, 14 + Math.sin(a) * 11, R5[2]);
    P.outline(); return P.url();
  }
  const cannon = sprite(58, 44, (P, part) => {
    // 引信
    P.line(9, 7, 6, 3, '#8a5a35'); P.set(5, 2, '#ff9b3d'); P.set(4, 1, '#ffd166'); P.set(6, 1, '#ffd166'); P.set(5, 0, '#fff3c4'); P.set(3, 3, '#ffd166');
    // 砲架
    part(M => M.poly([[6, 27], [42, 24], [47, 35], [4, 38]]), WOOD, { d1: 1, d2: 3, h1: 2 }); P.rect(8, 31, 36, 1, WOOD[0]);
    // 砲管
    part(M => M.poly([[9, 6], [51, 8], [51, 22], [9, 24]]).ell(9, 15, 8, 9), IRON, { d1: 2, d2: 5, h1: 3 });
    part(M => M.ell(2, 15, 2.4, 2.6), IRON, SM1);
    P.rect(10, 9, 38, 1, '#cfcde6'); P.rect(12, 10, 20, 1, IRON[3]);
    [[17, 5, 20], [31, 6, 18]].forEach(([x, y, hh]) => part(M => M.rect(x, y, 3, hh), ['#16142a', '#46426e', '#7a779c', '#b9b6d8'], SM1));
    part(M => M.rect(49, 5, 6, 20), ['#16142a', '#46426e', '#7a779c', '#b9b6d8'], SM1); P.rect(55, 9, 2, 12, '#0a0818');
    // 輪子
    part(M => M.ell(27, 32, 11.5, 11.5), IRON, SM1); P.ell(27, 32, 9, 9, '#24160e');
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + .2; P.line(27, 32, 27 + Math.cos(a) * 9, 32 + Math.sin(a) * 9, WOOD[2], 2); P.line(27, 32, 27 + Math.cos(a) * 8, 31.4 + Math.sin(a) * 8, WOOD[3]); }
    part(M => M.ell(27, 32, 3.4, 3.4), GOLD, SM1);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + .6; P.set(27 + Math.cos(a) * 10.4, 32 + Math.sin(a) * 10.4, '#cfcde6'); }
  });

  /* ================= 賽馬（面向右）54×38，兩格：收腿／伸展 ================= */
  const COATS = [['#a05c34', '#3a2618'], ['#4a4458', '#1d1b2e'], ['#e9e3d8', '#9a94a8'], ['#d3a052', '#fff3c4']];
  function horse(coat, maneCol, jersey, f) {
    const P = Cv(54, 38), C = ramp4(coat, '#1a1020'), M = [mix(maneCol, '#000000', .25), maneCol, mix(maneCol, '#ffffff', .3)], J = ramp4(jersey), hoof = '#2a1c12';
    const leg = (pts, far) => { P.path(pts, far ? C[0] : C[1], 2.6); if (!far) P.path(pts.map(([x, y]) => [x - .6, y]), C[2], 1.2); const [x, y] = pts[pts.length - 1]; P.rect(Math.round(x) - 1, Math.round(y), 3, 2, hoof); };
    const L = f === 0
      ? { ff: [[34, 25], [36, 30], [34, 34]], fn: [[37, 25], [38, 30], [38, 34]], hf: [[17, 25], [14, 30], [16, 34]], hn: [[14, 25], [12, 30], [13, 34]] }
      : { ff: [[36, 24], [42, 29], [47, 31]], fn: [[37, 25], [45, 26], [50, 28]], hf: [[16, 25], [11, 30], [6, 33]], hn: [[13, 24], [8, 27], [3, 30]] };
    leg(L.ff, true); leg(L.hf, true);
    // 尾巴
    if (f === 0) P.poly([[12, 17], [7, 17], [4, 22], [4, 30], [7, 31], [8, 24], [12, 21]], (x, y) => (x < 6 ? M[0] : M[1]));
    else P.poly([[12, 17], [5, 13], [1, 14], [0, 18], [5, 19], [12, 21]], (x, y) => (y > 17 ? M[0] : M[1]));
    // 身體、脖子、頭
    P.ball(25, 21, 14, 6.6, C, -.3, -.85);
    P.ball(36, 20, 5, 6, C, -.3, -.85);
    P.poly([[31, 16], [40, 22], [47, 11], [42, 6]], (x, y) => (y - x * .9 > -27 ? C[1] : C[2]));
    P.poly([[41, 6], [45, 4], [51, 9], [52, 12], [50, 14], [46, 13], [42, 11]], (x, y) => (y > 11 ? C[1] : C[2]));
    P.rect(49, 11, 3, 3, mix(coat, '#3a2618', .45)); P.set(50, 12, INK);
    P.poly([[42, 2], [44, 6], [41, 6]], C[1]); P.set(46, 8, INK); P.set(46, 7, INK); P.set(45, 7, '#ffffff');
    // 鬃毛
    P.path([[42, 4], [38, 8], [34, 12], [31, 15]], M[1], 2.6); P.path([[41, 4], [37, 8], [33, 12]], M[2], 1); P.set(44, 4, M[1]); P.set(45, 5, M[1]);
    // 韁繩
    P.line(49, 12, 36, 13, '#3a2618');
    leg(L.fn, false); leg(L.hn, false);
    // 馬鞍墊（號碼布）
    P.rect(20, 14, 11, 7, jersey); P.rect(20, 14, 11, 1, J[3]); P.rect(20, 20, 11, 1, J[0]); P.rect(20, 14, 1, 7, '#fffaf0'); P.rect(30, 14, 1, 7, '#fffaf0');
    // 騎師：身體前傾
    const lean = f ? 1 : 0;
    P.path([[25, 14], [27, 18]], '#fffaf0', 2.4); P.rect(26, 19, 4, 2, INK);
    P.poly([[21, 14], [27, 14], [32 + lean, 7], [27 + lean, 5]], (x, y) => (x - y > 17 ? J[2] : J[1])); P.rect(24, 10, 4, 1, '#fffaf0');
    P.path([[29 + lean, 8], [34, 12]], J[1], 2.2); P.rect(34, 12, 2, 2, '#f5c79a');
    P.ell(32 + lean, 4.5, 2.8, 2.8, '#f5c79a'); P.set(34 + lean, 4, INK);
    P.poly([[29 + lean, 4], [29.5 + lean, 1], [34 + lean, 1], [35 + lean, 3.2], [37 + lean, 3.2], [37 + lean, 4]], jersey); P.rect(30 + lean, 1, 4, 1, J[3]);
    P.outline();
    return P.url();
  }

  /* ================= 拆炸彈：地下室 ================= */
  function bgBomb() {
    const P = Cv(320, 200, 11);
    // 磚牆：吊燈照到的地方比較亮
    const inCone = (x, y) => y > 26 && Math.abs(x - 158) < 14 + (y - 26) * .62;
    P.rect(0, 0, 320, 170, '#2a2540');
    for (let r = 0; r * 12 < 170; r++) for (let c = -1; c * 32 < 320; c++) {
      const bx = c * 32 + (r % 2 ? 16 : 0), by = r * 12, lit = inCone(bx + 16, by + 6), base = lit ? ['#5a5380', '#615a88', '#565079'][P.R() * 3 | 0] : ['#474063', '#4c4569', '#433c5e'][P.R() * 3 | 0];
      P.rect(bx + 1, by + 1, 31, 11, base); P.rect(bx + 1, by + 1, 31, 1, mix(base, '#ffffff', .14)); P.rect(bx + 1, by + 11, 31, 1, mix(base, '#000000', .22)); P.rect(bx + 31, by + 1, 1, 11, mix(base, '#000000', .14));
    }
    // 吊燈
    P.rect(157, 0, 2, 16, INK); P.poly([[146, 24], [150, 16], [166, 16], [170, 24]], '#5d5a77'); P.rect(150, 16, 16, 1, '#a7a4c4'); P.rect(146, 23, 24, 1, '#35324e'); P.rect(152, 24, 12, 3, '#fff3c4'); P.rect(154, 27, 8, 1, '#ffe08a');
    // 通風口
    P.rect(14, 14, 44, 24, INK); P.rect(16, 16, 40, 20, '#35324e'); for (let y = 18; y < 35; y += 4) { P.rect(18, y, 36, 2, '#5d5a77'); P.rect(18, y, 36, 1, '#8b8aa3'); } [[15, 15], [56, 15], [15, 36], [56, 36]].forEach(([x, y]) => P.set(x, y, '#a7a4c4'));
    // 警告標誌（放在炸彈和選項牌中間的上方）
    P.poly([[130, 8], [144, 32], [116, 32]], INK); P.poly([[130, 11], [141.5, 30.5], [118.5, 30.5]], '#ffd166'); P.poly([[130, 12], [133, 17], [127, 17]], '#fff3c4'); P.rect(129, 17, 3, 8, INK); P.rect(129, 27, 3, 2, INK);
    // 牆上管線
    P.rect(0, 140, 320, 7, '#35324e'); P.rect(0, 140, 320, 2, '#9a97b8'); P.rect(0, 142, 320, 3, '#6b6890'); P.rect(0, 147, 320, 2, '#1d1934');
    for (let x = 20; x < 320; x += 60) { P.rect(x, 137, 7, 13, INK); P.rect(x + 1, 138, 5, 11, '#4a4766'); P.rect(x + 1, 138, 5, 1, '#8b8aa3'); P.set(x + 3, 143, '#cfcde6'); }
    // 地面：警告條＋鋼板（保持乾淨）
    for (let y = 168; y < 174; y++) for (let x = 0; x < 320; x++) P.set(x, y, ((x + (y - 168)) >> 3) % 2 ? INK : '#ffd166');
    P.rect(0, 167, 320, 1, INK); P.rect(0, 174, 320, 26, '#2a2640'); P.rect(0, 174, 320, 2, '#57507c');
    for (let x = 0; x < 320; x += 80) { P.rect(x, 176, 1, 24, '#1d1934'); P.rect(x + 1, 176, 1, 24, '#35304e'); P.set(x + 5, 180, '#57507c'); P.set(x + 75, 180, '#57507c'); P.set(x + 5, 196, '#57507c'); P.set(x + 75, 196, '#57507c'); }
    return P.url();
  }
  // 炸彈本體 84×92
  function spBomb() {
    // 乾淨的三階明暗：底色、左上一大塊亮面、一小塊反光；粗黑框
    const P = Cv(84, 92);
    P.ell(42, 52, 36, 36, '#23212f');
    for (let y = 16; y < 90; y++) for (let x = 6; x < 80; x++) { const a = Math.hypot(x + .5 - 42, y + .5 - 52), b = Math.hypot(x + .5 - 34, y + .5 - 43); if (a < 36 && b < 25) P.set(x, y, '#3d3b4f'); if (a < 36 && Math.hypot(x + .5 - 30, y + .5 - 38) < 13) P.set(x, y, '#5d5a77'); }
    P.ell(25, 33, 6, 4, '#a7a4c4'); P.rect(21, 31, 6, 2, '#e6e4f5');
    for (let y = 16; y < 90; y++) for (let x = 6; x < 80; x++) { const a = Math.hypot(x + .5 - 42, y + .5 - 52); if (a < 36 && a > 31 && (x - 42) + (y - 52) > 14) P.set(x, y, '#15131f'); }
    P.rect(30, 6, 24, 12, '#8b8aa3'); P.rect(30, 6, 24, 3, '#d3d1e6'); P.rect(30, 15, 24, 3, '#5d5a77'); P.rect(48, 9, 6, 6, '#6b6890');
    P.rect(28, 17, 28, 3, '#35324e');
    P.outline('#0b0912', 2); return P.url();
  }

  /* ================= 扭蛋機：玩具店 ================= */
  function bgGacha() {
    const P = Cv(320, 200, 31);
    for (let x = 0; x < 320; x++) P.rect(x, 0, 1, 132, (x >> 4) % 2 ? '#ffd9e8' : '#ffe6f0');
    for (let x = 0; x < 320; x += 16) P.rect(x, 0, 1, 132, '#ffcfe0');
    // 掛旗
    for (let x = 0; x < 320; x++) P.set(x, 5 + Math.round(4 * Math.sin((x % 80) / 80 * Math.PI)), '#c98a9c');
    for (let x = 6, i = 0; x < 320; x += 20, i++) { const y0 = 6 + Math.round(4 * Math.sin(((x + 6) % 80) / 80 * Math.PI)), c = ['#ff8fb1', '#ffd166', '#7fd6c2', '#b48cff', '#7fb8f0'][i % 5]; P.poly([[x, y0], [x + 13, y0], [x + 6.5, y0 + 12]], c); P.poly([[x, y0], [x + 5, y0], [x + 4, y0 + 5]], mix(c, '#ffffff', .4)); }
    // 木牆裙
    for (let x = 0; x < 320; x += 20) { const b = ['#dba56c', '#d59c62', '#e0ac74'][P.R() * 3 | 0]; P.rect(x, 132, 20, 26, b); P.rect(x, 132, 1, 26, '#b07a45'); P.rect(x + 1, 132, 1, 26, '#eebf8c'); for (let k = 0; k < 2; k++) P.rect(x + 4 + P.R() * 10, 138 + P.R() * 14, 1, 4, '#c08a52'); }
    P.rect(0, 130, 320, 3, '#f3cfa0'); P.rect(0, 133, 320, 1, '#a8743f');
    // 層架和玩具
    const box = (x, y, w, h, c) => { P.rect(x, y - h, w, h, c); P.rect(x, y - h, w, 2, mix(c, '#ffffff', .4)); P.rect(x + w - 2, y - h, 2, h, mix(c, '#000000', .22)); P.rect(x + 2, y - h + 4, w - 6, 2, '#fffaf0'); P.rect(x + 2, y - h + 8, Math.max(2, w - 10), 1, mix(c, '#ffffff', .5)); };
    const bear = (x, y, c) => { P.ell(x - 4, y - 17, 2.5, 2.5, c); P.ell(x + 4, y - 17, 2.5, 2.5, c); P.ball(x, y - 12, 6, 5.5, rampOf(c)); P.ball(x, y - 4, 5, 4.5, rampOf(c)); P.ell(x, y - 11, 2.4, 1.8, '#fff1dc'); P.set(x - 2, y - 13, INK); P.set(x + 2, y - 13, INK); P.set(x, y - 11, INK); };
    const ball = (x, y) => { P.ball(x, y - 6, 6, 6, ['#b02a3c', '#e8414f', '#ff7a7a', '#ffd0d4']); P.rect(x - 6, y - 7, 12, 2, '#fffaf0'); P.set(x - 3, y - 10, '#ffffff'); };
    const robot = (x, y) => { P.rect(x - 5, y - 10, 10, 10, '#7fb8f0'); P.rect(x - 5, y - 10, 10, 1, '#cfe6ff'); P.rect(x - 4, y - 18, 8, 7, '#a7c8f0'); P.rect(x - 4, y - 18, 8, 1, '#e6f2ff'); P.rect(x - 2, y - 16, 2, 2, INK); P.rect(x + 1, y - 16, 2, 2, INK); P.rect(x, y - 21, 1, 3, '#5d5a77'); P.set(x, y - 22, '#e8414f'); P.rect(x - 2, y - 7, 4, 3, '#ffd166'); };
    const cols = ['#e8414f', '#3c8dde', '#ffd166', '#2f9e5b', '#b48cff', '#ff7a1a'];
    [[4, 40, 0], [224, 40, 1], [4, 88, 2], [224, 88, 3]].forEach(([x, y, k]) => {
      P.rect(x, y, 92, 4, '#8a5a35'); P.rect(x, y, 92, 1, '#c08a52'); P.rect(x, y + 4, 92, 2, '#f3c0d2'); P.rect(x + 6, y + 4, 3, 6, '#6e4a2a'); P.rect(x + 83, y + 4, 3, 6, '#6e4a2a');
      let bx = x + 3; const special = [bear, ball, robot, bear][k], sp = 1 + (k % 3);
      for (let i = 0; bx < x + 78; i++) { if (i === sp) { special(bx + 8, y, ['#c98a5a', '', '', '#f0a8c0'][k] || '#c98a5a'); bx += 19; continue; } const w = 11 + (P.R() * 8 | 0), h = 11 + (P.R() * 11 | 0); box(bx, y, w, h, cols[P.R() * 6 | 0]); bx += w + 2 + (P.R() * 3 | 0); }
    });
    // 櫃台：平塗，硬幣放這裡
    P.rect(0, 158, 320, 42, '#c9567d'); P.rect(0, 158, 320, 3, '#ff9fc0'); P.rect(0, 161, 320, 2, '#e67aa0'); P.rect(0, 163, 320, 1, '#8f2f53');
    for (let x = 0; x < 320; x += 40) P.rect(x, 164, 1, 36, '#b84d73');
    return P.url();
  }
  function spMachine() {
    const P = Cv(96, 68), M = Mask(96, 68); M.rect(1, 1, 94, 66);
    paint(P, M, ['#8f1f33', '#c2283f', '#e8414f', '#ff7a85'], { d1: 2, d2: 8, h1: 4 });
    P.rect(1, 1, 94, 3, '#ff9aa2'); [[6, 8], [88, 8], [6, 58], [88, 58]].forEach(([x, y]) => { P.rect(x, y, 2, 2, '#ffd0d4'); P.set(x + 1, y + 1, '#8f1f33'); });
    // 投幣口座
    const S = Mask(96, 68); S.rect(64, 8, 20, 24); paint(P, S, ['#6b6890', '#9a97b8', '#d3d1e6', '#ffffff'], { d1: 1, d2: 3, h1: 2 }); P.rect(63, 7, 22, 1, INK); P.rect(63, 32, 22, 1, INK); P.rect(63, 7, 1, 26, INK); P.rect(84, 7, 1, 26, INK); P.rect(72, 11, 4, 17, INK); P.rect(73, 12, 1, 15, '#35324e');
    // 星星貼紙
    const star = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4 : 9; star.push([48 + Math.cos(a) * r, 17 + Math.sin(a) * r]); }
    const T = Mask(96, 68); T.poly(star); paint(P, T, ['#c98a00', '#f2b632', '#ffd166', '#fff3c4'], { d1: 1, d2: 2, h1: 1 });
    // 出口
    P.rect(30, 40, 36, 22, INK); P.rect(32, 42, 32, 18, '#2a2640'); P.rect(32, 42, 32, 5, '#121019'); P.rect(30, 40, 36, 2, '#d3d1e6'); P.rect(32, 58, 32, 2, '#3d3858');
    P.rect(0, 0, 96, 1, INK); P.rect(0, 67, 96, 1, INK); P.rect(0, 0, 1, 68, INK); P.rect(95, 0, 1, 68, INK);
    return P.url();
  }
  function spKnob() {
    const P = Cv(30, 30); P.ball(15, 15, 13.5, 13.5, ['#b9b29c', '#e6e1d3', '#fffaf0', '#ffffff'], -.5, -.7, true);
    const M = Mask(30, 30); M.rect(3, 12, 24, 6); paint(P, M, ['#16142a', '#35324e', '#5d5a77', '#9a97b8'], { d1: 1, d2: 2, h1: 1 }); P.ell(15, 15, 3, 3, '#9a97b8'); P.ell(14.5, 14.5, 1.5, 1.5, '#e6e4f5');
    P.outline(); return P.url();
  }

  /* ================= 火箭發射：夜晚的發射場 ================= */
  function bgRocket() {
    const P = Cv(320, 200, 47);
    P.grad(0, 0, 320, 168, ['#0b0a1e', '#100e2a', '#171438', '#201b48', '#2b2459', '#3a3070', '#4c3f86'], (u, v) => Math.pow(v, 1.5));
    stars(P, 320, 140, ['#fffaf0', '#fff3c4', '#b9d8ff', '#ffd6e6'], '#171438');
    const mx = 264, my = 32, mr = 18;
    for (let y = my - 40; y < my + 40; y++) for (let x = mx - 40; x < mx + 40; x++) { const dd = Math.hypot(x + .5 - mx, y + .5 - my); if (dd < mr + 18 && dd > mr - 1) P.veil(x, y, '#4a3f8c', Math.max(0, 1 - (dd - mr) / 18) * .7); }
    P.ball(mx, my, mr, mr, ['#cdbb86', '#e6d79f', '#f6ecbb', '#fff8dc', '#fffdf2'], -.5, -.6, true);
    [[-6, -5, 4, 3.4], [6, 4, 3.2, 2.8], [-3, 8, 2.4, 2], [8, -8, 2, 1.8]].forEach(([dx, dy, a, b]) => { P.ell(mx + dx, my + dy, a, b, '#d9c990'); P.ell(mx + dx + .6, my + dy + .6, a * .72, b * .72, '#e9dba6'); });
    // 遠山
    const ridge = (base, amp, ph, fill, rim) => { let j = 0; for (let x = 0; x < 320; x++) { j += (P.R() - .5) * 2.2; j = Math.max(-3, Math.min(3, j)); const top = Math.round(base - amp * (.55 + .45 * Math.sin(x * .027 + ph)) * (.6 + .4 * Math.sin(x * .071 + ph * 2)) + j); for (let y = top; y < 168; y++) P.set(x, y, y - top < 2 ? rim : fill); } };
    ridge(148, 34, .8, '#2a2458', '#463c80'); ridge(160, 20, 3.6, '#1c1840', '#2e2860');
    // 遠方的管制塔和小燈
    P.rect(18, 118, 8, 50, '#14112e'); P.rect(24, 118, 2, 50, '#2e2860'); P.rect(12, 108, 20, 11, '#14112e'); P.rect(14, 111, 16, 4, '#ffd166'); P.rect(14, 111, 16, 1, '#fff3c4'); P.rect(21, 96, 1, 12, '#5d5a77'); P.set(21, 95, '#ff4141'); P.veil(20, 95, '#ff4141', .5); P.veil(22, 95, '#ff4141', .5);
    for (let x = 50; x < 320; x += 37) { P.set(x, 165 - (x % 5), '#ffd166'); P.set(x + 1, 165 - (x % 5), '#ff9b3d'); }
    // 發射場地面（平塗）
    P.rect(0, 168, 320, 32, '#5d5a77'); P.rect(0, 168, 320, 2, '#b9b6d8'); P.rect(0, 170, 320, 1, '#8b8aa3');
    for (let x = 0; x < 320; x += 64) P.rect(x, 171, 1, 25, '#4a4766');
    for (let y = 196; y < 200; y++) for (let x = 0; x < 320; x++) P.set(x, y, ((x + (y - 196)) >> 3) % 2 ? INK : '#ffd166');
    return P.url();
  }
  // 火箭 28×38（機頭朝上）
  function spRocket(c) {
    const P = Cv(28, 38), W = ['#8f8ca8', '#c5c2dc', '#f2f4f8', '#ffffff'], C = rampOf(c), SMR = { d1: 1, d2: 2, h1: 1 };
    const part = (f, ramp, o) => { const M = Mask(28, 38); f(M); return paint(P, M, ramp, o); };
    part(M => M.poly([[2, 36], [2, 28], [8, 22], [8, 34]]).poly([[26, 36], [26, 28], [20, 22], [20, 34]]), C, SMR);
    part(M => M.rect(11, 33, 6, 4), ['#16142a', '#35324e', '#5d5a77', '#9a97b8'], SMR);
    part(M => M.rect(8, 9, 12, 25).ell(14, 10, 6, 6), W, { d1: 1, d2: 3, h1: 2 });
    part(M => M.poly([[8, 10], [14, 0], [20, 10]]).ell(14, 8, 6, 3), C, SMR);
    P.ell(14, 17, 3.6, 3.6, INK); P.ell(14, 17, 2.6, 2.6, '#78c3f0'); P.set(13, 16, '#e6f6ff'); P.set(12, 16, '#e6f6ff');
    P.rect(8, 25, 12, 2, c); P.rect(8, 25, 2, 2, C[3]); P.rect(18, 25, 2, 2, C[1]);
    part(M => M.poly([[12, 36], [12, 29], [14, 26], [16, 29], [16, 36]]), C, SMR);
    P.outline(); return P.url();
  }

  /* ================= 釣大魚：夕陽碼頭 ================= */
  function bgFish() {
    const P = Cv(320, 200, 59);
    P.grad(0, 0, 320, 60, ['#f47a6a', '#ff9370', '#ffab7e', '#ffc291', '#ffd7a6', '#ffe9c2'], (u, v) => v);
    // 夕陽和光暈
    for (let y = 0; y < 60; y++) for (let x = 210; x < 320; x++) { const dd = Math.hypot(x - 264, y - 28); if (dd < 40) P.veil(x, y, '#fff0c0', (1 - dd / 40) * .6); }
    P.ball(264, 28, 16, 16, ['#ff7a3a', '#ff9f43', '#ffbe5c', '#ffd98a'], -.3, -.7, true);
    // 雲
    const cloud = (x, y, s) => { [[0, 3, 6], [7, 0, 8], [16, 2, 6], [23, 4, 4]].forEach(([dx, dy, r]) => P.ell(x + dx * s, y + dy * s + r * s * .5, r * s, r * s * .6, '#fff4e0')); P.rect(x - 5 * s, y + 6 * s, 32 * s, 2 * s, '#ffc7a6'); P.rect(x - 2 * s, y + 5 * s, 26 * s, 1 * s, '#fff4e0'); };
    cloud(70, 8, 1); cloud(180, 26, .7); cloud(8, 30, .6);
    [[120, 16], [132, 12], [140, 18]].forEach(([x, y]) => { P.set(x, y, '#5d4a66'); P.set(x - 1, y - 1, '#5d4a66'); P.set(x + 1, y - 1, '#5d4a66'); P.set(x - 2, y - 1, '#5d4a66'); P.set(x + 2, y - 1, '#5d4a66'); });
    // 遠方小島
    { let j = 0; for (let x = 0; x < 320; x++) { j += (P.R() - .5) * 1.6; j = Math.max(-2, Math.min(2, j)); const top = Math.round(60 - 9 * (.5 + .5 * Math.sin(x * .03 + 1)) * (.5 + .5 * Math.sin(x * .011)) + j); for (let y = top; y < 60; y++) P.set(x, y, y - top < 1 ? '#c98aa0' : '#a8648a'); } }
    // 海：幾層平塗，交界只有一小條抖色
    const sea = ['#3f97d0', '#3385c2', '#2a74b2', '#2364a2', '#1e5592', '#1a4782'], ys = [60, 70, 86, 108, 136, 168, 200];
    sea.forEach((c, i) => { P.rect(0, ys[i], 320, ys[i + 1] - ys[i], c); });
    P.rect(0, 60, 320, 1, '#9ad0f0');
    // 夕陽倒影（只在遠處海面）
    for (let y = 62; y < 96; y += 3) { const w = 26 - (y - 62) * .6; P.rect(264 - w / 2 + Math.sin(y) * 3, y, w, 1, y < 76 ? '#ffe0a8' : '#ffc894'); }
    // 海底：角落幾株海草
    [[10, 16], [22, 11], [300, 14], [312, 10], [160, 8]].forEach(([x, hh]) => { for (let y = 0; y < hh; y++) { const sx = x + Math.round(Math.sin(y / 2.5) * 1.5); P.set(sx, 199 - y, y % 2 ? '#2f9e5b' : '#257a47'); P.set(sx + 1, 199 - y, '#1f6a3c'); } });
    // 碼頭
    [12, 52].forEach(x => { P.rect(x, 60, 6, 38, '#6e4a2a'); P.rect(x, 60, 2, 38, '#9a6a3f'); P.rect(x + 5, 60, 1, 38, '#3a2618'); P.rect(x, 82, 6, 16, '#2f4a6a'); P.rect(x - 2, 80, 10, 2, '#b8e0f6'); });
    for (let r = 0; r < 4; r++) { const y = 46 + r * 4, b = ['#a86e40', '#b47a48', '#9e663a', '#ac7244'][r]; P.rect(0, y, 78, 4, b); P.rect(0, y, 78, 1, '#cf9458'); P.rect(0, y + 3, 78, 1, '#5e3d22'); for (let x = 6 + r * 5; x < 78; x += 22) P.rect(x, y, 1, 4, '#5e3d22'); }
    P.rect(78, 46, 2, 16, '#5e3d22'); for (let x = 3; x < 76; x += 12) P.set(x, 48, '#3a2618');
    return P.url();
  }
  // 大魚 52×22（頭朝左）、舊鞋 32×23
  function spFish() {
    const P = Cv(52, 22), O = ['#b85a00', '#f08a1a', '#ffb62e', '#ffe08a'], SMF = { d1: 1, d2: 3, h1: 2 };
    const part = (f, ramp, o) => { const M = Mask(52, 22); f(M); return paint(P, M, ramp, o); };
    part(M => M.poly([[36, 11], [50, 2], [47, 11], [50, 20]]), O, SMF);
    part(M => M.poly([[16, 4], [30, 0], [32, 5]]).poly([[20, 18], [28, 21], [30, 17]]), ['#8f3a00', '#d06a10', '#f08a1a', '#ffc04a'], { d1: 1, d2: 2, h1: 1 });
    part(M => M.ell(21, 11, 20, 8.5), O, SMF);
    for (let x = 16; x < 36; x += 4) for (let y = 6; y < 16; y += 3) { P.set(x + (y % 2), y, O[1]); P.set(x + 1 + (y % 2), y + 1, O[1]); }
    P.ell(21, 15, 14, 3, '#fff0c0'); P.ell(21, 14, 14, 2, O[2]);
    P.path([[12, 5], [14, 11], [12, 17]], O[0], 1); P.ell(7, 9, 2.6, 2.6, '#ffffff'); P.ell(6.6, 9.2, 1.4, 1.4, INK); P.set(6, 8, '#ffffff'); P.rect(1, 13, 4, 1, '#a81f3c'); P.poly([[17, 11], [23, 9], [22, 14]], O[1]);
    P.outline('#7a3b00'); return P.url();
  }
  function spBoot() {
    const P = Cv(32, 23), Bt = ['#2e1c10', '#4e3420', '#6e4a2a', '#9a6a3f'];
    const M = Mask(32, 23); M.rect(7, 1, 12, 15).poly([[4, 14], [19, 12], [28, 15], [31, 19], [31, 21], [4, 21]]); paint(P, M, Bt, { d1: 1, d2: 3, h1: 2 });
    P.rect(7, 1, 12, 2, '#3a2618'); P.rect(3, 20, 29, 2, '#1d120a'); [5, 8, 11].forEach(y => { P.rect(13, y, 5, 1, '#d9cfb4'); P.set(12, y, '#2e1c10'); }); P.rect(22, 17, 6, 1, '#8ccdf3'); P.set(25, 5, '#8ccdf3'); P.set(25, 6, '#8ccdf3'); P.set(26, 8, '#b8e0f6'); P.rect(9, 9, 3, 3, '#3a2618');
    P.outline('#1d120a'); return P.url();
  }

  /* ================= OX 翻板：攝影棚 ================= */
  function bgOx() {
    const P = Cv(320, 200, 31);
    // 布幕：一摺一摺
    const fold = ['#241a40', '#2d2150', '#3a2c66', '#46367c', '#4f3e8a', '#46367c', '#3a2c66', '#2d2150'];
    for (let x = 0; x < 320; x++) P.rect(x, 8, 1, 120, fold[Math.floor((x % 24) / 3)]);
    for (let x = 0; x < 320; x++) { const s = Math.round(3 + 3 * Math.cos((x % 48) / 48 * Math.PI * 2)); P.rect(x, 8, 1, 6 + s, (x % 48) < 24 ? '#5a2d6b' : '#6b367c'); P.set(x, 14 + s, '#1d1534'); P.set(x, 13 + s, '#ffd166'); }
    // 天花板燈架和聚光燈
    P.rect(0, 0, 320, 8, INK); for (let x = 4; x < 320; x += 12) { P.rect(x, 2, 6, 4, '#5d5a77'); P.rect(x, 2, 6, 1, '#a7a4c4'); }
    for (let x = 28; x < 320; x += 88) { P.rect(x + 5, 8, 2, 4, '#35324e'); P.poly([[x, 22], [x + 3, 12], [x + 9, 12], [x + 12, 22]], '#5d5a77'); P.rect(x + 3, 12, 6, 1, '#b9b6d8'); P.rect(x + 1, 22, 10, 2, '#fff3c4'); P.rect(x + 3, 24, 6, 1, '#ffe08a'); }
    // 中間大螢幕
    P.rect(126, 16, 68, 46, INK); P.rect(128, 18, 64, 42, '#35324e'); P.rect(132, 22, 56, 34, '#12304e');
    for (let y = 22; y < 56; y += 2) P.rect(132, y, 56, 1, '#173c60'); P.rect(132, 22, 56, 2, '#2a5a86'); P.rect(134, 24, 10, 1, '#5d98c8');
    ['..kkkkkk..', '.kkkkkkkk.', 'kkk....kkk', 'kk......kk', '.......kkk', '......kkk.', '.....kkk..', '....kkk...', '....kk....', '..........', '....kk....', '....kk....'].forEach((r, y) => [...r].forEach((c, x) => { if (c === 'k') { P.rect(150 + x * 2, 27 + y * 2, 2, 2, '#ffd166'); } }));
    P.rect(122, 62, 76, 4, '#5d5a77'); P.rect(122, 62, 76, 1, '#a7a4c4');
    // 觀眾剪影
    for (let x = 0; x < 320; x += 10) { const hh = 6 + ((x * 7) % 7); P.ell(x + 5, 114 - hh, 4, 4, '#1f1838'); P.rect(x, 116 - hh, 10, 12 + hh, '#1f1838'); P.set(x + 3, 112 - hh, '#2d2450'); }
    // 舞台地板、兩個泥巴坑、中間站台
    P.rect(0, 128, 320, 32, '#2a2640');
    [16, 172].forEach(x0 => {
      P.grad(x0, 128, 132, 22, ['#08060e', '#120d16', '#22160f', '#33200f'], (u, v) => v);
      P.rect(x0, 150, 132, 10, '#6e4a2a'); P.rect(x0, 150, 132, 2, '#9a6a3f'); for (let i = 0; i < 11; i++) { P.ell(x0 + 8 + i * 12, 151, 4, 2, '#8a5c34'); P.set(x0 + 6 + i * 12, 150, '#b98a58'); } for (let x = x0 + 2; x < x0 + 132; x += 9) P.rect(x, 155 + (x % 3), 3, 1, '#573a1f');
    });
    P.rect(148, 128, 24, 32, '#5d5a77'); P.rect(148, 128, 24, 2, '#b9b6d8'); P.rect(148, 130, 2, 26, '#8b8aa3'); P.rect(170, 130, 2, 26, '#35324e');
    for (let y = 156; y < 160; y++) for (let x = 148; x < 172; x++) P.set(x, y, ((x + (y - 156)) >> 2) % 2 ? INK : '#ffd166');
    return P.url();
  }

  /* ================= 班會開票：教室 ================= */
  function bgVote() {
    const P = Cv(320, 200, 41);
    P.rect(0, 0, 320, 104, '#ebe4cb'); P.rect(0, 0, 320, 3, '#d9d1b4');
    // 牆裙
    P.rect(0, 104, 320, 36, '#b9d6c0'); P.rect(0, 104, 320, 2, '#dcecdf'); P.rect(0, 106, 320, 1, '#8fb39a'); for (let x = 0; x < 320; x += 24) { P.rect(x, 107, 1, 33, '#a3c4ab'); P.rect(x + 1, 107, 1, 33, '#c9e2cf'); }
    // 黑板
    P.rect(32, 6, 288, 78, '#5e3d22'); P.rect(34, 8, 284, 74, '#9a6a3f'); P.rect(34, 8, 284, 2, '#c08a52'); P.rect(37, 11, 278, 68, '#28503d'); P.rect(38, 12, 276, 66, '#2f5a45');
    for (let i = 0; i < 9; i++) { const x = 44 + P.R() * 230, y = 16 + P.R() * 56, w = 16 + P.R() * 30; P.rect(x, y, w, 2, '#356350'); }
    P.rect(32, 82, 288, 5, '#6e4a2a'); P.rect(32, 82, 288, 2, '#b8834e'); P.rect(80, 80, 8, 2, '#fffaf0'); P.rect(96, 80, 6, 2, '#ffd166'); P.rect(110, 80, 5, 2, '#ff9ab8'); P.rect(258, 78, 14, 4, '#5d5a77'); P.rect(258, 78, 14, 1, '#a7a4c4'); P.rect(258, 81, 14, 1, '#d9cfb4');
    // 窗戶
    P.rect(1, 8, 28, 54, '#fffaf0'); P.rect(1, 8, 28, 1, '#d9d1b4'); P.grad(4, 11, 22, 48, ['#8fcbf2', '#a8d8f6', '#c4e6fa'], (u, v) => v); P.ell(11, 20, 5, 2.5, '#ffffff'); P.ell(16, 18, 4, 3, '#ffffff'); P.rect(4, 52, 22, 7, '#5aa63c'); P.rect(4, 52, 22, 1, '#8fe0a2'); P.ell(20, 50, 5, 4, '#3e8f3a');
    P.rect(14, 11, 2, 48, '#fffaf0'); P.rect(4, 33, 22, 2, '#fffaf0'); P.rect(0, 62, 30, 3, '#fffaf0'); P.rect(0, 65, 30, 1, '#c9c1a4');
    // 時鐘
    P.ell(15, 76, 8, 8, INK); P.ell(15, 76, 6.6, 6.6, '#fffaf0'); P.rect(14, 71, 2, 6, INK); P.rect(15, 75, 5, 2, INK); P.set(15, 70, '#e8414f'); P.set(21, 76, '#b9b6d8'); P.set(9, 76, '#b9b6d8'); P.set(15, 82, '#b9b6d8');
    // 木地板（只留木板線，不加木紋）
    for (let y = 140; y < 200; y += 10) { const b = ((y - 140) / 10) % 2 ? '#c98a4b' : '#cf9152'; P.rect(0, y, 320, 10, b); P.rect(0, y, 320, 1, '#dca066'); P.rect(0, y + 9, 320, 1, '#a8743f'); for (let x = ((y / 10) % 2) * 40 + 20; x < 320; x += 80) P.rect(x, y + 1, 1, 8, '#a8743f'); }
    P.rect(0, 140, 320, 2, '#6e4a2a');
    return P.url();
  }

  /* ================= 小偵探：偵探事務所 ================= */
  function bgDetect() {
    const P = Cv(320, 200, 51);
    for (let x = 0; x < 320; x++) P.rect(x, 0, 1, 144, (x >> 3) % 2 ? '#24424a' : '#2a4b54');
    for (let x = 0; x < 320; x += 16) P.rect(x, 0, 1, 144, '#1f3a42');
    P.rect(0, 136, 320, 8, '#3a2618'); P.rect(0, 136, 320, 2, '#6e4a2a');
    // 夜晚的窗戶
    P.rect(8, 12, 60, 68, INK); P.grad(12, 16, 52, 60, ['#0f0d22', '#17143a', '#231c52', '#35286a'], (u, v) => v);
    for (let i = 0; i < 26; i++) P.set(12 + P.R() * 52, 16 + P.R() * 34, ['#fffaf0', '#b9b6d8'][i % 2]);
    P.ell(50, 28, 7, 7, '#fff3c4'); P.ell(53, 26, 6, 6, '#17143a');
    for (let x = 12; x < 64; x += 8) { const hh = 12 + ((x * 13) % 18), w = Math.min(8, 64 - x); P.rect(x, 76 - hh, w, hh, '#2a2748'); P.rect(x, 76 - hh, 1, hh, '#3a3760'); for (let y = 76 - hh + 3; y < 74; y += 5) for (let k = 2; k < w - 1; k += 3) if ((x + y + k) % 3) P.rect(x + k, y, 1, 2, '#ffd166'); }
    P.rect(37, 16, 3, 60, INK); P.rect(12, 44, 52, 3, INK); P.rect(4, 80, 68, 4, '#6e4a2a'); P.rect(4, 80, 68, 1, '#b8834e');
    // 軟木板：顏色平一點，線索卡才清楚
    P.rect(84, 6, 228, 120, '#5e3d22'); P.rect(86, 8, 224, 116, '#9a6a3f'); P.rect(86, 8, 224, 2, '#c08a52'); P.rect(90, 12, 216, 108, '#c8955a');
    for (let i = 0; i < 260; i++) P.set(90 + P.R() * 216, 12 + P.R() * 108, P.R() < .5 ? '#c08d52' : '#cf9d62');
    P.rect(90, 12, 216, 2, '#a97640'); P.rect(90, 12, 2, 108, '#a97640');
    // 桌子、檯燈、電話
    for (let y = 104; y < 128; y++) { const half = 10 + (y - 104) * .9; for (let x = 22 - half; x < 22 + half; x++) P.veil(x | 0, y, '#3d6a66', .45); }
    P.rect(0, 128, 80, 8, '#5a3a20'); P.rect(0, 128, 80, 2, '#9a6a3f'); P.rect(4, 136, 6, 28, '#3a2618'); P.rect(68, 136, 6, 28, '#3a2618');
    P.rect(16, 120, 12, 8, '#2e2b4a'); P.rect(16, 120, 12, 1, '#5d5a77'); P.rect(20, 102, 4, 18, '#c98a00'); P.rect(20, 102, 1, 18, '#ffd166');
    P.poly([[10, 102], [14, 92], [30, 92], [34, 102]], '#2f9e5b'); P.rect(14, 92, 16, 2, '#7fe0a2'); P.rect(12, 102, 20, 2, '#fff3c4');
    P.rect(40, 122, 18, 6, '#fffaf0'); P.rect(42, 124, 14, 1, '#b9b6d8'); P.rect(42, 126, 10, 1, '#b9b6d8'); P.rect(60, 120, 12, 8, '#e8414f'); P.rect(60, 120, 12, 2, '#ff8a8a'); P.rect(59, 117, 14, 3, '#b02a3c');
    // 深色木地板＋地毯
    for (let y = 144; y < 200; y += 8) { P.rect(0, y, 320, 8, ((y - 144) / 8) % 2 ? '#4a3324' : '#4f3727'); P.rect(0, y, 320, 1, '#5e4230'); P.rect(0, y + 7, 320, 1, '#2e1f16'); for (let x = ((y / 8) % 2) * 50 + 30; x < 320; x += 100) P.rect(x, y + 1, 1, 6, '#2e1f16'); }
    P.rect(112, 172, 160, 24, '#6a1228'); P.rect(114, 174, 156, 20, '#9e2a45'); P.rect(118, 177, 148, 14, '#8a2039'); P.rect(118, 177, 148, 1, '#ffd166'); P.rect(118, 190, 148, 1, '#ffd166'); for (let x = 124; x < 262; x += 12) { P.poly([[x, 184], [x + 4, 180], [x + 8, 184], [x + 4, 188]], '#c94a66'); }
    for (let y = 173; y < 196; y += 2) { P.set(110, y, '#c94a66'); P.set(273, y, '#c94a66'); }
    return P.url();
  }

  /* ================= 吊橋過峽谷 ================= */
  function bgBridge() {
    const P = Cv(320, 200, 61);
    P.grad(0, 0, 320, 104, ['#ff9a5a', '#ffb06e', '#ffc588', '#ffd8a4', '#ffe7c0', '#fff3dc'], (u, v) => v);
    for (let y = 20; y < 100; y++) for (let x = 190; x < 290; x++) { const dd = Math.hypot(x - 236, y - 62); if (dd < 44) P.veil(x, y, '#fff6d0', (1 - dd / 44) * .7); }
    P.ball(236, 62, 17, 17, ['#ffc04a', '#ffd874', '#ffe9a0', '#fff6cc'], -.3, -.7, true);
    const cloud = (x, y, s) => { [[0, 3, 6], [7, 0, 8], [16, 2, 6], [23, 4, 4]].forEach(([dx, dy, r]) => P.ell(x + dx * s, y + dy * s + r * s * .5, r * s, r * s * .6, '#fff8ec')); P.rect(x - 5 * s, y + 6 * s, 32 * s, 2 * s, '#ffd2a8'); P.rect(x - 2 * s, y + 5 * s, 26 * s, 1 * s, '#fff8ec'); };
    cloud(40, 14, 1.1); cloud(140, 8, .8); cloud(270, 22, .6);
    const ridge = (base, amp, ph, fill, rim) => { let j = 0; for (let x = 0; x < 320; x++) { j += (P.R() - .5) * 2.4; j = Math.max(-4, Math.min(4, j)); const top = Math.round(base - amp * (.5 + .5 * Math.sin(x * .024 + ph)) * (.6 + .4 * Math.sin(x * .067 + ph * 2)) + j); for (let y = top; y < 120; y++) P.set(x, y, y - top < 2 ? rim : fill); } };
    ridge(100, 36, 1.2, '#d0907e', '#e8ae96'); ridge(110, 24, 3.9, '#a8687a', '#c48290');
    // 峽谷深處：平塗三層
    P.rect(0, 112, 320, 24, '#6a4862'); P.rect(0, 136, 320, 20, '#553a56'); P.rect(0, 156, 320, 16, '#40294a');
   
    // 河
    P.rect(0, 172, 320, 28, '#2b7bb9'); P.rect(0, 172, 320, 2, '#a8dcf6'); P.rect(0, 174, 320, 1, '#5aa6dc');
    for (let y = 179; y < 200; y += 6) for (let x = ((y / 6) % 2) * 14 + 66; x < 256; x += 30) { P.rect(x, y, 9, 1, '#78c3f0'); P.rect(x + 2, y + 1, 5, 1, '#4f9fd6'); }
    // 懸崖
    const earth = (x0, x1, top, edge) => {
      P.rect(x0, top, x1 - x0, 200 - top, '#8a5a3c');
      for (let y = top + 10; y < 200; y += 12) for (let x = x0; x < x1; x++) P.set(x, y + Math.round(Math.sin(x * .2 + y) * 1.2), '#7a4e32');
      for (let i = 0; i < (x1 - x0) * .5; i++) { const x = x0 + P.R() * (x1 - x0 - 4), y = top + 8 + P.R() * (190 - top); P.rect(x, y, 4, 2, P.R() < .5 ? '#6e4a2a' : '#a8754e'); }
      if (edge === 'r') { P.rect(x1 - 3, top, 3, 200 - top, '#5a3824'); P.rect(x1 - 5, top, 2, 200 - top, '#74482e'); } else if (edge === 'l') { P.rect(x0, top, 3, 200 - top, '#5a3824'); P.rect(x0 + 3, top, 2, 200 - top, '#a8754e'); }
      P.rect(x0, top, x1 - x0, 6, '#5aa63c'); P.rect(x0, top, x1 - x0, 2, '#9ae88a'); for (let x = x0; x < x1; x += 4) { P.rect(x + 1, top + 6, 2, 1 + ((x * 7) % 3), '#3e8f3a'); }
    };
    earth(0, 60, 88, 'r'); earth(260, 320, 88, 'l');
    earth(0, 60, 140, 'r'); earth(260, 320, 140, 'l');
    // 樹
    const pine = (x, base, hh) => { P.rect(x - 1, base - 4, 3, 5, '#5e3d22'); for (let i = 0; i < hh; i++) { const half = Math.round(1 + (i / hh) * (hh * .36) * (.45 + .55 * ((i % 7) / 7))); P.rect(x - half, base - 4 - hh + i, half * 2 + 1, 1, i % 7 > 4 ? '#2f7a3a' : '#3e8f3a'); P.set(x - half, base - 4 - hh + i, '#7fd07a'); P.set(x + half, base - 4 - hh + i, '#235f2e'); } };
    pine(16, 88, 30); pine(300, 88, 34); pine(312, 140, 22);
    return P.url();
  }

  /* ================= 金庫保險箱 ================= */
  function bgVault() {
    const P = Cv(320, 200, 71);
    for (let y = 0; y < 156; y += 26) for (let x = 0; x < 320; x += 40) { P.rect(x, y, 40, 26, '#27333f'); P.rect(x + 1, y + 1, 38, 24, '#3d5064'); P.rect(x + 1, y + 1, 38, 2, '#5a748e'); P.rect(x + 1, y + 1, 2, 24, '#4a6078'); P.rect(x + 1, y + 23, 38, 2, '#2f3f50'); P.rect(x + 37, y + 3, 2, 22, '#334557'); [[4, 4], [34, 4], [4, 20], [34, 20]].forEach(([a, b]) => { P.rect(x + a, y + b, 2, 2, '#8aa2bc'); P.set(x + a + 1, y + b + 1, '#27333f'); }); }
    // 架子、金條、金幣
    for (const sy of [36, 80]) { P.rect(200, sy, 112, 4, '#5a3a20'); P.rect(200, sy, 112, 1, '#9a6a3f'); P.rect(200, sy + 4, 112, 2, '#1e2832'); for (let i = 0; i < 6; i++) { const x = 208 + i * 16, M = Mask(320, 200); M.poly([[x + 2, sy - 8], [x + 12, sy - 8], [x + 14, sy], [x, sy]]); paint(P, M, ['#8a5a10', '#d49a1e', '#ffd166', '#fff3c4'], { d1: 1, d2: 2, h1: 1 }); } }
    for (let i = 0; i < 5; i++) { const x = 212 + i * 20; P.ell(x, 116, 7, 7, '#7a4e00'); P.ball(x, 116, 6, 6, ['#c98a00', '#f2b632', '#ffd166', '#fff3c4']); P.rect(x - 1, 113, 2, 6, '#c98a00'); }
    P.rect(200, 124, 112, 4, '#5a3a20'); P.rect(200, 124, 112, 1, '#9a6a3f'); P.rect(200, 128, 112, 2, '#1e2832');
    // 黑白磁磚地板
    for (let y = 156; y < 200; y += 11) for (let x = 0; x < 320; x += 20) { const d = ((x / 20) + Math.round((y - 156) / 11)) % 2; P.rect(x, y, 20, 11, d ? '#dcdaec' : '#9a98b4'); P.rect(x, y, 20, 1, d ? '#ffffff' : '#b4b2cc'); }
    P.rect(0, 154, 320, 2, INK); P.rect(0, 156, 320, 2, '#6b6890');
    return P.url();
  }

  /* ================= 送貨到府：藍天 ================= */
  function bgSky() {
    const P = Cv(320, 200, 81);
    P.grad(0, 0, 320, 140, ['#6db9ee', '#80c6f2', '#96d2f5', '#aedcf7', '#c6e8fa', '#dcf2fc'], (u, v) => v);
    const cloud = (x, y, s) => { [[0, 4, 7], [8, 0, 9], [18, 2, 7], [26, 5, 5]].forEach(([dx, dy, r]) => P.ell(x + dx * s, y + dy * s + r * s * .5, r * s, r * s * .62, '#ffffff')); P.rect(x - 6 * s, y + 8 * s, 37 * s, 2 * s, '#d3eefb'); P.rect(x - 3 * s, y + 7 * s, 31 * s, 1 * s, '#ffffff'); };
    cloud(24, 60, 1.1); cloud(190, 72, .9); cloud(120, 96, .6); cloud(280, 56, .7);
    let j = 0; for (let x = 0; x < 320; x++) { j += (P.R() - .5) * 2; j = Math.max(-3, Math.min(3, j)); const top = Math.round(124 - 26 * (.5 + .5 * Math.sin(x * .021 + 2)) * (.6 + .4 * Math.sin(x * .06)) + j); for (let y = top; y < 200; y++) P.set(x, y, y - top < 2 ? '#b4dcc0' : '#9ccdaa'); }
    j = 0; for (let x = 0; x < 320; x++) { j += (P.R() - .5) * 2; j = Math.max(-3, Math.min(3, j)); const top = Math.round(132 - 14 * (.5 + .5 * Math.sin(x * .034 + 5)) + j); for (let y = top; y < 200; y++) P.set(x, y, y - top < 2 ? '#a2d4b0' : '#8fc6a2'); }
    return P.url();
  }

  /* ================= 寶藏大門：城堡石牆 ================= */
  function bgDoor() {
    const P = Cv(320, 200, 91);
    P.rect(0, 0, 320, 164, '#372f42');
    for (let r = 0; r * 14 < 164; r++) for (let c = -1; c * 28 < 320; c++) { const bx = c * 28 + (r % 2 ? 14 : 0), by = r * 14, base = ['#5d5266', '#655a6f', '#564b60', '#6a5f74'][P.R() * 4 | 0]; P.rect(bx + 1, by + 1, 27, 13, base); P.rect(bx + 1, by + 1, 27, 2, mix(base, '#ffffff', .14)); P.rect(bx + 1, by + 12, 27, 2, mix(base, '#000000', .24)); P.rect(bx + 26, by + 3, 2, 9, mix(base, '#000000', .12)); if (P.R() < .25) P.rect(bx + 6 + P.R() * 14, by + 5 + P.R() * 4, 3, 1, mix(base, '#000000', .25)); }
    // 石拱門
    const arch = (r, y) => y < 48 ? Math.sqrt(Math.max(0, r * r - (48 - y) ** 2)) : r;
    for (let y = 0; y < 164; y++) { const o = arch(52, y), m = arch(44, y); if (y >= -4) { P.rect(160 - o, y, o * 2, 1, '#8b8aa3'); P.rect(160 - o, y, 2, 1, '#b9b6d8'); P.rect(160 + o - 2, y, 2, 1, '#5d5a77'); P.rect(160 - m, y, m * 2, 1, '#2a1a10'); } }
    for (let a = 0; a <= 8; a++) { const t = Math.PI + a / 8 * Math.PI; P.line(160 + Math.cos(t) * 44, 48 + Math.sin(t) * 44, 160 + Math.cos(t) * 52, 48 + Math.sin(t) * 52, '#5d5a77'); }
    for (let y = 60; y < 164; y += 18) { P.rect(108, y, 8, 1, '#5d5a77'); P.rect(204, y, 8, 1, '#5d5a77'); }
    // 大木門
    for (let y = 8; y < 164; y++) { const half = arch(40, y); for (let x = Math.ceil(160 - half); x < 160 + half; x++) { const k = Math.floor((x - 120) / 10), e = (x - 120) % 10; P.set(x, y, e === 0 ? '#5a3a20' : e === 1 ? '#b07a45' : e === 9 ? '#7a4e2c' : k % 2 ? '#8a5a32' : '#9a6a3f'); } }
    for (let i = 0; i < 26; i++) { const x = 124 + P.R() * 72, y = 30 + P.R() * 126; P.rect(x, y, 1, 4 + P.R() * 6, '#6e4a2a'); }
    P.rect(158, 10, 4, 154, '#3a2618'); P.rect(158, 10, 1, 154, '#6e4a2a');
    [60, 112].forEach(y => { P.rect(120, y, 80, 7, '#2a2640'); P.rect(120, y, 80, 2, '#9a97b8'); P.rect(120, y + 2, 80, 3, '#5d5a77'); for (let x = 125; x < 200; x += 12) { P.rect(x, y + 2, 2, 2, '#e6e4f5'); P.set(x + 1, y + 3, '#2a2640'); } });
    // 火把座
    [48, 272].forEach(x => { P.rect(x - 2, 28, 5, 16, '#3a2618'); P.rect(x - 2, 28, 1, 16, '#6e4a2a'); P.rect(x - 6, 24, 13, 6, '#5d5a77'); P.rect(x - 6, 24, 13, 1, '#b9b6d8'); P.rect(x - 6, 29, 13, 1, '#35324e'); });
    // 石板地（平塗）
    P.rect(0, 164, 320, 36, '#3a3245'); P.rect(0, 164, 320, 2, '#6b5f75');
    for (let x = 0; x < 320; x += 32) { P.rect(x, 166, 31, 16, '#4a4058'); P.rect(x, 166, 31, 1, '#5d5266'); P.rect(x + 16, 184, 31, 16, '#4a4058'); P.rect(x + 16, 184, 31, 1, '#5d5266'); }
    return P.url();
  }

  /* ================= 火車過山洞：草原鐵道 ================= */
  function bgRail() {
    const P = Cv(320, 200, 101);
    P.grad(0, 0, 320, 104, ['#8fcbf2', '#a2d5f5', '#b6dff7', '#cae8f9', '#def1fb'], (u, v) => v);
    const cloud = (x, y, s) => { [[0, 4, 7], [8, 0, 9], [18, 2, 7], [26, 5, 5]].forEach(([dx, dy, r]) => P.ell(x + dx * s, y + dy * s + r * s * .5, r * s, r * s * .62, '#ffffff')); P.rect(x - 6 * s, y + 8 * s, 37 * s, 2 * s, '#d3eefb'); P.rect(x - 3 * s, y + 7 * s, 31 * s, 1 * s, '#ffffff'); };
    cloud(20, 12, 1); cloud(120, 6, .75); cloud(236, 20, .9);
    let j = 0; for (let x = 0; x < 320; x++) { j += (P.R() - .5) * 2; j = Math.max(-3, Math.min(3, j)); const top = Math.round(92 - 30 * (.5 + .5 * Math.sin(x * .022 + 1)) * (.6 + .4 * Math.sin(x * .058)) + j); for (let y = top; y < 112; y++) P.set(x, y, y - top < 2 ? '#a6d6b0' : '#8cc69a'); }
    j = 0; for (let x = 0; x < 320; x++) { j += (P.R() - .5) * 2; j = Math.max(-3, Math.min(3, j)); const top = Math.round(100 - 12 * (.5 + .5 * Math.sin(x * .03 + 4)) + j); for (let y = top; y < 112; y++) P.set(x, y, y - top < 2 ? '#8fd07a' : '#74bf66'); }
    // 草原：平塗兩層
    P.rect(0, 108, 320, 92, '#7cc56a'); P.rect(0, 108, 320, 14, '#86cc72');
    // 遠方的樹和小屋（在側線上面）
    const tree = (x, y, r) => { P.rect(x - 1, y - 3, 2, 4, '#6e4a2a'); P.ball(x, y - 3 - r, r, r, ['#2f7a3a', '#3e8f3a', '#5aa63c', '#8fd07a'], -.5, -.7, false); };
    tree(30, 96, 5); tree(42, 97, 4); tree(214, 96, 5); tree(300, 95, 6);
    P.rect(246, 86, 18, 10, '#fff1dc'); P.rect(246, 86, 18, 1, '#ffffff'); P.poly([[243, 86], [255, 78], [267, 86]], '#e8414f'); P.rect(253, 90, 4, 6, '#8a5a32'); P.rect(259, 89, 3, 3, '#78c3f0');
    // 側線（上方等待的車廂）
    for (let x = 0; x < 320; x += 10) { P.rect(x, 98, 6, 6, '#6e4a2a'); P.rect(x, 98, 6, 1, '#8a5a35'); }
    P.rect(0, 98, 320, 2, '#d3d1e6'); P.rect(0, 100, 320, 1, '#8b8aa3'); P.rect(0, 102, 320, 2, '#a7a4c4');
    // 主線：碎石、枕木、鐵軌
    P.rect(0, 160, 320, 8, '#9a8a7a'); for (let x = 0; x < 320; x += 3) P.set(x + ((x * 7) % 2), 163 + ((x * 5) % 3), '#847466');
    for (let x = 0; x < 320; x += 10) { P.rect(x, 158, 6, 12, '#6e4a2a'); P.rect(x, 158, 6, 1, '#9a6a3f'); P.rect(x + 5, 159, 1, 11, '#4e3420'); }
    P.rect(0, 160, 320, 2, '#e6e4f5'); P.rect(0, 162, 320, 1, '#6b6890'); P.rect(0, 166, 320, 2, '#d3d1e6'); P.rect(0, 168, 320, 1, '#6b6890');
    return P.url();
  }

  /* ================= 信鴿送信：屋頂 ================= */
  function bgRoof() {
    const P = Cv(320, 200, 111);
    P.grad(0, 0, 320, 144, ['#ffb9cf', '#ffc6d6', '#ffd2dc', '#ffdde0', '#ffe7df', '#fff0dc'], (u, v) => v);
    for (let y = 40; y < 130; y++) for (let x = 150; x < 250; x++) { const dd = Math.hypot(x - 200, y - 80); if (dd < 46) P.veil(x, y, '#fff8d8', (1 - dd / 46) * .7); }
    P.ball(200, 80, 19, 19, ['#ffd98a', '#ffe8a3', '#fff3c4', '#fffbe6'], -.3, -.7, true);
    const cloud = (x, y, s) => { [[0, 4, 7], [8, 0, 9], [18, 2, 7], [26, 5, 5]].forEach(([dx, dy, r]) => P.ell(x + dx * s, y + dy * s + r * s * .5, r * s, r * s * .62, '#ffffff')); P.rect(x - 6 * s, y + 8 * s, 37 * s, 2 * s, '#ffd4e2'); P.rect(x - 3 * s, y + 7 * s, 31 * s, 1 * s, '#ffffff'); };
    cloud(56, 10, 1); cloud(236, 22, .7); cloud(140, 30, .5);
    [[140, 40], [152, 34], [164, 44]].forEach(([x, y]) => { P.set(x, y, '#8b6a8f'); P.set(x - 1, y - 1, '#8b6a8f'); P.set(x + 1, y - 1, '#8b6a8f'); P.set(x - 2, y - 1, '#8b6a8f'); P.set(x + 2, y - 1, '#8b6a8f'); });
    // 遠處城市（淡）
    for (let x = 0; x < 320; x += 18) { const hh = 44 + ((x * 13) % 40); P.rect(x, 156 - hh, 16, hh + 44, '#e8c6dc'); P.rect(x, 156 - hh, 16, 1, '#f4dcea'); P.rect(x + 14, 156 - hh, 2, hh + 44, '#dcb6d0'); for (let y = 160 - hh; y < 156; y += 7) for (let wx = 2; wx < 13; wx += 4) if ((x + y + wx) % 3) P.rect(x + wx, y, 2, 3, '#f6e2ec'); }
    // 近處城市
    for (let x = 60; x < 250; x += 26) { const hh = 28 + ((x * 7) % 28); P.rect(x, 172 - hh, 24, hh + 28, '#c49ac0'); P.rect(x, 172 - hh, 24, 2, '#dcb8d8'); P.rect(x + 21, 172 - hh, 3, hh + 28, '#b086ae'); for (let y = 177 - hh; y < 196; y += 8) for (let wx = 3; wx < 20; wx += 6) { const lit = (x + y + wx) % 4 === 0; P.rect(x + wx, y, 4, 4, lit ? '#fff3c4' : '#a77ea6'); if (lit) P.rect(x + wx, y, 4, 1, '#ffffff'); } }
    // 左邊大樓：屋頂、磚牆、窗
    P.rect(0, 128, 116, 6, INK); P.rect(0, 128, 114, 4, '#b9a9b8'); P.rect(0, 128, 114, 2, '#e6dde6');
    P.rect(0, 134, 116, 66, INK); P.rect(0, 134, 114, 66, '#9a6458');
    for (let r = 0; r * 8 < 66; r++) for (let c = -1; c * 16 < 114; c++) { const bx = c * 16 + (r % 2 ? 8 : 0), by = 134 + r * 8, base = ['#c98a7a', '#bf7f70', '#d0937f'][P.R() * 3 | 0]; for (let yy = by + 1; yy < by + 8; yy++) for (let xx = Math.max(0, bx + 1); xx < Math.min(114, bx + 16); xx++) P.set(xx, yy, yy === by + 1 ? mix(base, '#ffffff', .18) : yy === by + 7 ? mix(base, '#000000', .2) : base); }
    for (const x of [12, 44, 76]) { P.rect(x, 148, 20, 20, INK); P.grad(x + 2, 150, 16, 16, ['#bfe4fa', '#9fd4f5', '#84c2ee'], (u, v) => v); P.rect(x + 2, 150, 16, 3, '#fffaf0'); P.rect(x + 9, 150, 2, 16, INK); P.rect(x - 2, 168, 24, 2, '#e6dde6'); P.rect(x - 2, 170, 24, 1, '#7a4a40'); }
    // 水塔
    P.rect(86, 100, 24, 20, INK); P.grad(88, 102, 20, 16, ['#a8dcf6', '#78c3f0', '#4f9fd6'], (u, v) => u); P.rect(88, 102, 20, 2, '#dff3fd'); P.rect(88, 109, 20, 1, '#3c8dde'); P.rect(88, 114, 20, 1, '#3c8dde'); P.poly([[86, 100], [98, 94], [110, 100]], INK); P.poly([[89, 99], [98, 95.5], [107, 99]], '#8b8aa3');
    P.rect(88, 120, 2, 10, INK); P.rect(106, 120, 2, 10, INK); P.line(89, 120, 106, 128, '#5d5a77'); P.line(106, 120, 89, 128, '#5d5a77');
    // 天線
    P.rect(72, 88, 2, 42, '#5d5a77'); P.rect(64, 92, 18, 2, '#5d5a77'); P.rect(66, 98, 14, 2, '#5d5a77'); P.set(72, 87, '#e8414f'); P.set(73, 87, '#e8414f');
    // 鴿舍
    P.rect(4, 96, 52, 34, INK); P.rect(6, 98, 48, 30, '#dca066'); for (let x = 6; x < 54; x += 8) { P.rect(x, 98, 1, 30, '#b8834e'); P.rect(x + 1, 98, 1, 30, '#f0c08a'); } P.rect(6, 98, 48, 2, '#f2c48e');
    for (let i = 0; i < 18; i++) { const half = 2 + i * 1.7; P.rect(30 - half - 1, 78 + i, half * 2 + 2, 1, INK); if (i) P.rect(30 - half + 1, 78 + i, half * 2 - 2, 1, (i >> 1) % 2 ? '#d6334a' : '#b42a3c'); }
    P.rect(0, 94, 60, 4, INK); P.rect(2, 94, 56, 2, '#e8414f'); P.rect(2, 94, 56, 1, '#ff8a8a');
    P.ell(27, 112, 11, 9, INK); P.rect(16, 112, 22, 10, INK); P.ell(27, 112, 9, 7, '#3a2618'); P.rect(18, 112, 18, 9, '#3a2618'); P.rect(18, 106, 18, 4, '#2a1a10');
    P.rect(12, 122, 30, 4, INK); P.rect(14, 122, 26, 2, '#b8834e'); P.rect(14, 122, 26, 1, '#dca066');
    P.rect(44, 108, 6, 6, INK); P.rect(46, 110, 2, 2, '#fff3c4');
    // 盆栽
    P.rect(56, 120, 12, 10, INK); P.rect(58, 120, 8, 8, '#c45a2a'); P.rect(58, 120, 8, 2, '#e07a42'); P.ball(62, 114, 6.5, 6.5, ['#2f7a3a', '#3e8f3a', '#5aa63c', '#8fd07a']); P.rect(63, 109, 2, 2, '#ff8fb1'); P.rect(58, 114, 2, 2, '#ffd166');
    // 右邊大樓
    P.rect(232, 48, 88, 152, INK); P.rect(234, 50, 86, 150, '#ffe8c2'); for (let y = 56; y < 200; y += 10) P.rect(234, y, 86, 1, '#f2d4a8'); for (let y = 50; y < 200; y += 20) for (let x = 234 + ((y / 20) % 2) * 10; x < 320; x += 20) P.rect(x, y, 1, 10, '#f2d4a8');
    P.rect(234, 50, 3, 150, '#fff6e0');
    for (let x = 248; x < 312; x++) { const g = ((x - 248) >> 3) % 2; P.rect(x, 60, 1, 10, g ? '#2f9e5b' : '#fffaf0'); P.set(x, 60, g ? '#6fd08f' : '#ffffff'); P.rect(x, 70, 1, 1 + Math.round(1.5 + 1.5 * Math.cos(((x - 248) % 8) / 8 * Math.PI * 2 + Math.PI)), g ? '#2f9e5b' : '#fffaf0'); } P.rect(246, 58, 68, 2, INK);
    P.rect(256, 74, 44, 44, INK); P.grad(258, 76, 40, 40, ['#cfeeff', '#9fd4f5', '#84c2ee'], (u, v) => v);
    [[258, 0], [288, 1]].forEach(([x, k]) => { P.rect(x, 76, 10, 40, '#ff8fb1'); P.rect(x + (k ? 0 : 8), 76, 2, 40, '#e86a92'); P.rect(x + 3, 76, 1, 40, '#ffb3cf'); P.rect(x + 6, 76, 1, 40, '#f07aa0'); });
    P.rect(277, 76, 2, 40, INK); P.rect(254, 118, 48, 3, '#fffaf0'); P.rect(254, 121, 48, 1, '#d9b98a');
    // 陽台地板
    P.rect(224, 132, 96, 8, INK); P.rect(226, 132, 94, 4, '#d3d1e6'); P.rect(226, 132, 94, 2, '#ffffff'); for (let x = 228; x < 320; x += 12) P.rect(x, 140, 4, 6, '#a7a4c4');
    return P.url();
  }

  /* ================= 神奇實驗室 ================= */
  function bgLab() {
    const P = Cv(320, 200, 121);
    for (let y = 0; y < 136; y += 12) for (let x = 0; x < 320; x += 16) { P.rect(x, y, 16, 12, '#cfe8e2'); P.rect(x, y, 16, 1, '#eaf6f3'); P.rect(x, y, 1, 12, '#b7d6cf'); P.rect(x + 1, y + 1, 1, 11, '#dff0ec'); }
    // 窗戶
    P.rect(12, 12, 52, 44, INK); P.grad(14, 14, 48, 40, ['#8fcbf2', '#a8d8f6', '#c4e6fa'], (u, v) => v); P.ell(26, 24, 7, 3, '#ffffff'); P.ell(33, 21, 5, 4, '#ffffff'); P.rect(14, 46, 48, 8, '#8cc69a'); P.rect(14, 46, 48, 1, '#b4dcc0');
    P.rect(36, 14, 4, 40, '#fffaf0'); P.rect(14, 32, 48, 4, '#fffaf0'); P.rect(8, 56, 60, 4, '#fffaf0'); P.rect(8, 60, 60, 1, '#9fbfb8');
    // 黑板和公式
    P.rect(88, 12, 100, 52, INK); P.rect(90, 14, 96, 48, '#8a5a35'); P.rect(92, 16, 92, 44, '#2f5a45'); P.rect(92, 16, 92, 1, '#244a38');
    const ch = '#e6f0ea'; for (let a = 0; a < 3; a++) for (let t = 0; t < 40; t++) { const th = t / 40 * Math.PI * 2, ca = Math.cos(a * Math.PI / 3), sa = Math.sin(a * Math.PI / 3), ex = Math.cos(th) * 13, ey = Math.sin(th) * 5; P.set(112 + ex * ca - ey * sa, 37 + ex * sa + ey * ca, ch); }
    P.ell(112, 37, 2.5, 2.5, '#ffd166'); P.rect(134, 24, 38, 2, ch); P.rect(134, 34, 24, 2, ch); P.rect(134, 44, 42, 2, ch); P.rect(164, 32, 8, 6, ch); P.rect(166, 34, 4, 2, '#2f5a45'); P.rect(96, 56, 10, 2, '#fffaf0'); P.rect(110, 56, 6, 2, '#ffd166');
    // 層架與瓶子
    for (const sy of [32, 68]) { P.rect(220, sy, 92, 4, '#5a3a20'); P.rect(220, sy, 92, 1, '#9a6a3f'); P.rect(220, sy + 4, 92, 2, '#a9c8c0'); for (let i = 0; i < 6; i++) { const x = 226 + i * 14, c = ['#e8414f', '#3c8dde', '#ffd166', '#2f9e5b', '#b48cff', '#ff9b6b'][(i + sy) % 6], hh = 10 + (i % 3) * 4; P.rect(x, sy - hh, 10, hh, INK); P.rect(x + 2, sy - hh + 2, 6, hh - 2, '#e6f6ff'); P.rect(x + 2, sy - hh + 5, 6, hh - 5, c); P.rect(x + 2, sy - hh + 5, 6, 1, mix(c, '#ffffff', .5)); P.rect(x + 2, sy - hh + 5, 2, hh - 5, mix(c, '#ffffff', .3)); P.rect(x + 3, sy - hh - 3, 4, 3, INK); P.rect(x + 4, sy - hh - 2, 2, 2, '#c98a4b'); } }
    // 實驗桌（桌面和櫃子都平塗）
    P.rect(0, 136, 320, 12, INK); P.rect(0, 136, 320, 8, '#e6e1d3'); P.rect(0, 136, 320, 2, '#ffffff'); P.rect(0, 144, 320, 2, '#b9b29c');
    P.rect(0, 148, 320, 52, '#5d5a77'); for (let x = 0; x < 320; x += 80) { P.rect(x + 4, 152, 72, 44, '#4a4458'); P.rect(x + 4, 152, 72, 1, '#6b6880'); P.rect(x + 4, 195, 72, 1, '#35324e'); P.rect(x + 36, 170, 8, 4, '#d3d1e6'); P.rect(x + 36, 170, 8, 1, '#ffffff'); }
    return P.url();
  }

  /* ================= 小道具（尺寸是舊圖的兩倍，比例一樣，遊戲裡的位置不用改） ================= */
  // 保險箱 104×116：螢幕框的位置和舊圖一樣（遊戲會把數字疊在上面）
  function spSafe() {
    const P = Cv(104, 116, 3);
    P.rect(0, 0, 104, 112, INK); P.grad(2, 2, 100, 108, ['#6d7c8c', '#5d6b7a', '#4d5a68'], (u, v) => u * .6 + v * .4);
    P.rect(2, 2, 100, 2, '#a9b7c6'); P.rect(2, 2, 2, 108, '#8a99a9'); P.rect(98, 4, 4, 106, '#3d4856'); P.rect(2, 106, 100, 4, '#3d4856');
    P.rect(8, 8, 88, 96, INK); P.grad(10, 10, 84, 92, ['#95a4b4', '#8695a5', '#778696', '#6a7888'], (u, v) => u * .5 + v * .5);
    P.rect(10, 10, 84, 2, '#cfd9e3'); P.rect(10, 10, 2, 92, '#b8c6d4'); P.rect(92, 12, 2, 90, '#56636f'); P.rect(10, 100, 84, 2, '#56636f');
    [[15, 15], [88, 15], [15, 96], [88, 96], [52, 96]].forEach(([x, y]) => { P.ell(x, y, 2.6, 2.6, '#3d4856'); P.ell(x, y, 1.8, 1.8, '#a9b7c6'); P.set(x - 1, y - 1, '#ffffff'); });
    [20, 76].forEach(y => { P.rect(3, y, 7, 17, INK); P.rect(4, y + 1, 5, 15, '#7d8c9c'); P.rect(4, y + 1, 2, 15, '#cfd9e3'); P.rect(4, y + 8, 5, 1, '#3d4856'); });
    P.rect(24, 18, 56, 18, INK); P.rect(26, 20, 52, 14, '#0c1a12'); P.rect(26, 20, 52, 1, '#06100a'); P.rect(23, 36, 58, 1, '#b8c6d4');
    P.rect(8, 112, 16, 4, INK); P.rect(80, 112, 16, 4, INK); P.rect(10, 112, 12, 2, '#3d4856'); P.rect(82, 112, 12, 2, '#3d4856');
    return P.url();
  }
  function spDial() {
    const P = Cv(34, 34);
    P.ell(17, 17, 17, 17, INK); P.ball(17, 17, 15, 15, ['#7d8590', '#a4acb6', '#c9ced6', '#eef1f5'], -.5, -.7, true); P.ell(17, 17, 11.4, 11.4, '#56636f'); P.ball(17, 17, 10.4, 10.4, ['#8a99a9', '#b0bcc8', '#d9dee6', '#ffffff']);
    for (let a = 45; a < 360; a += 45) { const r = a * Math.PI / 180; P.rect(Math.round(16 + Math.cos(r) * 13), Math.round(16 + Math.sin(r) * 13), 2, 2, '#3d4856'); }
    P.rect(16, 2, 2, 9, '#d6334a'); P.rect(16, 2, 1, 9, '#ff8a8a'); P.ell(17, 17, 3.4, 3.4, INK); P.ell(17, 17, 2, 2, '#56636f'); P.set(16, 16, '#cfd9e3');
    return P.url();
  }
  function spHandle() {
    const P = Cv(34, 34);
    P.rect(15, 2, 4, 30, '#d9dee6'); P.rect(15, 2, 1, 30, '#ffffff'); P.rect(18, 2, 1, 30, '#8a99a9'); P.rect(2, 15, 30, 4, '#d9dee6'); P.rect(2, 15, 30, 1, '#ffffff'); P.rect(2, 18, 30, 1, '#8a99a9');
    [[17, 3], [17, 31], [3, 17], [31, 17]].forEach(([x, y]) => P.ball(x, y, 3, 3, ['#a12a3c', '#e8414f', '#ff8a8a', '#ffd0d0']));
    P.ball(17, 17, 5.5, 5.5, ['#c98a00', '#f2b632', '#ffd166', '#fff3c4']); P.ell(17, 17, 1.6, 1.6, '#7a4e00');
    P.outline();
    return P.url();
  }
  // 貨車 96×52（車頭朝右）
  function spTruck() {
    const P = Cv(96, 52, 9);
    // 貨櫃
    P.rect(0, 4, 64, 38, INK); P.grad(2, 6, 60, 34, ['#ffffff', '#fffaf0', '#f2ecdf', '#e0d9cc'], (u, v) => v); P.rect(2, 36, 60, 4, '#cfc8ba');
    for (let x = 12; x < 62; x += 10) P.rect(x, 7, 1, 29, '#e6dfd0');
    P.rect(8, 14, 48, 16, '#c85a10'); P.rect(8, 14, 48, 14, '#ff7a1a'); P.rect(8, 14, 48, 2, '#ffa95a'); for (let x = 14; x < 52; x += 10) { P.rect(x, 18, 6, 8, '#fffaf0'); P.rect(x, 18, 6, 1, '#ffffff'); }
    // 車頭
    P.rect(64, 12, 30, 30, INK); P.poly([[66, 14], [84, 14], [92, 24], [92, 40], [66, 40]], '#3c8dde'); P.rect(66, 14, 18, 2, '#78c3f0'); P.rect(66, 34, 26, 6, '#2a6cb4'); P.rect(66, 14, 2, 26, '#5aa6ea');
    P.poly([[74, 17], [83, 17], [89, 25], [89, 28], [74, 28]], INK); P.poly([[76, 19], [82, 19], [87, 26], [76, 26]], '#cfeeff'); P.poly([[76, 19], [80, 19], [77, 24], [76, 24]], '#ffffff');
    P.rect(70, 30, 4, 1, INK); P.rect(90, 30, 4, 4, '#ffd166'); P.rect(90, 30, 4, 1, '#fff3c4'); P.rect(88, 38, 8, 4, '#8b8aa3'); P.rect(88, 38, 8, 1, '#d3d1e6');
    P.rect(0, 40, 96, 4, INK); P.rect(2, 41, 86, 1, '#5d5a77');
    [16, 76].forEach(x => { P.ell(x, 44, 8, 8, INK); P.ball(x, 44, 6.4, 6.4, ['#2a2640', '#3a3550', '#4a4766', '#5d5a77']); P.ball(x, 44, 3.4, 3.4, ['#8b8aa3', '#a7a4c4', '#d3d1e6', '#ffffff']); P.set(x, 44, INK); });
    return P.url();
  }
  const wood = (P, x, y, w, h) => { P.rect(x, y, w, h, INK); P.grad(x + 2, y + 2, w - 4, h - 4, ['#dca066', '#c98a4b', '#b47a40'], (u, v) => v); P.rect(x + 2, y + 2, w - 4, 2, '#f0bc84'); P.rect(x + 2, y + h - 4, w - 4, 2, '#8a5a32'); };
  function spCrate() {
    const P = Cv(32, 28); wood(P, 0, 0, 32, 28);
    P.rect(2, 12, 28, 5, '#9a6a3f'); P.rect(2, 12, 28, 1, '#b47a40'); P.rect(14, 2, 5, 24, '#9a6a3f'); P.rect(14, 2, 1, 24, '#b47a40');
    P.rect(11, 11, 11, 7, '#a12a3c'); P.rect(12, 12, 9, 5, '#e8414f'); P.rect(12, 12, 9, 1, '#ff8a8a');
    [[4, 4], [27, 4], [4, 23], [27, 23]].forEach(([x, y]) => { P.set(x, y, '#6e4a2a'); P.set(x, y - 1, '#f0bc84'); });
    return P.url();
  }
  // 鎖 40×48：open 時鎖頭往右上打開
  function spLock(open) {
    const P = Cv(40, 48), cx = open ? 30 : 20, cy = open ? 12 : 20;
    for (let a = 180; a <= 360; a += 1) { const r = a * Math.PI / 180; for (let k = 0; k < 6; k++) P.set(cx + Math.cos(r) * (13 - k), cy + Math.sin(r) * (14 - k) + (open ? 2 : 0), k === 0 || k === 5 ? INK : k < 3 ? '#e6e4f5' : '#a7a4c4'); }
    if (open) { P.rect(38, 12, 2, 8, INK); P.rect(17, 14, 6, 8, INK); P.rect(18, 14, 4, 8, '#a7a4c4'); } else { P.rect(7, 20, 6, 3, INK); P.rect(27, 20, 6, 3, INK); P.rect(8, 20, 2, 3, '#e6e4f5'); P.rect(10, 20, 2, 3, '#a7a4c4'); P.rect(28, 20, 2, 3, '#e6e4f5'); P.rect(30, 20, 2, 3, '#a7a4c4'); }
    P.rect(2, 20, 36, 28, INK); P.grad(4, 22, 32, 24, ['#ffe08a', '#ffd166', '#f2b632', '#d49a1e'], (u, v) => v); P.rect(4, 22, 32, 2, '#fff3c4'); P.rect(4, 22, 2, 24, '#ffe9a8'); P.rect(4, 42, 32, 4, '#c98a00'); P.rect(34, 24, 2, 20, '#d49a1e');
    P.ell(20, 31, 4.4, 4.4, INK); P.rect(18, 32, 4, 9, INK); P.set(19, 29, '#5d5a77');
    return P.url();
  }
  function spKey(c, d) {
    const P = Cv(44, 18), lt = mix(c, '#ffffff', .6);
    P.ball(9, 9, 8, 8, [d, mix(c, d, .5), c, lt]); P.ell(9, 9, 3.2, 3.2, INK); P.set(5, 4, '#ffffff'); P.set(6, 4, '#ffffff');
    P.rect(16, 7, 26, 4, c); P.rect(16, 7, 26, 1, lt); P.rect(16, 10, 26, 1, d);
    P.rect(30, 11, 4, 5, c); P.rect(30, 11, 1, 5, lt); P.rect(37, 11, 4, 4, c); P.rect(37, 11, 1, 4, lt); P.rect(30, 15, 4, 1, d); P.rect(37, 14, 4, 1, d);
    P.outline(); P.ell(9, 9, 3.2, 3.2, INK);
    return P.url();
  }
  // 發射台 44×12、發射塔 12×72
  function spPad() {
    const P = Cv(44, 12); P.rect(0, 0, 44, 12, INK); P.rect(2, 2, 40, 8, '#8b8aa3'); P.rect(2, 2, 40, 2, '#d3d1e6'); P.rect(2, 8, 40, 2, '#5d5a77');
    for (let y = 4; y < 8; y++) for (let x = 6; x < 38; x++) P.set(x, y, ((x + (y - 4)) >> 2) % 2 ? INK : '#ffd166');
    return P.url();
  }
  function spTower() {
    const P = Cv(12, 72);
    for (let y = 0; y < 72; y += 8) { P.line(1, y, 10, y + 8, '#8b8aa3'); P.line(10, y, 1, y + 8, '#6b6880'); P.rect(0, y, 12, 2, '#a7a4c4'); P.rect(0, y, 12, 1, '#d3d1e6'); }
    P.rect(0, 0, 2, 72, '#a7a4c4'); P.rect(0, 0, 1, 72, '#d3d1e6'); P.rect(10, 0, 2, 72, '#5d5a77');
    P.rect(0, 0, 12, 4, '#e8414f'); P.rect(0, 0, 12, 1, '#ff8a8a'); P.rect(0, 3, 12, 1, '#a12a3c');
    return P.url();
  }

  /* ================= 火車：乾淨點陣風（粗黑框、每個零件三階明暗）。尺寸是舊圖兩倍，輪子底部在最後一列 ================= */
  // 有黑框的方塊：上面一條亮、下面一條暗
  const box = (P, x, y, w, h, c, lt, dk, hi = Math.max(2, Math.round((h - 4) * .22)), lo = Math.max(2, Math.round((h - 4) * .25))) => { P.rect(x, y, w, h, INK); P.rect(x + 2, y + 2, w - 4, h - 4, c); if (lt) P.rect(x + 2, y + 2, w - 4, hi, lt); if (dk) P.rect(x + 2, y + h - 2 - lo, w - 4, lo, dk); };
  // 輪子：黑框、鐵圈、紅色輪面、十字輪輻、金色軸心
  const wheel = (P, cx, cy, r, face, dark, spokes = true) => {
    P.ell(cx, cy, r, r, INK); P.ell(cx, cy, r - 2, r - 2, '#d3d1e6');
    for (let y = Math.floor(cy); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { const d = Math.hypot(x + .5 - cx, y + .5 - cy); if (d <= r - 2 && d > r - 4 && y + .5 > cy + 1) P.set(x, y, '#8b8aa3'); }
    P.ell(cx, cy, r - 4, r - 4, INK); P.ell(cx, cy, r - 5, r - 5, dark);
    if (spokes) { const k = (r - 5) * .7; P.line(cx - k, cy - k, cx + k - 1, cy + k - 1, face, 2.4); P.line(cx + k - 1, cy - k, cx - k, cy + k - 1, face, 2.4); P.rect(cx - 1, cy - r + 5, 2, (r - 5) * 2, face); P.rect(cx - r + 5, cy - 1, (r - 5) * 2, 2, face); } else P.ell(cx, cy, r - 5, r - 5, face);
    P.ell(cx, cy, 2.6, 2.6, INK); P.ell(cx, cy, 1.6, 1.6, '#ffd166');
  };
  function spLoco() {
    const P = Cv(112, 68);
    // 底盤、連結器、排障器
    P.rect(2, 44, 104, 7, INK); P.rect(4, 46, 100, 3, '#3a3550'); P.rect(0, 44, 4, 6, INK);
    P.poly([[100, 48], [112, 62], [112, 66], [100, 66]], INK); P.poly([[102, 51], [110, 62], [110, 64], [102, 64]], '#8b8aa3'); [54, 58, 62].forEach(y => P.rect(102, y, 8, 1, INK));
    // 鍋爐（紅）、金箍
    box(P, 36, 22, 62, 26, '#e8414f', '#ff8a8a', '#a12a3c', 4, 6);
    [48, 64, 80].forEach(x => { P.rect(x, 22, 6, 26, INK); P.rect(x + 2, 24, 2, 22, '#ffd166'); P.rect(x + 2, 24, 2, 4, '#fff3c4'); P.rect(x + 2, 40, 2, 6, '#c98a00'); });
    // 煙箱和車頭燈
    box(P, 94, 20, 12, 28, '#3a3550', '#6b6890', '#231f38', 4, 6);
    box(P, 102, 24, 10, 10, '#ffd166', '#fff3c4', '#f2b632', 2, 2);
    // 蒸汽圓頂、煙囪
    P.ell(66, 20, 9, 9, INK); P.rect(57, 20, 18, 4, INK); P.ell(66, 20, 7, 7, '#ffd166'); P.ell(64, 17, 3, 2, '#fff3c4'); P.rect(59, 20, 14, 2, '#c98a00'); P.rect(64, 8, 4, 4, INK);
    box(P, 82, 6, 12, 18, '#3a3550', null, null); P.rect(84, 8, 3, 14, '#6b6890'); P.rect(90, 8, 2, 14, '#231f38');
    box(P, 78, 0, 20, 8, '#5d5a77', '#8b8aa3', null, 2);
    // 駕駛室（藍）、屋頂、車窗
    box(P, 0, 6, 40, 42, '#3c8dde', '#78c3f0', '#2a6cb4', 4, 6); P.rect(34, 10, 4, 30, '#2a6cb4');
    box(P, 0, 2, 44, 8, '#5d5a77', '#a7a4c4', null, 2);
    P.rect(6, 12, 24, 20, INK);
    box(P, 8, 34, 20, 6, '#ffd166', '#fff3c4', null, 1);
    // 輪子和連桿
    wheel(P, 17, 58, 9, '#e8414f', '#8a2034', false);
    [43, 67, 91].forEach(x => wheel(P, x, 56, 11, '#e8414f', '#8a2034'));
    P.rect(39, 58, 56, 6, INK); P.rect(41, 60, 52, 2, '#d3d1e6'); P.rect(41, 60, 52, 1, '#ffffff');
    [43, 67, 91].forEach(x => { P.ell(x, 61, 3.4, 3.4, INK); P.ell(x, 61, 2, 2, '#ffd166'); });
    P.clear(8, 14, 20, 16);
    return P.url();
  }
  // 車廂：底盤和輪子底部的高度跟火車頭一樣（底盤在輪底往上 16–23 列，最後一列留空）
  function spCar(c) {
    const P = Cv(76, 52), L = mix(c, '#ffffff', .45), D = mix(c, '#000000', .28);
    box(P, 2, 0, 72, 8, '#5d5a77', '#a7a4c4', null, 2);
    box(P, 0, 6, 76, 27, c, L, D, 2, 4);
    P.rect(2, 23, 72, 3, '#fffaf0'); P.rect(2, 25, 72, 1, '#d9d3c2');
    for (let x = 6; x < 66; x += 17) { P.rect(x, 10, 14, 12, INK); P.rect(x + 2, 12, 10, 8, '#9fd4f5'); P.rect(x + 2, 12, 10, 2, '#e6f6ff'); P.rect(x + 2, 12, 3, 8, '#e6f6ff'); }
    P.rect(2, 29, 72, 7, INK); P.rect(4, 31, 68, 3, '#3a3550'); P.rect(0, 29, 4, 6, INK); P.rect(72, 29, 4, 6, INK);
    [12, 28, 48, 64].forEach(x => { P.ell(x, 43.5, 7.5, 7.5, INK); P.ell(x, 43.5, 5.5, 5.5, '#d3d1e6'); for (let y = 44; y < 50; y++) for (let xx = x - 6; xx < x + 6; xx++) if (Math.hypot(xx + .5 - x, y + .5 - 43.5) <= 5.5) P.set(xx, y, '#8b8aa3'); P.ell(x, 43.5, 2.6, 2.6, INK); P.ell(x, 43.5, 1.3, 1.3, '#ffd166'); });
    return P.url();
  }

  /* ================= 山洞（火車過山洞）：乾淨版，尺寸是舊圖兩倍。theme = 'hill' 草山、'cave' 岩壁 ================= */
  function tunnel(theme) {
    const MW = 144, MH = 140, OX0 = 12, OW = 52, OTOP = 60, OR = 26, cx = OX0 + OR, cy = OTOP + OR, cave = theme === 'cave';
    const inHole = (x, y) => x >= OX0 && x < OX0 + OW && (y >= cy || (x + .5 - cx) ** 2 + (y + .5 - cy) ** 2 <= OR * OR);
    const inArch = (x, y) => { const d = Math.hypot(x + .5 - cx, y + .5 - cy); return !inHole(x, y) && x >= OX0 - 8 && x < OX0 + OW + 8 && (y >= cy ? (x < OX0 || x >= OX0 + OW) : d <= OR + 8); };
    const ridge = x => cave ? 0 : Math.max(4, Math.min(140, x < 88 ? 140 - x * 1.5 - Math.sin(x * .25) * 3 : 8 + (x - 88) * .9 + Math.sin(x * .35) * 2));
    const edge = y => cave ? Math.max(0, 28 - y * .5) + Math.sin(y * .4) * 2.4 : 0;
    const body = (x, y) => x >= edge(y) && y >= ridge(x);
    const draw = () => {
      const P = Cv(MW, MH, 13), R = cave ? ['#4b4160', '#40375a', '#352e47'] : ['#8a7866', '#7a6a5a', '#665848'];
      for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (body(x, y)) {
        const dy = y - ridge(x);
        P.set(x, y, !cave && dy < 5 ? '#9ae88a' : !cave && dy < 12 ? '#6ab55a' : !cave && dy < 20 ? '#4f9a4a' : R[y < 60 ? 0 : y < 104 ? 1 : 2]);
      }
      // 幾塊大石面（每塊只有底色和一條亮邊）
      (cave ? [[70, 20, 26], [104, 50, 30], [84, 88, 34], [112, 116, 22], [60, 124, 20]] : [[92, 44, 22], [108, 70, 26], [80, 96, 30], [112, 118, 24], [70, 126, 18]]).forEach(([x, y, w]) => { if (body(x, y) && body(x + w, y)) { P.rect(x, y, w, 6, cave ? '#5d5274' : '#9a8a7a'); P.rect(x, y, w, 2, cave ? '#74688c' : '#b4a492'); P.rect(x + 2, y + 6, w, 2, cave ? '#2a2438' : '#564a3e'); } });
      if (cave) { [[104, 34, '#78e0f0'], [124, 96, '#b48cff']].forEach(([x, y, c]) => { P.poly([[x - 5, y], [x - 2, y - 12], [x + 1, y]], mix(c, '#ffffff', .5)); P.poly([[x, y], [x + 3, y - 18], [x + 7, y]], c); P.poly([[x + 6, y], [x + 9, y - 9], [x + 12, y]], mix(c, '#1a1040', .35)); P.set(x + 3, y - 18, '#ffffff'); }); }
      else [[100, 30, 16], [118, 44, 13], [82, 20, 11]].forEach(([x, y, h]) => { for (let i = 0; i < h; i++) { const half = Math.round(1 + (i / h) * (h * .42) * (.5 + .5 * ((i % 5) / 5))); P.rect(x - half, y - h + i, half * 2 + 1, 1, '#3e8f3a'); P.rect(x - half, y - h + i, Math.max(1, half - 1), 1, '#5aa63c'); } P.rect(x - 1, y, 2, 3, '#5e3d22'); });
      // 拱門：草山是石塊，洞穴是木框
      for (let y = OTOP - 10; y < MH; y++) for (let x = OX0 - 10; x < OX0 + OW + 10; x++) if (inArch(x, y)) {
        const d = Math.hypot(x + .5 - cx, y + .5 - cy), ang = Math.atan2(y - cy, x - cx), joint = y >= cy ? (y - cy) % 14 < 2 : Math.abs(((ang + Math.PI) / (Math.PI / 7)) % 1 - .5) > .43;
        const inner = y >= cy ? (x >= OX0 - 3 && x < OX0 + OW + 3) : d < OR + 3, outer = y >= cy ? (x < OX0 - 6 || x >= OX0 + OW + 6) : d > OR + 6;
        P.set(x, y, joint ? (cave ? '#5a3a20' : '#5d5a77') : inner ? (cave ? '#b8834e' : '#d3d1e6') : outer ? (cave ? '#7a5030' : '#8b8aa3') : (cave ? '#9a6a3f' : '#a7a4c4'));
      }
      P.outline(INK, 2);
      for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (inHole(x, y)) P.clear(x, y, 1, 1);
      // 洞口內緣描一圈黑框
      for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (!inHole(x, y) && P.has(x, y) && (inHole(x - 1, y) || inHole(x + 1, y) || inHole(x, y + 1) || inHole(x - 2, y) || inHole(x + 2, y) || inHole(x, y + 2))) P.set(x, y, INK);
      return P;
    };
    const back = draw(); back.clear(OX0 + OW, 0, MW, MH); const front = draw(); front.clear(0, 0, OX0 + OW, MH);
    // 蓋在火車上的陰影：三段平塗的半透明黑，不用細點
    const c = document.createElement('canvas'); c.width = MW; c.height = MH; const g = c.getContext('2d');
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (inHole(x, y)) { const t = (x - OX0) / OW, a = t < .2 ? 0 : t < .4 ? .35 : t < .6 ? .65 : .96; if (a) { g.fillStyle = `rgba(12,10,20,${a})`; g.fillRect(x, y, 1, 1); } }
    return { mountBack: back.url(), mountFront: front.url(), holeShade: c.toDataURL() };
  }
  // 聚光燈：一整片半透明，不用格子點
  function spBeam(col) { const c = document.createElement('canvas'); c.width = 40; c.height = 64; const g = c.getContext('2d'); g.fillStyle = col; g.beginPath(); g.moveTo(18, 0); g.lineTo(22, 0); g.lineTo(40, 64); g.lineTo(0, 64); g.fill(); return c.toDataURL(); }

  /* ================= 套用：換背景，角色交給 games-core.js（它會先看 ART.HD） ================= */
  const LANES = ['#e8414f', '#3c8dde', '#ffd166', '#2f9e5b'];
  ART.BG.boss = bgBoss();
  ART.BG.race = bgRace();
  ART.BG.bomb = bgBomb(); ART.SP.bomb = spBomb();
  ART.BG.gacha = bgGacha(); ART.SP.machine = spMachine(); ART.SP.knob = spKnob();
  ART.BG.rocket = bgRocket();
  ART.BG.fish = bgFish();
  ART.BG.ox = bgOx(); ART.BG.vote = bgVote(); ART.BG.detect = bgDetect(); ART.BG.bridge = bgBridge(); ART.BG.vault = bgVault(); ART.BG.sky = bgSky();
  Object.assign(ART.SP, { signO: spSign('O', '#d6334a', false), signOlit: spSign('O', '#d6334a', true), signX: spSign('X', '#3c8dde', false), signXlit: spSign('X', '#3c8dde', true), panelO: spPanel('#d6334a', 'O'), panelX: spPanel('#3c8dde', 'X'), onair: [spOnAir(false), spOnAir(true)] });
  Object.assign(ART.SP, tunnel('hill')); ART.SP.beam = spBeam('rgba(255,243,196,.3)');
  ART.SP.loco = spLoco(); ART.SP.cars = ['#ffd166', '#2f9e5b', '#b48cff', '#ff9b6b'].map(spCar);
  Object.assign(ART.SP, { safe: spSafe(), dial: spDial(), handle: spHandle(), truck: spTruck(), crate: spCrate(), lockC: spLock(false), lockO: spLock(true), pad: spPad(), tower: spTower(),
    keys: [['#ffd166', '#c98a00'], ['#d3d1e6', '#8b8aa3'], ['#ff9b6b', '#c45a2a'], ['#8fe0a2', '#3e8f3a']].map(([c, d]) => spKey(c, d)) });
  ART.BG.door = bgDoor(); ART.BG.rail = bgRail(); ART.BG.roof = bgRoof(); ART.BG.lab = bgLab();
  ART.HD = {
    Cv, Mask, paint, mix, rampOf, tunnel, spBeam,
    // 第 0–3 隻是小飛龍（第 0 隻也是洞穴魔王），後面是五款可愛怪獸各四色；打怪獸每題隨機出一隻
    mon: [...MONPAL.map(monster), ...Object.keys(CUTE).flatMap(k => CUTE[k].map(c => cute[k](c)))],
    horse: LANES.map((c, i) => [0, 1].map(f => horse(COATS[i][0], COATS[i][1], c, f))),
    weapon: weapons, cannon: cannon.src, balls: LANES.map(shell),
    rocket: LANES.map(spRocket), fish: spFish(), boot: spBoot(),
  };
})();
