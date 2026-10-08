// three.js on an expo-gl context. three expects a canvas; this gives it just enough of one.
import type { ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';

/**
 * expo-gl's WebGL 2 context class extends its WebGL 1 one (as the spec says), so three's guard
 * against WebGL 1 (`context instanceof WebGLRenderingContext`) wrongly rejects it. When the context
 * really is WebGL 2, the WebGL 1 class is hidden for the moment three's renderer is created.
 */
function withoutWebGL1Guard<T>(gl: ExpoWebGLRenderingContext, create: () => T): T {
  const g = globalThis as unknown as Record<string, unknown>;
  const WebGL2 = g.WebGL2RenderingContext as (new () => unknown) | undefined;
  const webgl2 = (gl as unknown as { supportsWebGL2?: boolean }).supportsWebGL2 ?? (WebGL2 !== undefined && gl instanceof WebGL2);
  if (!webgl2) throw new Error('This device does not support WebGL 2, which the game needs.');
  const saved = g.WebGLRenderingContext;
  g.WebGLRenderingContext = undefined;
  try {
    return create();
  } finally {
    g.WebGLRenderingContext = saved;
  }
}

export function createRenderer(gl: ExpoWebGLRenderingContext, clearColor: number): THREE.WebGLRenderer {
  const width = gl.drawingBufferWidth;
  const height = gl.drawingBufferHeight;
  const canvas = { width, height, clientWidth: width, clientHeight: height, style: {}, addEventListener: () => {}, removeEventListener: () => {}, getContext: () => gl };
  const renderer = withoutWebGL1Guard(gl, () => new THREE.WebGLRenderer({ canvas: canvas as unknown as HTMLCanvasElement, context: gl as unknown as WebGLRenderingContext, antialias: false }));
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.setClearColor(clearColor);
  return renderer;
}
