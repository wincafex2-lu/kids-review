# 點陣人物

`chibi.js` 是本站原創的大頭點陣人物（32×40，二頭身），小遊戲、洞穴大冒險、找出間諜共用。

- `CHIBI.person(名字)`：由名字決定長相（髮型、髮色、膚色、衣服），同一個名字每次都長一樣。
  `泓` 是戴皇冠的隊長，`王奶奶` 有指定長相。
- `CHIBI.spy()`、`CHIBI.cop()`、`CHIBI.boss()`：間諜、警察、隊長。
- `CHIBI.url(人物, { pose, step, face, soot, hands, dir })`：回傳圖片網址。
  - `pose`：`stand` 站、`step` 原地踏步、`left`／`right` 側面走路、`cheer` 歡呼、`hold` 舉牌、`kick` 飛踢
  - `face`：`happy`、`sad`、`scared`、`smug`
  - `soot: true`：被炸得一臉黑

畫法：

- 一層一層畫（後面的頭髮、腳、身體、手、頭、配件），每一層自己描 1 格黑框。
  疊在別的顏色上面的線不用黑色，改用那個顏色的深色，人物裡面才不會一團黑。
- 頭髮每個髮型一張手畫點陣圖，五階顏色（反光、亮、底色、暗、最暗），瀏海和反光每個髮型都不一樣。
- 要加新髮型就在 `HAIR` 加一張圖；要加指定長相的角色就加在 `NAMED`。

以前用的是「Agent 辦公室」的 16×20 人物（`people-sprites.js`、`people.js`）加上放大用的 `people-hd.js`，已經換掉、不再載入。
