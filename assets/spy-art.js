'use strict';
/* 找出間諜的道具圖：乾淨點陣風（粗黑框、大色塊、兩三階明暗、一塊反光，不用細點）。
   每張圖都是 spy.js 裡舊圖的兩倍大、比例相同，所以遊戲裡的位置和大小都不用改。
   要在 spy.js 之前載入；spy.js 會用 window.SPY_ART 蓋掉同名的舊圖，沒載到就沿用舊圖。 */
(() => {
  const INK = '#0d0a16';
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  function Cv(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'), im = g.createImageData(w, h), d = im.data;
    const P = {
      set(x, y, col) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= w || y >= h) return; const i = (y * w + x) * 4, r = rgb(col); d[i] = r[0]; d[i + 1] = r[1]; d[i + 2] = r[2]; d[i + 3] = 255; },
      has: (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0,
      rect(x, y, ww, hh, col) { for (let yy = y; yy < y + hh; yy++) for (let xx = x; xx < x + ww; xx++) P.set(xx, yy, col); },
      // 橢圓；col 可以是函式 (x, y) => 顏色
      ell(cx, cy, rx, ry, col) { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1) P.set(x, y, typeof col === 'function' ? col(x, y) : col); },
      poly(pts, col) {
        const ys = pts.map(p => p[1]), xs = pts.map(p => p[0]);
        for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.max(...xs); x++) {
          let inside = false; const px = x + .5, py = y + .5;
          for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside; }
          if (inside) P.set(x, y, col);
        }
      },
      line(x0, y0, x1, y1, col, th = 2) { const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2) || 1; for (let i = 0; i <= n; i++) P.ell(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, th / 2, th / 2, col); },
      path(pts, col, th) { for (let i = 1; i < pts.length; i++) P.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], col, th); },
      // 整張圖外面描一圈黑框
      outline(th = 2, col = INK) { for (let k = 0; k < th; k++) { const add = []; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!P.has(x, y) && (P.has(x - 1, y) || P.has(x + 1, y) || P.has(x, y - 1) || P.has(x, y + 1))) add.push([x, y]); add.forEach(([x, y]) => P.set(x, y, col)); } },
      url() { g.putImageData(im, 0, 0); return c.toDataURL(); },
    };
    return P;
  }
  const star = (cx, cy, n, r1, r0, rot = 0) => Array.from({ length: n * 2 }, (_, i) => { const a = rot + i * Math.PI / n, r = i % 2 ? r0 : r1; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });

  // 飛彈（28×10），頭朝右
  function missile() {
    const P = Cv(28, 10);
    P.rect(9, 2, 5, 1, '#d6334a'); P.rect(9, 7, 5, 1, '#a3223a');                       // 尾翼
    P.rect(6, 3, 16, 4, '#dfe3ea'); P.rect(6, 3, 16, 1, '#ffffff'); P.rect(6, 6, 16, 1, '#a5adba'); // 彈身
    P.rect(7, 3, 2, 4, '#5a6072');
    P.rect(22, 3, 2, 4, '#d6334a'); P.rect(24, 4, 2, 2, '#d6334a'); P.rect(22, 3, 2, 1, '#ff7a8a'); // 紅彈頭
    P.rect(3, 3, 3, 4, '#ff7a1a'); P.rect(2, 4, 1, 2, '#ff7a1a'); P.rect(4, 4, 2, 2, '#ffd166');    // 火焰
    P.outline(); return P.url();
  }
  // 打中的星星（26×26）
  function pow() {
    const P = Cv(26, 26);
    P.poly(star(13, 13, 8, 11, 5.5, Math.PI / 8), '#ffd166'); P.poly(star(13, 13, 8, 6.5, 3.2, Math.PI / 8), '#fff7d6');
    P.outline(); return P.url();
  }
  // 夾娃娃機的夾子（28×20）
  function claw(shut) {
    const P = Cv(28, 20);
    const L = shut ? [[11, 6], [8, 10], [8, 14], [12, 17]] : [[11, 6], [6, 9], [3, 13], [5, 17]];
    const R = L.map(([x, y]) => [27 - x, y]);
    [L, R].forEach(a => { P.path(a, '#8b93a5', 3.2); P.path(a.map(([x, y]) => [x - .6, y - .6]), '#d5dae3', 1.6); });
    P.rect(10, 2, 8, 5, '#b7bec9'); P.rect(10, 2, 8, 1, '#eef1f5'); P.rect(10, 6, 8, 1, '#7c8396');
    P.outline(); return P.url();
  }
  // 彈簧跳板（24×20）
  function spring() {
    const P = Cv(24, 20);
    for (let i = 0; i < 3; i++) { P.rect(9, 6 + i * 4, 6, 4, '#7c8396'); P.rect(6, 7 + i * 4, 12, 2, '#d5dae3'); P.rect(6, 8 + i * 4, 12, 1, '#a5adba'); }
    P.rect(2, 2, 20, 4, '#ffcc4d'); P.rect(2, 2, 20, 1, '#ffe9a3'); P.rect(2, 5, 20, 1, '#d99a1f');
    P.rect(4, 16, 16, 2, '#a59fbf'); P.rect(4, 17, 16, 1, '#7d7799');
    P.outline(); return P.url();
  }
  // 香蕉皮（24×12）：三片皮往外攤開
  function banana() {
    const P = Cv(24, 12);
    const Y = '#ffd23f', H = '#fff0a0', D = '#d9a514';
    P.poly([[11, 5], [3, 7], [2, 10], [5, 10], [10, 8.5]], Y); P.poly([[13, 5], [21, 7], [22, 10], [19, 10], [14, 8.5]], Y);
    P.poly([[9.5, 6], [14.5, 6], [14, 10], [10, 10]], D);
    P.ell(12, 5.5, 3, 2.4, Y); P.rect(4, 8, 4, 1, H); P.rect(16, 8, 4, 1, H); P.rect(10, 4, 3, 1, H);
    P.rect(11, 2, 2, 2, '#8a5a2b');
    P.outline(); return P.url();
  }
  // 泡泡（20×20）
  function bubble() {
    const P = Cv(20, 20);
    P.ell(10, 10, 8, 8, '#8fc8ff'); P.ell(9.2, 9.2, 6.8, 6.8, '#cdeeff'); P.ell(6.6, 6.4, 2, 1.6, '#ffffff');
    P.outline(); return P.url();
  }
  // 龍捲風（64×56）：上寬下窄的漏斗，兩格左右扭動
  function tornado(f) {
    const P = Cv(64, 56);
    for (let i = 0; i < 10; i++) {
      const hw = 27 * Math.pow(1 - i / 10.5, 1.25) + 2, cx = 32 + Math.sin(i * .95 + f * Math.PI) * (1.5 + i * .35), y = 3 + i * 5, lt = i % 2 === f;
      const x0 = Math.round(cx - hw), w = Math.round(hw * 2);
      P.rect(x0, y, w, 5, lt ? '#e8edf5' : '#b8c0d0'); P.rect(x0, y + 4, w, 1, lt ? '#b8c0d0' : '#8b93a5');
      if (w > 12) P.rect(x0 + 3, y + 1, Math.round(w * .3), 1, '#ffffff');
    }
    P.outline(2, '#3a3f55'); return P.url();
  }
  // 吸塵器（40×24），吸嘴朝左
  function vacuum() {
    const P = Cv(40, 24);
    P.ell(22, 19.5, 2, 2, '#3a3f55'); P.ell(32, 19.5, 2, 2, '#3a3f55');
    P.rect(7, 9, 12, 4, '#dfe3ea'); P.rect(7, 9, 12, 1, '#ffffff'); P.rect(7, 12, 12, 1, '#a5adba');     // 管子
    P.rect(2, 6, 5, 10, '#dfe3ea'); P.rect(2, 6, 5, 1, '#ffffff'); P.rect(5, 7, 2, 9, '#a5adba');         // 吸嘴
    P.ell(27, 11, 10, 8, '#2a7ba3'); P.ell(26.4, 10.2, 9, 7, '#3fa7d6'); P.ell(23, 6.5, 3.6, 1.8, '#9ad8f2'); // 機身
    P.ell(29, 11.5, 4, 4, INK); P.ell(29, 11.5, 2.8, 2.8, '#ffcc4d'); P.rect(27, 10, 2, 1, '#fff0a0');
    P.outline(); return P.url();
  }
  // 捕蟲網（64×64）：網頭在左上、握把往右下
  function net() {
    const P = Cv(64, 64);
    P.line(34, 28, 59, 58, '#6e4a2a', 4.4); P.line(33.2, 28, 58.2, 58, '#b9803f', 1.8);
    P.ell(20, 16, 17, 13, '#b7bec9');
    P.ell(20, 16, 15, 11, (x, y) => (x % 7 === 3 || y % 7 === 2) ? '#c9c3e6' : '#f8f8fc');
    P.outline(); return P.url();
  }
  // 鐵籠（32×40）
  function cage() {
    const P = Cv(32, 40), G = '#ffcc4d', H = '#ffe9a3', D = '#c98a1f';
    P.rect(14, 2, 4, 4, G);
    P.rect(2, 6, 28, 4, G); P.rect(2, 6, 28, 1, H); P.rect(2, 9, 28, 1, D);
    P.rect(2, 34, 28, 4, G); P.rect(2, 34, 28, 1, H); P.rect(2, 37, 28, 1, D);
    [2, 27].forEach(x => { P.rect(x, 10, 3, 24, G); P.rect(x, 10, 1, 24, H); P.rect(x + 2, 10, 1, 24, D); });
    P.outline();
    [11, 18].forEach(x => { P.rect(x - 1, 10, 5, 24, INK); P.rect(x, 10, 3, 24, G); P.rect(x, 10, 1, 24, H); P.rect(x + 2, 10, 1, 24, D); });
    return P.url();
  }
  // 地洞（24×10）
  function pit() {
    const P = Cv(24, 10);
    P.ell(12, 5, 10, 3, '#6b5a3a'); P.ell(12, 5.6, 8.4, 2.2, '#120f1c'); P.rect(7, 4, 10, 1, '#3a3550');
    P.outline(); return P.url();
  }
  // 大老鷹（40×24），頭朝右；兩格：翅膀往上、往下
  function eagle(down) {
    const P = Cv(40, 24), B = '#8f4b2a', W1 = '#6e4a2a', HL = '#a8683a';
    P.poly([[10, 12], [3, 10], [3, 17], [11, 16]], W1); P.rect(3, 13, 6, 1, '#573719');             // 尾巴
    P.ell(20, 14, 10, 4.4, B); P.rect(13, 16, 15, 2, '#6e3a20');                                  // 身體
    P.rect(18, 18, 2, 2, '#ffcc4d'); P.rect(23, 18, 2, 2, '#ffcc4d');                             // 爪子
    P.ell(31, 11, 4.4, 4, '#f3f5f7'); P.rect(28, 13, 6, 2, '#c5cbd6'); P.rect(32, 9, 2, 2, INK);   // 白頭
    P.poly([[35, 10.5], [38, 12], [35, 14]], '#ffcc4d');                                          // 嘴
    if (down) { P.poly([[13, 12], [25, 12], [17, 21.5], [9, 21.5]], W1); P.poly([[14, 13], [20, 13], [15, 19], [11, 19]], HL); }
    else { P.poly([[13, 13], [25, 13], [17, 2.5], [8, 2.5]], W1); P.poly([[14, 12], [20, 12], [15, 5], [11, 5]], HL); }
    P.outline(); return P.url();
  }
  // 警車（68×36），車頭朝左；兩格警燈交替
  function car([r, b]) {
    const P = Cv(68, 36);
    P.rect(28, 2, 6, 4, r); P.rect(34, 2, 6, 4, b); P.rect(28, 2, 12, 1, '#ffffff');
    P.poly([[19, 6], [50, 6], [55, 16], [14, 16]], '#f3f5f7');
    P.poly([[21, 8], [32, 8], [32, 15], [18, 15]], '#8fd0ef'); P.poly([[35, 8], [48, 8], [52, 15], [35, 15]], '#8fd0ef');
    P.poly([[22, 9], [26, 9], [23, 14], [20, 14]], '#d3f0fb'); P.poly([[37, 9], [41, 9], [38, 14], [36, 14]], '#d3f0fb');
    P.rect(3, 16, 62, 12, '#f3f5f7'); P.rect(3, 16, 62, 1, '#ffffff'); P.rect(3, 21, 62, 4, '#2f56a8'); P.rect(3, 26, 62, 2, '#c5cbd6');
    P.rect(34, 17, 1, 9, '#8b93a5'); P.rect(38, 18, 3, 1, '#5a6072');
    P.rect(3, 17, 3, 4, '#ffd166'); P.rect(62, 17, 3, 4, '#e0574a'); P.rect(2, 25, 4, 3, '#b7bec9'); P.rect(62, 25, 4, 3, '#b7bec9');
    [15, 51].forEach(x => { P.ell(x, 28.5, 5, 5, '#2b2a3a'); P.ell(x, 28.5, 2.2, 2.2, '#b7bec9'); });
    P.outline(); return P.url();
  }
  // 飛碟（64×28）；兩格燈號交替
  function ufo(k) {
    const P = Cv(64, 28);
    P.ell(32, 10, 13, 7.6, '#a8d8ff'); P.ell(25, 6, 2.4, 1.6, '#ffffff');
    P.ell(32, 9.5, 4.2, 3.6, '#6fdc8c'); P.rect(29, 11, 6, 4, '#6fdc8c'); P.rect(30, 8, 1, 2, INK); P.rect(33, 8, 1, 2, INK);
    P.ell(32, 22, 14, 3.2, '#7c8396');
    P.ell(32, 16.5, 29, 5.4, '#8b93a5'); P.ell(32, 15.5, 28, 4.4, '#b7bec9'); P.ell(32, 14.2, 24, 2, '#dfe3ea');
    [8, 17, 26, 35, 44, 53].forEach((x, i) => P.rect(x, 16, 3, 3, (i + k) % 2 ? '#ffd166' : '#ff6b6b'));
    P.outline(); return P.url();
  }
  // 爆炸（32×32）：一圈一圈的尖角色塊
  function boom() {
    const P = Cv(32, 32);
    P.poly(star(16, 16, 10, 13.5, 9, .2), '#d6334a'); P.poly(star(16, 16, 10, 10.5, 7, .2), '#ff7a1a');
    P.poly(star(16, 16, 8, 7.5, 4.6, .5), '#ffd166'); P.poly(star(16, 16, 6, 4.4, 2.6, .5), '#fff4c2');
    P.outline(); return P.url();
  }

  window.SPY_ART = {
    missile: missile(), pow: pow(), claw: claw(false), clawShut: claw(true), spring: spring(), banana: banana(), bubbleIcon: bubble(),
    tornado: [0, 1].map(tornado), vacuum: vacuum(), net: net(), cage: cage(), pitIcon: pit(), eagle: [eagle(false), eagle(true)],
    car: [['#ff3b3b', '#1f3a78'], ['#7a1f1f', '#4fa8ff']].map(car), ufo: [0, 1].map(ufo), boom: boom(),
  };
})();
