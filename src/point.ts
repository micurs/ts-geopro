import { vec3, vec4 } from "gl-matrix";
import { Vector } from "./vector.ts";
import { Frame } from "./frame.ts";
import { UnitVector } from './unit-vector.ts';

import type { VecEntries } from "./types.ts";
import type { GeoMap } from "./operations.ts";

const isVec4 = (v: any): v is vec4 => {
  return v.length === 4;
}

export class Point {
  private _coord: vec4;

  private constructor() {
    this._coord = vec4.fromValues(0, 0, 0, 1);
  }

  static get bufferSize(): number {
    return 4 * 4;
  }

  static origin() {
    const p = new Point();
    return p;
  }

  /**
   * A creator function for Point that accepts different types of arguments
   * @param v - a vec4 or a set of 4 numbers
   * @param x,y,z,w - four numbers representing the coordinates of the point
   * @returns a new Point
   */
  static from(v: vec4): Point;
  static from(x: number, y: number, z: number, w: number): Point;
  static from(x: number | vec4, y?: number, z?: number, w = 1.0): Point {
    if (isVec4(x)) {
      return Point.fromVec4(x);
    } else if (typeof y === 'number' && typeof z === 'number') {
      return Point.fromValues(x, y, z);
    }
    throw new Error('Invalid arguments');
  }

  static fromValues(x: number, y: number, z: number): Point {
    const p = new Point();
    p._coord = vec4.fromValues(x, y, z, 1.0);
    return p;
  }

  static fromVector(v: Vector | UnitVector) {
    const p = new Point();
    p._coord = vec4.fromValues(v.x, v.y, v.z, 1.0);
    return p;
  }

  static fromVec4(v: vec4) {
    const p = new Point();
    const w = v[3] !== 0 ? v[3] : 1.0;
    p._coord = vec4.fromValues(v[0] / w, v[1] / w, v[2] / w, 1.0);
    return p;
  }

  static fromVec3(v: vec3) {
    const p = new Point();
    p._coord = vec4.fromValues(v[0], v[1], v[2], 1.0);
    return p;
  }

  toString() {
    return `Point(${this.x}, ${this.y}, ${this.z})`;
  }

  /**
   * Transform a point via a transformation or a reference frame
   * When t is a Transform map apply the direct transformation to the point and return the result.
   * When t is a Frame mapping a point means compute the point relative to the given Frame
   * @param t - transformation or reference frame
   * @returns a new Point
   */
  map(t: GeoMap): Point {
    const p = new Point();
    if (t.isFrame()) {
      vec4.transformMat4(p._coord, this._coord, t.inverseMatrix);
    } else {
      vec4.transformMat4(p._coord, this._coord, t.directMatrix);
    }
    return p;
  }

  /**
   * unMap() execute the inverse transformation from the given t.
   * If t is a Transformation this use the inverse transform to produce a new Point
   * if t is a Frame this create a new version of the given point in world coordinate as it was relative to the frame
   * @param t - Transform or Frame
   * @returns a new Point
   */
  unMap(t: GeoMap): Point {
    const p = new Point();
    if (t.isFrame()) {
      vec4.transformMat4(p._coord, this._coord, t.directMatrix);
    } else {
      vec4.transformMat4(p._coord, this._coord, t.inverseMatrix);
    }
    return p;
  }

  relative(f: Frame): Point {
    return this.map(f);
  }

  /**
   * Assume this point is relative to the given frame and return the absolute point in world coordinate
   * @param f - the reference frame
   * @returns a new Point in world coordinate
   */
  absolute(f: Frame): Point {
    return this.unMap(f);
  }

  static relative(p: Point, f: Frame): Point {
    return p.map(f);
  }

  static absolute(p: Point, f: Frame): Point {
    return p.unMap(f);
  }

  subtract(p: Point): Vector {
    const v = vec4.create();
    vec4.subtract(v, this._coord, p._coord);
    return Vector.fromVec4(v);
  }

  scale(s: number): Point {
    const v = vec3.create();
    vec3.scale(v, this.vec3(), s);
    return Point.fromVec3(v);
  }

  add(v: Vector): Point {
    const p = new Point();
    vec4.add(p._coord, this._coord, v.vec4());
    return p;
  }

  isPoint() {
    return true;
  }

  get x() {
    return this._coord[0];
  }
  get y() {
    return this._coord[1];
  }
  get z() {
    return this._coord[2];
  }

  get coordinates(): VecEntries {
    return [...this._coord.values()] as VecEntries;
  }

  get triplet(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  buffer(): ArrayBuffer {
    return new Float32Array(this.coordinates);
  }

  vec3(): Readonly<vec3> {
    return vec3.fromValues(this.x, this.y, this.z);
  }

  vec4(): Readonly<vec4> {
    return vec4.fromValues(this.x, this.y, this.z, 1.0);
  }
}