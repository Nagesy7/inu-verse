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
  arcade:   { name: 'Inu Arcade',    w: 1, h: 1, price: 150, color: '#6c5ce7', layer: 'obj' },
};
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
