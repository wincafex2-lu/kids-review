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
    // 草原（月光下，遠的偏藍、近的深）
    const grass = ['#3d7f6a', '#3f8a5e', '#45964f', '#429048', '#377f42', '#2c6c3c', '#235934', '#1c482e'];
    P.grad(0, 106, 320, 94, grass, (u, v) => v * .92 + (P.R() - .5) * .1);
    // 月光灑在草地上
    for (let y = 108; y < 150; y++) for (let x = 60; x < 220; x++) { const k = ((x - 140) / 80) ** 2 + ((y - 118) / 30) ** 2; if (k < 1) P.veil(x, y, '#7fc48a', (1 - k) * .4); }
    // 泥土小路：從城門彎到前景
    for (let y = 106; y < 200; y++) { const v = (y - 106) / 94, cx = 62 + 78 * Math.pow(v, 1.25) + 12 * Math.sin(v * 5.2), half = 3 + 24 * v; for (let x = Math.round(cx - half - P.R() * 2); x < cx + half + P.R() * 2; x++) { const e = Math.abs(x - cx) / half; P.set(x, y, P.pick(['#5a463e', '#7a6250', '#917860', '#a88e70'], .62 - e * .5 + (P.R() - .5) * .3, x, y)); } }
    for (let i = 0; i < 46; i++) { const v = P.R(), y = 108 + v * 90, cx = 62 + 78 * Math.pow(v, 1.25) + 12 * Math.sin(v * 5.2), x = cx + (P.R() - .5) * (4 + 40 * v); P.rect(x, y, 2 + v * 2, 1, '#c2aa88'); P.rect(x, y + 1, 2 + v * 2, 1, '#4a3a34'); }
    // 草叢、小花、螢火蟲
    for (let i = 0; i < 420; i++) { const v = P.R(), x = P.R() * 320 | 0, y = 110 + v * 88 | 0, hi = v > .5 ? '#5fae58' : '#6fbe7a', lo = v > .5 ? '#174028' : '#2c6c4c'; P.set(x, y, lo); P.set(x, y - 1, hi); if (v > .35) { P.set(x - 1, y - 2, hi); P.set(x + 1, y - 2, hi); P.set(x, y - 2, lo); } }
    for (let i = 0; i < 40; i++) { const x = P.R() * 320 | 0, y = 114 + P.R() * 80 | 0, c = ['#ffd166', '#ff8fb1', '#fffaf0', '#b9d8ff'][i % 4]; P.set(x, y, c); P.set(x - 1, y + 1, c); P.set(x + 1, y + 1, c); P.set(x, y + 1, '#fff3c4'); P.set(x, y + 2, '#2c6c3c'); }
    for (let i = 0; i < 14; i++) { const x = 10 + P.R() * 300 | 0, y = 96 + P.R() * 70 | 0; P.veil(x - 1, y, '#c8e86a', .5); P.veil(x + 1, y, '#c8e86a', .5); P.veil(x, y - 1, '#c8e86a', .5); P.veil(x, y + 1, '#c8e86a', .5); P.set(x, y, '#f4ffb0'); }
    // 大石頭
    const rock = (x, y, rx, ry) => { P.ell(x + 1, y + ry - 1, rx + 2, 2.4, '#1c482e'); P.ball(x, y, rx, ry, ['#3a3558', '#56507a', '#7a759c', '#a7a4c4', '#cfcde6'], .5, -.7, true); P.rect(x - rx + 1, y + ry - 1, rx * 2 - 2, 1, '#2c2846'); P.set(x - 2, y + 1, '#3a3558'); P.set(x - 1, y + 2, '#3a3558'); };
    rock(196, 122, 7, 5); rock(292, 150, 10, 7); rock(22, 140, 8, 6); rock(246, 186, 6, 4); rock(170, 168, 4, 3);
    // 前景深色草
    for (let x = 0; x < 320; x++) { const hh = 3 + (Math.sin(x * .7) + Math.sin(x * 1.9 + 2)) * 1.6 + P.R() * 3; for (let y = 200 - hh; y < 200; y++) P.set(x, y, y - (200 - hh) < 1 ? '#2c6c3c' : '#12301f'); }
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
    // 草地賽道：一格一格割草紋
    for (let y = 40; y < 186; y++) for (let x = 0; x < 320; x++) { const band = ((x + (y >> 1)) >> 5) % 2, n = P.R(); P.set(x, y, n < .06 ? (band ? '#3f9a44' : '#4aa84a') : n > .95 ? (band ? '#72cc66' : '#84d870') : (band ? '#56b552' : '#64c25a')); }
    P.grad(0, 40, 320, 5, ['#2c7a3a', '#3f9a44', null].filter(Boolean), (u, v) => v);
    for (let i = 0; i < 260; i++) { const x = P.R() * 320 | 0, y = 46 + P.R() * 138 | 0; P.set(x, y, '#2f8a3c'); P.set(x, y - 1, '#8fe07a'); P.set(x + 1, y - 2, '#8fe07a'); }
    for (let i = 0; i < 26; i++) { const x = P.R() * 320 | 0, y = 48 + P.R() * 134 | 0; P.rect(x, y, 3, 1, '#8a6a3a'); P.rect(x + 1, y - 1, 2, 1, '#a88450'); }
    // 內圈：白欄杆＋花圃
    P.grad(0, 186, 320, 14, ['#2f8a3c', '#267334', '#1c5c2c']);
    for (let x = 0; x < 320; x += 9) { const r = 4 + (P.R() * 2 | 0); P.ball(x + 4, 196, r + 1, r, ['#174a26', '#1f6630', '#2f8a3c', '#4aa84a'], -.4, -.8, true); }
    for (let i = 0; i < 70; i++) { const x = P.R() * 320 | 0, y = 190 + P.R() * 9 | 0, c = ['#ff8fb1', '#ffd166', '#fffaf0', '#ff6b6b'][i % 4]; P.set(x, y, c); P.set(x + 1, y, c); P.set(x, y + 1, mix(c, '#000000', .2)); }
    P.rect(0, 184, 320, 2, '#fffaf0'); P.rect(0, 186, 320, 1, '#b9b6d8');
    for (let x = 8; x < 320; x += 24) { P.rect(x, 184, 2, 8, '#fffaf0'); P.rect(x + 2, 186, 1, 6, '#b9b6d8'); }
    return P.url();
  }

  /* ================= 怪獸（面向左）62×54 ================= */
  function monster(pal) {
    const P = Cv(62, 54), B = ramp4(pal.m), W = ramp4(pal.wing), BE = [mix(pal.b, pal.m, .45), pal.b, mix(pal.b, '#ffffff', .5)], H = [mix(pal.h, '#7a5a20', .45), pal.h, mix(pal.h, '#ffffff', .5)];
    // 翅膀、尾巴、背鰭（在身體後面）
    P.poly([[42, 20], [57, 5], [60, 20], [55, 21], [58, 29], [46, 30]], (x, y) => (x + y > 70 ? W[0] : x - y > 38 ? W[2] : W[1]));
    P.line(44, 21, 57, 6, W[3]); P.line(46, 24, 55, 21, W[0]);
    P.poly([[46, 38], [58, 33], [60, 36], [59, 41], [50, 48]], (x, y) => (y > 41 ? B[0] : B[1])); P.poly([[57, 31], [61, 28], [60, 36]], H[1]);
    [[47, 13], [51, 22], [53, 31]].forEach(([x, y]) => P.poly([[x - 5, y - 3], [x + 3, y - 2], [x - 3, y + 5]], (px, py) => (py > y ? H[0] : H[1])));
    // 腳
    [[21, 49], [41, 49]].forEach(([x, y]) => { P.ball(x, y, 8, 4, B, -.3, -.8); [-6, -3, 0].forEach(k => { P.rect(x + k - 1, y + 1, 2, 3, '#ffffff'); P.set(x + k, y + 3, '#d3d1e6'); }); });
    // 身體、頭
    P.ball(34, 34, 19, 16, B, -.5, -.7);
    P.ball(26, 20, 17, 14, B, -.5, -.7);
    for (let x = 14; x < 44; x++) P.set(x, 32 + Math.round(Math.sin((x - 14) / 30 * Math.PI) * 1.5), B[1]);
    // 肚子
    P.ball(26, 41, 12, 9.5, BE, -.4, -.7);
    [36, 40, 44, 47].forEach((y, i) => { const hw = [9, 11, 10, 7][i]; P.rect(26 - hw, y, hw * 2, 1, BE[0]); });
    // 角
    P.poly([[13, 12], [9, 1], [20, 8]], (x, y) => (x > 13 + (y - 1) * .5 ? H[0] : H[1])); P.set(10, 2, H[2]); P.set(11, 4, H[2]);
    P.poly([[32, 8], [38, 0], [41, 11]], (x, y) => (x > 38 ? H[0] : H[1])); P.set(37, 3, H[2]); P.set(36, 5, H[2]);
    // 手
    P.ball(9, 37, 5, 4, B, -.4, -.8); [[4, 36], [4, 39], [6, 41]].forEach(([x, y]) => { P.rect(x - 1, y, 2, 2, '#ffffff'); });
    P.ball(45, 37, 5, 4.5, [B[0], B[0], B[1], B[2]], -.4, -.8);
    // 眼睛（看左邊）、眉毛
    [[17, 19, 5, 6], [31, 18, 5.5, 6.5]].forEach(([x, y, a, b]) => { P.ell(x, y, a + 1, b + 1, INK); P.ell(x, y, a, b, '#ffffff'); P.ell(x + 1.5, y + 2.5, a * .7, b * .5, '#e6e2f5'); P.ell(x, y, a, b * .6, '#ffffff'); P.ell(x - 2, y + 1, 2.6, 3, INK); P.set(x - 3, y - 1, '#ffffff'); P.set(x - 4, y - 1, '#ffffff'); P.set(x - 3, y - 2, '#ffffff'); });
    P.line(11, 11, 22, 14.5, INK, 2.4); P.line(38, 10, 26, 14.5, INK, 2.4);
    // 腮紅、鼻孔
    P.ell(39, 26, 3, 2, pal.c); P.set(21, 25, B[0]); P.set(22, 25, B[0]); P.set(26, 25, B[0]); P.set(27, 25, B[0]);
    // 嘴巴和牙齒
    P.poly([[9, 27], [36, 27], [33, 33], [28, 35], [16, 35], [11, 32]], INK);
    P.poly([[11, 28], [34, 28], [31, 32], [27, 33.5], [17, 33.5], [13, 31.5]], pal.r); P.ell(23, 33, 5, 1.6, mix(pal.r, '#ffb3c0', .6));
    [12, 17, 22, 27, 31].forEach(x => { P.rect(x, 28, 3, 2, '#ffffff'); P.set(x + 1, 30, '#ffffff'); P.set(x + 2, 29, '#d3d1e6'); });
    [15, 28].forEach(x => { P.rect(x, 31, 2, 2, '#ffffff'); P.set(x, 30, '#ffffff'); });
    P.outline();
    return P.url();
  }
  const MONPAL = [
    { m: '#8a63e8', wing: '#5b3db0', b: '#eadcff', h: '#ffe9a8', r: '#c2283f', c: '#ff8fb1' },
    { m: '#4fb36b', wing: '#2d7a47', b: '#eaf8c8', h: '#ffe08a', r: '#c2283f', c: '#ffb3a0' },
    { m: '#ef6b4a', wing: '#a8352a', b: '#ffe6bf', h: '#f2f2f2', r: '#7a1730', c: '#ffd0a0' },
    { m: '#3f9bd8', wing: '#26679a', b: '#dcf3ff', h: '#ffd166', r: '#c2283f', c: '#ffb3cf' },
  ];

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

  /* ================= 套用 ================= */
  ART.BG.boss = bgBoss();
  ART.BG.race = bgRace();
  if (typeof MON !== 'undefined') MON.splice(0, MON.length, ...MONPAL.map(monster));
  if (typeof HORSE !== 'undefined' && typeof LANE !== 'undefined') LANE.forEach((c, i) => { HORSE[i] = [0, 1].map(f => horse(COATS[i][0], COATS[i][1], c, f)); });
  ART.HD = { Cv, mix, ramp4, monster, horse, MONPAL, COATS };
})();
