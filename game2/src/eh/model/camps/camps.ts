// The tiles a bandit camp stands on, from EvenHold's model/camps/camps.ts (camps come later; the
// ground cover keeps off them already).
export const campTiles = (camp: { x: number; z: number }): Array<{ x: number; z: number }> =>
  Array.from({ length: 25 }, (_, i) => ({ x: camp.x + (i % 5) - 2, z: camp.z + Math.floor(i / 5) - 2 }));
