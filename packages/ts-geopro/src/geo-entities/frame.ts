import { mat4, type ReadonlyMat4 } from 'gl-matrix';
import { UnitVector } from './unit-vector.ts';
import { Vector } from './vector.ts';
import { Point } from './point.ts';
import { Transform } from '../transform.ts';

import type { AffineGeoMatrix, Col, GeoMatrix, MatEntries, Row, GeoEntity } from '../types.ts';
import { isUnitVector } from '../operations.ts';

export class Frame implements GeoMatrix, AffineGeoMatrix, GeoEntity<Frame> {
  _direct: mat4;
  _inverse: mat4;
  _isWorld: boolean = false;

  private constructor() {
    this._direct = mat4.create();
    this._inverse = mat4.create();
    mat4.identity(this._direct);
    mat4.identity(this._inverse);
    this._isWorld = true;
  }

  //#region Static builders

  static world(): Frame {
    const f = new Frame();
    return f;
  }

  /**
   * Build a frame from a transformation
   * @param t - the transformation
   * @returns a Frame representing the given transformation
   */
  static from(t: Transform): Frame {
    const f = new Frame();
    f._direct = t.directMatrix;
    f._inverse = t.inverseMatrix;
    f._isWorld = false;
    return f;
  }

  /**
   * Build a Frame from basic camera parameters such as eye, target and up vector
   * @param eye - the position of the camera and the origin of the frame
   * @param target - the target point to look at and the Z direction of the frame
   * @param up - the up vector of the camera and the Y direction of the frame
   * @returns
   */
  static lookAt(eye: Point, target: Point, up: UnitVector): Frame {
    const k = UnitVector.fromPoints(eye, target);
    const i = UnitVector.crossProduct(up, k);
    const j = UnitVector.crossProduct(k, i);

    return Frame.fromPointAndVectors(eye, i, j, k);
  }

  /**
   * Build a Frame through an origin and 2 independent vector.
   * The first vector will be considered the Z direction
   * The second vector will point in the semi-space of x
   * @param o - origin point
   * @param v1 - a vector indicating the Z of the new frame
   * @param v2 - a vector in the XY plane of the new frame (if you pass the correct x axis it will be preserved)
   */
  static from2Vectors = (o: Point, v1: Vector | UnitVector, v2: Vector | UnitVector): Frame => {
    const k = isUnitVector(v1) ? v1 : UnitVector.fromVector(v1);
    const j = UnitVector.crossProduct(k, isUnitVector(v2) ? v2 : UnitVector.fromVector(v2));
    const i = UnitVector.crossProduct(j, k);

    return Frame.fromPointAndVectors(o, i, j, k);
  };

  /**
   * Builds a frame directly from the origin and the 3 unit vectors
   * @remarks this function does not check if the vectors are orthogonal to each other!
   * @param o - origin point
   * @param i - unit vector for the X axis
   * @param j - unit vector for the Y axis
   * @param k - unit vector for the Z axis
   * @returns a mew Frame.
   */
  static fromPointAndVectors = (o: Point, i: UnitVector, j: UnitVector, k: UnitVector): Frame => {
    const f = new Frame();
    const matValues: MatEntries = [...i.coordinates, ...j.coordinates, ...k.coordinates, ...o.coordinates] as MatEntries;
    matValues[15] = 1;

    f._direct = mat4.fromValues(...matValues);
    mat4.invert(f._inverse, f._direct);
    f._isWorld = false;

    return f;
  };

  static fromMatrices = (inverse: ReadonlyMat4, direct: ReadonlyMat4): Frame => {
    const f = new Frame();
    f._direct = mat4.clone(direct);
    f._inverse = mat4.clone(inverse);
    f._isWorld = false;

    return f;
  };
  //#endregion

  //#region GeoEntity implementation

  /**
   * Compose this frame with another transformation yielding a new frame.
   * @param f - the other transformation to compose with
   * @returns a new Frame
   */
  map(f: GeoMatrix): Frame {
    return this.compose(f) as Frame;
  }

  unMap(f: GeoMatrix): Frame {
    return this.compose(f.invert()) as Frame;
  }

  /**
   * Convert a frame from the global frame to this frame of reference.
   * @param frame - the frame to convert
   * @returns a new frame as defined in the local frame
   */
  relative(frame: Frame): Frame {
    const ro = this.origin.relative(frame);
    const rz = this.k.relative(frame);
    const rx = this.i.relative(frame);
    const rf = Frame.from2Vectors(ro, rz, rx);
    return rf;
  }

  /**
   * Take a frame defined relative to this reference frame
   * and return the same entity defined in the global reference frame.
   * @param frame - the point, vector or frame to convert
   * @returns the same entity defined in the global reference frame
   */
  absolute(frame: Frame): Frame {
    const ro = this.origin.absolute(frame);
    const rz = this.k.absolute(frame);
    const rx = this.i.absolute(frame);
    const rf = Frame.from2Vectors(ro, rz, rx);
    return rf;
  }

  //#endregion GeoEntity implementation

  //#region Simple Getters

  /**
   * Retrieve the matrix used to transform from this frame to
   * the global frame.
   */
  get directMatrix(): ReadonlyMat4 {
    return mat4.clone(this._direct);
  }

  /**
   * Retrieve the matrix used to transform from global frame
   * to this frame
   */
  get inverseMatrix(): ReadonlyMat4 {
    return mat4.clone(this._inverse);
  }

  /**
   * The i vector for this frame
   */
  get i(): UnitVector {
    return UnitVector.fromValues(this._direct[0], this._direct[1], this._direct[2]);
  }

  /**
   * The j vector for this frame
   */
  get j(): UnitVector {
    return UnitVector.fromValues(this._direct[4], this._direct[5], this._direct[6]);
  }

  /**
   * The k vector for this frame
   */
  get k(): UnitVector {
    return UnitVector.fromValues(this._direct[8], this._direct[9], this._direct[10]);
  }

  /**
   * The origin of this frame
   */
  get o(): Point {
    return Point.from(this._direct[12], this._direct[13], this._direct[14], this._direct[15]);
  }

  /**
   * The origin of this frame
   */
  get origin(): Point {
    return Point.from(this._direct[12], this._direct[13], this._direct[14], this._direct[15]);
  }

  /**
   * The size in bytes of a Float32Array to store the matrix values
   */
  static get Float32Size(): number {
    return 16 * 4;
  }

  /**
   * The Float32Array to store the matrix values
   */
  get asFloat32Array(): Float32Array<ArrayBuffer> {
    return new Float32Array(this._direct.values());
  }

  /**
   * The Float32Array to store the matrix values
   */
  get inverseAsFloat32Array(): Float32Array<ArrayBuffer> {
    return new Float32Array(this._inverse.values());
  }

  //#endregion Simple Getters

  /**
   * Builds and returns the composition of t with the
   * transformation represented by this frame.
   * This can be use to transform a frame to another
   * by using simple transformations.
   * That is: resM = t.M · this.M
   * @param t - the transformation to compose with
   */
  compose(t: GeoMatrix): GeoMatrix {
    const { directMatrix: dm1, inverseMatrix: im1 } = this;
    const { directMatrix: dm2, inverseMatrix: im2 } = t;
    const direct = mat4.create();
    const inverse = mat4.create();
    mat4.multiply(direct, dm2, dm1);
    mat4.multiply(inverse, im1, im2);
    return Frame.fromMatrices(inverse, direct) as GeoMatrix;
  }

  toTransform(): Transform {
    return Transform.fromMat4(this._direct);
  }

  isFrame(): boolean {
    return true;
  }

  toString(): string {
    return `Frame: { o: {${this.origin}}, i: {${this.i}}, j: {${this.j}}, k: {${this.k}} }`;
  }

  /**
   * Invert the transformation defined for this frame.
   */
  invert(): Frame {
    const t = new Frame();
    t._direct = mat4.clone(this._inverse);
    t._inverse = mat4.clone(this._direct);
    return t;
  }

  direct(row: Row, col: Col): number {
    return this._direct[4 * row + col]!;
  }

  inverse(row: Row, col: Col): number {
    return this._inverse[4 * row + col]!;
  }

  get isWorld(): boolean {
    return this._isWorld || mat4.equals(this._direct, this._inverse);
  }
}
