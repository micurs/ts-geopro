import { mat4 } from 'gl-matrix';

import type { AffineGeoMatrix, GeoEntity, GeoMatrix, InvertibleGroMatrix, Row, Col } from './types.ts';
import { Point } from './geo-entities/point.ts';
import { Transform } from './transform.ts';

/**
 * Represents a projection transformation in 3D space.
 * This class can be used to create orthographic and perspective projections.
 */
export class Projection implements GeoMatrix, InvertibleGroMatrix {
  _direct: mat4;
  _inverse: mat4;

  private constructor() {
    this._direct = mat4.create();
    this._inverse = mat4.create();
  }

  /**
   * Creates an orthographic projection matrix.
   * @param left - The coordinate for the left vertical clipping plane.
   * @param right - The coordinate for the right vertical clipping plane.
   * @param bottom - The coordinate for the bottom horizontal clipping plane.
   * @param top - The coordinate for the top horizontal clipping plane.
   * @param near - The coordinate for the near clipping plane.
   * @param far - The coordinate for the far clipping plane.
   * @returns A new Projection object.
   */
  static orthographic(left: number, right: number, bottom: number, top: number, near: number, far: number): Projection {
    const p = new Projection();
    mat4.ortho(p._direct, left, right, bottom, top, near, far);
    mat4.invert(p._inverse, p._direct);
    return p;
  }

  /**
   * Creates a perspective projection matrix.
   * @param fovy - The vertical field of view in radians.
   * @param aspect - The aspect ratio of the viewport.
   * @param near - The coordinate for the near clipping plane.
   * @param far - The coordinate for the far clipping plane.
   * @returns A new Projection object.
   */
  static perspective(fovy: number, aspect: number, near: number, far: number): Projection {
    const p = new Projection();
    mat4.perspective(p._direct, fovy, aspect, near, far);
    mat4.invert(p._inverse, p._direct);
    return p;
  }

  isFrame(): boolean {
    return false;
  }

  /**
   * Applies the projection to a geometric entity.
   * @param v - The geometric entity to transform.
   * @returns The transformed geometric entity.
   */
  apply<T>(v: GeoEntity<T>): T {
    const transformed = v.map(this);
    console.log('transformed', transformed);
    if (transformed instanceof Point) {
      if (transformed.w === 0) {
        return Point.from(NaN, NaN, NaN, NaN) as T;
      }
      const result = Point.from(
        transformed.x / transformed.w,
        transformed.y / transformed.w,
        transformed.z / transformed.w,
        1
      ) as T;
      console.log('result', result);
      return result;
    }
    return transformed;
  }

  direct(row: Row, col: Col): number {
    return this._direct[4 * row + col]!;
  }

  inverse(row: Row, col: Col): number {
    return this._inverse[4 * row + col]!;
  }

  get directMatrix(): mat4 {
    return this._direct;
  }

  get inverseMatrix(): mat4 {
    return this._inverse;
  }

  compose(trans: AffineGeoMatrix): AffineGeoMatrix {
    const { directMatrix: dm1, inverseMatrix: im1 } = this;
    const { directMatrix: dm2, inverseMatrix: im2 } = trans;
    const direct = mat4.create();
    const inverse = mat4.create();
    mat4.multiply(direct, dm2, dm1);
    mat4.multiply(inverse, im1, im2);
    const p = new Projection();
    p._direct = direct;
    p._inverse = inverse;
    return p;
  }

  invert(): Projection {
    const p = new Projection();
    p._direct = mat4.clone(this._inverse);
    p._inverse = mat4.clone(this._direct);
    return p;
  }

  toTransform(): Transform {
    return Transform.fromMat4(this._direct);
  }
}
