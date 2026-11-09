/* 洞穴大冒險：把「最後一刻揭曉」的場景換成洞穴版（原創點陣畫，程式逐點畫出來）。
   背景 160×100 像素，1 像素 = 0.625cqw。地面、懸崖、鐵軌的高度和原版一樣，遊戲裡的人物和道具才會對得上。 */
(() => {
  const { canvas, mix, BG, SP } = ART;
  const draw = (P, rows, pal, ox = 0, oy = 0) => rows.forEach((r, y) => [...r].forEach((c, x) => { if (pal[c]) P.dot(ox + x, oy + y, pal[c]); }));
  const ROCK = ['#3d354e', '#443b57', '#4b4160', '#3a3249'];
  // 粗糙岩壁：大小不一的石塊、裂縫、亮邊
  function rockWall(P, x0, y0, w, h, cols = ROCK, line = '#272133') {
    P.rect(x0, y0, w, h, line);
    for (let y = y0; y < y0 + h; y += 5 + (P.R() * 3 | 0)) {
      let x = x0 - (P.R() * 6 | 0); const hh = 5 + (P.R() * 3 | 0);
      while (x < x0 + w) {
        const ww = 6 + (P.R() * 10 | 0), c = cols[P.R() * cols.length | 0];
        P.rect(Math.max(x0, x + 1), y + 1, Math.min(ww - 1, x0 + w - x - 1), Math.min(hh - 1, y0 + h - y - 1), c);
        P.rect(Math.max(x0, x + 1), y + 1, Math.min(ww - 2, x0 + w - x - 1), 1, mix(c, '#ffffff', .12));
        if (P.R() < .4) P.dot(x + 2 + P.R() * (ww - 4), y + 2 + P.R() * (hh - 3), mix(c, '#000000', .3));
        x += ww;
      }
    }
  }
  // 鐘乳石（從天花板往下）
  function stalactites(P, y0, n, col = '#2a2438', hi = '#4f4566', maxLen = 14) {
    for (let i = 0; i < n; i++) {
      const x = P.R() * 160, len = 4 + P.R() * maxLen, w = 2 + P.R() * 3;
      for (let k = 0; k < len; k++) { const ww = Math.max(1, w * (1 - k / len)); P.rect(x - ww / 2, y0 + k, ww, 1, col); P.dot(x - ww / 2, y0 + k, hi); }
      if (P.R() < .3) P.dot(x, y0 + len + 2, '#78c3f0');
    }
  }
  // 石筍（從地上往上）
  function stalagmite(P, x, yb, len, w, col = '#4b4160', hi = '#6b5f80') { for (let k = 0; k < len; k++) { const ww = Math.max(1, w * (k / len)); P.rect(x - ww / 2, yb - len + k, ww, 1, col); P.dot(x - ww / 2, yb - len + k, hi); } }
  // 發光水晶簇
  function crystal(P, x, yb, s, col) {
    const lite = mix(col, '#ffffff', .55), dark = mix(col, '#000000', .35);
    P.g.fillStyle = col + '22'; P.g.beginPath(); P.g.arc(x, yb - 4 * s, 9 * s, 0, 7); P.g.fill();
    [[-3, 6, 1.6], [0, 10, 2.2], [3, 7, 1.7], [5.5, 4, 1.2]].forEach(([dx, hh, ww]) => {
      const cx = x + dx * s, h2 = hh * s, w2 = Math.max(1, ww * s);
      for (let k = 0; k < h2; k++) { const t = k / h2, wk = Math.max(1, Math.round(w2 * Math.min(1, t * 2.2))); P.rect(cx - wk / 2, yb - h2 + k, wk, 1, col); P.dot(cx - wk / 2, yb - h2 + k, lite); P.dot(cx + wk / 2 - 1, yb - h2 + k, dark); }
      P.dot(cx, yb - h2, '#ffffff');
    });
  }
  // 發光小蘑菇
  function shroom(P, x, yb, col) { P.rect(x, yb - 3, 1, 3, '#e6e1d3'); P.rect(x - 2, yb - 4, 5, 1, col); P.rect(x - 1, yb - 5, 3, 1, col); P.dot(x - 1, yb - 5, mix(col, '#ffffff', .6)); P.g.fillStyle = col + '2a'; P.g.beginPath(); P.g.arc(x + .5, yb - 4, 4, 0, 7); P.g.fill(); }
  const glowFloor = (P, y0, y1, cols) => { for (let i = 0; i < 18; i++) { const x = P.R() * 160, y = y0 + P.R() * (y1 - y0); shroom(P, x, y, cols[i % cols.length]); } };

  /* ---------- 第 1 關：機關翻板廳（原 OX 攝影棚） ---------- */
  BG.ox = canvas(160, 100, P => {
    P.bands(0, 64, ['#1f1a2e', '#251f36', '#2b243f', '#312947']);
    rockWall(P, 0, 4, 160, 46, ['#352e47', '#3b334f', '#40375a', '#342c45'], '#211b2f');
    stalactites(P, 0, 26, '#1d1829', '#3a3150', 12);
    // 古老石碑台座（O、X 牌子掛在上面）
    [[23, 34], [101, 34]].forEach(([x, y]) => { P.rect(x - 2, y, 40, 4, '#1d1b2e'); P.rect(x - 1, y, 38, 3, '#6b5f80'); P.rect(x - 1, y, 38, 1, '#8b8aa3'); });
    // 中間的石頭面具（問號眼）
    P.circ(80, 16, 9, '#1d1b2e'); P.circ(80, 16, 8, '#5d5274'); P.circ(79, 15, 6, '#6b5f80');
    P.rect(75, 13, 3, 3, '#ffd166'); P.rect(82, 13, 3, 3, '#ffd166'); P.rect(77, 20, 6, 1, '#1d1b2e');
    crystal(P, 6, 58, .9, '#78e0f0'); crystal(P, 153, 58, 1, '#b48cff'); crystal(P, 64, 57, .6, '#8fe0a2'); crystal(P, 97, 57, .6, '#78e0f0');
    for (let x = 4; x < 160; x += 11 + (P.R() * 6 | 0)) stalagmite(P, x, 64, 4 + P.R() * 6, 3 + P.R() * 3);
    // 地面＋兩個坑（位置和原版一樣）
    P.rect(0, 64, 160, 16, '#2a2438');
    [8, 86].forEach(x0 => {
      for (let y = 64; y < 80; y++) P.rect(x0, y, 66, 1, mix('#07060c', '#2a1e1a', (y - 64) / 16));
      P.rect(x0, 75, 66, 5, '#3d2f3a'); for (let x = x0; x < x0 + 66; x += 3) { P.dot(x + 1, 75, '#5a4658'); P.dot(x, 77, '#2a1e28'); }
      for (let i = 0; i < 10; i++) P.circ(x0 + 4 + i * 6.4, 75.5, 1.2, '#4a3a48');
    });
    P.rect(74, 64, 12, 16, '#5d5274'); P.rect(74, 64, 12, 1, '#8b8aa3'); for (let y = 66; y < 80; y += 3) P.rect(75, y, 10, 1, '#4b4160');
  }, 31);
  // 前緣：岩石平台，鑲著會亮的水晶
  SP.oxFront = canvas(160, 20, P => {
    P.rect(0, 0, 160, 20, '#1d1b2e');
    for (let x = 0; x < 160; x++) { const top = 1 + Math.round(Math.sin(x * .7) * .6 + (x % 7 === 0 ? 1 : 0)); P.rect(x, top, 1, 20 - top, x % 9 < 5 ? '#4b4160' : '#443b57'); P.dot(x, top, '#6b5f80'); }
    rockWall(P, 0, 4, 160, 16, ['#3d354e', '#443b57', '#3a3249'], '#1d1b2e');
    for (let x = 6; x < 160; x += 14) { const c = ['#78e0f0', '#b48cff', '#8fe0a2', '#ffd166'][(x / 14 | 0) % 4]; P.rect(x, 5, 3, 4, '#1d1b2e'); P.rect(x + 1, 5, 1, 3, c); P.dot(x + 1, 5, '#ffffff'); }
    P.rect(0, 0, 160, 1, '#2a2438');
  }, 3);
  SP.beam = canvas(40, 64, P => { for (let y = 0; y < 64; y++) { const half = 2 + y * .28; for (let x = 0; x < 40; x++) if (Math.abs(x - 20) <= half && (x + y) % 2 === 0) P.dot(x, y, 'rgba(160,240,255,.5)'); } });

  /* ---------- 第 2 關：地底峽谷（原吊橋峽谷） ---------- */
  BG.bridge = canvas(160, 100, P => {
    P.bands(0, 56, ['#14111f', '#1a1628', '#201b31', '#26203a', '#2c2543']);
    // 遠處的發光洞窟和石柱
    P.g.fillStyle = 'rgba(120,224,240,.10)'; P.g.beginPath(); P.g.ellipse(80, 40, 50, 18, 0, 0, 7); P.g.fill();
    for (const [x, w] of [[44, 6], [64, 4], [98, 5], [116, 7]]) { P.rect(x, 8, w, 50, '#2f2840'); P.rect(x, 8, 1, 50, '#3d354e'); }
    P.mountains(56, 12, '#2a2338', 1.2);
    stalactites(P, 0, 30, '#100d18', '#2f2840', 16);
    for (let i = 0; i < 40; i++) P.dot(30 + P.R() * 100, 10 + P.R() * 40, P.R() < .5 ? '#78e0f0' : '#b48cff');
    // 峽谷深處
    P.rect(0, 56, 160, 44, '#1b1626');
    for (let y = 56; y < 86; y++) P.rect(30, y, 100, 1, mix('#221c30', '#0b0912', (y - 56) / 30));
    // 地底河（會發光的藍綠色）
    P.rect(0, 86, 160, 14, '#1f7a8a'); for (let y = 88; y < 100; y += 3) for (let x = (y % 2) * 4; x < 160; x += 9) P.rect(x, y, 4, 1, '#5fd0dc');
    P.rect(0, 86, 160, 1, '#a0f0f5');
    // 左右岩崖（上下兩層平台，位置和原版一樣）
    const cliff = (x0, x1, top, flip) => {
      for (let x = x0; x < x1; x++) { const k = flip ? x1 - x : x - x0; P.rect(x, top, 1, 100 - top, k < 2 ? '#1d1b2e' : '#4b4160'); }
      for (let i = 0; i < 160; i++) { const x = x0 + P.R() * (x1 - x0), y = top + 3 + P.R() * (90 - top); P.rect(x, y, 3, 1, P.R() < .5 ? '#3a3249' : '#5d5274'); }
      P.rect(x0, top, x1 - x0, 3, '#3e7a6a'); P.rect(x0, top, x1 - x0, 1, '#7fd8b8'); for (let x = x0; x < x1; x += 3) P.dot(x + 1, top + 3, '#2d5a50');
    };
    cliff(0, 30, 44, false); cliff(0, 18, 70, false); P.rect(17, 70, 13, 3, '#3e7a6a');
    cliff(130, 160, 44, true); cliff(142, 160, 70, true); P.rect(130, 70, 13, 3, '#3e7a6a');
    P.rect(0, 70, 30, 30, '#4b4160'); P.rect(0, 70, 30, 3, '#3e7a6a'); P.rect(0, 70, 30, 1, '#7fd8b8');
    P.rect(130, 70, 30, 30, '#4b4160'); P.rect(130, 70, 30, 3, '#3e7a6a'); P.rect(130, 70, 30, 1, '#7fd8b8');
    for (let i = 0; i < 60; i++) P.rect(P.R() < .5 ? P.R() * 30 : 130 + P.R() * 30, 74 + P.R() * 24, 3, 1, '#3a3249');
    crystal(P, 8, 44, 1, '#78e0f0'); crystal(P, 152, 44, 1.1, '#b48cff'); crystal(P, 154, 70, .7, '#8fe0a2');
    shroom(P, 22, 44, '#ffd166'); shroom(P, 138, 44, '#ff8fb1'); shroom(P, 6, 70, '#ffd166'); shroom(P, 146, 70, '#78e0f0');
  }, 61);
  SP.flag = canvas(12, 16, P => { P.rect(0, 0, 1, 16, '#3a2618'); P.rect(1, 1, 10, 7, '#7b4fd8'); P.rect(1, 1, 10, 1, '#b48cff'); P.rect(4, 3, 4, 3, '#78e0f0'); P.dot(5, 3, '#ffffff'); });
  SP.waterFront = canvas(160, 14, P => { P.g.globalAlpha = .82; P.rect(0, 0, 160, 14, '#1f7a8a'); P.g.globalAlpha = 1; P.rect(0, 0, 160, 1, '#a0f0f5'); for (let y = 2; y < 14; y += 3) for (let x = (y % 2) * 4; x < 160; x += 9) P.rect(x, y, 4, 1, 'rgba(95,208,220,.9)'); }, 3);

  /* ---------- 第 3 關：礦坑列車（原火車過山洞） ---------- */
  BG.rail = canvas(160, 100, P => {
    P.bands(0, 54, ['#16121f', '#1c1728', '#221c31', '#29223b']);
    rockWall(P, 0, 6, 160, 42, ['#2f2840', '#352e47', '#3a3249', '#2c2539'], '#1a1626');
    stalactites(P, 0, 24, '#110e1a', '#2f2840', 12);
    // 礦坑支架和掛燈
    for (const x of [4, 52, 100, 148]) { P.rect(x, 8, 4, 40, '#3a2618'); P.rect(x + 1, 8, 1, 40, '#6e4a2a'); }
    P.rect(0, 8, 160, 3, '#3a2618'); P.rect(0, 8, 160, 1, '#8a5a3c');
    for (const x of [28, 76, 124]) { P.rect(x, 11, 1, 5, '#1d1b2e'); P.rect(x - 2, 16, 5, 5, '#1d1b2e'); P.rect(x - 1, 17, 3, 3, '#ffd166'); P.dot(x - 1, 17, '#fff3c4'); P.g.fillStyle = 'rgba(255,209,102,.12)'; P.g.beginPath(); P.g.arc(x + .5, 19, 12, 0, 7); P.g.fill(); }
    crystal(P, 40, 47, .7, '#78e0f0'); crystal(P, 116, 47, .8, '#b48cff');
    // 上方石頭平台（側線）
    P.rect(0, 48, 160, 6, '#3d354e'); P.rect(0, 48, 160, 1, '#6b5f80'); P.rect(0, 53, 160, 1, '#1d1b2e');
    for (let x = 0; x < 160; x += 5) P.rect(x, 49, 3, 3, '#6e4a2a'); P.rect(0, 49, 160, 1, '#d3d1e6'); P.rect(0, 51, 160, 1, '#a7a4c4');
    // 地面：碎石
    P.rect(0, 54, 160, 46, '#3a3249'); for (let i = 0; i < 360; i++) P.dot(P.R() * 160, 54 + P.R() * 46, P.R() < .5 ? '#2f2840' : '#4b4160');
    for (let i = 0; i < 10; i++) { const x = P.R() * 160, y = 88 + P.R() * 10; P.rect(x, y, 3, 2, '#5d5274'); P.rect(x, y, 3, 1, '#7a6e90'); }
    shroom(P, 12, 96, '#ffd166'); shroom(P, 70, 94, '#78e0f0'); shroom(P, 140, 97, '#ff8fb1');
    // 軌道（位置和原版一樣）
    P.rect(0, 80, 160, 4, '#5d5274'); for (let x = 0; x < 160; x += 5) P.rect(x, 79, 3, 6, '#6e4a2a'); P.rect(0, 80, 160, 1, '#d3d1e6'); P.rect(0, 83, 160, 1, '#d3d1e6');
  }, 101);
  // 岩石隧道口：尺寸和原版山洞一樣（72×70，洞口 x 6–32），四張可以左右翻轉
  {
    const MW = 72, MH = 70, OX0 = 6, OW = 26, OTOP = 30, OR = 13;
    const inHole = (x, y) => x >= OX0 && x < OX0 + OW && (y >= OTOP + OR || (x + .5 - (OX0 + OR)) ** 2 + (y + .5 - (OTOP + OR)) ** 2 <= OR * OR);
    const inFrame = (x, y) => !inHole(x, y) && x >= OX0 - 3 && x < OX0 + OW + 3 && y >= OTOP - 3 && (y >= OTOP + OR ? (x < OX0 || x >= OX0 + OW) : Math.hypot(x + .5 - (OX0 + OR), y + .5 - (OTOP + OR)) <= OR + 3);
    const drawRock = P => {
      const edge = y => Math.max(0, 14 - y * .5) + Math.sin(y * .8) * 1.2;
      for (let y = 0; y < MH; y++) for (let x = Math.max(0, Math.floor(edge(y))); x < MW; x++) {
        let c = mix('#4b4160', '#2c2539', Math.min(1, y / 70));
        if ((x * 7 + y * 13) % 11 === 0) c = '#2a2438'; if ((x * 5 + y * 3) % 17 === 0) c = '#6b5f80';
        P.dot(x, y, c);
        if (x === Math.max(0, Math.floor(edge(y)))) P.dot(x, y, '#1d1b2e');
      }
      for (let i = 0; i < 16; i++) { const x = 10 + P.R() * 58, y = 4 + P.R() * 62; P.rect(x, y, 4, 2, '#2a2438'); P.rect(x, y, 4, 1, '#6b5f80'); }
      crystal(P, 52, 24, .7, '#78e0f0'); crystal(P, 62, 50, .6, '#b48cff');
      // 木頭礦坑框
      for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (inFrame(x, y)) { const grain = (y + x * 3) % 7 === 0; P.dot(x, y, grain ? '#5a3a20' : (x + y) % 2 ? '#8a5a3c' : '#9a6a3f'); }
      for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (inHole(x, y)) P.g.clearRect(x, y, 1, 1);
    };
    SP.mountBack = canvas(MW, MH, P => { drawRock(P); P.g.clearRect(OX0 + OW, 0, MW, MH); }, 13);
    SP.mountFront = canvas(MW, MH, P => { drawRock(P); P.g.clearRect(0, 0, OX0 + OW, MH); }, 13);
  }

  /* ---------- 第 4 關：寶藏石門（原寶藏大門） ---------- */
  BG.door = canvas(160, 100, P => {
    rockWall(P, 0, 0, 160, 82, ['#4a4058', '#544a62', '#463c56', '#4f455e'], '#2a2438');
    stalactites(P, 0, 18, '#2a2438', '#5d5274', 9);
    // 石拱門＋大木門（和原版一樣大）
    for (let y = 8; y < 82; y++) { const half = y < 24 ? Math.sqrt(Math.max(0, 22 * 22 - (24 - y) ** 2)) : 22; P.rect(80 - half - 4, y, (half + 4) * 2, 1, (y % 4) ? '#8b8aa3' : '#6b6880'); P.rect(80 - half, y, half * 2, 1, '#3a2618'); }
    for (let y = 10; y < 82; y++) { const half = y < 24 ? Math.sqrt(Math.max(0, 20 * 20 - (24 - y) ** 2)) : 20; for (let x = 80 - half; x < 80 + half; x++) { const k = Math.floor((x - 60) / 5); P.dot(x, y, k % 2 ? '#8a5a32' : '#9a6a3f'); if ((x - 60) % 5 === 0) P.dot(x, y, '#5a3a20'); } }
    P.rect(79, 12, 2, 70, '#5a3a20');
    [30, 56].forEach(y => { P.rect(60, y, 40, 3, '#3a3550'); P.rect(60, y, 40, 1, '#8b8aa3'); for (let x = 62; x < 100; x += 6) P.dot(x, y + 1, '#d3d1e6'); });
    // 門上的寶石
    P.circ(80, 6, 3, '#1d1b2e'); P.circ(80, 6, 2, '#e8414f'); P.dot(79, 5, '#ffb3b3');
    [24, 136].forEach(x => { P.rect(x - 1, 14, 3, 8, '#3a2618'); P.rect(x - 3, 12, 7, 3, '#5d5a77'); });
    crystal(P, 8, 82, .9, '#78e0f0'); crystal(P, 152, 82, .9, '#b48cff');
    // 地面：石板
    P.rect(0, 82, 160, 18, '#2a2438'); for (let x = 0; x < 160; x += 16) { P.rect(x, 82, 15, 8, '#3d354e'); P.rect(x + 8, 91, 15, 8, '#3d354e'); P.rect(x, 82, 15, 1, '#5d5274'); }
  }, 91);

  /* ---------- 魔王洞 ---------- */
  BG.lair = canvas(160, 100, P => {
    P.bands(0, 74, ['#1a0f22', '#22132b', '#2a1733', '#331b3a', '#3d1f3f']);
    rockWall(P, 0, 4, 160, 60, ['#2e1d36', '#35223e', '#2a1a31', '#3a2643'], '#1a0f22');
    stalactites(P, 0, 30, '#140a1a', '#3a2643', 18);
    // 後面的岩漿裂縫
    for (let i = 0; i < 5; i++) { let x = 20 + i * 30 + P.R() * 10, y = 20 + P.R() * 10; for (let k = 0; k < 30; k++) { P.dot(x, y, k % 3 ? '#ff7a1a' : '#ffd166'); x += P.R() * 2 - .8; y += 1; if (y > 66) break; } }
    P.g.fillStyle = 'rgba(255,122,26,.10)'; P.g.fillRect(0, 50, 160, 24);
    // 骨頭寶座和寶藏堆（右邊，怪獸後面）
    for (let i = 0; i < 40; i++) { const x = 104 + P.R() * 50, y = 68 + P.R() * 6; P.circ(x, y, 1.6, '#c98a00'); P.dot(x, y - 1, '#ffd166'); }
    crystal(P, 10, 74, 1.1, '#b48cff'); crystal(P, 150, 74, 1, '#e8414f'); crystal(P, 46, 72, .6, '#78e0f0');
    for (let x = 2; x < 160; x += 12 + (P.R() * 6 | 0)) stalagmite(P, x, 74, 5 + P.R() * 8, 3 + P.R() * 3, '#3a2643', '#5a3a60');
    // 地面
    P.bands(74, 100, ['#2e1d36', '#33213b', '#2a1a31', '#24162b']);
    for (let i = 0; i < 200; i++) P.dot(P.R() * 160, 76 + P.R() * 24, P.R() < .5 ? '#3a2643' : '#1f1226');
    for (let i = 0; i < 24; i++) { const t = i / 24, x = 4 + t * 150, y = 90 - Math.sin(t * 3) * 3; P.rect(x, y, 5, 2, '#4a3550'); P.rect(x, y, 5, 1, '#6b4f73'); }
  }, 71);

  /* ---------- 洞穴地圖（剖面圖） ---------- */
  // 節點座標（背景像素）：洞口、四個關卡、魔王洞
  const NODES = [[12, 14], [30, 36], [72, 30], [114, 42], [76, 66], [128, 82]];
  const PATH = [[12, 14], [18, 26], [30, 36], [50, 38], [72, 30], [94, 30], [114, 42], [104, 56], [76, 66], [96, 78], [128, 82]];
  BG.map = canvas(160, 100, P => {
    // 地面上：天空和草
    P.bands(0, 10, ['#78c3f0', '#8ccdf3', '#a2d8f6']); P.cloud(40, 1, .35, '#ffffff', '#d3eefb'); P.cloud(110, 2, .3, '#ffffff', '#d3eefb');
    for (let x = 30; x < 160; x += 14) P.pine(x, 11, .5, '#2f7a3a', '#3e8f3a');
    // 土層（越深越暗）
    for (let y = 10; y < 100; y++) P.rect(0, y, 160, 1, mix('#5a4636', '#1d1626', (y - 10) / 90));
    P.rect(0, 10, 160, 2, '#5aa63c'); P.rect(0, 10, 160, 1, '#8fe0a2');
    for (let i = 0; i < 260; i++) { const y = 13 + P.R() * 86; P.rect(P.R() * 160, y, 2 + P.R() * 3, 1, mix('#6e5644', '#2a2232', (y - 10) / 90)); }
    for (let i = 0; i < 18; i++) { const x = P.R() * 160, y = 20 + P.R() * 75; P.circ(x, y, 1.5 + P.R() * 2, mix('#7a6a5a', '#3a3249', (y - 10) / 90)); }
    // 隧道
    const tube = (r, col) => { for (let i = 0; i < PATH.length - 1; i++) { const [x0, y0] = PATH[i], [x1, y1] = PATH[i + 1], n = Math.hypot(x1 - x0, y1 - y0) | 0; for (let k = 0; k <= n; k++) P.circ(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, r, col); } };
    tube(5, '#120e1a'); tube(4, '#2a2232'); tube(3, '#352c40');
    NODES.forEach(([x, y], i) => { const r = i === 5 ? 13 : i ? 9 : 5; P.circ(x, y, r + 1, '#120e1a'); P.circ(x, y, r, i === 5 ? '#3d1f3f' : '#2a2232'); P.circ(x, y + 1, r - 1, i === 5 ? '#4a2448' : '#352c40'); P.rect(x - r + 2, y + r - 3, r * 2 - 4, 2, i === 5 ? '#2a1733' : '#241d2e'); });
    // 洞口
    P.rect(7, 8, 10, 6, '#120e1a'); P.rect(6, 8, 1, 4, '#8a6a4a'); P.rect(17, 8, 1, 4, '#8a6a4a'); P.rect(6, 7, 12, 1, '#8a6a4a');
    // 寶石、水晶點綴
    [[44, 52, '#78e0f0'], [140, 24, '#b48cff'], [20, 70, '#8fe0a2'], [150, 60, '#78e0f0'], [56, 86, '#b48cff'], [96, 14, '#8fe0a2']].forEach(([x, y, c]) => crystal(P, x, y, .45, c));
    // 魔王洞的火光
    P.g.fillStyle = 'rgba(255,122,26,.10)'; P.g.beginPath(); P.g.arc(128, 82, 15, 0, 7); P.g.fill();
  }, 23);

  /* ---------- 地底煉金室（原神奇實驗室）：桌面 y=68 和層架位置和原版一樣 ---------- */
  BG.lab = canvas(160, 100, P => {
    P.bands(0, 68, ['#1e1a2b', '#241f33', '#2a243c']);
    rockWall(P, 0, 0, 160, 68, ['#352e47', '#3b334f', '#40375a', '#342c45'], '#211b2f');
    stalactites(P, 0, 16, '#1d1829', '#3a3150', 8);
    // 發光的水晶洞（取代窗戶）
    P.circ(19, 17, 11, '#1d1b2e'); P.circ(19, 17, 10, '#1a3a4a'); P.g.fillStyle = 'rgba(120,224,240,.25)'; P.g.beginPath(); P.g.arc(19, 17, 10, 0, 7); P.g.fill();
    crystal(P, 15, 26, .9, '#78e0f0'); crystal(P, 24, 25, .6, '#b48cff');
    // 層架與藥水瓶（位置和原版一樣）
    for (const sy of [16, 34]) { P.rect(110, sy, 46, 2, '#5a3a20'); P.rect(110, sy, 46, 1, '#8a5a32'); for (let i = 0; i < 6; i++) { const x = 113 + i * 7, c = ['#e8414f', '#3c8dde', '#ffd166', '#2f9e5b', '#b48cff', '#ff9b6b'][(i + sy) % 6], hh = 5 + (i % 3) * 2; P.rect(x, sy - hh, 5, hh, '#1d1b2e'); P.rect(x + 1, sy - hh + 2, 3, hh - 2, c); P.rect(x + 1, sy - hh + 1, 3, 1, '#d3eefb'); P.rect(x + 1, sy - hh - 1, 3, 1, '#1d1b2e'); } }
    // 刻著符號的石板（取代黑板）
    P.rect(44, 6, 50, 26, '#1d1b2e'); P.rect(45, 7, 48, 24, '#5d5274'); P.rect(45, 7, 48, 1, '#7a6e90');
    const rune = '#8fe0d0'; P.circ(56, 18, 5, rune); P.circ(56, 18, 4, '#5d5274'); P.circ(56, 18, 1.2, rune);
    P.rect(68, 12, 18, 1, rune); P.rect(68, 17, 12, 1, rune); P.rect(68, 22, 20, 1, rune); P.rect(82, 16, 4, 3, rune);
    // 石桌
    P.rect(0, 68, 160, 6, '#1d1b2e'); P.rect(0, 68, 160, 4, '#8b8aa3'); P.rect(0, 68, 160, 1, '#b9b6d8');
    P.rect(0, 74, 160, 26, '#3a3249'); for (let x = 0; x < 160; x += 40) { P.rect(x + 2, 76, 36, 22, '#2f2840'); P.rect(x + 2, 76, 36, 1, '#4b4160'); }
  }, 121);

  /* ---------- 古代金庫（原金庫保險箱） ---------- */
  BG.vault = canvas(160, 100, P => {
    rockWall(P, 0, 0, 160, 78, ['#3d354e', '#443b57', '#4b4160', '#3a3249'], '#272133');
    stalactites(P, 0, 18, '#272133', '#4f4566', 8);
    // 石架＋金條、金幣（和原版一樣的位置）
    for (const sy of [18, 40]) { P.rect(100, sy, 56, 2, '#5d5274'); P.rect(100, sy, 56, 1, '#8b8aa3'); for (let i = 0; i < 6; i++) { const x = 104 + i * 8; P.rect(x, sy - 4, 7, 4, '#1d1b2e'); P.rect(x + 1, sy - 3, 5, 3, '#ffd166'); P.rect(x + 1, sy - 3, 5, 1, '#fff3c4'); P.dot(x + 5, sy - 1, '#c98a00'); } }
    for (let i = 0; i < 5; i++) { const x = 106 + i * 10; P.circ(x, 58, 3.5, '#1d1b2e'); P.circ(x, 58, 2.6, '#ffd166'); P.dot(x - 1, 57, '#fff3c4'); }
    P.rect(100, 62, 56, 2, '#5d5274');
    crystal(P, 52, 78, .8, '#78e0f0'); crystal(P, 92, 78, .7, '#b48cff');
    P.rect(0, 78, 160, 22, '#2a2438'); for (let x = 0; x < 160; x += 16) { P.rect(x, 79, 15, 9, '#3d354e'); P.rect(x + 8, 89, 15, 10, '#3d354e'); P.rect(x, 79, 15, 1, '#5d5274'); }
  }, 11);

  /* ---------- 礦坑炸藥庫（原拆炸彈） ---------- */
  BG.bomb = canvas(160, 100, P => {
    rockWall(P, 0, 0, 160, 86, ['#3d354e', '#443b57', '#4b4160', '#3a3249'], '#272133');
    for (const x of [2, 152]) { P.rect(x, 0, 6, 86, '#3a2618'); P.rect(x + 1, 0, 2, 86, '#8a5a3c'); }
    P.rect(0, 0, 160, 4, '#3a2618'); P.rect(0, 3, 160, 1, '#8a5a3c');
    P.rect(79, 4, 1, 6, '#1d1b2e'); P.rect(76, 10, 7, 6, '#1d1b2e'); P.rect(77, 11, 5, 4, '#ffd166'); P.dot(77, 11, '#fff3c4');
    P.g.fillStyle = 'rgba(255,209,102,.08)'; P.g.beginPath(); P.g.moveTo(74, 16); P.g.lineTo(86, 16); P.g.lineTo(120, 86); P.g.lineTo(40, 86); P.g.fill();
    const sx = 100, sy = 8; for (let i = 0; i < 9; i++) P.rect(sx + 8 - i, sy + i * 1.2, i * 2 + 1, 2, '#ffd166'); P.rect(sx + 7, sy + 3, 3, 1, '#1d1b2e'); P.rect(sx + 8, sy + 3, 1, 5, '#1d1b2e'); P.dot(sx + 8, sy + 9, '#1d1b2e');
    // 木箱（炸藥）
    for (const [x, y] of [[118, 72], [130, 72], [124, 62]]) { P.rect(x, y, 11, 10, '#1d1b2e'); P.rect(x + 1, y + 1, 9, 8, '#9a6a3f'); P.rect(x + 1, y + 1, 9, 1, '#dca066'); P.rect(x + 1, y + 4, 9, 1, '#6e4a2a'); P.rect(x + 3, y + 5, 5, 3, '#e8414f'); }
    crystal(P, 14, 86, .7, '#78e0f0');
    P.hazard(0, 84, 160, 3);
    P.rect(0, 87, 160, 13, '#2a2438'); P.rect(0, 87, 160, 1, '#5d5274');
    for (let i = 0; i < 90; i++) P.dot(P.R() * 160, 89 + P.R() * 11, P.R() < .5 ? '#3d354e' : '#1d1829');
  }, 11);

  /* ---------- 地底湖（原釣大魚）：水面 y=30、碼頭位置和原版一樣 ---------- */
  BG.fish = canvas(160, 100, P => {
    P.bands(0, 30, ['#14111f', '#1a1628', '#201b31', '#26203a']);
    rockWall(P, 0, 0, 160, 22, ['#2f2840', '#352e47', '#2c2539'], '#1a1626');
    stalactites(P, 0, 30, '#110e1a', '#2f2840', 14);
    for (let i = 0; i < 30; i++) P.dot(P.R() * 160, 4 + P.R() * 24, P.R() < .5 ? '#78e0f0' : '#b48cff');
    crystal(P, 120, 30, 1.1, '#78e0f0'); crystal(P, 140, 30, .8, '#b48cff'); crystal(P, 70, 30, .6, '#8fe0a2');
    P.rect(40, 26, 110, 4, '#2f2840');
    // 地底湖
    P.bands(30, 100, ['#1f6f80', '#1b6172', '#185465', '#154858', '#123d4c', '#0f3340']);
    for (let i = 0; i < 70; i++) { const y = 31 + P.R() ** 1.5 * 60, x = P.R() * 160, ww = 2 + P.R() * 6 * (1 - (y - 30) / 80); P.rect(x, y, ww, 1, mix('#7fe0ea', '#1b6172', (y - 30) / 70)); }
    for (let y = 31; y < 52; y += 2) P.rect(121 + Math.sin(y) * 2, y, 7 - (y - 31) / 4, 1, '#78e0f0');
    for (let x = 6; x < 160; x += 17) { for (let y = 0; y < 10 + (x % 5); y++) P.dot(x + Math.round(Math.sin(y / 2)), 99 - y, y % 2 ? '#3e8f6a' : '#2d5a50'); }
    for (let i = 0; i < 14; i++) { const x = P.R() * 160; P.rect(x, 97, 3, 3, '#2a3a4a'); P.dot(x, 97, '#4a5a6a'); }
    // 石頭碼頭（原木頭碼頭的位置）
    P.rect(0, 23, 38, 8, '#1d1b2e'); P.rect(0, 23, 37, 7, '#5d5274'); P.rect(0, 23, 37, 1, '#8b8aa3'); for (let x = 2; x < 36; x += 7) P.rect(x, 26, 4, 1, '#4b4160');
    [6, 26].forEach(x => { P.rect(x, 31, 3, 18, '#4b4160'); P.rect(x, 31, 1, 18, '#6b5f80'); P.rect(x, 40, 3, 9, '#2a3a4a'); P.rect(x - 1, 39, 5, 1, '#7fe0ea'); });
  }, 59);

  /* ---------- 追趕怪獸（原送貨到府）：會捲動的隧道地面 ---------- */
  BG.chase = canvas(160, 100, P => {
    P.bands(0, 100, ['#16121f', '#1c1728', '#221c31', '#29223b']);
    rockWall(P, 0, 6, 160, 50, ['#2f2840', '#352e47', '#3a3249', '#2c2539'], '#1a1626');
    stalactites(P, 0, 26, '#110e1a', '#2f2840', 14);
    for (let i = 0; i < 24; i++) P.dot(P.R() * 160, 10 + P.R() * 40, P.R() < .5 ? '#78e0f0' : '#b48cff');
    P.rect(0, 56, 160, 44, '#2a2438');
  }, 141);
  // 地面（240×40，左右可以接起來無限捲動）：碎石＋鐵軌＋支架
  SP.caveRoad = canvas(160, 40, P => {
    P.rect(0, 0, 160, 40, '#3a3249'); P.rect(0, 0, 160, 1, '#5d5274');
    for (let i = 0; i < 260; i++) P.dot(P.R() * 160, 1 + P.R() * 39, P.R() < .5 ? '#2f2840' : '#4b4160');
    for (let x = 0; x < 160; x += 5) P.rect(x, 17, 3, 6, '#6e4a2a'); P.rect(0, 18, 160, 1, '#d3d1e6'); P.rect(0, 21, 160, 1, '#d3d1e6');
    for (const x of [20, 100]) { P.rect(x, 0, 4, 4, '#3a2618'); crystal(P, x + 40, 10, .45, '#78e0f0'); }
    shroom(P, 60, 34, '#ffd166'); shroom(P, 140, 36, '#ff8fb1');
  }, 5);
  SP.pillar = canvas(12, 60, P => { P.rect(0, 0, 12, 60, '#1d1b2e'); P.rect(1, 0, 10, 60, '#6e4a2a'); P.rect(1, 0, 3, 60, '#8a5a3c'); for (let y = 6; y < 60; y += 11) P.rect(1, y, 10, 1, '#3a2618'); });
  // 四台車（32×20，面向右，輪子底部在最後一列）
  const WP = { k: '#1d1b2e', w: '#d3d1e6', a: '#8b8aa3', g: '#5d5a77', d: '#3a3550', h: '#fff3c4' };
  const SW = ['..kkk..', '.kwwak.', 'kwggdak', 'kaghgdk', 'kagddak', '.kdddk.', '..kkk..'];
  const wheels = (P, xs) => xs.forEach(x0 => SW.forEach((row, y) => [...row].forEach((ch, dx) => { if (WP[ch]) P.dot(x0 + dx, 13 + y, WP[ch]); })));
  SP.rides = [
    // 礦車：梯形鐵斗裝滿礦石
    canvas(32, 20, P => { for (let y = 3; y < 15; y++) { const ins = Math.round((y - 3) * .25); P.rect(2 + ins, y, 28 - ins * 2, 1, '#1d1b2e'); P.rect(3 + ins, y, 26 - ins * 2, 1, y < 5 ? '#a7a4c4' : y % 4 === 0 ? '#5d5a77' : '#8b8aa3'); } [6, 25].forEach(x => P.rect(x, 4, 1, 10, '#5d5a77')); for (let i = 0; i < 7; i++) { P.circ(6 + i * 3.4, 3, 1.8, i % 2 ? '#78e0f0' : '#9a8a7a'); } wheels(P, [5, 20]); }),
    // 鑽地車：黃色車身，前面一支大鑽頭
    canvas(32, 20, P => { P.rect(1, 5, 22, 10, '#1d1b2e'); P.rect(2, 6, 20, 8, '#ffd166'); P.rect(2, 6, 20, 1, '#fff3c4'); P.rect(2, 12, 20, 2, '#c98a00'); for (let x = 3; x < 21; x += 4) P.rect(x, 12, 2, 2, '#1d1b2e'); for (let i = 0; i < 9; i++) { const h = 8 - i * .85; P.rect(22 + i, 10 - h / 2, 1, h, i % 2 ? '#8b8aa3' : '#d3d1e6'); P.dot(22 + i, 10 - h / 2, '#1d1b2e'); P.dot(22 + i, 10 + h / 2 - 1, '#1d1b2e'); } P.rect(4, 2, 6, 4, '#1d1b2e'); P.rect(5, 3, 4, 3, '#5d5a77'); wheels(P, [3, 14]); }),
    // 吉普車：綠色、防滾架、車頭燈
    canvas(32, 20, P => { P.rect(1, 6, 30, 9, '#1d1b2e'); P.rect(2, 7, 28, 7, '#2f9e5b'); P.rect(2, 7, 28, 1, '#8fe0a2'); P.rect(2, 12, 28, 2, '#1f6e3e'); P.rect(20, 3, 10, 4, '#1d1b2e'); P.rect(21, 4, 8, 3, '#2f9e5b'); P.rect(6, 0, 2, 7, '#1d1b2e'); P.rect(6, 0, 10, 2, '#1d1b2e'); P.rect(14, 0, 2, 7, '#1d1b2e'); P.rect(29, 8, 2, 3, '#fff3c4'); P.rect(2, 9, 6, 3, '#5d5a77'); wheels(P, [4, 21]); }),
    // 火箭推車：紅色、後面噴火
    canvas(32, 20, P => { P.rect(6, 5, 22, 10, '#1d1b2e'); P.rect(7, 6, 20, 8, '#e8414f'); P.rect(7, 6, 20, 1, '#ff9a9a'); P.rect(7, 12, 20, 2, '#a12a3c'); for (let i = 0; i < 4; i++) P.rect(28 + i, 6 + i, 1, 8 - i * 2, '#1d1b2e'); P.rect(1, 7, 6, 6, '#1d1b2e'); P.rect(2, 8, 4, 4, '#5d5a77'); P.circ(18, 9.5, 2, '#1d1b2e'); P.circ(18, 9.5, 1.2, '#9fd4f5'); wheels(P, [8, 20]); }),
  ];
  SP.rideNames = ['礦車', '鑽地車', '吉普車', '火箭推車'];
  SP.sack = canvas(12, 12, P => draw(P, ['....kk......', '...kwwk.....', '....kk......', '..kkyykk....', '.kyyyyyyk...', 'kyyyyycyyk..', 'kyyycyyyyk..', 'kyyyyyycyk..', 'kyycyyyyyk..', '.kyyyyyyk...', '..kkkkkk....', '............'], { k: '#1d1b2e', w: '#e8414f', y: '#c98a4b', c: '#78e0f0' }));
  // 地圖上每個洞室的小圖
  const motif = rows => canvas(rows[0].length, rows.length, P => draw(P, rows, { k: '#1d1b2e', r: '#d6334a', b: '#3c8dde', y: '#ffd166', w: '#d3d1e6', o: '#b8834e', g: '#8b8aa3', t: '#1f7a8a', c: '#78e0f0', p: '#b48cff', n: '#6e4a2a', e: '#e8414f' }));
  SP.motif = {
    ox: motif(['rrrr.bbbb', 'rkkr.bkkb', 'rrrr.bbbb']),
    bridge: motif(['n.......n', 'no.....on', '.oo...oo.', '...ooo...', '..ttttt..']),
    train: motif(['.yyyyyy..', '.yccyccy.', '.yyyyyyy.', '..k...k..', 'wwwwwwwww']),
    lock: motif(['..ggg..', '.goooo.', '.ooooo.', '.ooyoo.', '.ooooo.']),
    lab: motif(['..kk..', '..cc..', '.cccc.', 'cpcccc', 'cccpcc', '.kkkk.']),
    safe: motif(['kkkkkkk', 'kyyyyyk', 'kyykyyk', 'kyyyyyk', 'kkkkkkk']),
    bomb: motif(['....y.', '...k..', '.kkk..', 'kgkkk.', 'kkkkk.', '.kkk..']),
    fish: motif(['.cc....', 'cccc.c.', 'ckcccc.', 'cccc.c.', '.cc....']),
    chase: motif(['..kgk..', 'kgggggk', 'kgggggk', '.k...k.']),
  };

  ART.MAP = { NODES, PATH };

  /* ---------- 小物件 ---------- */
  SP.gem = canvas(9, 9, P => draw(P, ['..kkkkk..', '.kwccbck.', 'kwccccbbk', 'kcccccbbk', '.kcccbbk.', '..kcbbk..', '...kbk...', '....k....', '.........'], { k: '#1d1b2e', w: '#ffffff', c: '#78e0f0', b: '#3c8dde' }));
  SP.hFull = canvas(9, 8, P => draw(P, ['.kk...kk.', 'krrk.krrk', 'krwrkrrrk', 'krrrrrrrk', '.krrrrrk.', '..krrrk..', '...krk...', '....k....'], { k: '#1d1b2e', r: '#e8414f', w: '#ffb3b3' }));
  SP.hEmpty = canvas(9, 8, P => draw(P, ['.kk...kk.', 'k..k.k..k', 'k...k...k', 'k.......k', '.k.....k.', '..k...k..', '...k.k...', '....k....'], { k: '#5d5a77' }));
  SP.crown = canvas(13, 8, P => draw(P, ['k.....k.....k', 'kyk..kyk..kyk', 'kyyk.kyk.kyyk', 'kyyykyyykyyyk', 'kyryyyryyyryk', 'kyyyyyyyyyyyk', 'kkkkkkkkkkkkk', '.............'], { k: '#1d1b2e', y: '#ffd166', r: '#e8414f' }));
  SP.bigChestOpen = canvas(30, 30, P => {
    P.rect(1, 0, 28, 9, '#1d1b2e'); P.rect(2, 1, 26, 7, '#8a5a32'); P.rect(2, 1, 26, 1, '#b8834e'); [5, 24].forEach(x => P.rect(x, 0, 2, 9, '#ffd166'));
    P.rect(1, 9, 28, 4, '#1d1b2e'); for (let i = 0; i < 9; i++) P.circ(4 + i * 2.8, 12, 2.2, i % 3 ? '#ffd166' : '#fff3c4'); P.rect(9, 9, 3, 3, '#78e0f0'); P.rect(18, 10, 3, 2, '#e8414f');
    P.rect(0, 14, 30, 16, '#1d1b2e'); P.rect(1, 15, 28, 14, '#9a6a3f'); P.rect(1, 15, 28, 1, '#dca066'); P.rect(1, 27, 28, 2, '#6e4a2a');
    [4, 25].forEach(x => { P.rect(x, 14, 2, 16, '#ffd166'); P.rect(x, 14, 1, 16, '#fff3c4'); }); P.rect(12, 15, 6, 6, '#1d1b2e'); P.rect(13, 16, 4, 4, '#ffd166');
  });
  SP.bigChest = canvas(30, 24, P => {
    P.rect(0, 8, 30, 16, '#1d1b2e'); P.rect(1, 12, 28, 11, '#9a6a3f'); P.rect(1, 12, 28, 1, '#dca066'); P.rect(1, 21, 28, 2, '#6e4a2a');
    P.rect(0, 2, 30, 8, '#1d1b2e'); P.rect(1, 3, 28, 6, '#b8834e'); P.rect(1, 3, 28, 1, '#dca066');
    [4, 25].forEach(x => { P.rect(x, 2, 2, 22, '#ffd166'); P.rect(x, 2, 1, 22, '#fff3c4'); });
    P.rect(12, 9, 6, 7, '#1d1b2e'); P.rect(13, 10, 4, 5, '#ffd166'); P.rect(14, 12, 2, 2, '#1d1b2e');
  });
})();
