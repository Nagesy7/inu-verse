// Pre-made decorated NPC homes to visit
export const NPC_INTERIORS = {
  h1: { wall: 2, floor: 1, roof: '#e58fa8', items: [[ 'bed', 0, 0, 0 ], [ 'rug', 3, 3, 0 ], [ 'table', 4, 3, 0 ], [ 'plant', 9, 0, 0 ], [ 'lamp', 2, 0, 0 ], [ 'bowl', 8, 6, 0 ], [ 'kennel', 8, 3, 0 ], [ 'shelf', 5, 0, 0 ]] },
  h2: { wall: 1, floor: 3, roof: '#4b5a7a', items: [[ 'tv', 4, 0, 0 ], [ 'sofa', 3, 3, 0 ], [ 'arcade', 0, 0, 0 ], [ 'arcade', 1, 0, 0 ], [ 'lamp', 7, 0, 0 ], [ 'rug', 3, 4, 0 ], [ 'bed', 7, 5, 1 ], [ 'plant', 0, 6, 0 ]] },
  h3: { wall: 3, floor: 2, roof: '#69b67a', items: [[ 'plant', 0, 0, 0 ], [ 'plant', 9, 0, 0 ], [ 'plant', 0, 6, 0 ], [ 'plant', 9, 6, 0 ], [ 'table', 4, 2, 0 ], [ 'chair', 3, 2, 0 ], [ 'chair', 6, 3, 0 ], [ 'rug', 3, 4, 0 ], [ 'shelf', 2, 0, 0 ], [ 'shelf', 6, 0, 0 ]] },
  h4: { wall: 0, floor: 0, roof: '#d6a24a', items: [[ 'kennel', 0, 0, 0 ], [ 'bowl', 2, 0, 0 ], [ 'bowl', 3, 0, 0 ], [ 'sofa', 5, 5, 0 ], [ 'tv', 5, 0, 0 ], [ 'lamp', 9, 0, 0 ], [ 'rug', 5, 2, 0 ], [ 'bed', 0, 4, 1 ]] },
};
export function npcHome(id) {
  const h = NPC_INTERIORS[id];
  return { wall: h.wall, floor: h.floor, roof: h.roof, items: h.items.map(([id, x, y, rot], i) => ({ uid: 1000 + i, id, x, y, rot })) };
}
