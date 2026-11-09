/* 最後一刻揭曉：原創點陣圖（背景、道具、車輛、器材），全部用程式逐點畫出來。 */
/* 自畫點陣圖（原創）：怪獸、馬、火箭、武器、魚、鞋子、大砲。全部面向固定，不靠手機字型。 */
const SPRITES = {
  // 怪獸：面向左邊（英雄在左邊）。k 外框、m 身體、n 陰影、l 亮面、b 肚子、h 角、e 眼白、p 眼珠、w 牙、r 嘴巴、c 腮紅
  monster: [
    '.......kk.............kk.......',
    '......khk............khk.......',
    '......khhk..........khhk.......',
    '.......khhk........khhk........',
    '........khkkkkkkkkkkhk.........',
    '......kkmmmmmmmmmmmmmmkk.......',
    '.....kmmllllmmmmmmmmmmmnk......',
    '....kmmllmmmmmmmmmmmmmmmnk.....',
    '...kmmlmkkkkmmmmkkkkmmmmnnk....',
    '...kmmmkeeeekmmkeeeekmmmmnk....',
    '..kmmmkeepeeekkeepeeekmmmnnk...',
    '..kmmmkeppeeekkeppeeekmmmmnk...',
    '..kmmmkeeeeeekkeeeeeekmmmmnk...',
    '..kmcckkeeeekmmkeeeekmmmmmnnk..',
    '..kmcccmkkkkmmmmkkkkmmmmmmmnk..',
    '.kmmmmmmmmmmmmmmmmmmmmmmmmmnnk.',
    '.kmkkkkkkkkkkkmmmmmmmmmmmmmnnk.',
    '.kmkwkrrrrrkwkmmbbbbbbmmmmmnnk.',
    '.kmmkwrrrrrwkmmbbbbbbbbmmmnnnkkk',
    'kkmmmkkkkkkkmmbbbbbbbbbbmmnnknnk',
    'kmmkmmmmmmmmmbbbbbbbbbbmmmnnnnk.',
    'kmmkkmmmmmmmmbbbbbbbbbbmmnnnkk..',
    '.kk.kmmmmmmmmmbbbbbbbbmmmnnnk...',
    '....kmmmmmmmmmmmbbbbmmmmmnnnk...',
    '....kmmnnnkmmmmmmmmmmkmmnnnk....',
    '....kmmnnk.kmmmmmmmmk.kmmnnk....',
    '...kkkkkkk.kkkkkkkkkk.kkkkkk....',
  ],
  monsterPal: [
    { k: '#1d1b2e', m: '#8a63e8', n: '#5b3db0', l: '#b79cff', b: '#e6d7ff', h: '#fff3c4', e: '#ffffff', p: '#1d1b2e', w: '#ffffff', r: '#d6334a', c: '#ff8fb1' },
    { k: '#1d1b2e', m: '#4fb36b', n: '#2d7a47', l: '#8fe0a2', b: '#e2f7c8', h: '#ffe8a3', e: '#ffffff', p: '#1d1b2e', w: '#ffffff', r: '#d6334a', c: '#ffb3a0' },
    { k: '#1d1b2e', m: '#ef6b4a', n: '#b43d2a', l: '#ffa585', b: '#ffe0b8', h: '#f2f2f2', e: '#ffffff', p: '#1d1b2e', w: '#ffffff', r: '#7a1730', c: '#ffd0a0' },
    { k: '#1d1b2e', m: '#3f9bd8', n: '#26679a', l: '#8fd0ff', b: '#d9f1ff', h: '#ffd166', e: '#ffffff', p: '#1d1b2e', w: '#ffffff', r: '#d6334a', c: '#ffb3cf' },
  ],
  // 馬：面向右邊。c 騎師帽、f 臉、j 騎師衣、r 馬鞍、b 馬、n 馬陰影、d 鬃毛尾巴、k 外框
  horse: [[
    '.....................kk...',
    '....................kbbk..',
    '...................kdbbbk.',
    '.........kkk......kddbkbbk',
    '........kccck.....kdbbbbbbk',
    '........kfffk....kddbbkkbbk',
    '.......kjjjjk...kddbbk..kk.',
    '..kk...kjjjjjk.kddbbk......',
    '.kddk.kkrrrrrkkdbbbk.......',
    'kddkkbbbbbbbbbbbbbbk.......',
    'kdk.kbbbbbbbbbbbbbbk.......',
    'kdk.kbbbbbbbbbbbbbbk.......',
    '.k..kbnnnnnnnnnnnnbk.......',
    '....kbbk.kbk..kbk.kbk......',
    '....kbk..kbk..kbk..kbk.....',
    '....kbk..kbk..kbk..kbk.....',
    '...kkkk.kkkk.kkkk.kkkk.....',
  ], [
    '.....................kk...',
    '....................kbbk..',
    '...................kdbbbk.',
    '.........kkk......kddbkbbk',
    '........kccck.....kdbbbbbbk',
    '........kfffk....kddbbkkbbk',
    '.......kjjjjk...kddbbk..kk.',
    '..kk...kjjjjjk.kddbbk......',
    '.kddk.kkrrrrrkkdbbbk.......',
    'kddkkbbbbbbbbbbbbbbk.......',
    'kdk.kbbbbbbbbbbbbbbk.......',
    'kdk.kbbbbbbbbbbbbbbk.......',
    '.k..kbnnnnnnnnnnnnbk.......',
    '...kbbk...kbk.kbbk..kbk....',
    '..kbk......kbkbk.....kbk...',
    '.kbk........kbk.......kbk..',
    'kkk.........kkk........kkk.',
  ]],
  // 火箭：機頭朝上。r 機頭和尾翼、w 機身、s 機身陰影、k 外框、g 噴嘴、b 窗
  rocket: [
    '......kk......',
    '.....krrk.....',
    '....krrrrk....',
    '...krrrrrrk...',
    '...kwwwwwsk...',
    '..kwwwwwwwsk..',
    '..kwwkkkkwsk..',
    '..kwkbbbbksk..',
    '..kwkbbbbksk..',
    '..kwwkkkkwsk..',
    '..kwwwwwwwsk..',
    '..kwwwwwwwsk..',
    '..kwrrrrrrsk..',
    '..kwwwwwwwsk..',
    '.kkwwwwwwwskk.',
    'krkwwwwwwwskrk',
    'krrkwwwwwskrrk',
    'krrkkggggkkrrk',
    'kkk..kggk..kkk',
  ],
  // 武器（全部指向右邊）
  sword: [
    '..yy..............',
    '.kyyk.............',
    'kbbykssssssssssk..',
    'kbbykwwwwwwwwwwwsk',
    'kbbykssssssssssk..',
    '.kyyk.............',
    '..yy..............',
  ],
  arrow: [
    'ff............kk..',
    '.ff...........kkk.',
    '..ffbbbbbbbbbbkkkk',
    '.ff...........kkk.',
    'ff............kk..',
  ],
  hammer: [
    '..........kkkkk',
    '..........ksssk',
    '..........ksssk',
    'kbbbbbbbbbksssk',
    'kbbbbbbbbbksssk',
    '..........ksssk',
    '..........ksssk',
    '..........kkkkk',
  ],
  wand: [
    '..........y...',
    '.........yyy..',
    '.....yyyyyyyyy',
    'kbbbbbbb.yyy..',
    '........yy.yy.',
  ],
  cannon: [
    '....kkkkkkkkkkkk',
    '...kssssssssssssk',
    '..kswwssssssssssk',
    '..ksssssssssssssk',
    '...kssssssssssssk',
    '....kkkkkkkkkkkk',
    '..kkbbbbbbk......',
    '.kbbbbbbbbbk.....',
    'kbbkkbbbbkkbk....',
    'kbkyykbbkyykbk...',
    'kbkyykkkkyykk....',
    '.kkkk....kkkk....',
  ],
  fish: [
    '.....kkkkkkk.........',
    '...kkooooooookk...kk.',
    '..kooooyyyooooook.kok',
    '.kowkoyyyyyoooooookook',
    'kooooooyyyooooooooook.',
    '.koroooooooooooooook.',
    '..koooooooooooook.kok',
    '...kkooooooookk...kk.',
    '.....kkkkkkk.........',
  ],
  boot: [
    '...kkkkkkk....',
    '...kbbbbbk....',
    '...kbnbnbk....',
    '...kbbbbbk....',
    '...kbbbbbk..w.',
    '...kbbbbbk.w..',
    '...kbbbbbbkk..',
    '..kbbbbbbbbbk.',
    '.kbbbbbbbbbbbk',
    'kkkkkkkkkkkkkk',
  ],
};
const SPAL = {
  weapon: { k: '#1d1b2e', y: '#ffd166', b: '#8a5a35', s: '#9aa3b5', w: '#e8edf5', f: '#e8414f' },
  fish: { k: '#7a3b00', o: '#ffb62e', y: '#ffe08a', w: '#ffffff', r: '#d6334a' },
  boot: { k: '#2a1c12', b: '#6e4a2a', n: '#4e3420', w: '#8ccdf3' },
  cannon: { k: '#1d1b2e', s: '#5d5a77', w: '#b9b6d8', b: '#8a5a35', y: '#ffd166' },
};
/* 場景點陣畫（原創，程式即時繪製）。背景 160×100 像素，1 像素 = 0.625cqw。 */
const ART = (() => {
  function seeded(s) { return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function hex(c) { return [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)); }
  function mix(a, b, t) { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
  function canvas(w, h, fn, seed = 7) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'), R = seeded(seed);
    const P = {
      g, R, w, h, mix,
      rect(x, y, ww, hh, col) { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(ww), Math.round(hh)); },
      dot(x, y, col) { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), 1, 1); },
      circ(cx, cy, r, col) { g.fillStyle = col; for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if ((x + .5 - cx) ** 2 + (y + .5 - cy) ** 2 <= r * r) g.fillRect(x, y, 1, 1); },
      // 漸層色帶，交界用棋盤格混色（點陣風）
      bands(y0, y1, cols, x0 = 0, x1 = w) {
        const n = cols.length, hh = (y1 - y0) / n;
        for (let i = 0; i < n; i++) { const a = y0 + Math.round(i * hh), b = y0 + Math.round((i + 1) * hh); P.rect(x0, a, x1 - x0, b - a, cols[i]); if (i < n - 1) for (let x = x0; x < x1; x += 2) P.dot(x + (b % 2), b - 1, cols[i + 1]); }
      },
      line(x0, y0, x1, y1, col) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0; for (let i = 0; i <= n; i++) P.dot(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, col); },
      stars(n, y0, y1, cols) { for (let i = 0; i < n; i++) { const x = R() * w | 0, y = y0 + R() * (y1 - y0) | 0, c = cols[R() * cols.length | 0]; if (R() < .12) { P.dot(x, y, c); P.dot(x - 1, y, mix(c, '#000000', .5)); P.dot(x + 1, y, mix(c, '#000000', .5)); P.dot(x, y - 1, mix(c, '#000000', .5)); P.dot(x, y + 1, mix(c, '#000000', .5)); } else P.dot(x, y, c); } },
      cloud(x, y, s, col, shade) { [[0, 2, 4], [3, 0, 5], [7, 1, 4], [10, 2, 3]].forEach(([dx, dy, r]) => P.circ(x + dx * s, y + dy * s + r * s, r * s, col)); P.rect(x - 2 * s, y + 5 * s, 16 * s, 2 * s, shade); },
      moon(cx, cy, r, col, dark) { P.circ(cx, cy, r + 2, mix(col, '#000000', .75)); P.circ(cx, cy, r, col); P.circ(cx + 2, cy + 1, r * .9, mix(col, dark, .12)); [[-.3, -.3, .22], [.35, .1, .16], [-.1, .45, .12], [.3, -.45, .1]].forEach(([dx, dy, rr]) => { P.circ(cx + dx * r, cy + dy * r, rr * r, mix(col, dark, .35)); P.circ(cx + dx * r - .5, cy + dy * r - .5, rr * r * .6, mix(col, dark, .2)); }); },
      mountains(y, hmax, col, step = 1) { let hgt = hmax * .5; for (let x = 0; x < w; x++) { hgt += (R() - .5) * 2.2 * step; hgt = Math.max(hmax * .2, Math.min(hmax, hgt)); P.rect(x, y - hgt, 1, h - (y - hgt), col); } },
      pine(x, y, s, col, shade) { for (let i = 0; i < 4; i++) { const ww = (i + 1) * 2 * s; P.rect(x - ww / 2, y - (16 - i * 3.6) * s, ww, 3 * s, i % 2 ? shade : col); } P.rect(x - s / 2, y - 2 * s, Math.max(1, s), 2 * s, '#3a2618'); },
      planks(x, y, ww, hh, plank, base, dark, light) {
        for (let yy = y; yy < y + hh; yy += plank) { P.rect(x, yy, ww, plank, base); P.rect(x, yy, ww, 1, light); P.rect(x, yy + plank - 1, ww, 1, dark); for (let k = 0; k < ww / 9; k++) { const gx = x + R() * ww, gl = 3 + R() * 8; P.rect(gx, yy + 1 + (R() * (plank - 3) | 0), gl, 1, mix(base, dark, .5)); } }
      },
      bricks(x, y, ww, hh, bw, bh, cols, mortar) {
        P.rect(x, y, ww, hh, mortar);
        for (let r = 0; r * bh < hh; r++) for (let c = -1; c * bw < ww; c++) {
          const bx = x + c * bw + (r % 2 ? bw / 2 : 0), by = y + r * bh, col = cols[R() * cols.length | 0];
          P.rect(bx + 1, by + 1, bw - 1, bh - 1, col); P.rect(bx + 1, by + 1, bw - 1, 1, mix(col, '#ffffff', .15)); P.rect(bx + 1, by + bh - 1, bw - 1, 1, mix(col, '#000000', .25));
          if (R() < .3) P.dot(bx + 2 + R() * (bw - 4), by + 2 + R() * (bh - 3), mix(col, '#000000', .3));
        }
      },
      hazard(x, y, ww, hh) { for (let xx = 0; xx < ww; xx++) for (let yy = 0; yy < hh; yy++) P.dot(x + xx, y + yy, ((xx + yy) >> 2) % 2 ? '#1d1b2e' : '#ffd166'); },
    };
    fn(P); return c.toDataURL();
  }

  const BG = {};
  // 拆炸彈：地下室磚牆、吊燈、警告標誌、鋼板地面
  BG.bomb = canvas(160, 100, P => {
    P.bricks(0, 0, 160, 86, 16, 6, ['#4a4366', '#504a70', '#463f60', '#4d4569'], '#2e2944');
    // 吊燈和光
    P.rect(79, 0, 1, 8, '#1d1b2e'); P.rect(74, 8, 12, 3, '#5d5a77'); P.rect(75, 8, 10, 1, '#8b8aa3'); P.rect(77, 11, 6, 2, '#fff3c4');
    P.g.fillStyle = 'rgba(255,243,196,.08)'; P.g.beginPath(); P.g.moveTo(74, 13); P.g.lineTo(86, 13); P.g.lineTo(120, 86); P.g.lineTo(40, 86); P.g.fill();
    // 警告標誌
    const sx = 100, sy = 6; for (let i = 0; i < 9; i++) P.rect(sx + 8 - i, sy + i * 1.2, i * 2 + 1, 2, '#ffd166'); P.rect(sx + 7, sy + 3, 3, 1, '#1d1b2e'); P.rect(sx + 8, sy + 3, 1, 5, '#1d1b2e'); P.dot(sx + 8, sy + 9, '#1d1b2e');
    // 牆上管線
    P.rect(0, 70, 160, 3, '#5d5a77'); P.rect(0, 70, 160, 1, '#8b8aa3'); for (let x = 10; x < 160; x += 30) P.rect(x, 69, 3, 5, '#3a3550');
    // 地面：警告條＋鋼板
    P.hazard(0, 84, 160, 3);
    P.rect(0, 87, 160, 13, '#2a2640'); P.rect(0, 87, 160, 1, '#57507c');
    for (let y = 90; y < 100; y += 4) for (let x = (y / 4 % 2) * 4; x < 160; x += 8) { P.dot(x, y, '#3d3858'); P.dot(x + 1, y + 1, '#3d3858'); }
    for (let x = 0; x < 160; x += 40) P.rect(x, 87, 1, 13, '#1d1b2e');
  }, 11);
  // 賽馬：藍天白雲、有遮雨棚的看台、欄杆、泥土跑道
  BG.race = canvas(160, 100, P => {
    P.bands(0, 7, ['#78c3f0', '#8ccdf3', '#a2d8f6']);
    P.cloud(20, 0, .5, '#ffffff', '#d3eefb'); P.cloud(110, 1, .4, '#ffffff', '#d3eefb');
    // 看台遮雨棚（紅白條＋波浪邊）
    for (let x = 0; x < 160; x++) { const red = (x >> 3) % 2; P.rect(x, 4, 1, 3, red ? '#e8414f' : '#fffaf0'); P.dot(x, 7, (x % 8 < 4) ? (red ? '#e8414f' : '#fffaf0') : '#46426e'); }
    P.rect(0, 4, 160, 1, '#8f2f53');
    // 看台座位
    P.rect(0, 8, 160, 10, '#3a3550');
    for (let r = 0; r < 3; r++) for (let x = r % 2 * 3; x < 160; x += 6) { P.rect(x, 9 + r * 3, 4, 2, ['#3c8dde', '#2d6db0', '#e8414f'][r]); P.rect(x, 9 + r * 3, 4, 1, mix(['#3c8dde', '#2d6db0', '#e8414f'][r], '#ffffff', .3)); }
    for (let x = 10; x < 160; x += 36) P.rect(x, 7, 2, 11, '#8b8aa3');
    // 小旗子
    for (let x = 6; x < 160; x += 24) { P.rect(x, 0, 1, 5, '#5d5a77'); P.rect(x + 1, 0, 4, 2, ['#ffd166', '#2f9e5b', '#3c8dde', '#b48cff'][x / 24 | 0 % 4]); }
    // 草地＋欄杆
    P.rect(0, 17.6, 160, 2, '#3e8f3a'); P.rect(0, 17.6, 160, 1, '#5aa63c');
    // 泥土跑道
    P.rect(0, 19, 160, 81, '#c98a4b');
    for (let i = 0; i < 900; i++) P.dot(P.R() * 160, 19 + P.R() * 81, P.R() < .5 ? '#b87a3d' : '#d89a5a');
    for (let i = 0; i < 40; i++) { const x = P.R() * 160, y = 22 + P.R() * 76; P.rect(x, y, 2, 1, '#a86e36'); }
  }, 23);
  // 扭蛋店：條紋壁紙、層架玩具、木頭櫃台
  BG.gacha = canvas(160, 100, P => {
    for (let x = 0; x < 160; x++) P.rect(x, 0, 1, 79, (x >> 2) % 2 ? '#ffd6e6' : '#ffe6ef');
    for (let y = 6; y < 66; y += 12) for (let x = (y / 12 % 2) * 8 + 4; x < 160; x += 16) { P.dot(x, y, '#ffb3cf'); P.dot(x - 1, y, '#ffc4da'); P.dot(x + 1, y, '#ffc4da'); P.dot(x, y - 1, '#ffc4da'); P.dot(x, y + 1, '#ffc4da'); }
    // 下半部木牆裙
    P.planks(0, 66, 160, 13, 13, '#d9a066', '#a8743f', '#f0c08a'); for (let x = 0; x < 160; x += 10) P.rect(x, 66, 1, 13, '#a8743f');
    // 左右層架和玩具盒
    [[2, 20, 46], [112, 20, 46], [2, 44, 46], [112, 44, 46]].forEach(([x, y, ww]) => {
      P.rect(x, y, ww, 2, '#8a5a35'); P.rect(x, y, ww, 1, '#b07a4a'); P.rect(x + 2, y + 2, 2, 3, '#6e4a2a'); P.rect(x + ww - 4, y + 2, 2, 3, '#6e4a2a');
      for (let bx = x + 2; bx < x + ww - 6;) { const bw = 5 + (P.R() * 4 | 0), bh = 5 + (P.R() * 5 | 0), col = ['#e8414f', '#3c8dde', '#ffd166', '#2f9e5b', '#b48cff', '#ff7a1a'][P.R() * 6 | 0]; P.rect(bx, y - bh, bw, bh, col); P.rect(bx, y - bh, bw, 1, mix(col, '#ffffff', .4)); P.rect(bx + bw - 1, y - bh, 1, bh, mix(col, '#000000', .25)); P.rect(bx + 1, y - bh + 2, bw - 3, 1, '#fffaf0'); bx += bw + 1 + (P.R() * 2 | 0); }
    });
    // 櫃台
    P.rect(0, 79, 160, 21, '#c9567d'); P.rect(0, 79, 160, 2, '#ff8fb1'); P.rect(0, 81, 160, 1, '#8f2f53');
    for (let x = 0; x < 160; x += 20) { P.rect(x, 82, 1, 18, '#a8456a'); } for (let i = 0; i < 120; i++) P.dot(P.R() * 160, 83 + P.R() * 17, '#b84d73');
  }, 31);
  // 火箭：星空、月亮、遠山、水泥發射場
  BG.rocket = canvas(160, 100, P => {
    P.bands(0, 84, ['#141226', '#1a1734', '#211d42', '#29245050'.slice(0, 7), '#2f2a5c', '#3a3470', '#46426e']);
    P.stars(110, 0, 70, ['#fffaf0', '#fff3c4', '#b9d8ff', '#ffd6e6']);
    P.moon(132, 16, 9, '#fff3c4', '#b9a77a');
    P.mountains(84, 22, '#2a2650', 1.2); P.mountains(84, 12, '#353066', .9);
    for (let x = 4; x < 160; x += 22) { P.dot(x, 70 + (x % 7), '#ffd166'); }
    // 發射場地面
    P.rect(0, 84, 160, 16, '#5d5a77'); P.rect(0, 84, 160, 1, '#a7a4c4'); P.rect(0, 85, 160, 1, '#8b8aa3');
    for (let x = 0; x < 160; x += 16) P.rect(x, 86, 1, 14, '#4a4766'); P.rect(0, 93, 160, 1, '#4a4766');
    for (let i = 0; i < 80; i++) P.dot(P.R() * 160, 87 + P.R() * 13, '#6b6880');
    P.hazard(0, 98, 160, 2);
  }, 47);
  // 釣魚：夕陽、雲、遠山、海面波光、碼頭、海草
  BG.fish = canvas(160, 100, P => {
    P.bands(0, 30, ['#ff9e7a', '#ffb08a', '#ffc49a', '#ffd8a8', '#ffe6bf']);
    P.circ(132, 13, 9, '#ffd28a'); P.circ(132, 13, 7, '#ff9f43'); P.circ(130, 11, 3, '#ffc078');
    P.cloud(40, 4, .6, '#fff1dc', '#ffd0b0'); P.cloud(95, 12, .45, '#fff1dc', '#ffd0b0');
    [[60, 8], [66, 6], [70, 9]].forEach(([x, y]) => { P.dot(x, y, '#5d5a77'); P.dot(x - 1, y - 1, '#5d5a77'); P.dot(x + 1, y - 1, '#5d5a77'); });
    P.mountains(30, 6, '#b06a8a', 1);
    // 海
    P.bands(30, 100, ['#3a8fca', '#2b7bb9', '#256caa', '#1f5d98', '#1d4f86', '#1a4475']);
    for (let i = 0; i < 70; i++) { const y = 31 + P.R() ** 1.5 * 60, x = P.R() * 160, ww = 2 + P.R() * 6 * (1 - (y - 30) / 80); P.rect(x, y, ww, 1, mix('#8ccdf3', '#2b7bb9', (y - 30) / 70)); }
    for (let y = 31; y < 60; y += 2) P.rect(128 + Math.sin(y) * 2, y, 8 - (y - 31) / 5, 1, '#ffd8a8');
    // 海底海草和石頭
    for (let x = 6; x < 160; x += 17) { for (let y = 0; y < 10 + (x % 5); y++) P.dot(x + Math.round(Math.sin(y / 2)), 99 - y, y % 2 ? '#2f9e5b' : '#257a47'); }
    for (let i = 0; i < 14; i++) { const x = P.R() * 160; P.rect(x, 97, 3, 3, '#3a4a66'); P.dot(x, 97, '#5d6b88'); }
    // 碼頭（木板＋柱子，柱子泡水的部分顏色變深）
    P.planks(0, 23, 38, 8, 4, '#a0683c', '#5e3d22', '#c4874f');
    for (let x = 1; x < 38; x += 6) P.dot(x, 25, '#3a2618');
    [6, 26].forEach(x => { P.rect(x, 31, 3, 18, '#6e4a2a'); P.rect(x, 31, 1, 18, '#8a5a35'); P.rect(x, 40, 3, 9, '#3a3a50'); P.rect(x - 1, 39, 5, 1, '#8ccdf3'); });
  }, 59);
  // 打怪獸：夜空、城堡剪影、松樹、草地、石頭小路
  BG.boss = canvas(160, 100, P => {
    P.bands(0, 50, ['#1b1436', '#231a45', '#2e2250', '#3a2a5c', '#4a3570']);
    P.stars(80, 0, 36, ['#fffaf0', '#fff3c4', '#b9d8ff']);
    P.moon(78, 12, 7, '#fff3c4', '#b9a77a');
    P.mountains(50, 14, '#2c2048', 1);
    // 城堡剪影
    const cx = 18; P.rect(cx, 30, 26, 20, '#1f1736'); [[cx - 3, 24, 7, 26], [cx + 22, 24, 7, 26], [cx + 9, 20, 8, 30]].forEach(([x, y, ww, hh]) => { P.rect(x, y, ww, hh, '#1f1736'); for (let k = 0; k < ww; k += 2) P.dot(x + k, y - 1, '#1f1736'); });
    [[cx, 34], [cx + 12, 26], [cx + 24, 32], [cx + 6, 40]].forEach(([x, y]) => { P.rect(x, y, 2, 3, '#ffd166'); });
    for (let x = 50; x < 160; x += 9 + (P.R() * 6 | 0)) P.pine(x, 51, .7 + P.R() * .4, '#1f3a2c', '#264a36');
    // 草地
    P.bands(50, 100, ['#4f6b34', '#56743a', '#5c6b3a', '#536234', '#4a582e']);
    for (let i = 0; i < 260; i++) { const x = P.R() * 160, y = 52 + P.R() * 48; P.dot(x, y, '#6f8a45'); P.dot(x, y - 1, '#86a356'); }
    for (let i = 0; i < 16; i++) { const x = P.R() * 160, y = 56 + P.R() * 40; P.dot(x, y, ['#ffd166', '#ff8fb1', '#fffaf0'][i % 3]); }
    // 石頭小路
    for (let i = 0; i < 26; i++) { const t = i / 26, x = 10 + t * 120, y = 92 - t * 12 + Math.sin(t * 6) * 2; P.rect(x, y, 5, 3, '#8b8aa3'); P.rect(x, y, 5, 1, '#b9b6d8'); P.rect(x, y + 2, 5, 1, '#5d5a77'); }
    for (let i = 0; i < 6; i++) { const x = 100 + P.R() * 55, y = 60 + P.R() * 30; P.rect(x, y, 4, 3, '#5d5a77'); P.rect(x, y, 3, 1, '#8b8aa3'); }
  }, 71);

  // ---------- 物件 ----------
  const SP = {};
  // 炸彈：圓身有反光和鉚釘，頂上金屬蓋
  SP.bomb = canvas(42, 46, P => {
    const cx = 21, cy = 26, r = 19;
    P.circ(cx, cy, r + 1, '#0b0912');
    for (let y = 0; y < 46; y++) for (let x = 0; x < 42; x++) { const d = Math.hypot(x + .5 - cx, y + .5 - cy); if (d <= r) { const l = Math.hypot(x + .5 - (cx - 7), y + .5 - (cy - 7)) / (r * 1.6); P.dot(x, y, mix('#5d5a77', '#0f0d18', Math.min(1, l) ** .8)); } }
    P.circ(cx - 8, cy - 9, 3, '#8b8aa3'); P.circ(cx - 9, cy - 10, 1.5, '#d3d1e6');
    for (let a = 0; a < 12; a++) { const t = a / 12 * Math.PI * 2, x = cx + Math.cos(t) * (r - 3), y = cy + Math.sin(t) * (r - 3); P.dot(x, y, '#8b8aa3'); P.dot(x + 1, y + 1, '#1d1b2e'); }
    P.rect(cx - 6, 3, 12, 6, '#0b0912'); P.rect(cx - 5, 4, 10, 4, '#8b8aa3'); P.rect(cx - 5, 4, 10, 1, '#d3d1e6'); P.rect(cx - 5, 7, 10, 1, '#5d5a77'); P.rect(cx - 3, 4, 1, 4, '#5d5a77'); P.rect(cx + 2, 4, 1, 4, '#5d5a77');
  });
  // 接線板：鋼板、螺絲、四個接線端子
  SP.board = canvas(10, 64, P => {
    P.rect(0, 0, 10, 64, '#1d1b2e'); P.rect(1, 1, 8, 62, '#8b8aa3'); P.rect(1, 1, 1, 62, '#b9b6d8'); P.rect(8, 1, 1, 62, '#5d5a77');
    [2, 61].forEach(y => { P.dot(4, y, '#3a3550'); P.dot(5, y, '#3a3550'); });
    [9.6, 25.6, 41.6, 57.6].forEach(y => { P.rect(1, y - 2, 6, 4, '#3a3550'); P.rect(2, y - 1, 4, 2, '#ffd166'); P.rect(2, y - 1, 4, 1, '#fff3c4'); });
    for (let y = 4; y < 60; y += 3) P.dot(7, y, '#6b6880');
  });
  // 扭蛋機身體：紅色外殼、白邊面板、螺絲、星星貼紙、投幣口、出口
  SP.machine = canvas(48, 34, P => {
    P.rect(0, 0, 48, 34, '#1d1b2e');
    for (let x = 1; x < 47; x++) P.rect(x, 1, 1, 32, x < 6 ? '#ff6b75' : x > 41 ? '#b52d3a' : '#e8414f');
    P.rect(1, 1, 46, 2, '#ff8f97'); P.rect(1, 31, 46, 2, '#9c2532');
    [[3, 4], [44, 4], [3, 29], [44, 29]].forEach(([x, y]) => { P.dot(x, y, '#ffd0d4'); P.dot(x + 1, y + 1, '#8f2f53'); });
    // 投幣口座
    P.rect(32, 4, 10, 12, '#1d1b2e'); P.rect(33, 5, 8, 10, '#d3d1e6'); P.rect(33, 5, 8, 1, '#ffffff'); P.rect(36, 6, 2, 8, '#1d1b2e'); P.rect(34, 14, 6, 1, '#8b8aa3');
    // 星星貼紙
    const st = (x, y, c) => { P.rect(x - 1, y - 3, 3, 7, c); P.rect(x - 3, y - 1, 7, 3, c); P.dot(x, y - 4, c); P.dot(x, y + 4, c); P.dot(x - 4, y, c); P.dot(x + 4, y, c); };
    st(24, 8, '#ffd166'); st(24, 8, '#ffd166'); P.dot(23, 7, '#fff3c4');
    // 出口
    P.rect(15, 20, 18, 11, '#1d1b2e'); P.rect(16, 21, 16, 9, '#2a2640'); P.rect(16, 21, 16, 2, '#121019'); P.rect(15, 20, 18, 1, '#d3d1e6');
  });
  SP.knob = canvas(15, 15, P => { P.circ(7.5, 7.5, 7.5, '#1d1b2e'); P.circ(7.5, 7.5, 6.3, '#fffaf0'); P.circ(6.5, 6.5, 4, '#ffffff'); P.circ(8.5, 8.5, 4, '#e6e1d3'); P.rect(1.5, 6, 12, 3, '#1d1b2e'); P.rect(2.5, 6.5, 10, 1, '#5d5a77'); P.circ(7.5, 7.5, 1.6, '#8b8aa3'); });
  SP.pad = canvas(22, 6, P => { P.rect(0, 0, 22, 6, '#1d1b2e'); P.rect(1, 1, 20, 4, '#8b8aa3'); P.rect(1, 1, 20, 1, '#d3d1e6'); P.rect(1, 4, 20, 1, '#5d5a77'); P.hazard(3, 2, 16, 2); });
  SP.tower = canvas(6, 36, P => { P.rect(0, 0, 1, 36, '#8b8aa3'); P.rect(5, 0, 1, 36, '#5d5a77'); for (let y = 0; y < 36; y += 4) { P.line(0, y, 5, y + 4, '#8b8aa3'); P.line(5, y, 0, y + 4, '#6b6880'); P.rect(0, y, 6, 1, '#a7a4c4'); } P.rect(0, 0, 6, 2, '#e8414f'); P.dot(2, 0, '#ffb3b3'); });
  SP.fishShadow = canvas(28, 12, P => { P.g.globalAlpha = .6; for (let y = 0; y < 12; y++) for (let x = 0; x < 22; x++) if (((x - 11) / 11) ** 2 + ((y - 6) / 5.6) ** 2 <= 1) P.dot(x, y, '#081a33'); for (let y = 1; y < 11; y++) { const ww = Math.abs(y - 6) * .9 + 1; P.rect(21, y, ww + 4 - Math.abs(y - 6) * .5, 1, '#081a33'); } P.rect(8, 0, 6, 1, '#081a33'); P.g.globalAlpha = .35; P.rect(3, 4, 12, 1, '#2b7bb9'); });
  SP.dome = canvas(48, 40, P => {
    // 透明玻璃罩：只有外框、金屬底座、反光，裡面透明
    for (let y = 0; y < 40; y++) for (let x = 0; x < 48; x++) { const inTop = y < 24 ? ((x + .5 - 24) / 24) ** 2 + ((y + .5 - 24) / 24) ** 2 <= 1 : x >= 0 && x < 48; const inIn = y < 24 ? ((x + .5 - 24) / 22.6) ** 2 + ((y + .5 - 24) / 22.6) ** 2 <= 1 : x >= 1.4 && x < 46.6; if (inTop && !inIn) P.dot(x, y, '#1d1b2e'); }
    P.g.globalAlpha = .55; for (let i = 0; i < 14; i++) { P.rect(7 + i * .2, 8 + i, 2, 1, '#ffffff'); } P.rect(36, 10, 1, 8, '#ffffff'); P.g.globalAlpha = 1;
    P.rect(0, 36, 48, 4, '#1d1b2e'); P.rect(1, 37, 46, 2, '#b9b6d8'); P.rect(1, 37, 46, 1, '#ffffff');
    P.rect(18, 0, 12, 3, '#1d1b2e'); P.rect(19, 1, 10, 1, '#e8414f');
  });
  return { BG, SP, mix, hex, canvas };
})();

/* 自動明暗：外框內側靠右下的像素變暗、靠左上的變亮，讓色塊有立體感 */
function shadeRows(rows, pal, skip = 'kweyp') {
  const H = rows.length, W = Math.max(...rows.map(r => r.length));
  const at = (x, y) => (y >= 0 && y < H && x >= 0 && x < W ? rows[y][x] || '.' : '.');
  const out = rows.map(r => [...r.padEnd(W, '.')]);
  const extra = {};
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = at(x, y); if (c === '.' || skip.includes(c) || !pal[c]) continue;
    const edge = ch => ch === '.' || ch === 'k';
    let key = null;
    if (edge(at(x + 1, y)) || edge(at(x, y + 1))) key = c + '_d';
    else if (edge(at(x - 1, y)) || edge(at(x, y - 1))) key = c + '_l';
    if (key) { out[y][x] = key; extra[key] = ART.mix(pal[c], key.endsWith('_d') ? '#1d1b2e' : '#ffffff', key.endsWith('_d') ? .28 : .3); }
  }
  return { cells: out, pal: Object.assign({}, pal, extra) };
}
function pixShaded(rows, pal, skip) {
  const { cells, pal: p } = shadeRows(rows, pal, skip);
  const c = document.createElement('canvas'); c.width = cells[0].length; c.height = cells.length;
  const g = c.getContext('2d');
  cells.forEach((row, y) => row.forEach((ch, x) => { if (p[ch]) { g.fillStyle = p[ch]; g.fillRect(x, y, 1, 1); } }));
  return c.toDataURL();
}

/* 新場景點陣畫（原創，程式即時繪製）：OX 攝影棚、教室開票、偵探事務所。背景 160×100，1 像素 = 0.625cqw。 */
(() => {
  const { canvas, mix, BG, SP } = ART;

  /* ---------- OX 翻板：攝影棚 ---------- */
  BG.ox = canvas(160, 100, P => {
    // 後牆：深紫布幕＋直條皺褶
    for (let x = 0; x < 160; x++) { const f = (x % 10); P.rect(x, 0, 1, 64, f < 2 ? '#2a1f48' : f < 5 ? '#3b2d63' : f < 8 ? '#46367a' : '#33275a'); }
    for (let x = 0; x < 160; x += 2) P.dot(x + 1, 63, '#1d1b2e');
    // 天花板燈架
    P.rect(0, 0, 160, 4, '#1d1b2e'); for (let x = 2; x < 160; x += 6) { P.rect(x, 1, 3, 2, '#5d5a77'); P.dot(x + 1, 1, '#8b8aa3'); }
    for (let x = 14; x < 160; x += 44) { P.rect(x, 4, 6, 4, '#5d5a77'); P.rect(x + 1, 8, 4, 1, '#fff3c4'); P.rect(x + 1, 4, 4, 1, '#8b8aa3'); }
    // 背景大螢幕（中間），螢幕上畫一個問號
    P.rect(64, 8, 32, 22, '#1d1b2e'); P.rect(66, 10, 28, 18, '#14324f');
    for (let y = 10; y < 28; y += 2) P.rect(66, y, 28, 1, '#173a5c');
    const qm = ['.kkkkk.', 'kk...kk', '.....kk', '...kkk.', '...kk..', '.......', '...kk..'];
    qm.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'k') P.rect(77 + x, 12 + y * 2, 1, 2, '#ffd166'); }));
    P.rect(62, 30, 36, 2, '#5d5a77');
    // 觀眾席剪影（下方暗處）
    for (let x = 0; x < 160; x += 5) { const hh = 3 + ((x * 7) % 3); P.circ(x + 2.5, 57 - hh, 2, '#211a3a'); P.rect(x, 57 - hh + 1, 5, 7 + hh, '#211a3a'); }
    // 舞台地板（兩塊翻板下面是泥巴坑，翻板會蓋住）
    P.rect(0, 64, 160, 16, '#2a2640');
    // 左右兩個坑
    [[8, 66], [86, 66]].forEach(([x0]) => {
      P.rect(x0, 64, 66, 16, '#120f1c');
      for (let y = 64; y < 80; y++) { const t = (y - 64) / 16; P.rect(x0, y, 66, 1, mix('#0b0912', '#3a2618', t)); }
      P.rect(x0, 75, 66, 5, '#6e4a2a'); for (let x = x0; x < x0 + 66; x += 3) { P.dot(x + 1, 75, '#9a6a3f'); P.dot(x, 77, '#5a3a20'); }
      for (let i = 0; i < 10; i++) P.circ(x0 + 4 + i * 6.4, 75.5, 1.2, '#7d5532');
    });
    // 中間站台
    P.rect(74, 64, 12, 16, '#5d5a77'); P.rect(74, 64, 12, 1, '#a7a4c4'); P.hazard(74, 78, 12, 2);
  }, 31);
  // 舞台前緣（蓋住掉進坑裡的人）：燈泡一排
  SP.oxFront = canvas(160, 20, P => {
    P.rect(0, 0, 160, 20, '#1d1b2e'); P.rect(0, 0, 160, 2, '#ff7a1a'); P.rect(0, 2, 160, 1, '#b4501a');
    P.rect(0, 3, 160, 9, '#3b2d63'); for (let x = 0; x < 160; x += 8) { P.circ(x + 4, 7.5, 2, '#5d5a77'); P.circ(x + 4, 7.5, 1.3, (x / 8) % 2 ? '#ffd166' : '#fff3c4'); P.dot(x + 3, 6, '#ffffff'); }
    P.rect(0, 12, 160, 1, '#46367a'); P.rect(0, 13, 160, 7, '#211a3a');
    for (let x = 0; x < 160; x += 20) P.rect(x, 13, 1, 7, '#1d1b2e');
  }, 3);
  // 翻板（66×16）：O 紅、X 藍
  const panel = (base, dark, mark) => canvas(66, 16, P => {
    P.rect(0, 0, 66, 16, '#1d1b2e');
    for (let y = 0; y < 4; y++) for (let x = 0; x < 8; x++) P.rect(1 + x * 8, y * 4, 8, 4, (x + y) % 2 ? base : mix(base, '#ffffff', .18));
    P.rect(1, 0, 64, 1, mix(base, '#ffffff', .45)); P.rect(1, 15, 64, 1, dark);
    for (let x = 1; x < 65; x += 8) P.rect(x, 0, 1, 16, mix(base, '#000000', .25));
    if (mark === 'O') { for (let a = 0; a < 360; a += 3) { const r = a * Math.PI / 180; for (let k = 0; k < 2; k++) P.dot(33 + Math.cos(r) * (11 - k), 8 + Math.sin(r) * (5.5 - k * .6), '#fffaf0'); } }
    else { for (let i = -5; i <= 5; i++) { P.rect(33 + i * 2, 8 + i, 3, 1, '#fffaf0'); P.rect(33 - i * 2 - 1, 8 + i, 3, 1, '#fffaf0'); } }
    P.hazard(0, 14, 66, 2);
  }, 5);
  SP.panelO = panel('#d6334a', '#7a1730', 'O');
  SP.panelX = panel('#3c8dde', '#1f4f86', 'X');
  // 大招牌（36×26）：外框燈泡 + O / X
  const sign = (mark, col, lit) => canvas(36, 26, P => {
    P.rect(0, 0, 36, 26, '#1d1b2e'); P.rect(1, 1, 34, 24, lit ? mix(col, '#ffffff', .1) : mix(col, '#1d1b2e', .55));
    P.rect(3, 3, 30, 20, lit ? '#fffaf0' : '#3a3550');
    for (let x = 2; x < 35; x += 4) { P.dot(x, 1, lit ? '#fff3c4' : '#8b8aa3'); P.dot(x, 24, lit ? '#fff3c4' : '#8b8aa3'); }
    for (let y = 5; y < 24; y += 4) { P.dot(1, y, lit ? '#fff3c4' : '#8b8aa3'); P.dot(34, y, lit ? '#fff3c4' : '#8b8aa3'); }
    const c = lit ? col : mix(col, '#1d1b2e', .4);
    if (mark === 'O') { for (let a = 0; a < 360; a += 2) { const r = a * Math.PI / 180; for (let k = 0; k < 3; k++) P.dot(18 + Math.cos(r) * (8 - k), 13 + Math.sin(r) * (8 - k), c); } }
    else for (let i = -7; i <= 7; i++) { P.rect(17 + i, 13 + i, 3, 1, c); P.rect(17 - i, 13 + i, 3, 1, c); }
  }, 9);
  SP.signO = sign('O', '#d6334a', false); SP.signOlit = sign('O', '#d6334a', true);
  SP.signX = sign('X', '#3c8dde', false); SP.signXlit = sign('X', '#3c8dde', true);
  // 聚光燈光束（半透明點陣）
  SP.beam = canvas(40, 64, P => { for (let y = 0; y < 64; y++) { const half = 2 + y * .28; for (let x = 0; x < 40; x++) if (Math.abs(x - 20) <= half && (x + y) % 2 === 0) P.dot(x, y, 'rgba(255,243,196,.55)'); } });
  // 你的箭頭
  SP.arrow = canvas(9, 7, P => { ['kkkkkkkkk', 'kyyyyyyyk', '.kyyyyyk.', '..kyyyk..', '...kyk...', '....k....', '.........'].forEach((r, y) => [...r].forEach((c, x) => { if (c !== '.') P.dot(x, y, c === 'k' ? '#1d1b2e' : '#ffd166'); })); });

  /* ---------- 班會開票：教室 ---------- */
  BG.vote = canvas(160, 100, P => {
    P.rect(0, 0, 160, 70, '#e9e2c8'); for (let x = 0; x < 160; x += 2) for (let y = (x % 4); y < 70; y += 4) P.dot(x, y, '#e2dabd');
    P.rect(0, 52, 160, 18, '#b9d6c0'); P.rect(0, 52, 160, 1, '#8fb39a'); for (let x = 0; x < 160; x += 12) P.rect(x, 53, 1, 17, '#a6c7ae');
    // 黑板（大）
    P.rect(16, 3, 144, 38, '#6e4a2a'); P.rect(17, 4, 142, 36, '#9a6a3f'); P.rect(18, 5, 140, 34, '#2f5a45');
    for (let i = 0; i < 260; i++) P.dot(18 + P.R() * 140, 5 + P.R() * 34, P.R() < .5 ? '#335f4a' : '#2b5341');
    for (let i = 0; i < 6; i++) P.rect(24 + P.R() * 120, 8 + P.R() * 28, 6 + P.R() * 10, 1, 'rgba(255,255,255,.07)');
    P.rect(16, 41, 144, 2, '#6e4a2a'); P.rect(16, 41, 144, 1, '#b8834e');
    P.rect(40, 40, 4, 1, '#fffaf0'); P.rect(48, 40, 3, 1, '#ffd166'); P.rect(130, 39, 6, 2, '#5d5a77');
    // 左邊窗戶
    P.rect(1, 4, 13, 26, '#fffaf0'); P.rect(2, 5, 11, 24, '#9fd4f5'); P.rect(7, 5, 1, 24, '#fffaf0'); P.rect(2, 16, 11, 1, '#fffaf0');
    P.cloud(3, 7, .25, '#ffffff', '#d3eefb'); P.rect(2, 26, 11, 3, '#5aa63c');
    // 時鐘
    P.circ(7.5, 36, 4, '#1d1b2e'); P.circ(7.5, 36, 3.2, '#fffaf0'); P.rect(7, 33.5, 1, 3, '#1d1b2e'); P.rect(7, 36, 2.5, 1, '#1d1b2e');
    // 木地板
    P.planks(0, 70, 160, 30, 5, '#c98a4b', '#9a6a3f', '#dca066');
    P.rect(0, 70, 160, 1, '#6e4a2a');
  }, 41);
  SP.box = canvas(20, 18, P => {
    P.rect(0, 2, 20, 16, '#1d1b2e'); P.rect(1, 3, 18, 14, '#fffaf0'); P.rect(1, 3, 18, 1, '#ffffff'); P.rect(1, 15, 18, 2, '#d9d3e6'); P.rect(17, 3, 2, 14, '#e6e1d3');
    P.rect(0, 0, 20, 3, '#1d1b2e'); P.rect(1, 0, 18, 2, '#d6334a'); P.rect(1, 0, 18, 1, '#ff8a8a'); P.rect(6, 1, 8, 1, '#1d1b2e');
    P.rect(4, 7, 12, 6, '#d6334a'); P.rect(5, 8, 10, 4, '#fffaf0');
    ['k.k.kkk', 'k.k.k..', '.k..kkk', '.k....k', '.k..kkk'].forEach((r, y) => [...r].forEach((c, x) => { if (c === 'k') P.dot(6.5 + x, 8 + y * .8, '#d6334a'); }));
  }, 2);
  SP.ballot = canvas(10, 8, P => { P.rect(0, 0, 10, 8, '#1d1b2e'); P.rect(1, 1, 8, 6, '#fffaf0'); P.rect(1, 4, 8, 1, '#d9d3e6'); P.rect(2, 2, 3, 1, '#b9b6d8'); });
  SP.rosette = canvas(14, 20, P => {
    P.rect(3, 10, 3, 10, '#d6334a'); P.rect(8, 10, 3, 10, '#d6334a'); P.dot(3, 19, '#1d1b2e'); P.dot(10, 19, '#1d1b2e');
    for (let a = 0; a < 360; a += 30) { const r = a * Math.PI / 180; P.circ(7 + Math.cos(r) * 4.6, 7 + Math.sin(r) * 4.6, 2.2, '#ffd166'); }
    P.circ(7, 7, 4.2, '#d6334a'); P.circ(7, 7, 3, '#ff6b6b'); P.dot(6, 5, '#ffffff');
  }, 4);

  /* ---------- 小偵探：事務所 ---------- */
  BG.detect = canvas(160, 100, P => {
    // 牆：深青色直條壁紙
    for (let x = 0; x < 160; x++) P.rect(x, 0, 1, 72, (x >> 2) % 2 ? '#24424a' : '#2a4b54');
    for (let y = 4; y < 72; y += 8) for (let x = 2; x < 160; x += 8) P.dot(x + ((y / 8) % 2) * 4, y, '#335c66');
    // 左邊夜晚窗戶：月亮＋城市
    P.rect(4, 6, 30, 34, '#1d1b2e'); P.rect(6, 8, 26, 30, '#141226');
    P.stars(18, 8, 26, ['#fffaf0', '#b9b6d8']); P.circ(25, 14, 3.4, '#fff3c4'); P.circ(26.5, 13, 3, '#141226');
    for (let x = 6; x < 32; x += 4) { const hh = 6 + ((x * 13) % 9); P.rect(x, 38 - hh, 4, hh, '#2e2b4a'); for (let y = 38 - hh + 2; y < 37; y += 3) if ((x + y) % 3) P.dot(x + 1, y, '#ffd166'); }
    P.rect(18, 8, 2, 30, '#1d1b2e'); P.rect(6, 22, 26, 2, '#1d1b2e');
    P.rect(2, 40, 34, 2, '#6e4a2a'); P.rect(2, 40, 34, 1, '#9a6a3f');
    // 軟木板（大）
    P.rect(42, 3, 114, 60, '#6e4a2a'); P.rect(43, 4, 112, 58, '#9a6a3f'); P.rect(45, 6, 108, 54, '#c8955a');
    for (let i = 0; i < 700; i++) P.dot(45 + P.R() * 108, 6 + P.R() * 54, ['#b98448', '#d5a46a', '#a97640'][P.R() * 3 | 0]);
    // 桌子、檯燈
    P.rect(0, 64, 40, 4, '#5a3a20'); P.rect(0, 64, 40, 1, '#8a5a32'); P.rect(2, 68, 3, 14, '#3a2618'); P.rect(34, 68, 3, 14, '#3a2618');
    P.rect(8, 60, 6, 4, '#2e2b4a'); P.rect(10, 50, 2, 10, '#2e2b4a'); P.rect(6, 46, 10, 5, '#2f9e5b'); P.rect(6, 46, 10, 1, '#57d68a'); P.rect(7, 51, 8, 1, '#fff3c4');
    P.g.fillStyle = 'rgba(255,243,196,.12)'; P.g.beginPath(); P.g.moveTo(6, 52); P.g.lineTo(16, 52); P.g.lineTo(24, 64); P.g.lineTo(-2, 64); P.g.fill();
    P.rect(20, 61, 9, 3, '#fffaf0'); P.rect(21, 62, 7, 1, '#b9b6d8'); P.rect(30, 60, 5, 4, '#e8414f'); P.rect(31, 59, 3, 1, '#e8414f');
    // 地板：深色木頭＋地毯
    P.planks(0, 72, 160, 28, 4, '#4a3324', '#2e1f16', '#5e4230');
    P.rect(56, 86, 80, 12, '#7a1730'); P.rect(58, 88, 76, 8, '#9e2a45'); for (let x = 60; x < 132; x += 6) P.rect(x, 91, 3, 2, '#c94a66');
  }, 51);
  SP.lens = canvas(26, 26, P => {
    P.circ(10, 10, 10, '#1d1b2e'); P.circ(10, 10, 8.6, '#8b6a2f'); P.circ(10, 10, 7.4, '#1d1b2e');
    P.g.globalAlpha = .35; P.circ(10, 10, 6.8, '#cfeeff'); P.g.globalAlpha = 1;
    P.rect(5, 6, 2, 1, '#ffffff'); P.rect(4, 7, 1, 2, '#ffffff'); P.dot(13, 14, 'rgba(255,255,255,.7)');
    for (let i = 0; i < 8; i++) { P.rect(16 + i, 16 + i, 3, 3, '#1d1b2e'); P.rect(17 + i, 17 + i, 1, 1, '#6e4a2a'); }
    P.rect(16, 16, 2, 2, '#ffd166');
  }, 6);
  SP.pin = canvas(5, 5, P => { P.circ(2.5, 2.5, 2.5, '#1d1b2e'); P.circ(2.5, 2.5, 1.8, '#e8414f'); P.dot(1.5, 1.5, '#ffb3b3'); });
  SP.file = canvas(26, 20, P => {
    P.rect(0, 2, 26, 18, '#1d1b2e'); P.rect(1, 3, 24, 16, '#e3b766'); P.rect(1, 3, 24, 1, '#f2cf86'); P.rect(1, 0, 10, 3, '#1d1b2e'); P.rect(2, 1, 8, 3, '#e3b766');
    P.rect(4, 7, 18, 9, '#fffaf0'); for (let y = 9; y < 15; y += 2) P.rect(6, y, 14, 1, '#b9b6d8');
    P.rect(14, 5, 10, 5, '#d6334a'); P.rect(15, 6, 8, 3, '#ff6b6b');
  }, 8);
})();

/* 第三批點陣畫（原創）：紙張字卡、獨木橋、金庫、送貨、寶藏門、火車、信鴿、實驗室。背景 160×100，1 像素 = 0.625cqw。 */
(() => {
  const { canvas, mix, BG, SP } = ART;
  const draw = (P, rows, pal, ox = 0, oy = 0) => rows.forEach((r, y) => [...r].forEach((c, x) => { if (pal[c]) P.dot(ox + x, oy + y, pal[c]); }));

  /* ---------- 共用：點陣紙張（給字卡用 border-image + 紋理） ---------- */
  const frame = (fill, edge, hi) => canvas(9, 9, P => {
    P.rect(0, 0, 9, 9, '#1d1b2e'); P.rect(1, 1, 7, 7, fill); P.rect(1, 1, 7, 1, hi); P.rect(1, 1, 1, 7, hi); P.rect(1, 7, 7, 1, edge); P.rect(7, 1, 1, 7, edge);
    P.g.clearRect(0, 0, 1, 1); P.g.clearRect(8, 0, 1, 1); P.g.clearRect(0, 8, 1, 1); P.g.clearRect(8, 8, 1, 1);
  });
  SP.frame = frame('#fffaf0', '#d9cfb4', '#ffffff');
  SP.tex = canvas(8, 8, P => { [[1, 2], [5, 1], [3, 5], [6, 6], [0, 6]].forEach(([x, y]) => P.dot(x, y, 'rgba(120,100,60,.10)')); P.dot(4, 3, 'rgba(255,255,255,.5)'); });
  SP.texLine = canvas(8, 8, P => { P.rect(0, 7, 8, 1, 'rgba(90,130,200,.22)'); P.dot(2, 3, 'rgba(120,100,60,.08)'); });
  const R = document.documentElement.style;
  R.setProperty('--pp-frame', `url(${SP.frame})`); R.setProperty('--pp-tex', `url(${SP.tex})`); R.setProperty('--pp-line', `url(${SP.texLine})`);

  /* ---------- 獨木橋：峽谷 ---------- */
  BG.bridge = canvas(160, 100, P => {
    P.bands(0, 46, ['#ffb46b', '#ffc98a', '#ffdca8', '#ffe9c4', '#fff2da']);
    P.circ(118, 30, 9, '#fff3c4'); P.circ(118, 30, 7, '#ffe08a');
    P.cloud(20, 8, .6, '#fff7ea', '#ffd9b0'); P.cloud(70, 4, .45, '#fff7ea', '#ffd9b0');
    P.mountains(52, 22, '#c98a7a', 1.4); P.mountains(58, 14, '#a8687a', 1.1);
    // 峽谷深處
    P.rect(0, 56, 160, 44, '#5b3d55');
    for (let y = 56; y < 86; y++) P.rect(30, y, 100, 1, mix('#6e4a62', '#2e2240', (y - 56) / 30));
    // 河
    P.rect(0, 86, 160, 14, '#2b7bb9'); for (let y = 88; y < 100; y += 3) for (let x = (y % 2) * 4; x < 160; x += 9) P.rect(x, y, 4, 1, '#78c3f0');
    P.rect(0, 86, 160, 1, '#a2d8f6');
    // 左右懸崖（上下兩層平台）
    const cliff = (x0, x1, top, flip) => {
      for (let x = x0; x < x1; x++) { const k = flip ? x1 - x : x - x0; P.rect(x, top, 1, 100 - top, k < 2 ? '#3a2618' : '#8a5a3c'); }
      for (let i = 0; i < 160; i++) { const x = x0 + P.R() * (x1 - x0), y = top + 3 + P.R() * (90 - top); P.rect(x, y, 3, 1, P.R() < .5 ? '#6e4a2a' : '#a8754e'); }
      P.rect(x0, top, x1 - x0, 3, '#5aa63c'); P.rect(x0, top, x1 - x0, 1, '#8fe0a2'); for (let x = x0; x < x1; x += 3) P.dot(x + 1, top + 3, '#3e8f3a');
    };
    cliff(0, 30, 44, false); cliff(0, 18, 70, false); P.rect(17, 70, 13, 3, '#5aa63c');
    cliff(130, 160, 44, true); cliff(142, 160, 70, true); P.rect(130, 70, 13, 3, '#5aa63c');
    // 下層平台（左右）
    P.rect(0, 70, 30, 30, '#8a5a3c'); P.rect(0, 70, 30, 3, '#5aa63c'); P.rect(0, 70, 30, 1, '#8fe0a2');
    P.rect(130, 70, 30, 30, '#8a5a3c'); P.rect(130, 70, 30, 3, '#5aa63c'); P.rect(130, 70, 30, 1, '#8fe0a2');
    for (let i = 0; i < 60; i++) P.rect(P.R() < .5 ? P.R() * 30 : 130 + P.R() * 30, 74 + P.R() * 24, 3, 1, '#6e4a2a');
    // 樹
    P.pine(8, 44, 1, '#2f7a3a', '#3e8f3a'); P.pine(150, 44, 1.1, '#2f7a3a', '#3e8f3a'); P.pine(156, 70, .8, '#2f7a3a', '#3e8f3a');
  }, 61);
  SP.plank = canvas(8, 4, P => { P.rect(0, 0, 8, 4, '#3a2618'); P.rect(1, 0, 6, 3, '#b8834e'); P.rect(1, 0, 6, 1, '#dca066'); P.dot(3, 1, '#9a6a3f'); P.dot(5, 2, '#9a6a3f'); });
  SP.post = canvas(4, 12, P => { P.rect(0, 0, 4, 12, '#3a2618'); P.rect(1, 1, 2, 11, '#8a5a3c'); P.rect(1, 1, 2, 1, '#b8834e'); });
  SP.flag = canvas(12, 16, P => { P.rect(0, 0, 1, 16, '#3a2618'); P.rect(1, 1, 10, 7, '#2f9e5b'); P.rect(1, 1, 10, 1, '#57d68a'); P.rect(4, 3, 4, 3, '#fffaf0'); });
  // 救生圈：分成後半圈（在人後面）和前半圈（在人前面），套在腰上
  const ring = (y0, y1) => canvas(20, y1 - y0, P => { for (let y = y0; y < y1; y++) for (let x = 0; x < 20; x++) { const o = ((x - 9.5) / 10) ** 2 + ((y - 4.5) / 4.5) ** 2, i = ((x - 9.5) / 6) ** 2 + ((y - 4.2) / 2.1) ** 2; if (o > 1 || i <= 1) continue; const edge = o > .78 || i < 1.35; const seg = Math.floor((Math.atan2(y - 4.5, x - 9.5) + Math.PI) / (Math.PI / 4)) % 2; P.dot(x, y - y0, edge ? '#1d1b2e' : seg ? '#e8414f' : '#fffaf0'); if (!edge && y < 3 && x > 4 && x < 9) P.dot(x, y - y0, '#ffffff'); } });
  SP.tubeBack = ring(0, 5); SP.tubeFront = ring(4, 9);
  // 河水前景（半透明，蓋住泡在水裡的身體）
  SP.waterFront = canvas(160, 14, P => { P.g.globalAlpha = .82; P.rect(0, 0, 160, 14, '#2b7bb9'); P.g.globalAlpha = 1; P.rect(0, 0, 160, 1, '#a2d8f6'); for (let y = 2; y < 14; y += 3) for (let x = (y % 2) * 4; x < 160; x += 9) P.rect(x, y, 4, 1, 'rgba(120,195,240,.9)'); }, 3);

  /* ---------- 保險箱：金庫 ---------- */
  BG.vault = canvas(160, 100, P => {
    for (let y = 0; y < 78; y += 13) for (let x = 0; x < 160; x += 20) { P.rect(x, y, 20, 13, '#2c3a4a'); P.rect(x + 1, y + 1, 18, 11, '#3d5064'); P.rect(x + 1, y + 1, 18, 1, '#58708a'); P.rect(x + 1, y + 11, 18, 1, '#2c3a4a'); [[2, 2], [17, 2], [2, 10], [17, 10]].forEach(([a, b]) => P.dot(x + a, y + b, '#8aa2bc')); }
    // 架子＋金條
    for (const sy of [18, 40]) { P.rect(100, sy, 56, 2, '#5a3a20'); P.rect(100, sy, 56, 1, '#8a5a32'); for (let i = 0; i < 6; i++) { const x = 104 + i * 8; P.rect(x, sy - 4, 7, 4, '#1d1b2e'); P.rect(x + 1, sy - 3, 5, 3, '#ffd166'); P.rect(x + 1, sy - 3, 5, 1, '#fff3c4'); P.dot(x + 5, sy - 1, '#c98a00'); } }
    for (let i = 0; i < 5; i++) { const x = 106 + i * 10; P.circ(x, 58, 3.5, '#1d1b2e'); P.circ(x, 58, 2.6, '#ffd166'); P.dot(x - 1, 57, '#fff3c4'); }
    P.rect(100, 62, 56, 2, '#5a3a20');
    // 地板：黑白磁磚
    for (let y = 78; y < 100; y += 5) for (let x = 0; x < 160; x += 10) { const d = ((x / 10) + (y - 78) / 5) % 2; P.rect(x, y, 10, 5, d ? '#d3d1e6' : '#8b8aa3'); P.rect(x, y, 10, 1, d ? '#ffffff' : '#a7a4c4'); }
    P.rect(0, 77, 160, 1, '#1d1b2e');
  }, 71);
  SP.safe = canvas(52, 58, P => {
    P.rect(0, 0, 52, 56, '#1d1b2e'); P.rect(1, 1, 50, 54, '#5d6b7a'); P.rect(1, 1, 50, 1, '#a9b7c6'); P.rect(1, 1, 1, 54, '#8a99a9'); P.rect(49, 1, 2, 54, '#3d4856'); P.rect(1, 53, 50, 2, '#3d4856');
    P.rect(4, 4, 44, 48, '#1d1b2e'); P.rect(5, 5, 42, 46, '#7d8c9c'); P.rect(5, 5, 42, 1, '#b8c6d4'); P.rect(46, 5, 1, 46, '#56636f');
    [[7, 7], [44, 7], [7, 48], [44, 48]].forEach(([x, y]) => { P.dot(x, y, '#1d1b2e'); P.dot(x - 1, y - 1, '#cfd9e3'); });
    // 鉸鍊
    P.rect(2, 10, 3, 8, '#1d1b2e'); P.rect(2, 38, 3, 8, '#1d1b2e'); P.rect(3, 11, 1, 6, '#a9b7c6'); P.rect(3, 39, 1, 6, '#a9b7c6');
    // 螢幕框
    P.rect(12, 9, 28, 9, '#1d1b2e'); P.rect(13, 10, 26, 7, '#0c1a12');
    // 腳
    P.rect(4, 56, 8, 2, '#1d1b2e'); P.rect(40, 56, 8, 2, '#1d1b2e');
  }, 3);
  SP.dial = canvas(17, 17, P => { P.circ(8.5, 8.5, 8.5, '#1d1b2e'); P.circ(8.5, 8.5, 7.4, '#c9ced6'); P.circ(8.5, 8.5, 5.6, '#8a99a9'); P.circ(8.5, 8.5, 4.4, '#d9dee6'); for (let a = 0; a < 360; a += 30) { const r = a * Math.PI / 180; P.dot(8.5 + Math.cos(r) * 6.6, 8.5 + Math.sin(r) * 6.6, '#1d1b2e'); } P.rect(8, 1, 1, 4, '#d6334a'); P.circ(8.5, 8.5, 1.4, '#1d1b2e'); });
  SP.handle = canvas(17, 17, P => { P.rect(7, 0, 3, 17, '#1d1b2e'); P.rect(0, 7, 17, 3, '#1d1b2e'); P.rect(8, 1, 1, 15, '#d9dee6'); P.rect(1, 8, 15, 1, '#d9dee6'); P.circ(8.5, 8.5, 3, '#1d1b2e'); P.circ(8.5, 8.5, 2, '#ffd166'); [[8, 0], [8, 16], [0, 8], [16, 8]].forEach(([x, y]) => P.circ(x + .5, y + .5, 1.6, '#e8414f')); });
  SP.safeIn = canvas(42, 46, P => { P.rect(0, 0, 42, 46, '#1d1b2e'); P.rect(1, 1, 40, 44, '#2a1f12'); for (let i = 0; i < 3; i++) { P.rect(3, 12 + i * 12, 36, 1, '#6e4a2a'); for (let j = 0; j < 4; j++) { const x = 5 + j * 9, y = 7 + i * 12; P.rect(x, y, 7, 5, '#1d1b2e'); P.rect(x + 1, y + 1, 5, 4, '#ffd166'); P.rect(x + 1, y + 1, 5, 1, '#fff3c4'); } } P.g.fillStyle = 'rgba(255,209,102,.25)'; P.g.fillRect(1, 1, 40, 44); });
  SP.siren = canvas(10, 8, P => { P.rect(0, 6, 10, 2, '#1d1b2e'); P.rect(1, 6, 8, 1, '#5d5a77'); P.circ(5, 5, 4, '#1d1b2e'); P.circ(5, 5, 3.2, '#e8414f'); P.rect(0, 6, 10, 2, '#1d1b2e'); P.dot(3, 3, '#ffb3b3'); P.dot(4, 2, '#ffb3b3'); });
  SP.glove = canvas(14, 12, P => { P.circ(8, 6, 5.6, '#1d1b2e'); P.circ(8, 6, 4.6, '#e8414f'); P.circ(7, 4, 2, '#ff8a8a'); P.rect(0, 4, 4, 5, '#1d1b2e'); P.rect(1, 5, 3, 3, '#fffaf0'); P.rect(9, 9, 3, 1, '#a12a3c'); });
  SP.coin = canvas(7, 7, P => { P.circ(3.5, 3.5, 3.5, '#7a4e00'); P.circ(3.5, 3.5, 2.7, '#ffd166'); P.rect(3, 2, 1, 3, '#c98a00'); P.dot(2, 2, '#fff3c4'); });

  /* ---------- 送貨卡車：街道 ---------- */
  BG.sky = canvas(160, 100, P => { P.bands(0, 70, ['#78c3f0', '#8ccdf3', '#a2d8f6', '#b8e2f8', '#cdebfa']); P.cloud(12, 6, .6, '#ffffff', '#d3eefb'); P.cloud(96, 12, .5, '#ffffff', '#d3eefb'); P.mountains(62, 18, '#8fc6a2', 1.2); P.rect(0, 62, 160, 38, '#8fc6a2'); }, 81);
  SP.road = canvas(160, 40, P => {
    // 遠處房子
    for (let x = 0; x < 160; x += 20) { const hh = 10 + ((x * 7) % 8), c = ['#e8b3a0', '#f2d08a', '#b9d6c0', '#c7b8e8'][(x / 20) % 4]; P.rect(x + 2, 12 - hh + 8, 16, hh, '#1d1b2e'); P.rect(x + 3, 13 - hh + 8, 14, hh - 1, c); for (let y = 15 - hh + 8; y < 18; y += 4) { P.rect(x + 5, y, 3, 2, '#5d5a77'); P.rect(x + 11, y, 3, 2, '#5d5a77'); } }
    P.rect(0, 20, 160, 3, '#d3d1e6'); P.rect(0, 20, 160, 1, '#ffffff'); for (let x = 0; x < 160; x += 8) P.rect(x, 21, 1, 2, '#a7a4c4');
    P.rect(0, 23, 160, 17, '#4a4458'); for (let x = 0; x < 160; x += 16) P.rect(x + 2, 31, 8, 1, '#ffd166');
    for (let i = 0; i < 120; i++) P.dot(P.R() * 160, 24 + P.R() * 16, '#3f3a4d');
  }, 82);
  SP.truck = canvas(48, 26, P => {
    P.rect(0, 2, 32, 19, '#1d1b2e'); P.rect(1, 3, 30, 17, '#fffaf0'); P.rect(1, 3, 30, 1, '#ffffff'); P.rect(1, 18, 30, 2, '#d9d3e6');
    P.rect(4, 7, 24, 8, '#ff7a1a'); P.rect(4, 7, 24, 1, '#ffa95a'); for (let x = 7; x < 26; x += 5) P.rect(x, 9, 3, 4, '#fffaf0');
    P.rect(32, 6, 15, 15, '#1d1b2e'); P.rect(33, 7, 13, 13, '#3c8dde'); P.rect(33, 7, 13, 1, '#78c3f0'); P.rect(38, 8, 7, 6, '#1d1b2e'); P.rect(39, 9, 5, 4, '#cfeeff'); P.dot(40, 9, '#ffffff');
    P.rect(45, 15, 2, 2, '#ffd166'); P.rect(0, 20, 48, 2, '#1d1b2e');
    [8, 38].forEach(x => { P.circ(x, 22, 4, '#1d1b2e'); P.circ(x, 22, 2.6, '#5d5a77'); P.circ(x, 22, 1, '#d3d1e6'); });
  }, 9);
  SP.crate = canvas(16, 14, P => { P.rect(0, 0, 16, 14, '#1d1b2e'); P.rect(1, 1, 14, 12, '#c98a4b'); P.rect(1, 1, 14, 1, '#dca066'); P.rect(1, 6, 14, 2, '#9a6a3f'); P.rect(7, 1, 2, 12, '#9a6a3f'); P.rect(1, 12, 14, 1, '#8a5a32'); P.rect(6, 6, 4, 2, '#e8414f'); });
  SP.lid = canvas(18, 4, P => { P.rect(0, 0, 18, 4, '#1d1b2e'); P.rect(1, 1, 16, 2, '#dca066'); P.rect(8, 1, 2, 2, '#9a6a3f'); });
  SP.depot = canvas(56, 46, P => {
    P.rect(0, 6, 56, 40, '#1d1b2e'); P.rect(1, 7, 54, 39, '#8b8aa3'); for (let y = 8; y < 46; y += 3) P.rect(1, y, 54, 1, '#7a7894');
    for (let i = 0; i < 56; i++) P.rect(i, 4 - Math.abs(i - 28) / 10, 1, 4, '#5d5a77');
    P.rect(6, 18, 44, 28, '#1d1b2e'); P.rect(7, 19, 42, 27, '#5d5a77'); for (let y = 20; y < 46; y += 3) P.rect(7, y, 42, 1, '#4a4458');
    P.rect(16, 9, 24, 7, '#ff7a1a'); P.rect(17, 10, 22, 5, '#ffa95a');
    P.rect(0, 40, 56, 6, '#46426e'); P.rect(0, 40, 56, 1, '#a7a4c4'); P.hazard(0, 44, 56, 2);
  }, 10);
  SP.house = canvas(48, 46, P => {
    for (let i = 0; i < 24; i++) P.rect(24 - i, 2 + i * .7, i * 2, 2, i < 1 ? '#1d1b2e' : '#d6334a');
    P.rect(0, 18, 48, 2, '#1d1b2e'); P.rect(4, 19, 40, 27, '#1d1b2e'); P.rect(5, 20, 38, 26, '#ffe8c2'); P.rect(5, 20, 38, 1, '#fff6e2');
    P.rect(20, 28, 10, 18, '#1d1b2e'); P.rect(21, 29, 8, 17, '#9a6a3f'); P.dot(27, 37, '#ffd166');
    [[8, 25], [33, 25]].forEach(([x, y]) => { P.rect(x, y, 8, 8, '#1d1b2e'); P.rect(x + 1, y + 1, 6, 6, '#9fd4f5'); P.rect(x + 4, y + 1, 1, 6, '#fffaf0'); P.rect(x + 1, y + 4, 6, 1, '#fffaf0'); });
    P.rect(36, 4, 5, 10, '#1d1b2e'); P.rect(37, 5, 3, 9, '#8b8aa3');
    P.rect(2, 40, 4, 6, '#3e8f3a'); P.rect(42, 40, 4, 6, '#3e8f3a'); P.dot(3, 40, '#ff8fb1'); P.dot(44, 41, '#ffd166');
  }, 11);

  /* ---------- 鑰匙開鎖：寶藏門 ---------- */
  BG.door = canvas(160, 100, P => {
    P.bricks(0, 0, 160, 82, 14, 7, ['#5d5266', '#665a70', '#544a5e', '#6b5f75'], '#3a3245');
    // 拱門＋大木門
    for (let y = 8; y < 82; y++) { const half = y < 24 ? Math.sqrt(Math.max(0, 22 * 22 - (24 - y) ** 2)) : 22; P.rect(80 - half - 4, y, (half + 4) * 2, 1, '#8b8aa3'); P.rect(80 - half, y, half * 2, 1, '#3a2618'); }
    for (let y = 10; y < 82; y++) { const half = y < 24 ? Math.sqrt(Math.max(0, 20 * 20 - (24 - y) ** 2)) : 20; for (let x = 80 - half; x < 80 + half; x++) { const k = Math.floor((x - 60) / 5); P.dot(x, y, k % 2 ? '#8a5a32' : '#9a6a3f'); if ((x - 60) % 5 === 0) P.dot(x, y, '#5a3a20'); } }
    P.rect(79, 12, 2, 70, '#5a3a20');
    [30, 56].forEach(y => { P.rect(60, y, 40, 3, '#3a3550'); P.rect(60, y, 40, 1, '#8b8aa3'); for (let x = 62; x < 100; x += 6) P.dot(x, y + 1, '#d3d1e6'); });
    // 火把座
    [24, 136].forEach(x => { P.rect(x - 1, 14, 3, 8, '#3a2618'); P.rect(x - 3, 12, 7, 3, '#5d5a77'); });
    // 地板
    P.rect(0, 82, 160, 18, '#3a3245'); for (let x = 0; x < 160; x += 16) { P.rect(x, 82, 15, 8, '#4a4058'); P.rect(x + 8, 91, 15, 8, '#4a4058'); P.rect(x, 82, 15, 1, '#6b5f75'); }
  }, 91);
  SP.lockC = canvas(20, 24, P => {
    for (let a = 180; a <= 360; a += 3) { const r = a * Math.PI / 180; for (let k = 0; k < 3; k++) P.dot(10 + Math.cos(r) * (6 - k), 10 + Math.sin(r) * (7 - k), k === 1 ? '#d3d1e6' : '#1d1b2e'); }
    P.rect(4, 10, 2, 2, '#1d1b2e'); P.rect(14, 10, 2, 2, '#1d1b2e');
    P.rect(1, 10, 18, 14, '#1d1b2e'); P.rect(2, 11, 16, 12, '#ffd166'); P.rect(2, 11, 16, 1, '#fff3c4'); P.rect(2, 21, 16, 2, '#c98a00');
    P.circ(10, 16, 2, '#1d1b2e'); P.rect(9, 16, 2, 4, '#1d1b2e');
  }, 12);
  SP.lockO = canvas(20, 24, P => {
    for (let a = 180; a <= 360; a += 3) { const r = a * Math.PI / 180; for (let k = 0; k < 3; k++) P.dot(15 + Math.cos(r) * (6 - k), 4 + Math.sin(r) * (7 - k) + 2, k === 1 ? '#d3d1e6' : '#1d1b2e'); }
    P.rect(19, 6, 1, 4, '#1d1b2e');
    P.rect(1, 10, 18, 14, '#1d1b2e'); P.rect(2, 11, 16, 12, '#ffd166'); P.rect(2, 11, 16, 1, '#fff3c4'); P.rect(2, 21, 16, 2, '#c98a00');
    P.circ(10, 16, 2, '#1d1b2e'); P.rect(9, 16, 2, 4, '#1d1b2e');
  }, 12);
  const key = (c, d) => canvas(22, 9, P => {
    P.circ(4.5, 4.5, 4.5, '#1d1b2e'); P.circ(4.5, 4.5, 3.4, c); P.circ(4.5, 4.5, 1.4, '#1d1b2e'); P.dot(3, 2, '#ffffff');
    P.rect(8, 3, 14, 3, '#1d1b2e'); P.rect(8, 4, 13, 1, c); P.rect(15, 6, 2, 3, '#1d1b2e'); P.rect(19, 6, 2, 2, '#1d1b2e'); P.rect(15, 6, 1, 2, d); P.rect(19, 6, 1, 1, d);
  });
  SP.keys = [['#ffd166', '#c98a00'], ['#d3d1e6', '#8b8aa3'], ['#ff9b6b', '#c45a2a'], ['#8fe0a2', '#3e8f3a']].map(([c, d]) => key(c, d));
  SP.hook = canvas(6, 6, P => { P.rect(2, 0, 2, 4, '#1d1b2e'); P.rect(0, 3, 2, 3, '#1d1b2e'); P.rect(2, 4, 3, 2, '#1d1b2e'); P.dot(3, 1, '#8b8aa3'); });
  SP.torch = [0, 1].map(f => canvas(8, 12, P => { const s = f ? 1 : 0; P.circ(4, 7, 3.6 - s * .4, '#ff7a1a'); P.circ(4 + s * .5, 6, 2.6, '#ffd166'); P.circ(4, 5 - s, 1.4, '#fff3c4'); P.dot(3 - s, 1 + s, '#ffd166'); P.dot(5 + s, 2, '#ff7a1a'); }));
  SP.chest = canvas(24, 18, P => { P.rect(0, 4, 24, 14, '#1d1b2e'); P.rect(1, 9, 22, 8, '#9a6a3f'); P.rect(1, 9, 22, 1, '#dca066'); P.rect(1, 5, 22, 3, '#c98a4b'); for (let i = 0; i < 6; i++) P.circ(4 + i * 3.4, 4, 2.2, '#ffd166'); P.rect(10, 9, 4, 5, '#ffd166'); P.rect(0, 0, 24, 2, '#1d1b2e'); P.rect(1, 0, 22, 1, '#8a5a32'); P.dot(7, 2, '#ffffff'); P.dot(16, 3, '#ffffff'); });

  /* ---------- 火車 ---------- */
  BG.rail = canvas(160, 100, P => {
    P.bands(0, 50, ['#9fd4f5', '#b2dcf6', '#c5e5f8', '#d8eefa']); P.cloud(10, 6, .5, '#ffffff', '#d3eefb'); P.cloud(60, 2, .4, '#ffffff', '#d3eefb');
    P.mountains(56, 20, '#7fb98e', 1.2);
    P.rect(0, 54, 160, 46, '#7cc56a'); for (let i = 0; i < 300; i++) P.dot(P.R() * 160, 54 + P.R() * 46, P.R() < .5 ? '#6ab55a' : '#8fd07a');
    for (let i = 0; i < 12; i++) { const x = P.R() * 160, y = 86 + P.R() * 12; P.dot(x, y, '#ffd166'); P.dot(x + 1, y, '#fffaf0'); }
    // 軌道
    P.rect(0, 80, 160, 4, '#9a8a7a'); for (let x = 0; x < 160; x += 5) P.rect(x, 79, 3, 6, '#6e4a2a'); P.rect(0, 80, 160, 1, '#d3d1e6'); P.rect(0, 83, 160, 1, '#d3d1e6');
    // 側線（上方等待的車廂）
    for (let x = 0; x < 160; x += 5) P.rect(x, 49, 3, 3, '#6e4a2a'); P.rect(0, 49, 160, 1, '#d3d1e6'); P.rect(0, 51, 160, 1, '#a7a4c4');
  }, 101);
  // 蒸汽火車頭（面向右）：左邊駕駛室有鏤空車窗，司機站在車頭後面從窗戶露出來。輪子底部都在最後一列＝踩在鐵軌上
  SP.loco = canvas(56, 34, P => {
    const K = '#1d1b2e';
    // 底盤與排障器
    P.rect(2, 22, 52, 3, K); P.rect(3, 23, 50, 1, '#3a3550');
    for (let i = 0; i < 7; i++) P.rect(49 + i * .9, 24 + i, 6 - i * .8, 1, i % 2 ? '#8b8aa3' : '#5d5a77');
    P.rect(48, 24, 1, 7, K);
    // 鍋爐（紅色圓筒，上亮下暗）
    const boil = ['#ff9a9a', '#ff6b6b', '#e8414f', '#e8414f', '#d6334a', '#d6334a', '#b42a3c', '#a12a3c', '#8a2034', '#7a1730'];
    P.rect(18, 11, 31, 12, K); boil.forEach((c, i) => P.rect(19, 12 + i, 29, 1, c));
    [25, 33, 41].forEach(x => { P.rect(x, 11, 2, 12, '#c98a00'); P.rect(x, 12, 1, 9, '#ffd166'); });
    // 煙箱與車頭燈
    P.rect(47, 10, 5, 13, K); P.rect(48, 11, 3, 11, '#3a3550'); P.rect(48, 11, 3, 1, '#5d5a77');
    P.rect(51, 12, 4, 4, K); P.rect(52, 13, 2, 2, '#fff3c4'); P.dot(52, 13, '#ffffff');
    // 汽笛蓋（金）與煙囪
    P.rect(30, 7, 7, 4, K); P.rect(31, 8, 5, 3, '#ffd166'); P.rect(31, 8, 2, 1, '#fff3c4'); P.rect(32, 6, 3, 1, K);
    P.rect(41, 3, 6, 8, K); P.rect(42, 4, 4, 7, '#3a3550'); P.rect(42, 4, 1, 7, '#5d5a77'); P.rect(39, 0, 10, 3, K); P.rect(40, 1, 8, 1, '#5d5a77');
    // 駕駛室（藍）＋屋頂，車窗鏤空
    P.rect(0, 3, 20, 20, K); P.rect(1, 4, 18, 18, '#3c8dde'); P.rect(1, 4, 18, 1, '#78c3f0'); P.rect(17, 4, 2, 18, '#2d6db0'); P.rect(1, 20, 18, 2, '#2d6db0');
    P.rect(0, 1, 22, 3, K); P.rect(1, 1, 20, 1, '#5d5a77');
    P.rect(3, 6, 12, 10, K); P.g.clearRect(4, 7, 10, 8);
    P.rect(5, 17, 8, 2, '#ffd166'); P.rect(6, 17, 6, 1, '#fff3c4');
    // 連結器
    P.rect(0, 22, 2, 3, K);
    // 動輪三個＋後面小輪＋連桿
    // 汽缸（前輪前方）與後轉向架支架
    P.rect(44, 23, 7, 6, K); P.rect(45, 24, 5, 4, '#5d5a77'); P.rect(45, 24, 5, 1, '#a7a4c4'); P.rect(45, 27, 5, 1, '#3a3550');
    P.rect(3, 24, 14, 2, K); P.rect(4, 24, 12, 1, '#3a3550');
    // 車輪：鋼圈輪胎＋紅色輪心＋八根輪輻＋配重塊＋輪軸
    const wheel = (cx, cy, r) => {
      P.circ(cx, cy, r, K); P.circ(cx, cy, r - .8, '#a7a4c4'); P.circ(cx, cy, r - 1.7, '#d6334a'); P.circ(cx - .6, cy - .6, r - 2.6, '#e8414f');
      for (let a = 0; a < 4; a++) { const t = a * Math.PI / 4 + Math.PI / 8; P.line(cx - Math.cos(t) * (r - 2), cy - Math.sin(t) * (r - 2), cx + Math.cos(t) * (r - 2), cy + Math.sin(t) * (r - 2), '#8a2034'); }
      P.circ(cx, cy, 1.2, K); P.dot(cx, cy, '#d3d1e6');
    };
    wheel(9.5, 29.6, 4.3); [22, 32, 42].forEach(x => wheel(x, 28.5, 5.2));
    // 連桿與主連桿（接到汽缸）
    P.rect(22, 29, 21, 2, K); P.rect(22, 29, 21, 1, '#d3d1e6'); P.rect(42, 26, 4, 2, K); P.rect(42, 26, 4, 1, '#a7a4c4');
    [22, 32, 42].forEach(x => { P.rect(x - 1, 28, 2, 3, K); P.dot(x, 29, '#ffd166'); });
  }, 14);
  // 客車廂（38×26）：圓弧屋頂、四個車窗（有窗簾）、腰帶、兩組轉向架。輪子底部在最後一列
  const car = c => canvas(38, 26, P => {
    const K = '#1d1b2e', L = mix(c, '#ffffff', .4), D = mix(c, '#000000', .25);
    P.rect(2, 0, 34, 2, K); P.rect(1, 1, 36, 2, K); P.rect(3, 1, 32, 1, '#8b8aa3'); P.rect(2, 2, 34, 1, '#5d5a77');
    P.rect(0, 3, 38, 16, K); P.rect(1, 3, 36, 15, c); P.rect(1, 3, 36, 1, L); P.rect(1, 16, 36, 2, D); P.rect(35, 3, 2, 15, D);
    for (let x = 4; x < 34; x += 8) { P.rect(x, 5, 6, 6, K); P.rect(x + 1, 6, 4, 4, '#cfeeff'); P.rect(x + 1, 6, 4, 1, '#fffaf0'); P.dot(x + 1, 7, '#fffaf0'); P.dot(x + 4, 9, '#9fd4f5'); }
    P.rect(1, 13, 36, 2, '#fffaf0'); P.rect(1, 14, 36, 1, '#e6e1d3');
    P.rect(2, 19, 34, 2, K); P.rect(0, 19, 2, 2, K); P.rect(36, 19, 2, 2, K);
    const bog = x => { P.rect(x - 1, 20, 12, 2, '#3a3550'); [x + 2, x + 8].forEach(cx => { P.circ(cx, 23, 2.8, K); P.circ(cx, 23, 1.8, '#5d5a77'); P.dot(cx, 23, '#d3d1e6'); }); };
    bog(3); bog(24);
  });
  SP.cars = ['#ffd166', '#2f9e5b', '#b48cff', '#ff9b6b'].map(car);
  // 山洞：山（開口挖空、石頭拱門）＋洞裡的黑＋蓋在火車上的陰影，三張同尺寸，可以一起左右翻轉
  const MW = 72, MH = 70, OX0 = 6, OW = 26, OTOP = 30, OR = 13;
  const inHole = (x, y) => x >= OX0 && x < OX0 + OW && (y >= OTOP + OR || (x + .5 - (OX0 + OR)) ** 2 + (y + .5 - (OTOP + OR)) ** 2 <= OR * OR);
  const inArch = (x, y) => { const cx = OX0 + OR, cy = OTOP + OR, d = Math.hypot(x + .5 - cx, y + .5 - cy); return !inHole(x, y) && x >= OX0 - 4 && x < OX0 + OW + 4 && (y >= cy ? (x < OX0 || x >= OX0 + OW) : d <= OR + 4); };
  const drawMount = P => {
    const ridge = x => x < 44 ? 70 - x * 1.5 - Math.sin(x * .5) * 1.5 : 4 + (x - 44) * .9 + Math.sin(x * .7);
    for (let x = 0; x < MW; x++) { const top = Math.max(2, Math.min(70, ridge(x))); for (let y = Math.floor(top); y < MH; y++) { const dy = y - top; let c = dy < 2 ? '#8fd07a' : dy < 5 ? '#6ab55a' : dy < 9 ? '#4f9a4a' : mix('#7a6a5a', '#4e4238', Math.min(1, (y - 20) / 50)); if (dy >= 9 && ((x * 7 + y * 13) % 11 === 0)) c = '#5e5246'; if (dy >= 9 && ((x * 5 + y * 3) % 17 === 0)) c = '#9a8a7a'; P.dot(x, y, c); } if (top > 2) P.dot(x, Math.floor(top), '#1d1b2e'); }
    for (let i = 0; i < 14; i++) { const x = 6 + P.R() * 60, y = 30 + P.R() * 36; P.rect(x, y, 4, 2, '#5e5246'); P.rect(x, y, 4, 1, '#9a8a7a'); }
    [[50, 14, .7], [58, 20, .6], [40, 10, .5]].forEach(([x, y, s]) => P.pine(x, y, s, '#2f7a3a', '#3e8f3a'));
    // 石頭拱門
    for (let y = OTOP - 5; y < MH; y++) for (let x = OX0 - 5; x < OX0 + OW + 5; x++) if (inArch(x, y)) { const blk = (Math.floor(y / 3) + Math.floor((x + (Math.floor(y / 3) % 2) * 2) / 4)) % 2; P.dot(x, y, blk ? '#a7a4c4' : '#8b8aa3'); if (y % 3 === 0 || (x + (Math.floor(y / 3) % 2) * 2) % 4 === 0) P.dot(x, y, '#5d5a77'); }
    P.rect(OX0 + OR - 2, OTOP - 5, 4, 5, '#d3d1e6'); P.rect(OX0 + OR - 2, OTOP - 5, 4, 1, '#ffffff');
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (inHole(x, y)) P.g.clearRect(x, y, 1, 1);
  };
  // 側面看：左柱和洞口在火車後面，右柱和山在火車前面（火車從洞口鑽進山裡）
  SP.mountBack = canvas(MW, MH, P => { drawMount(P); P.g.clearRect(OX0 + OW, 0, MW, MH); }, 13);
  SP.mountFront = canvas(MW, MH, P => { drawMount(P); P.g.clearRect(0, 0, OX0 + OW, MH); }, 13);
  SP.holeIn = canvas(MW, MH, P => { for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (inHole(x, y)) P.dot(x, y, y > 64 ? '#2a2420' : '#0c0a14'); for (let x = OX0; x < OX0 + OW; x += 3) P.rect(x, 66, 2, 1, '#5a4a3a'); });
  SP.holeShade = canvas(MW, MH, P => { for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (inHole(x, y)) { const t = (x - OX0) / OW, a = Math.min(.96, Math.max(0, t * 1.5 - .05)); if (a > 0 && ((x + y) % 2 === 0 || a > .6)) P.dot(x, y, `rgba(12,10,20,${a.toFixed(2)})`); } });
  SP.mountGeo = { MW, MH, OX0, OW };

  /* ---------- 信鴿 ---------- */
  // 屋頂（寄信）→ 城市 → 陽台（收信）。左邊屋頂頂面 y=66，右邊陽台地板 y=66
  BG.roof = canvas(160, 100, P => {
    P.bands(0, 72, ['#ffc4d6', '#ffd0dc', '#ffdbe2', '#ffe4e2', '#ffecde', '#fff2dc']);
    P.circ(100, 40, 10, '#fff3c4'); P.circ(100, 40, 8, '#ffe8a3');
    P.cloud(30, 6, .55, '#ffffff', '#ffd9e6'); P.cloud(120, 12, .4, '#ffffff', '#ffd9e6');
    for (const [x, y] of [[70, 20], [76, 17], [82, 22]]) { P.dot(x, y, '#8b6a8f'); P.dot(x - 1, y - 1, '#8b6a8f'); P.dot(x + 1, y - 1, '#8b6a8f'); }
    // 遠處城市（淡）
    for (let x = 0; x < 160; x += 9) { const hh = 22 + ((x * 13) % 20); P.rect(x, 78 - hh, 8, hh + 22, '#e8c6dc'); for (let y = 80 - hh; y < 78; y += 4) for (let wx = 1; wx < 7; wx += 3) if ((x + y + wx) % 3) P.dot(x + wx, y, '#f6e2ec'); }
    // 近處城市（深一點，有窗戶燈）
    for (let x = 30; x < 125; x += 13) { const hh = 14 + ((x * 7) % 14); P.rect(x, 86 - hh, 12, hh + 14, '#c49ac0'); P.rect(x, 86 - hh, 12, 1, '#d8b4d4'); for (let y = 89 - hh; y < 98; y += 4) for (let wx = 2; wx < 11; wx += 3) P.rect(x + wx, y, 2, 2, (x + y + wx) % 4 ? '#a77ea6' : '#fff3c4'); }
    // 左邊大樓：屋頂頂面、女兒牆、磚牆和窗
    P.rect(0, 64, 58, 3, '#1d1b2e'); P.rect(0, 64, 57, 2, '#b9a9b8'); P.rect(0, 64, 57, 1, '#e6dde6');
    P.rect(0, 67, 58, 33, '#1d1b2e'); P.bricks(0, 67, 57, 33, 8, 4, ['#c98a7a', '#bf7f70', '#d0937f'], '#9a6458');
    for (const x of [6, 22, 38]) { P.rect(x, 74, 10, 10, '#1d1b2e'); P.rect(x + 1, 75, 8, 8, '#9fd4f5'); P.rect(x + 1, 75, 8, 2, '#fffaf0'); P.rect(x + 5, 75, 1, 8, '#1d1b2e'); P.rect(x - 1, 84, 12, 1, '#e6dde6'); }
    // 水塔（在後面）
    P.rect(43, 50, 12, 10, '#1d1b2e'); P.rect(44, 51, 10, 8, '#78c3f0'); P.rect(44, 51, 10, 1, '#cfeeff'); P.rect(44, 55, 10, 1, '#3c8dde'); P.rect(45, 49, 8, 1, '#1d1b2e');
    P.rect(44, 60, 1, 5, '#1d1b2e'); P.rect(53, 60, 1, 5, '#1d1b2e'); P.line(44, 60, 53, 64, '#5d5a77'); P.line(53, 60, 44, 64, '#5d5a77');
    // 天線
    P.rect(36, 44, 1, 21, '#5d5a77'); P.rect(32, 46, 9, 1, '#5d5a77'); P.rect(33, 49, 7, 1, '#5d5a77');
    // 鴿舍（木頭、斜屋頂、圓洞、停腳板）
    P.rect(2, 48, 26, 17, '#1d1b2e'); P.rect(3, 49, 24, 15, '#dca066'); for (let x = 3; x < 27; x += 4) P.rect(x, 49, 1, 15, '#c98a4b'); P.rect(3, 49, 24, 1, '#f2c48e');
    for (let i = 0; i < 9; i++) { P.rect(15 - i * 1.7, 39 + i, 1 + i * 3.4, 1, '#1d1b2e'); if (i) P.rect(16 - i * 1.7, 39 + i, i * 3.4 - 1, 1, i % 2 ? '#d6334a' : '#b42a3c'); }
    P.rect(0, 47, 30, 2, '#1d1b2e'); P.rect(1, 47, 28, 1, '#e8414f');
    P.rect(8, 53, 11, 8, '#1d1b2e'); P.rect(9, 54, 9, 7, '#3a2618'); P.rect(9, 54, 9, 2, '#2a1a10');
    P.rect(6, 61, 15, 2, '#1d1b2e'); P.rect(7, 61, 13, 1, '#b8834e');
    P.rect(22, 54, 3, 3, '#1d1b2e'); P.dot(23, 55, '#fff3c4');
    // 盆栽
    P.rect(28, 60, 6, 5, '#1d1b2e'); P.rect(29, 60, 4, 4, '#c45a2a'); P.circ(31, 57, 3, '#3e8f3a'); P.dot(30, 56, '#8fd07a'); P.dot(32, 55, '#ff8fb1');
    // 右邊大樓：牆、雨棚、窗簾窗戶、花台
    P.rect(116, 24, 44, 76, '#1d1b2e'); P.rect(117, 25, 43, 75, '#ffe8c2'); for (let y = 28; y < 100; y += 5) P.rect(117, y, 43, 1, '#f2d4a8'); for (let y = 25; y < 100; y += 10) for (let x = 117 + (y / 10 % 2) * 5; x < 160; x += 10) P.rect(x, y, 1, 5, '#f2d4a8');
    for (let x = 124; x < 156; x++) P.rect(x, 30, 1, 5, ((x - 124) >> 2) % 2 ? '#2f9e5b' : '#fffaf0'); P.rect(123, 29, 34, 1, '#1d1b2e'); for (let x = 124; x < 156; x += 4) P.rect(x, 35, 2, 1, '#2f9e5b');
    P.rect(128, 37, 22, 22, '#1d1b2e'); P.rect(129, 38, 20, 20, '#9fd4f5'); P.rect(129, 38, 20, 3, '#cfeeff');
    P.rect(129, 38, 5, 20, '#ff8fb1'); P.rect(144, 38, 5, 20, '#ff8fb1'); P.rect(133, 38, 1, 20, '#e86a92'); P.rect(144, 38, 1, 20, '#e86a92'); P.rect(138, 38, 1, 20, '#1d1b2e');
    // 陽台地板
    P.rect(112, 66, 48, 4, '#1d1b2e'); P.rect(113, 66, 47, 2, '#d3d1e6'); P.rect(113, 66, 47, 1, '#ffffff');
    for (let x = 114; x < 160; x += 6) P.rect(x, 70, 2, 3, '#a7a4c4');
  }, 111);
  // 陽台欄杆（前景，會擋住奶奶的腳）＋花盆
  SP.railing = canvas(48, 12, P => {
    P.rect(0, 0, 48, 2, '#1d1b2e'); P.rect(1, 0, 47, 1, '#8b8aa3');
    for (let x = 1; x < 48; x += 4) { P.rect(x, 2, 2, 9, '#1d1b2e'); P.rect(x + 1, 2, 1, 9, '#5d5a77'); }
    P.rect(0, 10, 48, 2, '#1d1b2e');
    P.rect(34, -1, 9, 4, '#1d1b2e'); P.rect(35, 0, 7, 2, '#c45a2a'); [36, 39, 41].forEach((x, i) => { P.circ(x, -3 + 3, 1.6, ['#e8414f', '#ffd166', '#ff8fb1'][i]); });
  });
  // 鴿子（側面、面向右）：停著、翅膀往上、翅膀往下
  const DPAL = { k: '#1d1b2e', g: '#c3c8d8', d: '#8b8fa8', w: '#eef1f8', n: '#5fb59a', p: '#9b7fd0', e: '#1d1b2e', o: '#ff9b6b', r: '#e8414f' };
  const D = rows => canvas(16, 13, P => draw(P, rows, DPAL));
  SP.dovePerch = D(['................', '................', '................', '................', '............kk..', '...........kggk.', '.......kkkkkpnek', '....kkkddgggnnko', '..kkddddggwwwk..', '.kddkddgggwwwk..', 'kdk..kkkggkkk...', '........r.r.....', '.......rr.rr....']);
  SP.dove = [
    D(['.....kk.........', '.....kwk........', '....kwddk.......', '....kwddk.......', '...kwdddk...kk..', '...kwddk...kggk.', '.kkkggggkkkkpnek', 'kdddggggggggnnko', '.kdgggggwwwwgk..', '..kkdgggwwwwk...', '....kkkkkkkk....', '................', '................']),
    D(['................', '................', '................', '................', '............kk..', '...........kggk.', '.kkkkkkkkkkkpnek', 'kdddggggggggnnko', '.kdggwwwwwwwgk..', '..kkgdddddkkk...', '....kwddddk.....', '.....kwddk......', '......kkk.......']),
  ];
  SP.env = canvas(20, 14, P => { P.rect(0, 0, 20, 14, '#1d1b2e'); P.rect(1, 1, 18, 12, '#fffaf0'); P.line(1, 1, 10, 8, '#d9cfb4'); P.line(18, 1, 10, 8, '#d9cfb4'); P.rect(8, 7, 4, 3, '#d6334a'); P.dot(9, 8, '#ff8a8a'); });
  SP.envOpen = canvas(20, 22, P => { P.rect(0, 8, 20, 14, '#1d1b2e'); P.rect(1, 9, 18, 12, '#fffaf0'); for (let i = 0; i < 9; i++) P.rect(1 + i, 8 - i * .9, 18 - i * 2, 1, '#1d1b2e'); for (let i = 0; i < 8; i++) P.rect(2 + i, 8 - i * .9, 16 - i * 2, 1, '#f2e6c8'); P.rect(4, 3, 12, 10, '#ffffff'); for (let y = 5; y < 13; y += 2) P.rect(5, y, 10, 1, '#b9b6d8'); P.line(1, 21, 10, 14, '#d9cfb4'); P.line(18, 21, 10, 14, '#d9cfb4'); });
  SP.cloud = canvas(32, 12, P => P.cloud(4, 0, .6, '#ffffff', '#ffe0ea'));
  SP.heart = canvas(9, 8, P => draw(P, ['.kk...kk.', 'krrk.krrk', 'krwrkrrrk', 'krrrrrrrk', '.krrrrrk.', '..krrrk..', '...krk...', '....k....'], { k: '#1d1b2e', r: '#e8414f', w: '#ffb3b3' }));
  SP.qmark = canvas(7, 10, P => draw(P, ['.kkkkk.', 'kyyyyyk', 'kyk.kyk', '...kyyk', '..kyyk.', '..kyk..', '..kk...', '..kyk..', '..kyk..', '..kk...'], { k: '#1d1b2e', y: '#ffd166' }));

  /* ---------- 實驗室 ---------- */
  BG.lab = canvas(160, 100, P => {
    for (let y = 0; y < 68; y += 6) for (let x = 0; x < 160; x += 8) { P.rect(x, y, 8, 6, '#cfe8e2'); P.rect(x, y, 8, 1, '#e6f4f1'); P.rect(x, y, 1, 6, '#b7d6cf'); }
    // 窗戶
    P.rect(6, 6, 26, 22, '#1d1b2e'); P.rect(7, 7, 24, 20, '#9fd4f5'); P.rect(18, 7, 2, 20, '#fffaf0'); P.rect(7, 16, 24, 2, '#fffaf0'); P.cloud(8, 9, .25, '#ffffff', '#d3eefb');
    // 層架與瓶子
    for (const sy of [16, 34]) { P.rect(110, sy, 46, 2, '#5a3a20'); P.rect(110, sy, 46, 1, '#8a5a32'); for (let i = 0; i < 6; i++) { const x = 113 + i * 7, c = ['#e8414f', '#3c8dde', '#ffd166', '#2f9e5b', '#b48cff', '#ff9b6b'][(i + sy) % 6], hh = 5 + (i % 3) * 2; P.rect(x, sy - hh, 5, hh, '#1d1b2e'); P.rect(x + 1, sy - hh + 2, 3, hh - 2, c); P.rect(x + 1, sy - hh + 1, 3, 1, '#d3eefb'); P.rect(x + 1, sy - hh - 1, 3, 1, '#1d1b2e'); } }
    // 公式黑板
    P.rect(44, 6, 50, 26, '#1d1b2e'); P.rect(45, 7, 48, 24, '#2f5a45');
    const chalk = '#e6f0ea'; P.circ(56, 18, 5, chalk); P.circ(56, 18, 4, '#2f5a45'); P.circ(56, 18, 1.2, chalk); for (let a = 0; a < 3; a++) { const r = a * 2.1; P.dot(56 + Math.cos(r) * 7, 18 + Math.sin(r) * 3, chalk); P.dot(56 + Math.cos(r + .3) * 7, 18 + Math.sin(r + .3) * 3, chalk); }
    P.rect(68, 12, 18, 1, chalk); P.rect(68, 17, 12, 1, chalk); P.rect(68, 22, 20, 1, chalk); P.rect(82, 16, 4, 3, chalk);
    // 桌子
    P.rect(0, 68, 160, 6, '#1d1b2e'); P.rect(0, 68, 160, 4, '#e6e1d3'); P.rect(0, 68, 160, 1, '#ffffff');
    P.rect(0, 74, 160, 26, '#5d5a77'); for (let x = 0; x < 160; x += 40) { P.rect(x + 2, 76, 36, 22, '#4a4458'); P.rect(x + 18, 85, 4, 2, '#d3d1e6'); }
  }, 121);
  // 玻璃器皿：逐點畫外框、玻璃厚邊、液體（深淺、液面、彎月面）、反光
  const vessel = (W, H, inside, col, top, extra) => canvas(W, H, P => {
    const IN = (x, y) => x >= 0 && y >= 0 && x < W && y < H && inside(x, y);
    const rowL = y => { let x = 0; while (x < W && !IN(x, y)) x++; return x; };
    const rowR = y => { let x = W - 1; while (x >= 0 && !IN(x, y)) x--; return x; };
    const dk = mix(col, '#000000', .35), lt = mix(col, '#ffffff', .35);
    for (let y = 0; y < H; y++) { const L = rowL(y), R = rowR(y);
      for (let x = 0; x < W; x++) { if (!IN(x, y)) continue;
        const edge = !IN(x - 1, y) || !IN(x + 1, y) || !IN(x, y + 1) || !IN(x, y - 1);
        if (edge) { P.dot(x, y, '#1d1b2e'); continue; }
        const rim = !IN(x - 2, y) || !IN(x + 2, y) || !IN(x, y + 2);
        const u = R > L ? (x - L) / (R - L) : .5;
        if (y >= top) {
          let c = mix(col, '#000000', Math.min(.3, (y - top) * .012));
          if (u < .18 || u > .84) c = mix(c, dk, .7); else if (u > .25 && u < .45) c = mix(c, lt, .35);
          if (y === top) c = mix(col, '#ffffff', .6); else if (y === top + 1) c = mix(col, '#ffffff', .28); else if (y === top + 2 && (u < .2 || u > .8)) c = mix(col, '#ffffff', .2);
          if (rim) c = mix(c, '#ffffff', .18);
          P.dot(x, y, c);
        } else if (y === top - 1 && rim && top < H) P.dot(x, y, mix(col, '#ffffff', .45));
        else P.dot(x, y, rim ? 'rgba(232,247,255,.8)' : 'rgba(214,238,255,.32)');
      } }
    // 液體裡的小氣泡
    if (top < H) for (let i = 0; i < 6; i++) { const y = top + 3 + (P.R() * (H - top - 6) | 0), L = rowL(y), R = rowR(y); const x = L + 3 + (P.R() * Math.max(1, R - L - 6) | 0); if (IN(x, y)) P.dot(x, y, mix(col, '#ffffff', .55)); }
    extra && extra(P, IN, rowL, rowR);
  });
  // 三角燒瓶（照照片：平底圓角、直瓶頸、瓶口外翻、刻度）
  const EW = 40, EH = 46, ECX = 20;
  const eHalf = y => y < 3 ? 6.5 : y < 13 ? 5 : y < 16 ? 5 + (y - 13) * .35 : y < 43 ? 6 + (y - 16) * 11 / 27 : y === 43 ? 16.8 : y === 44 ? 16 : y === 45 ? 14.5 : 0;
  const eIn = (x, y) => Math.abs(x + .5 - ECX) <= eHalf(y);
  const flask = (col, lvl) => vessel(EW, EH, eIn, col, lvl ? [0, 38, 30, 22][lvl] : 99, (P, IN, rowL, rowR) => {
    for (let x = ECX - 6; x < ECX + 6; x++) { P.dot(x, 1, 'rgba(240,250,255,.95)'); P.dot(x, 2, '#9fc0d6'); }   // 瓶口外翻
    P.rect(ECX - 7, 3, 14, 1, '#1d1b2e');
    for (let y = 4; y < 13; y++) { P.dot(ECX - 3, y, 'rgba(255,255,255,.8)'); }                              // 瓶頸反光
    for (let y = 17; y < 42; y++) { const L = rowL(y); P.dot(L + 2, y, 'rgba(255,255,255,.75)'); if (y > 19 && y < 38) P.dot(L + 3, y, 'rgba(255,255,255,.3)'); }
    for (let y = 31; y < 41; y++) { const R = rowR(y); P.dot(R - 2, y, 'rgba(255,255,255,.35)'); }
    for (let x = ECX - 13; x < ECX + 13; x++) P.dot(x, 44, 'rgba(255,255,255,.55)');                            // 厚玻璃底
    [[22, 6], [26, 3], [30, 6], [34, 3], [38, 6]].forEach(([y, l]) => { P.rect(ECX + 2, y, l, 1, 'rgba(255,255,255,.85)'); });
    P.dot(ECX + 10, 22, 'rgba(255,255,255,.85)'); P.dot(ECX + 10, 30, 'rgba(255,255,255,.85)'); P.dot(ECX + 10, 38, 'rgba(255,255,255,.85)');
  });
  SP.flask = (col, lvl) => { const k = col + lvl; SP._fl = SP._fl || {}; return SP._fl[k] || (SP._fl[k] = flask(col, lvl)); };
  SP.burner = canvas(22, 14, P => { P.rect(2, 0, 18, 2, '#1d1b2e'); P.rect(3, 0, 16, 1, '#8b8aa3'); P.rect(4, 2, 2, 8, '#1d1b2e'); P.rect(16, 2, 2, 8, '#1d1b2e'); P.rect(9, 6, 4, 4, '#1d1b2e'); P.rect(10, 6, 2, 3, '#3c8dde'); P.rect(0, 10, 22, 4, '#1d1b2e'); P.rect(1, 10, 20, 3, '#5d5a77'); P.rect(1, 10, 20, 1, '#a7a4c4'); });
  // 圓底長頸瓶（選項）
  const RW = 20, RH = 30, RCX = 10, RCY = 20.5, RR = 9;
  const rIn = (x, y) => { const px = x + .5, py = y + .5; if (y < 2) return Math.abs(px - RCX) <= 4; if (y < 14) return Math.abs(px - RCX) <= 3; return Math.hypot(px - RCX, py - RCY) <= RR || (y < 16 && Math.abs(px - RCX) <= 3); };
  const bottle = (c, top = 17) => vessel(RW, RH, rIn, c, top, P => {
    for (let x = RCX - 3; x < RCX + 3; x++) P.dot(x, 1, 'rgba(240,250,255,.95)'); P.rect(RCX - 4, 2, 8, 1, '#1d1b2e');
    for (let y = 3; y < 13; y++) P.dot(RCX - 1, y, 'rgba(255,255,255,.75)');
    for (let a = 200; a <= 255; a += 6) { const r = a * Math.PI / 180; P.dot(Math.round(RCX + Math.cos(r) * 6.6), Math.round(RCY + Math.sin(r) * 6.6), 'rgba(255,255,255,.85)'); }
    for (let a = 150; a <= 190; a += 10) { const r = a * Math.PI / 180; P.dot(Math.round(RCX + Math.cos(r) * 6.6), Math.round(RCY + Math.sin(r) * 6.6), 'rgba(255,255,255,.45)'); }
    P.dot(6, 17, '#ffffff'); P.dot(14, 25, 'rgba(255,255,255,.5)'); P.dot(13, 26, 'rgba(255,255,255,.35)');
  });
  SP.bottleCols = ['#e8414f', '#3c8dde', '#ffd166', '#8a63e8'];
  SP.bottles = SP.bottleCols.map(c => bottle(c));
  SP.bottleEmpty = bottle('#cfeeff', 99);
  SP.bub = canvas(5, 5, P => { P.circ(2.5, 2.5, 2.5, '#1d1b2e'); P.circ(2.5, 2.5, 1.7, 'rgba(255,255,255,.6)'); P.dot(1.5, 1.5, '#ffffff'); });
  SP.sprout = canvas(20, 22, P => { P.rect(9, 6, 2, 16, '#2f7a3a'); P.circ(5, 12, 4, '#3e8f3a'); P.circ(15, 9, 4, '#5aa63c'); for (let a = 0; a < 360; a += 60) { const r = a * Math.PI / 180; P.circ(10 + Math.cos(r) * 3, 4 + Math.sin(r) * 3, 2, '#ff8fb1'); } P.circ(10, 4, 1.6, '#ffd166'); });
  SP.shard = canvas(4, 4, P => { P.dot(0, 0, '#cfeeff'); P.dot(1, 1, '#cfeeff'); P.dot(2, 1, '#1d1b2e'); P.dot(1, 2, '#cfeeff'); P.dot(3, 3, '#1d1b2e'); });
  SP.star = canvas(7, 7, P => draw(P, ['...k...', '..kyk..', 'kkyyykk', '.kyyyk.', '.kyky k'.replace(' ', 'k'), 'kk...kk', '.......'], { k: '#1d1b2e', y: '#ffd166' }));

  /* ---------- 精修：既有場景加細節 ---------- */
  // OX：ON AIR 燈箱、攝影機
  SP.onair = [0, 1].map(on => canvas(20, 8, P => { P.rect(0, 0, 20, 8, '#1d1b2e'); P.rect(1, 1, 18, 6, on ? '#e8414f' : '#5a2030'); const t = on ? '#fff3c4' : '#8f4a5a'; ['.kk..k..k...k..k.kk.', 'k..k.kk.k..k.k.k.k.k', 'k..k.k.kk..kkk.k.kk.', '.kk..k..k..k.k.k.k.k'].forEach((r, y) => [...r].forEach((c, x) => { if (c === 'k') P.dot(x, 2 + y, t); })); }));
  SP.camera = canvas(26, 30, P => {
    P.rect(4, 2, 16, 11, '#1d1b2e'); P.rect(5, 3, 14, 9, '#5d5a77'); P.rect(5, 3, 14, 1, '#a7a4c4'); P.rect(19, 4, 6, 7, '#1d1b2e'); P.rect(20, 5, 4, 5, '#3a3550'); P.circ(22, 7.5, 1.6, '#78c3f0'); P.rect(7, 0, 6, 2, '#1d1b2e'); P.rect(6, 5, 2, 2, '#e8414f');
    P.rect(11, 13, 2, 12, '#1d1b2e'); P.line(12, 22, 3, 29, '#1d1b2e'); P.line(12, 22, 21, 29, '#1d1b2e'); P.line(12, 22, 12, 29, '#1d1b2e');
  });
  // 教室：前排課桌
  SP.desks = canvas(160, 14, P => {
    for (let x = 4; x < 160; x += 40) { P.rect(x, 0, 30, 5, '#1d1b2e'); P.rect(x + 1, 1, 28, 3, '#dca066'); P.rect(x + 1, 1, 28, 1, '#f2c48e'); P.rect(x + 2, 5, 2, 9, '#5d5a77'); P.rect(x + 26, 5, 2, 9, '#5d5a77'); P.rect(x + 4, 6, 22, 3, '#9a6a3f'); P.rect(x + 6, 2, 6, 1, '#fffaf0'); P.rect(x + 18, 2, 4, 1, '#e8414f'); }
  }, 7);
  SP.podium = canvas(24, 20, P => { P.rect(0, 0, 24, 4, '#1d1b2e'); P.rect(1, 1, 22, 2, '#c98a4b'); P.rect(1, 1, 22, 1, '#dca066'); P.rect(2, 4, 20, 16, '#1d1b2e'); P.rect(3, 4, 18, 16, '#9a6a3f'); for (let y = 6; y < 20; y += 4) P.rect(3, y, 18, 1, '#8a5a32'); P.rect(9, 8, 6, 6, '#ffd166'); P.rect(10, 9, 4, 4, '#e8414f'); });
  SP.poster = canvas(30, 16, P => { P.rect(0, 0, 30, 16, '#1d1b2e'); P.rect(1, 1, 28, 14, '#fff3c4'); P.rect(3, 3, 24, 3, '#e8414f'); P.rect(3, 8, 10, 1, '#5d5a77'); P.rect(3, 10, 14, 1, '#5d5a77'); P.rect(3, 12, 8, 1, '#5d5a77'); P.circ(23, 11, 3, '#3c8dde'); P.dot(2, 1, '#d6334a'); P.dot(27, 1, '#d6334a'); });
})();
