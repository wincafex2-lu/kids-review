/* W003-1. Original text-pixel characters. Load people-sprites.js first. */
(function (root) {
  'use strict';
  const data = typeof module === 'object' && module.exports
    ? require('./people-sprites.js') : root.PEOPLE_SPRITES;
  function hashName(name) {
    if (typeof name !== 'string') throw new TypeError('Thread name must be a string');
    let h = 2166136261;
    for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619) >>> 0;
    return h;
  }
  function boss() {
    return Object.freeze({name:'泓',boss:true,body:'male',skin:0,hair:'sidepart',hairColor:1,
      top:'boss',clothesColor:7,bottom:'trousers',bottomColor:0,accessory:'boss'});
  }
  function readableHair(skin, hairColor) {
    // Hair too close to the skin tone blurs into the face; step to the next hair colour.
    const rgb = c => [1,3,5].map(i => parseInt(c.slice(i,i+2),16));
    const a = rgb(data.skinColors[skin][0]);
    for (let k = 0; k < data.hairColors.length; k++) {
      const b = rgb(data.hairColors[hairColor][0]);
      if ((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2 >= 4900) break;
      hairColor = (hairColor + 1) % data.hairColors.length;
    }
    return hairColor;
  }
  function accessoryFor(hair, index) {
    // Headphones over a ponytail read as uneven hair; step to the next accessory.
    if (hair === 'ponytail' && data.layers.accessory[index] === 'headphones') index += 1;
    return data.layers.accessory[index];
  }
  function create(name) {
    const seed = hashName(name);
    if (name === '泓') return boss();
    let n = seed || 0x9e3779b9;
    function pick(count) { n ^= n << 13; n ^= n >>> 17; n ^= n << 5; return (n >>> 0) % count; }
    const body = (seed & 1) ? 'female' : 'male';
    const skin = pick(4);
    const hair = data.layers.hair[pick(4) + (body === 'female' ? 4 : 0)];
    const hairColor = readableHair(skin, pick(6));
    return Object.freeze({name,boss:false,body,skin,hair,hairColor,
      top:data.layers.top[pick(8)],clothesColor:pick(8),bottom:data.layers.bottom[pick(4)],
      bottomColor:pick(4),accessory:accessoryFor(hair, pick(5))});
  }
  function palette(person) {
    const p = Object.assign({}, data.palette);
    [p.S,p.s] = data.skinColors[person.skin];
    [p.H,p.h,p.J] = data.hairColors[person.hairColor];
    [p.C,p.c,p.Q] = data.clothesColors[person.clothesColor];
    [p.P,p.p] = data.bottomColors[person.bottomColor];
    return p;
  }
  function frame(person, action, index) {
    if (!data.actions.includes(action)) throw new RangeError('Unknown action: '+action);
    if (index !== 0 && index !== 1) throw new RangeError('Frame must be 0 or 1');
    const rows = Array.from({length:20}, () => Array(16).fill('.'));
    const stack = [['body',person.body],['bottom',person.bottom],[person.body === 'female' ? 'top-female' : 'top',person.top],
      ['hair',person.hair],['accessory',person.accessory],['prop','action']];
    for (const [layer,kind] of stack) {
      const pixels = data.parts[layer][kind][action][index];
      for(let y=0;y<20;y++) for(let x=0;x<16;x++) if(pixels[y][x] !== '.') rows[y][x]=pixels[y][x];
    }
    return {width:16,height:20,rows:rows.map(r=>r.join('')),palette:palette(person)};
  }
  function draw(context, person, action, index, x, y, scale=1) {
    if (!Number.isInteger(scale) || scale < 1) throw new RangeError('Use a positive integer scale');
    const f = frame(person,action,index);
    for(let py=0;py<20;py++) for(let px=0;px<16;px++) {
      const c=f.rows[py][px];
      if(c!=='.') {context.fillStyle=f.palette[c];context.fillRect(x+px*scale,y+py*scale,scale,scale);}
    }
  }
  const api=Object.freeze({create,boss,hashName,frame,draw,actions:Object.freeze(data.actions.slice()),frameMs:data.frameMs});
  if(typeof module==='object' && module.exports) module.exports=api;
  else root.OFFICE_PEOPLE=api;
})(typeof window==='object' ? window : globalThis);
