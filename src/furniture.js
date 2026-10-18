export const ROOM_W = 10, ROOM_H = 7;
export const FURNITURE = {
  bed:      { name: 'Cosy Bed',      w: 2, h: 3, price: 120, color: '#7aa7e0', layer: 'obj' },
  sofa:     { name: 'Plush Sofa',    w: 3, h: 1, price: 90,  color: '#e07a8c', layer: 'obj' },
  table:    { name: 'Low Table',     w: 2, h: 2, price: 60,  color: '#b9824f', layer: 'obj' },
  chair:    { name: 'Cushion Chair', w: 1, h: 1, price: 25,  color: '#f2b84b', layer: 'obj' },
  lamp:     { name: 'Paper Lamp',    w: 1, h: 1, price: 30,  color: '#ffe7a3', layer: 'obj' },
  plant:    { name: 'Potted Plant',  w: 1, h: 1, price: 20,  color: '#5fb36a', layer: 'obj' },
  rug:      { name: 'Round Rug',     w: 3, h: 2, price: 45,  color: '#c78ad8', layer: 'floor' },
  tv:       { name: 'Retro TV',      w: 2, h: 1, price: 110, color: '#4a4f5c', layer: 'obj' },
  kennel:   { name: 'Kennel',        w: 2, h: 2, price: 80,  color: '#c0623b', layer: 'obj' },
  shelf:    { name: 'Bookshelf',     w: 2, h: 1, price: 70,  color: '#8a5a34', layer: 'obj' },
  bowl:     { name: 'Food Bowl',     w: 1, h: 1, price: 15,  color: '#e05a4f', layer: 'obj' },
  gold_throne: { name: 'Golden Throne', w: 1, h: 1, price: 250, color: '#e3b341', layer: 'obj', mall: true },
  gold_statue: { name: 'Mini Shiba Statue', w: 1, h: 1, price: 190, color: '#d4a640', layer: 'obj', mall: true },
  gold_lamp:   { name: 'Gilded Lamp', w: 1, h: 1, price: 75, color: '#f2cc68', layer: 'obj', mall: true },
  // Golden Den Furniture stock (mall, $KIBBLE): drawn with the shared furniture art kinds in gold / luxe colours
  gold_bed:     { name: 'Gilded Four-Poster Bed', w: 2, h: 3, price: 300, color: '#e3b341', layer: 'obj', mall: true, draw: 'bed' },
  gold_sofa:    { name: 'Golden Velvet Sofa', w: 3, h: 1, price: 240, color: '#c9a23a', layer: 'obj', mall: true, draw: 'sofa' },
  gold_table:   { name: 'Gold Leaf Dining Table', w: 2, h: 2, price: 180, color: '#f2cc68', layer: 'obj', mall: true, draw: 'table' },
  gold_rug:     { name: 'Royal Bone Rug', w: 3, h: 2, price: 120, color: '#b8323a', layer: 'floor', mall: true, draw: 'rug' },
  gold_art:     { name: 'Golden Paw Portrait', w: 1, h: 1, price: 110, color: '#d4a640', layer: 'obj', mall: true, draw: 'art' },
  gold_plant:   { name: 'Gilded Bonsai', w: 1, h: 1, price: 90, color: '#e3b341', layer: 'obj', mall: true, draw: 'plant' },
  gold_pupbed:  { name: 'Gold Silk Pup Cushion', w: 1, h: 1, price: 140, color: '#f2cc68', layer: 'obj', mall: true, draw: 'pupbed' },
  arcade:   { name: 'Inu Arcade',    w: 1, h: 1, price: 150, color: '#6c5ce7', layer: 'obj' },
};
// Furniture stores (outer district). store 'cosy' = Cosy Corner (Bones), 'royal' = Maison Royale ($KIBBLE, 2% split).
// draw: which base drawing to use; set: themed collection; cat: shelf section.
export const FURN_STORES = { cosy: { name: 'Cosy Corner', currency: 'bones', sets: ['cosy', 'modern'] }, royal: { name: 'Maison Royale', currency: 'kibble', sets: ['royal', 'deco'] } };
export const FURN_CATS = ['beds', 'sofas', 'tables', 'lamps', 'rugs', 'wall art', 'plants', 'kitchen', 'baby & pup'];
const SET_ITEMS = [ // [set, cat, draw, name, w, h, color, layer]
  ['cosy', 'beds', 'bed', 'Patchwork Bed', 2, 3, '#e8a06a'], ['cosy', 'sofas', 'sofa', 'Knitted Loveseat', 2, 1, '#c97a5a'], ['cosy', 'tables', 'table', 'Farmhouse Table', 2, 2, '#a8744a'], ['cosy', 'lamps', 'lamp', 'Candle Lamp', 1, 1, '#ffd08a'],
  ['cosy', 'rugs', 'rug', 'Braided Rug', 3, 2, '#d89a6a', 'floor'], ['cosy', 'wall art', 'art', 'Sunflower Print', 1, 1, '#f2c84b'], ['cosy', 'plants', 'plant', 'Fern Basket', 1, 1, '#6cbf4a'], ['cosy', 'kitchen', 'stove', 'Cast-Iron Stove', 2, 1, '#4a4f5c'],
  ['cosy', 'baby & pup', 'crib', 'Wicker Pup Crib', 2, 2, '#e8c890'], ['cosy', 'baby & pup', 'pupbed', 'Plaid Pup Bed', 1, 1, '#c8323c'],
  ['modern', 'beds', 'bed', 'Low Platform Bed', 2, 3, '#9aa8b8'], ['modern', 'sofas', 'sofa', 'Grey Sectional', 3, 1, '#7a8090'], ['modern', 'tables', 'table', 'Glass Coffee Table', 2, 2, '#bfe6ff'], ['modern', 'lamps', 'lamp', 'Arc Lamp', 1, 1, '#f4f4f4'],
  ['modern', 'rugs', 'rug', 'Geo Rug', 3, 2, '#5ab0b8', 'floor'], ['modern', 'wall art', 'art', 'Abstract Canvas', 1, 1, '#ff6a8a'], ['modern', 'plants', 'plant', 'Snake Plant', 1, 1, '#3f8a5a'], ['modern', 'kitchen', 'stove', 'Induction Island', 2, 1, '#e8e8ee'],
  ['modern', 'baby & pup', 'crib', 'Bubble Crib', 2, 2, '#bfe6ff'],
  ['royal', 'beds', 'bed', 'Canopy Royal Bed', 2, 3, '#7a2a6a'], ['royal', 'sofas', 'sofa', 'Velvet Chaise', 3, 1, '#5a1a6a'], ['royal', 'tables', 'table', 'Gilded Banquet Table', 2, 2, '#e3b341'], ['royal', 'lamps', 'lamp', 'Crystal Chandelier', 1, 1, '#fff1b0'],
  ['royal', 'rugs', 'rug', 'Persian Throne Rug', 3, 2, '#a8323a', 'floor'], ['royal', 'wall art', 'art', 'Portrait of President Inu', 1, 1, '#c9a23a'], ['royal', 'plants', 'plant', 'Gold-Pot Orchid', 1, 1, '#d88ad8'], ['royal', 'kitchen', 'stove', 'Marble Chef Range', 2, 1, '#f2efe8'],
  ['royal', 'baby & pup', 'crib', 'Royal Pup Cradle', 2, 2, '#e3b341'],
  ['deco', 'sofas', 'sofa', 'Emerald Deco Sofa', 3, 1, '#1f6a4a'], ['deco', 'lamps', 'lamp', 'Fan Sconce Lamp', 1, 1, '#ffd86a'], ['deco', 'wall art', 'art', 'Sunburst Mirror', 1, 1, '#e3b341'], ['deco', 'tables', 'table', 'Onyx Side Table', 2, 2, '#2a2440'],
  ['deco', 'baby & pup', 'pupbed', 'Velvet Pup Pouf', 1, 1, '#1f6a4a'],
];
const PRICE = { beds: [140, 90000], sofas: [110, 70000], tables: [70, 50000], lamps: [35, 25000], rugs: [55, 35000], 'wall art': [40, 30000], plants: [25, 15000], kitchen: [160, 100000], 'baby & pup': [90, 60000] };
for (const [set, cat, draw, name, w, h, color, layer] of SET_ITEMS) { const store = FURN_STORES.cosy.sets.includes(set) ? 'cosy' : 'royal', id = (set + '_' + name).toLowerCase().replace(/[^a-z0-9]+/g, '_');
  FURNITURE[id] = { name, w, h, color, layer: layer || 'obj', draw, set, cat, store, ...(store === 'cosy' ? { price: PRICE[cat][0] } : { price: Math.round(PRICE[cat][0] * 2), kibble: PRICE[cat][1] }) }; }
export const storeItems = (store) => Object.entries(FURNITURE).filter(([, d]) => d.store === store);
export const WALLS = [
  { name: 'Plain Cream', price: 0, color: '#f3e6cf', trim: '#d8c3a0' },
  { name: 'Wood Panel', price: 80, color: '#c79a6b', trim: '#9c7148' },
  { name: 'Sakura Paper', price: 150, color: '#f6d3dc', trim: '#e3a3b5' },
  { name: 'Mint Tiles', price: 200, color: '#cdebdc', trim: '#8fc7ab' },
];
export const FLOORS = [
  { name: 'Pine Boards', price: 0, color: '#e2b98a', line: '#c9996a' },
  { name: 'Tatami', price: 80, color: '#cfd59a', line: '#aab36f' },
  { name: 'Checker', price: 150, color: '#f1efe9', line: '#cfc9bd' },
  { name: 'Teal Carpet', price: 220, color: '#7fbfbf', line: '#69a8a8' },
];

export function footprint(id, rot) {
  const d = FURNITURE[id];
  return rot % 2 ? { w: d.h, h: d.w } : { w: d.w, h: d.h };
}

export function canPlace(home, id, x, y, rot, ignoreUid = null) {
  const d = FURNITURE[id];
  if (!d) return false;
  const f = footprint(id, rot);
  if (x < 0 || y < 0 || x + f.w > ROOM_W || y + f.h > ROOM_H) return false;
  for (const it of home.items) {
    if (it.uid === ignoreUid) continue;
    if (FURNITURE[it.id].layer !== d.layer) continue;
    const g = footprint(it.id, it.rot);
    if (x < it.x + g.w && x + f.w > it.x && y < it.y + g.h && y + f.h > it.y) return false;
  }
  return true;
}

export function itemAt(home, cx, cy) {
  // prefer object layer over rugs, last placed first
  const hits = home.items.filter((it) => {
    const g = footprint(it.id, it.rot);
    return cx >= it.x && cx < it.x + g.w && cy >= it.y && cy < it.y + g.h;
  });
  hits.sort((a, b) => (FURNITURE[a.id].layer === 'obj' ? -1 : 1) - (FURNITURE[b.id].layer === 'obj' ? -1 : 1));
  return hits[0] || null;
}
