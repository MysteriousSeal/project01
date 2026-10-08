// A small voxel adventurer: hooded, belted tunic, boots. Limbs pivot at the shoulder and hip so
// they can swing as the hero walks.
import * as THREE from 'three';

const C = { skin: 0xf2c49b, hood: 0x2f5d3a, tunic: 0x9b4a32, belt: 0x3a281c, buckle: 0xffd34d, legs: 0x5a4636, boots: 0x2b1d10, eye: 0x1a1a1a };

export type HeroRig = { root: THREE.Group; body: THREE.Group; legL: THREE.Group; legR: THREE.Group; armL: THREE.Group; armR: THREE.Group };

// Standard materials, so EvenHold's stylizer cel-shades and fogs the hero like the world around them.
const mat = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true });
const shadowMaterial = (opacity: number) =>
  new THREE.MeshBasicMaterial({ color: 0x2b1d10, transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });

function box(w: number, h: number, d: number, color: number, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.set(x, y, z);
  return m;
}

function limb(x: number, y: number, parts: THREE.Mesh[]) {
  const g = new THREE.Group();
  g.position.set(x, y, 0);
  for (const p of parts) g.add(p);
  return g;
}

export function buildHero(): HeroRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16).rotateX(-Math.PI / 2), shadowMaterial(0.3));
  shadow.position.y = 0.005;
  root.add(shadow);

  const legL = limb(-0.06, 0.24, [box(0.09, 0.16, 0.1, C.legs, 0, -0.08), box(0.1, 0.07, 0.13, C.boots, 0, -0.205, 0.015)]);
  const legR = limb(0.06, 0.24, [box(0.09, 0.16, 0.1, C.legs, 0, -0.08), box(0.1, 0.07, 0.13, C.boots, 0, -0.205, 0.015)]);
  body.add(legL, legR);

  body.add(box(0.24, 0.22, 0.16, C.tunic, 0, 0.35)); // torso
  body.add(box(0.26, 0.05, 0.17, C.belt, 0, 0.27)); // belt
  body.add(box(0.05, 0.04, 0.02, C.buckle, 0, 0.27, 0.09));
  body.add(box(0.26, 0.06, 0.18, C.tunic, 0, 0.215)); // skirt of the tunic

  const armL = limb(-0.15, 0.44, [box(0.07, 0.17, 0.08, C.tunic, 0, -0.07), box(0.07, 0.05, 0.08, C.skin, 0, -0.18)]);
  const armR = limb(0.15, 0.44, [box(0.07, 0.17, 0.08, C.tunic, 0, -0.07), box(0.07, 0.05, 0.08, C.skin, 0, -0.18)]);
  body.add(armL, armR);

  body.add(box(0.2, 0.18, 0.18, C.skin, 0, 0.56)); // head
  body.add(box(0.03, 0.035, 0.01, C.eye, -0.045, 0.57, 0.093));
  body.add(box(0.03, 0.035, 0.01, C.eye, 0.045, 0.57, 0.093));
  body.add(box(0.23, 0.08, 0.21, C.hood, 0, 0.66)); // hood over the head
  body.add(box(0.23, 0.16, 0.06, C.hood, 0, 0.58, -0.08)); // hood's back
  body.add(box(0.26, 0.05, 0.19, C.hood, 0, 0.47)); // hood's collar
  return { root, body, legL, legR, armL, armR };
}

/** Swings the limbs with the stride, and bobs the body. */
export function poseHero(rig: HeroRig, walk: number, moving: boolean) {
  const swing = moving ? Math.sin(walk) * 0.7 : 0;
  rig.legL.rotation.x = swing;
  rig.legR.rotation.x = -swing;
  rig.armL.rotation.x = -swing * 0.8;
  rig.armR.rotation.x = swing * 0.8;
  rig.body.position.y = moving ? Math.abs(Math.cos(walk)) * 0.025 : 0;
}
