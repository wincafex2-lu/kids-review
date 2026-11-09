'use strict';
/* 四個頁面共用的小工具：本機儲存、錯題本、讀題庫。
   index.html（複習小書）、spy.html（找出間諜）、games.html（最後一刻揭曉）、cave.html（洞穴大冒險）都要先載入這個檔。
   錯題本存在 localStorage「kr-wrong-v1」，內容是題目代號陣列：「單元檔#題號」，題組小題是「單元檔#題號.小題」。 */
const KR = (() => {
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } },
  };

  // 錯題本：每次都重新讀，這樣同時開好幾個頁面也不會互相蓋掉
  const WRONG = 'kr-wrong-v1';
  const wrong = {
    all: () => new Set(store.get(WRONG, [])),
    mark(key, isWrong) { const w = wrong.all(); if (isWrong) w.add(key); else w.delete(key); store.set(WRONG, [...w]); },
    clear() { store.set(WRONG, []); },
  };

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // 題庫：data/index.json（tools/build-index.mjs 產生）和各單元檔
  const dataUrl = file => 'data/' + file.split('/').map(encodeURIComponent).join('/');
  const getJSON = (url, opt) => fetch(url, opt).then(r => { if (!r.ok) throw Error(url); return r.json(); });
  const loadIndex = () => getJSON('data/index.json', { cache: 'no-cache' });
  const units = new Map();
  const loadUnitFile = file => {
    if (!units.has(file)) { const p = getJSON(dataUrl(file)); units.set(file, p); p.catch(() => units.delete(file)); }
    return units.get(file);
  };

  return { store, wrong, esc, dataUrl, loadIndex, loadUnitFile };
})();
