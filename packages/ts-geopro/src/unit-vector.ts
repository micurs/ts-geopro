import { vec3, vec4 } from 'gl-matrix';
import { Vector } from './vector.ts';
import { Transform } from './transform.ts';
import { Frame } from './frame.ts';
import { Point } from './point.ts';

import type { Addable, HomogeneousCoords, VecEntries } from './types.ts';
import { isVector } from './operations.ts';

export class UnitVector implements HomogeneousCoords, Addable {
  private _coord: vec4;

  private constructor() {
    this._coord = vec4.fromValues(1.0, 1.0, 1.0, 0.0);
  }

  //#region Static builders

  static from(x: Vector): UnitVector;
  static from(x: number, y: number, z: number): UnitVector;
  static from(x: number | Vector, y?: number, z?: number): UnitVector {
    if (isVector(x)) {
      return UnitVector.fromVector(x);
    }
    return UnitVector.fromValues(x, y!, z!);
  }

  static fromVector(v: Vector): UnitVector {
    const uv = new UnitVector();
    uv._coord = vec4.fromValues(v.x, v.y, v.z, 0);
    vec4.normalize(uv._coord, uv._coord);
    return uv;
  }

  static fromPoints(p1: Point, p2: Point): UnitVector {
    const uv = new UnitVector();
    uv._coord = vec4.fromValues(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z, 0);
    vec4.normalize(uv._coord, uv._coord);
    return uv;
  }

  static fromPoint(p: Point): UnitVector {
    const uv = UnitVector.fromValues(...p.triplet);
    return uv;
  }

  static fromValues(x: number, y: number, z: number): UnitVector {
    const v = vec4.fromValues(x, y, z, 0);
    vec4.normalize(v, v);
    return UnitVector.fromVec4(v);
  }

  /**
   * Returns a new UnitVector computed as the cross-product
   * of the two unit-vector passed as parameter: u' = u1 x u2
   * @param v1 - a first unit-vector
   * @param v2 - a second unit-vector
   */
  static crossProduct = (v1: UnitVector | Vector, v2: UnitVector | Vector): UnitVector => {
    const res = vec3.create();
    vec3.cross(res, v1.vec3(), v2.vec3());
    return UnitVector.fromVec3(res);
  };

  static fromVec4(v: vec4): UnitVector {
    const p = new UnitVector();
    const w = v[3] !== 0 ? v[3] : 1.0;
    p._coord = vec4.fromValues(v[0] / w, v[1] / w, v[2] / w, 0.0);
    vec4.normalize(p._coord, p._coord);
    return p;
  }

  static fromVec3(v: vec3): UnitVector {
    const p = new UnitVector();
    p._coord = vec4.fromValues(v[0], v[1], v[2], 0.0);
    vec4.normalize(p._coord, p._coord);
    return p;
  }

  //#endregion Static builders

  toString(): string {
    return `UnitVector: [${this.x}, ${this.y}, ${this.z}]`;
  }

  map(t: Transform | Frame): UnitVector {
    const p = new UnitVector();
    vec4.transformMat4(p._coord, this._coord, t.directMatrix);
    vec4.normalize(p._coord, p._coord);
    return p;
  }

  unMap(t: Transform | Frame): UnitVector {
    const p = new UnitVector();
    vec4.transformMat4(p._coord, this._coord, t.inverseMatrix);
    vec4.normalize(p._coord, p._coord);
    return p;
  }

  relative(f: Frame): UnitVector {
    return this.map(f);
  }

  absolute(f: Frame): UnitVector {
    return this.unMap(f);
  }

  invert(): UnitVector {
    const p = new UnitVector();
    vec4.negate(p._coord, this._coord);
    return p;
  }

  dot = (v: UnitVector): number => {
    return vec3.dot(this.vec3(), v.vec3());
  };

  /**
   * return tru if the object is a UnitVector
   */
  isUnitVector(): boolean {
    return true;
  }

  /**
   * Get component along the X axis
   */
  get x(): number {
    return this._coord[0];
  }

  /**
   * Get component along the Y axis
   */
  get y(): number {
    return this._coord[1];
  }

  /**
   * Get component along the Z axis
   */
  get z(): number {
    return this._coord[2];
  }

  get length(): number {
    return 1.0;
  }

  get coordinates(): VecEntries {
    return [...this._coord.values()] as VecEntries;
  }

  get triplet(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  crossProduct(v2: UnitVector | Vector): Vector {
    const v = Vector.fromVec3(this.triplet);
    return v.crossProduct(v2 as Vector);
  }

  /**
   * Add two vectors
   * @param v - the other vector
   * @returns this vector plus the other vector
   */
  add = (v: UnitVector): UnitVector => {
    const _coord: vec4 = vec4.create();
    vec4.add(_coord, this._coord, v._coord);
    return UnitVector.fromVec4(_coord);
  };

  vec3(): Readonly<vec3> {
    return vec3.fromValues(this.x, this.y, this.z);
  }

  vec4(): Readonly<vec4> {
    return this._coord;
  }

  /* v8 ignore next 3 */
  static get Float32Size(): number {
    return 4 * 4;
  }

  /* v8 ignore next 3 */
  get asFloat32Array(): ArrayBuffer {
    return new Float32Array(this.coordinates);
  }
}
