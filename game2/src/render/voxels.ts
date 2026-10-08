// Shared voxel geometry building: quads with baked face shading into position/color arrays.
import * as THREE from 'three';
import { SHADE } from './palette';

export class QuadBuilder {
  positions: number[] = [];
  colors: number[] = [];
  private c = new THREE.Color();

  /** A quad from four corners (counter-clockwise seen from outside) with one flat color. */
  quad(a: number[], b: number[], c: number[], d: number[], color: number, shade: number) {
    this.c.setHex(color).multiplyScalar(shade);
    for (const p of [a, b, c, a, c, d]) {
      this.positions.push(p[0], p[1], p[2]);
      this.colors.push(this.c.r, this.c.g, this.c.b);
    }
  }

  top(x0: number, z0: number, x1: number, z1: number, y: number, color: number) {
    this.quad([x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0], color, SHADE.top);
  }

  /** The +x face of a column between y0 and y1, spanning z0..z1 at x. */
  sideX(x: number, z0: number, z1: number, y0: number, y1: number, color: number) {
    this.quad([x, y0, z1], [x, y0, z0], [x, y1, z0], [x, y1, z1], color, SHADE.x);
  }

  /** The +z face of a column between y0 and y1, spanning x0..x1 at z. */
  sideZ(z: number, x0: number, x1: number, y0: number, y1: number, color: number) {
    this.quad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], color, SHADE.z);
  }

  geometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    g.computeBoundingSphere();
    return g;
  }
}

export const vertexColored = () => new THREE.MeshBasicMaterial({ vertexColors: true });
