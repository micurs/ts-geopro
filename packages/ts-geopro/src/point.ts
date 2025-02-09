import { vec3, vec4 } from "gl-matrix";
import { Vector } from "./vector.ts";
import { Frame } from "./frame.ts";
import { Transform } from './transform.ts';
import { UnitVector } from './unit-vector.ts';

import type { GeoMatrix, HomogeneousCoords, VecEntries } from './types.ts';
import { isUnitVector, isVec4, isVector } from './operations.ts';

export class Point implements HomogeneousCoords {
  private _coord: vec4;

  private constructor() {
    this._coord = vec4.fromValues(0, 0, 0, 1);
  }

  //#region Static builders

  static origin(): Point {
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
  static from(v: Vector | UnitVector): Point;
  static from(x: number, y: number, z: number, w?: number): Point;
  static from(x: number | vec4 | Vector | UnitVector, y?: number, z?: number): Point {
    if (isVec4(x)) {
      return Point.fromVec4(x);
    } else if (isVector(x) || isUnitVector(x)) {
      return Point.fromVector(x);
    }
    return Point.fromValues(x, y!, z!);
  }

  static fromValues(x: number, y: number, z: number): Point {
    const p = new Point();
    p._coord = vec4.fromValues(x, y, z, 1.0);
    return p;
  }

  static fromVector(v: Vector | UnitVector): Point {
    const p = new Point();
    p._coord = vec4.fromValues(v.x, v.y, v.z, 1.0);
    return p;
  }

  static fromVec4(v: vec4): Point {
    const p = new Point();
    const w = v[3] !== 0 ? v[3] : 1.0;
    p._coord = vec4.fromValues(v[0] / w, v[1] / w, v[2] / w, 1.0);
    return p;
  }

  static fromVec3(v: vec3): Point {
    const p = new Point();
    p._coord = vec4.fromValues(v[0], v[1], v[2], 1.0);
    return p;
  }

  //#endregion Static builders

  toString(): string {
    return `Point: [${this.x}, ${this.y}, ${this.z}]`;
  }

  /**
   * Transform a point via a transformation or a reference frame
   * When t is a Transform map apply the direct transformation to the point and return the result.
   * When t is a Frame mapping a point means compute the point relative to the given Frame
   * @param t - transformation or reference frame
   * @returns a new Point
   */
  map(t: GeoMatrix): Point {
    const p = new Point();
    vec4.transformMat4(p._coord, this._coord, t.directMatrix);
    return p;
  }

  /**
   * unMap() execute the inverse transformation from the given t.
   * If t is a Transformation this use the inverse transform to produce a new Point
   * if t is a Frame this create a new version of the given point in world coordinate as it was relative to the frame
   * @param t - Transform or Frame
   * @returns a new Point
   */
  unMap(t: Transform | Frame): Point {
    const p = new Point();
    vec4.transformMat4(p._coord, this._coord, t.inverseMatrix);
    return p;
  }

  relative(f: Frame): Point {
    return this.unMap(f);
  }

  /**
   * Assume this point is relative to the given frame and return the absolute point in world coordinate
   * @param f - the reference frame
   * @returns a new Point in world coordinate
   */
  absolute(f: Frame): Point {
    return this.map(f);
  }

  static relative(p: Point, f: Frame): Point {
    return p.unMap(f);
  }

  static absolute(p: Point, f: Frame): Point {
    return p.map(f);
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

  isPoint(): boolean {
    return true;
  }

  get x(): number {
    return this._coord[0];
  }
  get y(): number {
    return this._coord[1];
  }
  get z(): number {
    return this._coord[2];
  }

  get coordinates(): VecEntries {
    return [...this._coord.values()] as VecEntries;
  }

  get triplet(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  vec3(): Readonly<vec3> {
    return vec3.fromValues(this.x, this.y, this.z);
  }

  vec4(): Readonly<vec4> {
    return vec4.fromValues(this.x, this.y, this.z, 1.0);
  }

  static get Float32Size(): number {
    return 4 * 4;
  }

  get asFloat32Array(): ArrayBuffer {
    return new Float32Array(this.coordinates);
  }
}