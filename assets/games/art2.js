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
      pick(ramp, t, x, y, dither = true) { const n = ramp.length, f = Math.max(0, Math.min(.9999, t)) * (n - 1), i = Math.floor(f), fr = f - i; if (!dither) return ramp[Math.round(f)]; return ramp[fr > (B4[(y & 3) * 4 + (x & 3)] + .5) / 16 ? i + 1 : i]; },
      grad(x, y, ww, hh, ramp, fn) { for (let yy = y; yy < y + hh; yy++) for (let xx = x; xx < x + ww; xx++) { const u = (xx - x) / ww, v = (yy - y) / hh; P.set(xx, yy, P.pick(ramp, fn ? fn(u, v, xx, yy) : v, xx, yy)); } },
      // 抖色疊一層（a 0–1 是覆蓋比例）
      veil(x, y, col, a) { if (a > (B4[(y & 3) * 4 + (x & 3)] + .5) / 16) P.set(x, y, col); },
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
      outline(col = INK) { const add = []; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!P.has(x, y) && (P.has(x - 1, y) || P.has(x + 1, y) || P.has(x, y - 1) || P.has(x, y + 1))) add.push([x, y]); add.forEach(([x, y]) => P.set(x, y, col)); },
      url() { g.putImageData(im, 0, 0); return c.toDataURL(); },
    };
    return P;
  }
  const ramp4 = (base, dark = '#150f2e', light = '#ffffff') => [mix(base, dark, .5), mix(base, dark, .22), base, mix(base, light, .32)];

  /* ================= 打怪獸：月夜城堡草原 ================= */
  function bgBoss() {
    const P = Cv(320, 200, 71);
    const sky = ['#0c0a22', '#120f34', '#1a1549', '#261c60', '#372573', '#522f84', '#77408f', '#a25896', '#d27f95'];
    P.grad(0, 0, 320, 106, sky, (u, v) => Math.pow(v, 1.7));
    // 星星
    for (let i = 0; i < 150; i++) { const x = P.R() * 320 | 0, y = P.R() * P.R() * 84 | 0, c = ['#fffaf0', '#fff3c4', '#b9d8ff', '#8f86c9'][P.R() * 4 | 0]; P.set(x, y, c); if (P.R() < .09) { const m = mix(c, '#261c60', .45); P.set(x - 1, y, m); P.set(x + 1, y, m); P.set(x, y - 1, m); P.set(x, y + 1, m); } }
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
    for (let i = 0; i < 70; i++) { const x = P.R() * 320 | 0, y = 190 + P.R() * 9 | 0, c = ['#ff8fb1', '#ffd166', '#fffaf0', '#ff6b6b'][i % 4]; P.set(x, y, c); P.set(x + 1, y, c); P.set(x, y + 1, mix(c, '#000000', .2)); }
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
    P.outline();
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
  function critter(fn) { const W = 96, H = 84, P = Cv(W, H); const part = (f, ramp, o) => { const M = Mask(W, H); f(M); return paint(P, M, ramp, o); }; fn(P, part); P.outline(); return P.url(); }
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
    const P = Cv(84, 92);
    P.ball(42, 52, 38, 38, ['#0c0a16', '#1b1830', '#35324e', '#5d5a77', '#8b8aa3'], -.55, -.65, true);
    P.ell(26, 34, 6, 4, '#a7a4c4'); P.ell(24, 33, 3, 2, '#e6e4f5'); P.set(34, 28, '#cfcde6');
    for (let a = 0; a < 16; a++) { const t = a / 16 * Math.PI * 2 + .2, x = 42 + Math.cos(t) * 32, y = 52 + Math.sin(t) * 32; P.rect(x, y, 2, 2, '#9a97b8'); P.set(x + 1, y + 1, '#0c0a16'); P.set(x, y, '#e6e4f5'); }
    const M = Mask(84, 92); M.rect(30, 6, 24, 12); paint(P, M, ['#35324e', '#6b6890', '#9a97b8', '#e6e4f5'], { d1: 1, d2: 3, h1: 2 }); [36, 42, 48].forEach(x => P.rect(x, 7, 1, 10, '#4a4766'));
    P.rect(28, 17, 28, 3, '#1b1830'); P.rect(28, 17, 28, 1, '#5d5a77');
    P.outline('#0b0912'); return P.url();
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
    for (let i = 0; i < 190; i++) { const x = P.R() * 320 | 0, y = P.R() * 140 | 0, c = ['#fffaf0', '#fff3c4', '#b9d8ff', '#ffd6e6', '#7f78b8'][P.R() * 5 | 0]; P.set(x, y, c); if (P.R() < .08) { const m = mix(c, '#201b48', .45); P.set(x - 1, y, m); P.set(x + 1, y, m); P.set(x, y - 1, m); P.set(x, y + 1, m); } }
    // 銀河
    for (let i = 0; i < 500; i++) { const t = P.R(), x = t * 320, y = 20 + t * 50 + (P.R() - .5) * 26 * (1 - Math.abs(t - .5)); P.veil(x | 0, y | 0, '#4a3f8c', .35); }
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
    sea.forEach((c, i) => { P.rect(0, ys[i], 320, ys[i + 1] - ys[i], c); if (i) for (let x = 0; x < 320; x += 2) P.set(x + (i % 2), ys[i], sea[i - 1]); });
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

  /* ================= 套用：換背景，角色交給 games-core.js（它會先看 ART.HD） ================= */
  const LANES = ['#e8414f', '#3c8dde', '#ffd166', '#2f9e5b'];
  ART.BG.boss = bgBoss();
  ART.BG.race = bgRace();
  ART.BG.bomb = bgBomb(); ART.SP.bomb = spBomb();
  ART.BG.gacha = bgGacha(); ART.SP.machine = spMachine(); ART.SP.knob = spKnob();
  ART.BG.rocket = bgRocket();
  ART.BG.fish = bgFish();
  ART.HD = {
    Cv, Mask, paint, mix, rampOf,
    // 第 0–3 隻是小飛龍（第 0 隻也是洞穴魔王），後面是五款可愛怪獸各四色；打怪獸每題隨機出一隻
    mon: [...MONPAL.map(monster), ...Object.keys(CUTE).flatMap(k => CUTE[k].map(c => cute[k](c)))],
    horse: LANES.map((c, i) => [0, 1].map(f => horse(COATS[i][0], COATS[i][1], c, f))),
    weapon: weapons, cannon: cannon.src, balls: LANES.map(shell),
    rocket: LANES.map(spRocket), fish: spFish(), boot: spBoot(),
  };
})();
