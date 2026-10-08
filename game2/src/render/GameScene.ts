// The world on screen: terrain, trees and the hero, a fixed isometric camera following them
// (EvenHold's pan-and-follow, never orbiting), warm light and a peach haze in the distance.
import type { ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';
import { createHero, type Hero, indexTrees, type Input, stepHero, type TreeIndex } from '../sim/hero';
import type { World } from '../world/world';
import { createRenderer } from './glRenderer';
import { buildHero, type HeroRig, poseHero } from './heroMesh';
import { FOG_FAR, FOG_NEAR, GROUND_BOUNCE, SKY, SKY_LIGHT, SUN } from './palette';
import { buildTerrain } from './terrainMesh';
import { buildTreeShadows, buildTrees } from './treeMesh';

const CAMERA_OFFSET = new THREE.Vector3(14, 18, 14);
const FRUSTUM = 6; // world units visible top to bottom; smaller is closer
const CAMERA_Y_SMOOTHING = 8;
const MAX_DT = 1 / 20;

export class GameScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.OrthographicCamera;
  private rig: HeroRig;
  private trees: TreeIndex;
  private camY: number;
  hero: Hero;

  constructor(private gl: ExpoWebGLRenderingContext, private world: World) {
    this.renderer = createRenderer(gl, SKY);
    const aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
    this.camera = new THREE.OrthographicCamera((-FRUSTUM * aspect) / 2, (FRUSTUM * aspect) / 2, FRUSTUM / 2, -FRUSTUM / 2, 0.1, 80);
    this.scene.fog = new THREE.Fog(SKY, FOG_NEAR, FOG_FAR);
    this.scene.add(new THREE.HemisphereLight(SKY_LIGHT, GROUND_BOUNCE, 1.6));
    const sun = new THREE.DirectionalLight(SUN, 1.8);
    sun.position.set(20, 30, 10);
    this.scene.add(sun);

    this.scene.add(buildTerrain(world));
    this.scene.add(buildTreeShadows(world));
    this.scene.add(buildTrees(world));
    this.rig = buildHero();
    this.scene.add(this.rig.root);

    this.trees = indexTrees(world);
    this.hero = createHero(world);
    this.camY = this.hero.y;
    this.place();
  }

  /** Advances the world by `dt` seconds of input and draws a frame. */
  frame(dt: number, input: Input) {
    this.hero = stepHero(this.hero, this.world, this.trees, input, Math.min(dt, MAX_DT));
    this.camY += (this.hero.y - this.camY) * Math.min(1, CAMERA_Y_SMOOTHING * dt);
    this.place();
    this.renderer.render(this.scene, this.camera);
    this.gl.endFrameEXP();
  }

  private place() {
    const h = this.hero;
    this.rig.root.position.set(h.x, h.y, h.z);
    this.rig.root.rotation.y = h.facing;
    poseHero(this.rig, h.walk, h.moving);
    const target = new THREE.Vector3(h.x, this.camY, h.z);
    this.camera.position.copy(target).add(CAMERA_OFFSET);
    this.camera.lookAt(target);
  }

  dispose() {
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      }
    });
    this.renderer.dispose();
  }
}
