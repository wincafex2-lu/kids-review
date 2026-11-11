/* 大頭點陣人物（本站原創）：32×40，二頭身。小遊戲、洞穴大冒險、找出間諜共用。
   畫法：一層一層畫（後面的頭髮 → 腳 → 身體 → 手 → 頭 → 配件 → 最前面），每一層自己描 1 格黑框；
   疊在別的顏色上面的線不用黑色，改用那個顏色的深色，所以人物裡面不會一團黑。
   頭髮每個髮型一張手畫點陣圖，五階顏色：I 反光、i 亮、H 底色、h 暗、d 最暗。
   CHIBI.person(名字) 由名字決定長相；CHIBI.url(人物, { pose, step, face, soot, hands }) 回傳圖片網址。
   pose：stand 站、step 原地踏步、left／right 側面走路、cheer 歡呼、hold 舉牌、kick 飛踢（側面，配 dir: 'left'／'right'）
   face：happy 開心、sad 難過、scared 嚇到、smug 得意 */
window.CHIBI = (() => {
  const W = 32, H = 40, OY = 4, LH = H + 6;
  const layer = () => Array.from({ length: LH }, () => Array(W).fill(''));
  const px = (g, x, y, c) => { if (x >= 0 && x < W && y + OY >= 0 && y + OY < LH) g[y + OY][x] = c; };
  const rect = (g, x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) px(g, x, y, c); };
  const row = (g, y, hw, c) => rect(g, 16 - hw, y, 15 + hw, y, c);                       // 左右對稱：hw = 從中線往外幾格
  const both = (g, x0, y0, x1, y1, c) => { rect(g, x0, y0, x1, y1, c); rect(g, 31 - x1, y0, 31 - x0, y1, c); };
  const pts = (g, list, c, mirror, dy = 0) => list.forEach(([x, y]) => { px(g, x, y + dy, c); if (mirror) px(g, 31 - x, y + dy, c); });
  // 點陣圖：{ 第幾列: [[從第幾格開始, '字元…', 要不要左右鏡射再畫一次], …] }，'.' 是不畫；dx 整張往右移；keep(x, y) 決定哪幾格要畫
  const art = (g, rows, dx = 0, keep) => { for (const y in rows) for (const [x0, str, m] of rows[y]) [...str].forEach((c, i) => { if (c === '.' || (keep && !keep(x0 + i, +y))) return; px(g, x0 + i + dx, +y, c); if (m) px(g, 31 - x0 - i + dx, +y, c); }); };

  const DOME = { 1: [[12, 'hHHHHHHh']], 2: [[9, 'hHHiiiiiiiiHHh']], 3: [[7, 'hHHiiiiiiiiiiiiHHh']], 4: [[6, 'hHHiiiiiiiiiiiiiiHHh']] };
  const FULL = [[5, 'hHHHHHHHHHHHHHHHHHHHHh']];
  const BUN = { 0: [[4, 'hHHh']], 1: [[3, 'hHIiHh']], 2: [[2, 'hHIiHHHh']], 3: [[2, 'hHiHHHHh']], 4: [[2, 'hHHHHHhd']], 5: [[3, 'dhHHhd']], 6: [[4, 'dddd']] };
  const TAIL = { 8: [[2, 'hHHH']], 9: [[1, 'hHiHH']], 10: [[1, 'hHiHH']], 11: [[1, 'hHIHH']], 12: [[1, 'hHIHh']], 13: [[1, 'hHiHh']], 14: [[1, 'hHHHh']], 15: [[1, 'hHHHh']], 16: [[1, 'hHHHh']], 17: [[1, 'hHHHh']], 18: [[1, 'dhHHh']], 19: [[2, 'dhHh']], 20: [[2, 'dhHh']], 21: [[3, 'dhh']], 22: [[4, 'dd']] };
  const mir = rows => Object.fromEntries(Object.entries(rows).map(([y, segs]) => [y, segs.map(([x0, s]) => [x0, s, 1])]));
  const HAIR = {
    // 短髮女生：齊瀏海、中間一撮，髮尾往外翹；反光是一圈斷開的弧
    bob: { len: 19, front: { ...DOME,
      5: [[5, 'hHHiIIIIiiIIIIIiIIIHHh']], 6: [[5, 'hHHIIiHHHHHHHHHHHiIIHh']], 7: FULL,
      8: [[5, 'hHHHHHHhHHHHHHhHHHHHHh']], 9: [[5, 'hHHHHHHhHHHHHHhHHHHHHh']], 10: [[5, 'hHHHHHhHHHHHHHHhHHHHHh']], 11: [[5, 'hHHHHHhHHHHHHHHhHHHHHh']],
      12: [[5, 'hHHhhhd.HHHHHH.dhhhHHh']], 13: [[5, 'hHH'], [14, 'hddh'], [24, 'HHh']], 14: [[5, 'hHH'], [24, 'HHh']], 15: [[5, 'hHH'], [24, 'HHh']],
      16: [[5, 'hHh'], [24, 'hHh']], 17: [[4, 'hhHh'], [24, 'hHhh']], 18: [[4, 'dhHHh'], [23, 'hHHhd']], 19: [[5, 'ddhhh'], [22, 'hhhdd']] } },
    // 長髮女生：公主切（一刀平的瀏海），兩側直直垂到肩膀，後面的頭髮貼著背；反光是一整圈
    long: { len: 19, front: { 1: [[12, 'hHHHHHHh']], 2: [[9, 'hHHHiiiiiiHHHh']], 3: [[7, 'hHHHiiiiiiiiiiHHHh']], 4: [[6, 'hHHiiiiiiiiiiiiiiHHh']],
      5: [[5, 'hHHiiIIIIIIIIIIIIiiHHh']], 6: [[5, 'hHHIIiiHHHHHHHHiiIIHHh']], 7: FULL,
      8: [[5, 'hHHHhHHHHHHHHHHHHhHHHh']], 9: [[5, 'hHHHhHHHHHHHHHHHHhHHHh']], 10: [[5, 'hHHHhHHHHHHHHHHHHhHHHh']], 11: [[5, 'hHHHhHHHHHHHHHHHHhHHHh']],
      12: [[5, 'hHHhddddddddddddddhHHh']], 13: [[5, 'hHH'], [24, 'HHh']], 14: [[5, 'hHH'], [24, 'HHh']], 15: [[5, 'hHh'], [24, 'hHh']], 16: [[5, 'hHh'], [24, 'hHh']], 17: [[5, 'hHh'], [24, 'hHh']],
      18: [[5, 'hHhH'], [23, 'HhHh']], 19: [[5, 'hHhHH'], [22, 'HHhHh']], 20: [[5, 'hHhHHH'], [21, 'HHHhHh']], 21: [[6, 'hhHHHHH'], [19, 'HHHHHhh']] },
      back: { 20: [[6, 'hhhhhhhhhhhhhhhhhhhh']], 21: [[6, 'hhhhhhhhhhhhhhhhhhhh']], 22: [[6, 'hHhhhhhhhhhhhhhhhhHh']], 23: [[6, 'hHhhhhhhhhhhhhhhhhHh']], 24: [[6, 'hHhhhhhhhhhhhhhhhhHh']], 25: [[6, 'dhhhhhhhhhhhhhhhhhhd']], 26: [[7, 'ddhhhhhhhhhhhhhhdd']], 27: [[8, 'dddddddddddddddd']] },
      sideBack: { 18: [[16, 'hHHHHHHHhh']], 19: [[16, 'hHHHHHHHhh']], 20: [[16, 'hHHHHHHHhh']], 21: [[16, 'hHHHHHHHhh']], 22: [[16, 'hHHHHHHHhh']], 23: [[16, 'hHHHHHHHhh']], 24: [[16, 'hHHHHHHHhh']], 25: [[16, 'dhhhhhhhhd']], 26: [[17, 'ddhhhhdd']], 27: [[18, 'dddddd']] } },
    // 雙馬尾女生：中分瀏海露出額頭，兩邊各一道反光
    twin: { len: 17, front: { 1: [[12, 'hHHHHHHh']], 2: [[9, 'hHHiiiHHiiiHHh']], 3: [[7, 'hHHiiiiiHHiiiiiHHh']], 4: [[6, 'hHHiiiiiihhiiiiiiHHh']],
      5: [[5, 'hHHiIIIIiHhhHiIIIIiHHh']], 6: [[5, 'hHHIIiHHHHhhHHHHiIIHHh']], 7: [[5, 'hHHHHHHHHHhhHHHHHHHHHh']], 8: [[5, 'hHHHHHHHHHddHHHHHHHHHh']],
      9: [[5, 'hHHHHHHHHh..hHHHHHHHHh']], 10: [[5, 'hHHHHHHHh....hHHHHHHHh']], 11: [[5, 'hHHHHHHh......hHHHHHHh']], 12: [[5, 'hHHHhhd........dhhHHHh']],
      13: [[5, 'hHH'], [24, 'HHh']], 14: [[5, 'hHH'], [24, 'HHh']], 15: [[5, 'hHH'], [24, 'HHh']], 16: [[5, 'hHh'], [24, 'hHh']], 17: [[5, 'hdd'], [24, 'ddh']] },
      back: mir(TAIL), top: { 6: [[3, 'A', 1]], 7: [[4, 'AAA', 1]], 8: [[4, 'AAa', 1]], 9: [[3, 'A', 1]] } },
    // 包包頭女生：斜瀏海，反光跟著瀏海斜下來，兩顆包包各有一點亮
    buns: { len: 16, front: { ...DOME,
      5: [[5, 'hHHiiiiiiiiiiIIIIiHHHh']], 6: [[5, 'hHHHiiiiiIIIIIiHHHHHHh']], 7: [[5, 'hHHHHIIIIiHHHHHHHHHHHh']], 8: [[5, 'hHHHHHHHHHHHHHHHHHHhHh']], 9: [[5, 'hHHHHHHHHHHHHHHHHhhHHh']],
      10: [[5, 'hHHHHHHHHHHHHHHhd..HHh']], 11: [[5, 'hHHHHHHHHHHhhd.....HHh']], 12: [[5, 'hHHHhhhhhd.........HHh']],
      13: [[5, 'hHH'], [24, 'HHh']], 14: [[5, 'hHH'], [24, 'HHh']], 15: [[5, 'hHh'], [24, 'hHh']], 16: [[5, 'hhd'], [24, 'dhh']] },
      back: { 0: [[4, 'hHHh'], [24, 'hHHh']], 1: [[3, 'hHIiHh'], [23, 'hHIiHh']], 2: [[2, 'hHIiHHHh'], [22, 'hHIiHHHh']], 3: [[2, 'hHiHHHHh'], [22, 'hHiHHHHh']], 4: [[2, 'hHHHHHhd'], [22, 'dhHHHHHh']], 5: [[3, 'dhHHhd'], [23, 'dhHHhd']], 6: [[4, 'dddd'], [24, 'dddd']] },
      top: { 3: [[8, 'A'], [23, 'A']], 4: [[7, 'A'], [24, 'A']] } },
    // 馬尾女生：頭髮往後梳、露出額頭，髮絲往馬尾的方向斜
    pony: { len: 16, front: { 1: [[12, 'hHHHHHHh']], 2: [[9, 'hHHiiiiiiiiHHh']], 3: [[7, 'hHHiiiiiiiiiiiiHHh']], 4: [[6, 'hHHiiiIIIIIIIIiiiHHh']],
      5: [[5, 'hHHiIIiiHHHHHHHHiiIIHh']], 6: [[5, 'hHHHHHHhHHHHhHHHHhHHHh']], 7: [[5, 'hHHHHHhHHHHHhHHHHHhHHh']], 8: FULL, 9: FULL,
      10: [[5, 'hHHHHhhddddddddhhHHHHh']], 11: [[5, 'hHHhd'], [22, 'dhHHh']], 12: [[5, 'hHh'], [24, 'hHh']], 13: [[5, 'hHd'], [24, 'dHh']], 14: [[5, 'hHd'], [24, 'dHh']], 15: [[5, 'hdd'], [24, 'ddh']] },
      back: { 2: [[24, 'hHHh']], 3: [[24, 'HHiHHh']], 4: [[25, 'HiIHHh']], 5: [[26, 'HIHHh']], 6: [[26, 'HiHHh']], 7: [[27, 'HHHh']], 8: [[27, 'HHHh']], 9: [[27, 'HHHh']], 10: [[27, 'HHHh']], 11: [[27, 'HHHh']],
        12: [[27, 'HHhd']], 13: [[27, 'Hhhd']], 14: [[28, 'hhd']], 15: [[28, 'hd']], 16: [[29, 'd']] },
      top: { 3: [[24, 'AA']], 4: [[24, 'Aa']] } },
    // 刺刺頭男生：頭頂幾撮往上翹，每一撮亮的那一面都有反光，瀏海是鋸齒狀
    spiky: { short: true, front: { 0: [[16, 'h']], 1: [[10, 'h'], [15, 'hiH'], [23, 'h']], 2: [[9, 'hHh'], [14, 'hiiHh'], [21, 'hHHh']],
      3: [[7, 'hHiiHHHiiiHHHHiHHHh']], 4: [[4, 'h'], [6, 'hHIIiHHIIIiHHHIIiHHh'], [27, 'h']], 5: [[4, 'hHHHIiHHHHIIiHHHHIiHHHHh']], 6: FULL, 7: FULL,
      8: [[5, 'hHHHHhHHHHHhHHHHHhHHHh']], 9: [[5, 'hHHHHhHHHHHhHHHHHhHHHh']], 10: [[5, 'hHHHHhHHHHHhHHHHHhHHHh']], 11: [[5, 'hHHHd.hHHHd.hHHHd.hHHh']],
      12: [[5, 'hHd'], [11, 'hHd'], [17, 'hHd'], [23, 'hHHh']], 13: [[6, 'h'], [25, 'h']], 14: [[6, 'h'], [25, 'h']] } },
    // 旁分男生：分線從左邊斜上去，瀏海往右邊蓋，反光順著分線
    part: { short: true, front: { 1: [[12, 'hHHHHHHh']], 2: [[9, 'hHHhiiiiiiiHHh']], 3: [[7, 'hHHHhiiiiiiiiiiHHh']], 4: [[6, 'hHHHhiiIIIIIIiiiiHHh']],
      5: [[5, 'hHHHhiIIiiHHHHHHHHiHHh']], 6: [[5, 'hHHHhHHHHHHHHHHHHHHHHh']], 7: [[5, 'hHHHhHHHHHHHHhHHHHhHHh']], 8: [[5, 'hHHhHHHHHHHHHhHHHHhHHh']],
      9: [[5, 'hHHd.hHHHHHHHHHHHHHHHh']], 10: [[5, 'hHd...hHHHHHHHHHHHHHHh']], 11: [[5, 'hHd.....hHHHHHHHHHHHHh']], 12: [[5, 'hd.........hhhhhdddHHh']],
      13: [[6, 'h'], [25, 'h']], 14: [[6, 'h'], [25, 'h']] } },
    // 平頭男生：額頭全露出來，髮際線一條暗邊，反光在左上一小塊
    crop: { short: true, front: { 1: [[12, 'hHHHHHHh']], 2: [[9, 'hHHiiiiiiiiHHh']], 3: [[7, 'hHHiiIIIIIiiiiiHHh']], 4: [[6, 'hHHiIIiiiiiiiiiiiHHh']],
      5: [[5, 'hHHiiHHHHHHHHHHHHHHHHh']], 6: FULL, 7: FULL, 8: FULL, 9: [[5, 'hHHHHhhhhhhhhhhhhHHHHh']],
      10: [[5, 'hHHd'], [23, 'dHHh']], 11: [[5, 'hHd'], [24, 'dHh']], 12: [[5, 'hd'], [25, 'dh']], 13: [[6, 'h'], [25, 'h']] } },
    // 香菇頭男生：整圈一樣長，下緣一條暗邊，反光是左上厚厚一塊
    mush: { short: true, front: { ...DOME, 4: [[6, 'hHHiIIIIIiiiiiiiiHHh']], 5: [[5, 'hHHiIIIiiiHHHHHHHHHHHh']], 6: FULL, 7: FULL,
      8: [[5, 'hHHHHHHhHHHHHHhHHHHHHh']], 9: [[5, 'hHHHHHHhHHHHHHhHHHHHHh']], 10: [[5, 'hHHHHHHhHHHHHHhHHHHHHh']], 11: FULL,
      12: [[5, 'hhddddddddddddddddddhh']], 13: [[6, 'h'], [25, 'h']] } },
  };
  // 奶奶：頭髮往後梳、露出額頭，頭頂盤一顆髮髻
  HAIR.granny = { len: 15, front: HAIR.pony.front, back: { '-2': [[14, 'hHHh']], '-1': [[13, 'hHIiHh']], 0: [[12, 'hHIiHHHh']], 1: [[12, 'hHiHHHHh']], 2: [[12, 'hHHHHHHh']] } };
  // 帽子：X 底色、x 暗、Z 亮、W 反光；rows 蓋掉頭髮第 10 列以上，side 是側面時要換掉的那幾列
  const HAT = {
    cap: { rows: { 0: [[14, 'xXXx']], 1: [[11, 'xXXZZZZXXx']], 2: [[8, 'xXXZZZZZZZZXXXXx']], 3: [[7, 'xXXZZWWWWZZXXXXXXx']], 4: [[6, 'xXXZWWZZXXXXXXXXXXXx']],
      5: [[5, 'xXXXZZXXXXXXXXXXXXXXXx']], 6: [[5, 'xXXXXXXXXXXXXXXXXXXXXx']], 7: [[5, 'xXXXXXXXXXXXXXXXXXXXXx']], 8: [[5, 'xxXXXXXXXXXXXXXXXXXXxx']],
      9: [[3, 'xXXXXXXXXXXXXXXXXXXXXXXXXx']], 10: [[3, 'xxxxxxxxxxxxxxxxxxxxxxxxxx']] },
      side: { 9: [[1, 'xXXXXXXXXXXXXXXXXXXXXXXXXx']], 10: [[1, 'xxxxxxxxxxxxxxxxxx'], [19, 'HHHHHHHh']] } },
    // 間諜的黑帽：帽身圓圓的，一圈紅色帽帶，寬帽簷
    fedora: { rows: { 0: [[11, 'xXXXXXXXXx']], 1: [[9, 'xXXZZZZXXXXXXx']], 2: [[8, 'xXXZZXXXXXXXXXXx']], 3: [[8, 'xXXXXXXXXXXXXXXx']], 4: [[8, 'xXXXXXXXXXXXXXXx']], 5: [[8, 'xXXXXXXXXXXXXXXx']],
      6: [[8, 'TTTTTTTTTTTTTTTT']], 7: [[8, 'tTTTTTTTTTTTTTTt']], 8: [[4, 'xXXXXXXXXXXXXXXXXXXXXXXx']], 9: [[2, 'xXXZZZXXXXXXXXXXXXXXXXXXXXXx']], 10: [[3, 'xxxxxxxxxxxxxxxxxxxxxxxxxx']] } },
    // 警察帽：帽徽、黑色帽簷
    police: { rows: { 0: [[10, 'xXXXXXXXXXXx']], 1: [[7, 'xXXZZZZXXXXXXXXXXx']], 2: [[6, 'xXXZZXXXXXXXXXXXXXXx']], 3: [[6, 'xXXXXXXXYYXXXXXXXXXx']], 4: [[6, 'xXXXXXXYVYYXXXXXXXXx']], 5: [[7, 'xXXXXXXYYXXXXXXXXx']],
      6: [[7, 'xxxxxxxxxxxxxxxxxx']], 7: [[7, 'xXXXXXXXXXXXXXXXXx']], 8: [[5, 'KKKKKKKKKKKKKKKKKKKKKK']], 9: [[5, 'KGGGGGGGGGGGGGGGGGGGGK']], 10: [[6, 'KKKKKKKKKKKKKKKKKKKK']] },
      side: { 8: [[2, 'KKKKKKKKKKKKKKKKKK'], [20, 'XXXXXXx']], 9: [[2, 'KGGGGGGGGGGGGGGGGK'], [20, 'HHHHHHh']], 10: [[3, 'KKKKKKKKKKKKKKKK'], [19, 'HHHHHHHh']] } },
  };
  // 皇冠：戴在頭髮上面，不蓋掉頭髮
  const CROWN = { '-2': [[9, 'Y'], [15, 'YY'], [22, 'Y']], '-1': [[9, 'YV'], [14, 'YVYY'], [21, 'YY']], 0: [[9, 'YVYYYYVVYYYVYY']], 1: [[9, 'YYYYYYTTYYYYYY']], 2: [[9, 'yyyyyyyyyyyyyy']] };

  function make(sp, opt = {}) {
    const L = { back: layer(), legs: layer(), body: layer(), arms: layer(), head: layer(), top: layer(), front: layer() };
    const o = sp.outfit || {}, pose = opt.pose || 'stand', step = opt.step || 0, face = opt.face || '';
    const side = pose === 'left' || pose === 'right' || pose === 'kick';
    const hat = sp.hat || (sp.accessory === 'cap' ? 'cap' : ''), glasses = sp.glasses || (sp.accessory === 'glasses' ? 1 : 0);
    const dark = glasses === 'dark' && face !== 'scared';
    const sleeve = 'C', legC = o.kind === 'pants' ? 'P' : 'S';
    // 一隻腳：x0 起 3 格寬，從第 31 列往下 n 格，下面接鞋子（toe = 鞋尖多往前 1 格）
    const leg = (x0, n, toe = 0) => {
      rect(L.legs, x0, 31, x0 + 2, 30 + n, legC);
      if (o.socks && legC === 'S') rect(L.legs, x0, 29 + n, x0 + 2, 30 + n, 'W');
      if (legC === 'P') rect(L.body, x0, 31, x0 + 2, 29 + n, 'P');        // 長褲的褲管和褲子畫在同一層，中間才不會多一條線
      rect(L.legs, x0 - toe, 31 + n, x0 + 2, 31 + n, 'F');
    };
    if (!side) {
      // ── 正面：腳、身體、手
      const lift = pose === 'step' ? step + 1 : pose === 'hold' && opt.step != null ? opt.step + 1 : 0;
      leg(11, lift === 1 ? 3 : 4); leg(18, lift === 2 ? 3 : 4);
      for (let y = 22; y <= 27; y++) row(L.body, y, 4, 'C');
      if (o.kind === 'dress') { row(L.body, 27, 5, 'C'); for (let y = 28; y <= 30; y++) row(L.body, y, 6, 'C'); row(L.body, 30, 6, 'c'); }
      else if (o.kind === 'skirt') { row(L.body, 27, 5, 'P'); for (let y = 28; y <= 30; y++) row(L.body, y, 6, 'P'); row(L.body, 30, 6, 'p'); }
      else { for (let y = 28; y <= 30; y++) row(L.body, y, 5, 'P'); rect(L.body, 15, 30, 16, 30, ''); }      // 褲子和腳一樣寬
      if (o.coat) { row(L.body, 28, 5, 'C'); row(L.body, 29, 5, 'C'); row(L.body, 27, 4, 'c'); rect(L.body, 15, 27, 16, 27, 'Y'); pts(L.body, [[13, 23], [14, 24], [15, 25]], 'c', true); }
      if (o.collar) pts(L.body, [[13, 23], [14, 23], [14, 24], [15, 24]], 'W', true);
      if (o.tie) rect(L.body, 15, 24, 16, 25, 'A');
      if (o.zip) rect(L.body, 15, 23, 16, 27, 'W');
      if (o.stripe) row(L.body, 25, 4, 'W');
      if (o.vest) { rect(L.body, 12, 23, 13, 27, 'W'); rect(L.body, 18, 23, 19, 27, 'W'); pts(L.body, [[15, 23], [16, 23]], 'W'); }
      if (o.hood) { pts(L.body, [[14, 24], [14, 25], [17, 24], [17, 25]], 'W'); row(L.body, 23, 4, 'c'); }
      if (o.pocket) rect(L.body, 14, 26, 17, 27, 'c');
      if (o.belt) { row(L.body, 27, 4, 'G'); rect(L.body, 15, 27, 16, 27, 'Y'); }
      const armDown = m => { const f = m ? (x0, y0, x1, y1, c) => rect(L.arms, 31 - x1, y0, 31 - x0, y1, c) : (x0, y0, x1, y1, c) => rect(L.arms, x0, y0, x1, y1, c); f(9, 23, 10, 25, sleeve); f(9, 26, 10, 27, 'S'); if (o.long) f(9, 26, 10, 26, sleeve); };
      const armUp = (m, dy) => { const P = list => list.forEach(([x, y, c]) => px(L.front, m ? 31 - x : x, y + dy, c));
        P([[10, 23, sleeve], [9, 23, sleeve], [9, 22, sleeve], [8, 22, sleeve], [8, 21, sleeve], [7, 21, sleeve], [7, 20, 'S'], [6, 20, 'S'], [6, 19, 'S'], [5, 19, 'S'], [6, 18, 'S'], [5, 18, 'S']]); };
      // 舉牌：手往外上方伸，握著一根木桿，牌子接在桿子上面
      const armPole = m => { const R = (x0, y0, x1, y1, c) => rect(L.front, m ? 31 - x1 : x0, y0, m ? 31 - x0 : x1, y1, c);
        [[10, 23], [9, 23], [9, 22], [8, 22], [7, 22], [7, 21]].forEach(([x, y]) => px(L.front, m ? 31 - x : x, y, sleeve));
        R(4, -3, 4, 22, 'O'); R(3, 19, 5, 20, 'S'); };
      if (pose === 'cheer') { armUp(false, -step); armUp(true, -step); }
      else if (pose === 'hold') { armPole(false); if (opt.hands === 2) armPole(true); else armDown(true); }
      else { armDown(false); armDown(true); }
    } else {
      // ── 側面（一律先畫面向左，面向右的最後整張左右翻過來）
      const stride = pose !== 'kick' && step === 1;
      if (pose === 'kick') {
        // 飛踢：前腳往前平平踢出去，後腳縮起來
        rect(L.legs, 15, 31, 17, 32, legC); rect(L.legs, 15, 33, 17, 33, 'F'); if (legC === 'P') rect(L.body, 15, 31, 17, 31, 'P');
        rect(L.legs, 5, 28, 12, 30, legC); if (legC === 'P') rect(L.body, 6, 28, 12, 30, 'P'); rect(L.legs, 2, 27, 4, 30, 'F');
      } else if (stride) { leg(12, 4, 1); rect(L.legs, 16, 31, 18, 33, legC); if (legC === 'P') rect(L.body, 16, 31, 18, 32, 'P'); rect(L.legs, 16, 34, 18, 34, 'F'); if (o.socks && legC === 'S') rect(L.legs, 16, 32, 18, 33, 'W'); }
      else leg(14, 4, 1);
      rect(L.body, 13, 22, 18, 27, 'C');
      if (o.kind === 'dress' || o.kind === 'skirt') { const c = o.kind === 'dress' ? 'C' : 'P'; rect(L.body, 12, 27, 19, 27, c); rect(L.body, 11, 28, 20, 30, c); rect(L.body, 11, 30, 20, 30, c.toLowerCase()); }
      else rect(L.body, 12, 28, 18, 30, 'P');
      if (o.coat) { rect(L.body, 12, 28, 19, 29, 'C'); rect(L.body, 13, 27, 18, 27, 'c'); }
      if (o.collar || o.vest) pts(L.body, [[13, 23], [14, 23]], 'W');
      if (o.stripe) rect(L.body, 13, 25, 18, 25, 'W');
      if (o.belt) rect(L.body, 13, 27, 18, 27, 'G');
      if (pose === 'kick') { pts(L.front, [[16, 23], [17, 23], [17, 22], [18, 22], [18, 21], [19, 21]], sleeve); pts(L.front, [[19, 20], [20, 20], [20, 19], [21, 19]], 'S'); }
      // 側面的手臂貼在身體上：袖子用衣服的暗色，和手掌一起畫在身體那一層（不另外描框，身體上才不會多一圈線）
      else if (stride) { rect(L.body, 15, 23, 16, 24, 'c'); rect(L.body, 14, 25, 15, 25, 'c'); rect(L.body, 13, 26, 14, 27, 'S'); }
      else { rect(L.body, 15, 23, 16, 25, 'c'); rect(L.body, 15, 26, 16, 27, 'S'); }
    }
    // ── 頭：先畫臉，再把髮型的點陣圖蓋上去
    const hd = L.head, HS = HAIR[sp.hair] || HAIR.bob, short = HS.short, HT = HAT[hat];
    if (!side) {
      const fw = short ? { 18: 9, 19: 8, 20: 6, 21: 4 } : { 18: 7, 19: 6, 20: 5, 21: 3 };
      for (let y = 9; y <= 21; y++) row(hd, y, fw[y] || (short ? 10 : 8), 'S');
      if (short) pts(hd, [[5, 14], [5, 15]], 'S', true);      // 耳朵
      art(hd, HS.front, 0, HT ? (x, y) => y >= 11 : null); if (HT) art(hd, HT.rows);
      if (HS.back) art(L.back, HS.back, 0, HT ? (x, y) => y >= 9 : null);
      if (HS.top && !HT) art(L.top, HS.top);
    } else {
      const fs = { 18: [7, 18], 19: [8, 17], 20: [9, 16], 21: [11, 15] };
      for (let y = 9; y <= 21; y++) { const [a, b] = fs[y] || [6, 18]; rect(hd, a, y, b, y, 'S'); }
      // 頭頂照正面的畫；瀏海只留前面一段，後腦勺整片是頭髮
      art(hd, HS.front, 0, (x, y) => (HT ? y >= 11 : true) && y <= 12 && (y <= 8 || x <= 11));
      for (let y = HT ? 11 : 9; y <= 12; y++) { rect(hd, 12, y, 25, y, 'H'); px(hd, 26, y, 'h'); }
      rect(hd, 12, 12, 14, 12, 'h');
      const len = HS.len || 16;
      for (let y = 13; y <= len; y++) {
        const x0 = short ? 16 + (y - 13) : 15, x1 = 26 - Math.max(0, y - (len - 2));
        for (let x = x0; x <= x1; x++) px(hd, x, y, y === len ? 'd' : x === x0 || x === x1 ? 'h' : 'H');
      }
      if (HT) { art(hd, HT.rows); if (HT.side) { for (const y in HT.side) rect(hd, 0, +y, 31, +y, ''); art(hd, HT.side); } }
      if (HS.sideBack) art(L.back, HS.sideBack);
      if (sp.hair === 'twin') { art(L.front, TAIL, 18); if (!HT) rect(L.front, 20, 6, 22, 8, 'A'); }
      if (sp.hair === 'buns' && !HT) { art(L.back, BUN, 14); pts(L.top, [[21, 4], [22, 3]], 'A'); }
      if (sp.hair === 'pony') { art(L.back, HS.back, 0, HT ? (x, y) => y >= 9 : null); if (!HT) art(L.top, HS.top); }
      if (sp.hair === 'granny' && !HT) art(L.back, HS.back, 2);
    }
    if (sp.hat === 'crown') art(L.top, CROWN);
    if (sp.clip && !HT && !side) rect(L.top, 21, 8, 23, 9, 'A');
    // ── 臉：眼睛 3×4（上面一排睫毛、外側一排黑、裡面是有顏色的眼珠和一點反光）
    const eye = (ox, dir, tick = true) => {
      if (face === 'happy') { pts(hd, [[ox, 15], [ox + dir, 14], [ox + 2 * dir, 15]], 'K'); return; }
      for (let i = 0; i < 3; i++) px(hd, ox + i * dir, 13, 'K');
      if (face === 'smug') { for (let i = 0; i < 3; i++) px(hd, ox + i * dir, 14, 'K'); px(hd, ox + dir, 15, 'E'); px(hd, ox + 2 * dir, 15, 'E'); return; }
      if (face === 'scared') { rect(hd, Math.min(ox, ox + 2 * dir), 14, Math.max(ox, ox + 2 * dir), 16, 'W'); px(hd, ox + dir, 15, 'K'); return; }   // 嚇到：眼睛瞪成白白一顆，中間一點
      for (let y = 14; y <= 15; y++) px(hd, ox, y, 'K'); if (tick) px(hd, ox - dir, 14, 'K');
            px(hd, ox + dir, 14, 'E'); px(hd, ox + 2 * dir, 14, 'E'); px(hd, ox + dir, 15, 'E'); px(hd, ox + 2 * dir, 15, 'E'); px(hd, ox + dir, 16, 'e'); px(hd, ox + 2 * dir, 16, 'e');
      px(hd, dir > 0 ? ox + dir : ox + 2 * dir, 14, 'W');
      if (face === 'sad') { px(hd, ox + dir, 17, 'L'); px(hd, ox + dir, 18, 'L'); px(hd, ox + dir, 19, 'L'); }
    };
    if (!side) {
      eye(9, 1); eye(22, -1);
      if (face !== 'sad') pts(hd, [[9, 18], [10, 18]], 'R', true);                                  // 腮紅
      if (face === 'happy') { rect(hd, 13, 18, 18, 18, 'K'); rect(hd, 14, 19, 17, 19, 'T'); rect(hd, 15, 20, 16, 20, 'T'); }
      else if (face === 'sad') pts(hd, [[14, 20], [15, 19], [16, 19], [17, 20]], 'M');
      else if (face === 'scared') { rect(hd, 14, 18, 17, 20, 'K'); rect(hd, 15, 19, 16, 19, 'T'); pts(L.top, [[27, 9], [27, 10], [28, 10], [27, 11], [28, 11]], 'L'); }
      else if (face === 'smug') { rect(hd, 13, 18, 18, 18, 'K'); rect(hd, 14, 19, 17, 19, 'W'); rect(hd, 14, 20, 17, 20, 'K'); }
      else pts(hd, [[15, 19], [16, 19]], 'M');
      if (glasses && (dark || glasses !== 'dark')) {
        for (const x0 of [8, 19]) { if (dark) { rect(L.top, x0, 12, x0 + 4, 16, 'K'); rect(L.top, x0 + 1, 13, x0 + 2, 13, 'G'); } else { rect(L.top, x0, 12, x0 + 4, 12, 'G'); rect(L.top, x0, 17, x0 + 4, 17, 'G'); rect(L.top, x0, 12, x0, 17, 'G'); rect(L.top, x0 + 4, 12, x0 + 4, 17, 'G'); } }
        rect(L.top, 13, 14, 18, 14, dark ? 'K' : 'G');
      }
    } else {
      eye(10, -1, false);
      if (face !== 'sad') pts(hd, [[8, 18], [9, 18]], 'R');
      if (face === 'happy') { rect(hd, 9, 19, 11, 19, 'K'); rect(hd, 9, 20, 10, 20, 'T'); }
      else if (face === 'scared') rect(hd, 9, 19, 10, 20, 'K');
      else pts(hd, face === 'sad' ? [[9, 20], [10, 19]] : [[8, 19], [9, 19]], 'M');
      if (glasses && (dark || glasses !== 'dark')) {
        if (dark) { rect(L.top, 7, 12, 11, 16, 'K'); rect(L.top, 8, 13, 9, 13, 'G'); } else { rect(L.top, 7, 12, 11, 12, 'G'); rect(L.top, 7, 17, 11, 17, 'G'); rect(L.top, 7, 12, 7, 17, 'G'); rect(L.top, 11, 12, 11, 17, 'G'); }
        rect(L.top, 12, 14, 16, 14, dark ? 'K' : 'G');
      }
    }
    // ── 疊起來：每一層先描框再上色；疊在別的顏色上面的線記成「那個顏色!」，上色時用它的深色
    const isLine = c => c === 'K' || c.length > 1, N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const G = layer(), order = ['back', 'legs', 'body', 'arms', 'head', 'top', 'front'], noLine = { top: 1 };
    for (const k of order) {
      const g = L[k];
      if (!noLine[k]) for (let y = 0; y < LH; y++) for (let x = 0; x < W; x++) if (!g[y][x] && N4.some(([dx, dy]) => g[y + dy] && g[y + dy][x + dx])) G[y][x] = !G[y][x] || isLine(G[y][x]) ? (G[y][x] || 'K') : G[y][x] + '!';
      for (let y = 0; y < LH; y++) for (let x = 0; x < W; x++) if (g[y][x]) G[y][x] = g[y][x];
    }
    // 配件那層沒有自己的框，露在外面的部分最後補上
    const out = G.map(r => r.slice());
    for (let y = 0; y < LH; y++) for (let x = 0; x < W; x++) if (!G[y][x] && N4.some(([dx, dy]) => G[y + dy] && G[y + dy][x + dx] && !isLine(G[y + dy][x + dx]))) out[y][x] = 'K';
    // 陰影：瀏海或帽簷下面的皮膚、衣服和褲子靠右、靠下的一排
    const at = (x, y) => (out[y] && out[y][x]) || '', ln = (x, y) => at(x, y) && isLine(at(x, y));
    for (let y = 0; y < LH; y++) for (let x = 0; x < W; x++) {
      const c = out[y][x], yy = y - OY;
      if (c === 'S' && yy < 14 && 'HhdiIXxZ'.includes(at(x, y - 1)) && at(x, y - 1)) out[y][x] = 's';
      else if (c === 'C' && yy > 21 && (ln(x + 1, y) && !ln(x - 2, y) || ln(x, y + 1))) out[y][x] = 'c';
      else if (c === 'P' && (ln(x + 1, y) && !ln(x - 2, y) || yy <= 30 && ln(x, y + 1))) out[y][x] = 'p';
    }
    // 裁成 32×40：腳底的黑框固定在最下面一列（踏步、飛踢時整個人才不會上下跳）
    const fin = Array.from({ length: H }, (_, y) => out[y + OY - 3].slice());
    return pose === 'right' || (pose === 'kick' && opt.dir === 'right') ? fin.map(r => r.reverse()) : fin;
  }

  const mix = (a, b, t) => { const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)), A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const INK = '#1c1b2e', SOOT = '#4a4458';
  function palette(sp, opt = {}) {
    const c = sp.colors, skin = opt.soot ? SOOT : c.skin, hat = c.hat || c.accent || '#4fa57a', acc = c.accent || '#ffcc4d';
    return {
      K: INK, W: '#ffffff', T: '#e2606a', t: '#b8434e', L: '#6fb8ff', G: '#3a3f5c', Y: '#ffcc4d', y: '#c98a1e', V: '#ffe89a', O: '#c79a5e', o: '#8a6234',
      S: skin, s: mix(skin, opt.soot ? '#000000' : '#b0603c', .28), R: opt.soot ? skin : mix(skin, '#f0707e', .5), M: mix(skin, opt.soot ? '#000000' : '#8a3030', .6),
      H: c.hair, h: mix(c.hair, '#22102e', .24), d: mix(c.hair, '#22102e', .46), i: mix(c.hair, '#fff3e0', .2), I: mix(c.hair, '#ffffff', .55),
      E: c.eye, e: mix(c.eye, '#ffffff', .45), C: c.top, c: mix(c.top, '#000000', .22), P: c.bottom, p: mix(c.bottom, '#000000', .25),
      F: c.shoes || '#5a4038', A: acc, a: mix(acc, '#000000', .25), X: hat, x: mix(hat, '#000000', .28), Z: mix(hat, '#ffffff', .4),
    };
  }
  const cache = new Map();
  function url(sp, opt = {}) {
    const key = JSON.stringify([sp, opt]);
    if (!cache.has(key)) {
      const g = make(sp, opt), pal = palette(sp, opt);
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
      g.forEach((r, y) => r.forEach((ch, i) => { if (ch) { x.fillStyle = ch.length > 1 ? mix(pal[ch[0]] || '#ff00ff', ch[0] === 'S' ? '#7a3418' : INK, ch[0] === 'S' ? .5 : .55) : pal[ch] || '#ff00ff'; x.fillRect(i, y, 1, 1); } }));
      cache.set(key, cv.toDataURL());
    }
    return cache.get(key);
  }

  // ── 由名字決定長相：同一個名字每次都長一樣
  const SKIN = ['#fbe3cf', '#f7d7ba', '#e9b98f', '#c98d62'];
  const HAIRC = ['#8a5a3c', '#453f60', '#b07a3e', '#d0703a', '#3a3f6b', '#6b3a2a'];
  const EYE = ['#3f7fbf', '#9a5220', '#8a4fbf', '#3f8f5f', '#2f8f8f', '#7a3d14'];
  const TOP = ['#f6f1e6', '#e0564f', '#ffd45e', '#f39c3d', '#4f9f7a', '#6fb7d6', '#f08aa6', '#8f9ac2'];
  const BOTTOM = ['#34518c', '#5b6f8f', '#6b4a32', '#3b4666', '#5b5fa0'];
  const SHOES = ['#6b3f2a', '#f2f2f2', '#c0392b', '#34518c'];
  const ACCENT = ['#ffcc4d', '#f58fb0', '#e0564f', '#4fa57a'];
  const GIRL = [{ kind: 'dress', collar: true, socks: true }, { kind: 'skirt', collar: true, tie: true, socks: true }, { kind: 'skirt', zip: true, socks: true }, { kind: 'shorts', stripe: true }, { kind: 'dress', stripe: true, socks: true }, { kind: 'shorts', zip: true, long: true }];
  const BOY = [{ kind: 'shorts', hood: true, pocket: true }, { kind: 'shorts', stripe: true }, { kind: 'pants', vest: true }, { kind: 'pants', zip: true }, { kind: 'shorts', collar: true }, { kind: 'pants', stripe: true }];
  // 指定長相的角色（其他人由名字決定）
  const NAMED = {
    王奶奶: { hair: 'granny', glasses: 1, outfit: { kind: 'dress', collar: true, long: true }, colors: { skin: '#f7d7ba', hair: '#c9c6d8', eye: '#7a3d14', top: '#8f6fae', bottom: '#8f6fae', shoes: '#6b3f2a', accent: '#ffcc4d' } },
  };
  function person(name) {
    if (name === '泓') return boss();
    if (NAMED[name]) return { name, ...NAMED[name] };
    let h = 2166136261; for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619) >>> 0;
    let n = h || 0x9e3779b9; const pick = k => { n ^= n << 13; n ^= n >>> 17; n ^= n << 5; return (n >>> 0) % k; };
    const girl = (h & 1) === 1, top = TOP[pick(TOP.length)], outfit = (girl ? GIRL : BOY)[pick(6)];
    return { name, hair: girl ? ['bob', 'long', 'twin', 'buns', 'pony'][pick(5)] : ['spiky', 'part', 'crop', 'mush'][pick(4)], clip: girl && pick(3) === 0, glasses: pick(7) === 0 ? 1 : 0, outfit,
      colors: { skin: SKIN[pick(4)], hair: HAIRC[pick(6)], eye: EYE[pick(6)], top, bottom: outfit.kind === 'dress' ? top : BOTTOM[pick(5)], shoes: SHOES[pick(4)], accent: ACCENT[pick(4)] } };
  }
  // 隊長（泓）：戴皇冠、打領帶
  const boss = () => ({ name: '泓', hair: 'part', hat: 'crown', outfit: { kind: 'pants', collar: true, tie: true }, colors: { skin: '#f7d7ba', hair: '#453f60', eye: '#7a3d14', top: '#4a5fa8', bottom: '#2f3760', shoes: '#5a4038', accent: '#e0564f' } });
  // 間諜：黑帽、墨鏡、風衣
  const spy = () => ({ name: '間諜', hair: 'crop', hat: 'fedora', glasses: 'dark', outfit: { kind: 'pants', coat: true }, colors: { skin: '#f7d7ba', hair: '#2b2440', eye: '#3a2a20', top: '#b88a50', bottom: '#2b2440', shoes: '#1c1b2e', hat: '#3a3350' } });
  // 警察：藍色制服、警帽
  const cop = () => ({ name: '警察', hair: 'crop', hat: 'police', outfit: { kind: 'pants', collar: true, belt: true }, colors: { skin: '#f2cda8', hair: '#3b3a55', eye: '#3a2a20', top: '#3460b8', bottom: '#1f3a78', shoes: '#1c1b2e', hat: '#2a4a98' } });
  return { make, url, person, boss, spy, cop, HAIR: Object.keys(HAIR) };
})();
