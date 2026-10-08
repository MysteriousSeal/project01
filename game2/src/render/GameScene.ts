// The world on screen, drawn the way EvenHold's GameView draws it: its camera, lights, chunked
// world layers (terrain, water, trees, bushes, ground cover), its stylizer (cel bands, haze and
// valley mist) and its post-processing (light shafts, bloom). The hero walks through it.
import type { ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';
import { TILE_HEIGHT } from '../eh/model/constants';
import { GameModel } from '../eh/model/GameModel';
import type { MapSize } from '../eh/model/map/grid';
import { generateWorld } from '../eh/model/worldgen/world';
import { CAMERA_OFFSET, CAMERA_Y_SMOOTHING, FOG_COLOR } from '../eh/view/constants';
import { buildBushes } from '../eh/view/meshes/bush/bushMesh';
import { buildGroundCover } from '../eh/view/meshes/cover/groundCoverMesh';
import { buildTerrain } from '../eh/view/meshes/terrain/terrainMesh';
import { buildTrees } from '../eh/view/meshes/tree/treeMesh';
import { buildWater } from '../eh/view/meshes/water/waterMesh';
import { createCamera, resizeCamera } from '../eh/view/render/camera';
import { addLights } from '../eh/view/render/lighting';
import { PostProcessing } from '../eh/view/render/postprocessing';
import { stylize, type Stylizer } from '../eh/view/render/stylize';
import { ChunkStreamer } from '../eh/view/world/chunkStreamer';
import { createHero, type Hero, indexBlockers, type Blockers, type Input, stepHero } from '../sim/hero';
import { createRenderer } from './glRenderer';
import { buildHero, type HeroRig, poseHero } from './heroMesh';

export const WORLD_SIZE: MapSize = { width: 256, depth: 256 };
const MAX_DT = 1 / 20;
type WorldBuilder = (sink: ChunkStreamer, model: GameModel) => ((elapsedSeconds: number) => void) | void;
const BUILDERS: WorldBuilder[] = [buildTerrain, buildWater, buildTrees, buildBushes, buildGroundCover];

export type SceneOptions = { post: boolean };

/**
 * EvenHold's post-processing draws into half-float targets; without a GL extension that can
 * render to them the screen would stay black, so such devices draw straight to the screen.
 */
export const canPostProcess = (gl: ExpoWebGLRenderingContext) => {
  try {
    return !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));
  } catch {
    return false;
  }
};

export class GameScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = createCamera();
  private world: ChunkStreamer;
  private animations: ((elapsedSeconds: number) => void)[] = [];
  private stylizer: Stylizer;
  private post: PostProcessing | null;
  private rig: HeroRig;
  private blockers: Blockers;
  private elapsed = 0;
  private cameraY: number;
  readonly model: GameModel;
  hero: Hero;

  constructor(
    private gl: ExpoWebGLRenderingContext,
    seed: number,
    options: SceneOptions = { post: canPostProcess(gl) },
  ) {
    const [width, height] = [gl.drawingBufferWidth, gl.drawingBufferHeight];
    this.renderer = createRenderer(gl, FOG_COLOR);
    resizeCamera(this.camera, width, height);
    addLights(this.scene);

    this.model = new GameModel(seed, WORLD_SIZE, generateWorld(seed, WORLD_SIZE));
    this.world = new ChunkStreamer(this.scene);
    for (const build of BUILDERS) {
      const animate = build(this.world, this.model);
      if (animate) this.animations.push(animate);
    }

    this.rig = buildHero();
    this.scene.add(this.rig.root);
    this.blockers = indexBlockers(this.model);
    this.hero = createHero(this.model);
    this.cameraY = this.hero.y;
    this.world.loadAround(this.hero.x, this.hero.z);

    // The stylized look goes on last, over every material (chunks not loaded yet included).
    this.stylizer = stylize(this.scene, this.world.materials());
    this.post = options.post ? new PostProcessing(this.renderer, this.scene, this.camera, { pixelRatio: 1, post: true, bloom: true, shafts: true, msaa: 0, uncapped: false }) : null;
    this.post?.setSize(width, height, 1);
    this.place(0);
  }

  /** Advances the world by `dt` seconds of input and draws a frame. */
  frame(dt: number, input: Input) {
    const step = Math.min(dt, MAX_DT);
    this.elapsed += step;
    this.hero = stepHero(this.hero, this.model, this.blockers, input, step);
    this.world.update(this.hero.x, this.hero.z);
    for (const animate of this.animations) animate(this.elapsed);
    this.place(step);
    if (this.post) this.post.render(this.elapsed);
    else this.renderer.render(this.scene, this.camera);
    this.gl.endFrameEXP();
  }

  /** The hero's rig where the hero is, and the camera following as EvenHold's does. */
  private place(dt: number) {
    const h = this.hero;
    this.rig.root.position.set(h.x, h.y, h.z);
    this.rig.root.rotation.y = h.facing;
    poseHero(this.rig, h.walk, h.moving);
    // The camera eases toward the ground height rather than the hero's, so hops don't bounce the screen.
    const ground = this.model.tiles.height(Math.round(h.x), Math.round(h.z)) * TILE_HEIGHT;
    this.cameraY += (ground - this.cameraY) * (1 - Math.exp(-CAMERA_Y_SMOOTHING * dt));
    this.camera.position.set(h.x + CAMERA_OFFSET.x, this.cameraY + CAMERA_OFFSET.y, h.z + CAMERA_OFFSET.z);
    this.camera.lookAt(h.x, this.cameraY, h.z);
    this.stylizer.setFocusHeight(this.cameraY);
  }

  /** Draw calls and triangles of the last frame (every post pass included). */
  stats() {
    const { calls, triangles } = this.renderer.info.render;
    return { calls, triangles };
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
