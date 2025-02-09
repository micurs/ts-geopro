import { vec3, vec4 } from "gl-matrix";
import { Transform } from "./transform.ts";
import { Frame } from "./frame.ts";
import { Point } from "./point.ts";
import { isUnitVector, isVec3, isVec4 } from './operations.ts';

import type { Addable, HomogeneousCoords, VecEntries } from './types.ts';
import { UnitVector } from './unit-vector.ts';

export class Vector implements HomogeneousCoords, Addable {
  private _coord: vec4;

  private constructor() {
    this._coord = vec4.fromValues(0, 0, 0, 0);
  }

  get isVector(): boolean {
    return true;
  }

  //#region Static builders

  /**
   * Build a Vector from a Point, a vec4 or vec3, or from three numbers
   * @param x - a Point, vec3, vec4 or a number
   * @param y - a y component
   * @param z - a z component
   */
  static from(x: Point): Vector;
  static from(x: vec4): Vector;
  static from(x: vec3): Vector;
  static from(x: UnitVector): Vector;
  static from(x: number, y: number, z: number): Vector;
  static from(x: number | vec4 | vec3 | Point | UnitVector, y?: number, z?: number): Vector {
    if (isUnitVector(x)) {
      return Vector.from(x.x, x.y, x.z);
    }
    if (isVec3(x)) {
      return Vector.fromVec3(x);
    } else if (isVec4(x)) {
      return Vector.fromVec4(x);
    } else if (x instanceof Point) {
      return Vector.fromPoint(x);
    }
    return Vector.fromValues(x, y!, z!);
  }

  static fromValues(x: number, y: number, z: number): Vector {
    const v = new Vector();
    v._coord = vec4.fromValues(x, y, z, 0.0);
    return v;
  }

  static fromVec4(v: vec4): Vector {
    const p = new Vector();
    const w = v[3] !== 0 ? v[3] : 1.0;
    p._coord = vec4.fromValues(v[0] / w, v[1] / w, v[2] / w, 0.0);
    return p;
  }

  static fromVec3(v: vec3): Vector {
    const p = new Vector();
    p._coord = vec4.fromValues(v[0], v[1], v[2], 0.0);
    return p;
  }

  static fromUnitAndLength(u: UnitVector, l: number): Vector {
    const v = new Vector();
    vec4.scale(v._coord, u.vec4(), l);
    return v;
  }

  /**
   * Compute a vector as a difference between two points p1 - p2
   * @param p1
   * @param p2
   * @returns
   */
  static fromPoints(p1: Point, p2: Point): Vector {
    const v = new Vector();
    vec4.subtract(v._coord, p1.vec4(), p2.vec4());
    return v;
  }

  static fromPoint(p: Point): Vector {
    const v = new Vector();
    v._coord = [...p.triplet, 0.0];
    return v;
  }

  /**
   * Returns a new Vector computed as the cross-product
   * of the two vector passed as parameter: u' = u1 x u2
   * @param v1 - a first unit-vector
   * @param v2 - a second unit-vector
   */
  static crossProduct = (v1: Vector, v2: Vector): Vector => {
    const res = vec3.create();
    vec3.cross(res, v1.vec3(), v2.vec3());
    return Vector.fromVec3(res);
  };

  static dot = (v1: Vector, v2: Vector): number => {
    return vec3.dot(v1.vec3(), v2.vec3());
  };

  //#endregion Static builders

  toString(): string {
    return `Vector: [${this.x}, ${this.y}, ${this.z}]`;
  }

  map(t: Transform | Frame): Vector {
    const p = new Vector();
    vec4.transformMat4(p._coord, this._coord, t.directMatrix);
    return p;
  }

  unMap(t: Transform | Frame): Vector {
    const p = new Vector();
    vec4.transformMat4(p._coord, this._coord, t.inverseMatrix);
    return p;
  }

  relative(f: Frame): Vector {
    return this.map(f);
  }

  absolute(f: Frame): Vector {
    return this.unMap(f);
  }

  /**
   * Return a new vector by multiplying this one by a scalar
   * @param s - the multiplier
   */
  scale = (s: number): Vector => {
    const v = new Vector();
    vec4.scale(v._coord, this._coord, s);
    return v;
  };

  /**
   * Compute the dot product of this vector with another vector
   * @param v - the other vector
   * @returns a scalar
   */
  dot = (v: Vector): number => {
    return vec3.dot(this.vec3(), v.vec3());
  };

  /**
   * Compute the cross product of this vector with another vector
   * @param v2 - the other vector
   * @returns
   */
  crossProduct = (v2: Vector): Vector => {
    const res = vec3.create();
    vec3.cross(res, this.vec3(), v2.vec3());
    return Vector.fromVec3(res);
  };

  /**
   * Add two vectors
   * @param v - the other vector
   * @returns this vector plus the other vector
   */
  add = (v: Vector): Vector => {
    const res = new Vector();
    vec4.add(res._coord, this._coord, v._coord);
    return res;
  };

  /**
   * Component-wise multiplication
   * @param v
   */
  multiply = (v: Vector): Vector => {
    const res = new Vector();
    vec4.multiply(res._coord, this._coord, v._coord);
    return res;
  };

  get isUnitVector(): boolean {
    return false;
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

  /**
   * Get components as a triplet of numbers
   */
  get triplet(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  /**
   * Get the homogenous 4 components vector coordinates
   */
  get coordinates(): VecEntries {
    return [...this._coord.values()] as VecEntries;
  }

  get length(): number {
    const x = this._coord[0];
    const y = this._coord[1];
    const z = this._coord[2];
    return Math.sqrt(x * x + y * y + z * z);
  }

  get lengthSquare(): number {
    const x = this._coord[0];
    const y = this._coord[1];
    const z = this._coord[2];
    return x * x + y * y + z * z;
  }

  vec3(): Readonly<vec3> {
    return vec3.fromValues(this.x, this.y, this.z);
  }

  vec4(): Readonly<vec4> {
    return vec4.fromValues(this.x, this.y, this.z, 0.0);
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