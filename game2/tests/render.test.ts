import { describe, expect, it } from '@jest/globals';
import * as THREE from 'three';
import { buildHero, poseHero } from '../src/render/heroMesh';
import { buildTerrain } from '../src/render/terrainMesh';
import { buildTreeShadows, buildTrees, treeShape } from '../src/render/treeMesh';
import { CHUNK, TREE_SHAPES } from '../src/world/constants';
import { generateWorld } from '../src/world/world';

const triangles = (o: THREE.Object3D) => {
  let n = 0;
  o.traverse((m) => {
    if (m instanceof THREE.Mesh) n += (m.geometry.getAttribute('position').count / 3) * (m instanceof THREE.InstancedMesh ? m.count : 1);
  });
  return n;
};

describe('world meshes', () => {
  const world = generateWorld(1234);

  it('splits terrain and trees into chunks small enough to skip off screen', () => {
    const terrain = buildTerrain(world);
    const trees = buildTrees(world);
    expect(triangles(terrain)).toBeGreaterThan(world.size * world.size);
    const chunks = (world.size / CHUNK) ** 2;
    expect(terrain.children.length).toBeGreaterThanOrEqual(chunks);
    // The camera sees about four chunks at once; their trees and ground stay well within a phone's budget.
    const perChunk = (triangles(terrain) + triangles(trees)) / chunks;
    expect(perChunk * 4).toBeLessThan(250_000);
    for (const mesh of trees.children) expect((mesh as THREE.InstancedMesh).boundingSphere!.radius).toBeLessThan(CHUNK * 1.2);
    expect(buildTreeShadows(world).count).toBe(world.trees.length);
  });

  it('draws every tree shape with a trunk and leaves, deterministically', () => {
    for (let s = 0; s < TREE_SHAPES; s++) {
      const shape = treeShape(s);
      expect(shape.size).toBeGreaterThan(80);
      expect([...shape.values()].some((c) => c === 0x6b4a2f)).toBe(true);
      expect(treeShape(s)).toEqual(shape);
    }
  });

  it('swings the hero rig while walking and stands straight when still', () => {
    const rig = buildHero();
    poseHero(rig, Math.PI / 2, true);
    expect(rig.legL.rotation.x).toBeCloseTo(-rig.legR.rotation.x);
    expect(Math.abs(rig.legL.rotation.x)).toBeGreaterThan(0.5);
    poseHero(rig, 1, false);
    expect(rig.legL.rotation.x).toBe(0);
  });
});
