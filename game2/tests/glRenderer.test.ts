import { describe, expect, it, jest } from '@jest/globals';

// three's WebGLRenderer is replaced by a probe that records whether three's WebGL 1 guard
// (`context instanceof WebGLRenderingContext`) would have fired at construction time.
const seen: { guardFired: boolean }[] = [];
jest.mock('three', () => ({
  WebGLRenderer: class {
    constructor(opts: { context: object }) {
      const G = (globalThis as { WebGLRenderingContext?: new () => object }).WebGLRenderingContext;
      seen.push({ guardFired: typeof G !== 'undefined' && opts.context instanceof G });
    }
    setPixelRatio() {}
    setSize() {}
    setClearColor() {}
  },
}));

import { createRenderer } from '../src/render/glRenderer';

describe('three on expo-gl', () => {
  // expo-gl: a WebGL 2 context whose class extends the WebGL 1 class.
  function WebGLRenderingContext() {}
  function WebGL2RenderingContext() {}
  Object.setPrototypeOf(WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype);
  const g = globalThis as Record<string, unknown>;

  it('creates the renderer on a WebGL 2 context despite the WebGL 1 guard, then restores it', () => {
    g.WebGLRenderingContext = WebGLRenderingContext;
    g.WebGL2RenderingContext = WebGL2RenderingContext;
    const gl = Object.assign(Object.create(WebGL2RenderingContext.prototype), { drawingBufferWidth: 800, drawingBufferHeight: 400, supportsWebGL2: true });
    expect(gl instanceof (WebGLRenderingContext as unknown as new () => object)).toBe(true);
    createRenderer(gl, 0);
    expect(seen.pop()).toEqual({ guardFired: false });
    expect(g.WebGLRenderingContext).toBe(WebGLRenderingContext);
  });

  it('explains when the device only has WebGL 1', () => {
    const gl = Object.assign(Object.create(WebGLRenderingContext.prototype), { drawingBufferWidth: 800, drawingBufferHeight: 400, supportsWebGL2: false });
    expect(() => createRenderer(gl, 0)).toThrow('does not support WebGL 2');
    expect(g.WebGLRenderingContext).toBe(WebGLRenderingContext);
  });
});
