import { mat4, type ReadonlyMat4 } from 'gl-matrix';
import { UnitVector } from './unit-vector.ts';
import { Vector } from './vector.ts';
import { Point } from './point.ts';
import { Transform } from './transform.ts';

import type { AffineGeoMatrix, Col, GeoMatrix, InvertibleGroMatrix, MatEntries, Row } from './types.ts';
import { isFrame, isUnitVector } from './operations.ts';

export class Frame implements GeoMatrix, InvertibleGroMatrix {
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

  direct(row: Row, col: Col): number {
    return this._direct[4 * row + col]!;
  }

  inverse(row: Row, col: Col): number {
    return this._inverse[4 * row + col]!;
  }

  get isWorld() {
    return this._isWorld || mat4.equals(this._direct, this._inverse);
  }

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

  //#region Static builders
  static world() {
    const f = new Frame();
    return f;
  }

  /**
   * Build a frame from a transformation
   * @param t - the transformation
   * @returns a Frame representing the given transformation
   */
  static from(t: Transform) {
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
  static lookAt(eye: Point, target: Point, up: UnitVector) {
    const k = UnitVector.fromPoints(target, eye);
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
  static from2Vectors = (o: Point, v1: Vector | UnitVector, v2: Vector | UnitVector) => {
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
  static fromPointAndVectors = (o: Point, i: UnitVector, j: UnitVector, k: UnitVector) => {
    const f = new Frame();
    const matValues: MatEntries = [...i.coordinates, ...j.coordinates, ...k.coordinates, ...o.coordinates] as MatEntries;

    f._direct = mat4.fromValues(...matValues);
    mat4.invert(f._inverse, f._direct);
    f._isWorld = false;

    return f;
  };

  static fromMatrices = (inverse: ReadonlyMat4, direct: ReadonlyMat4) => {
    const f = new Frame();
    f._direct = mat4.clone(direct);
    f._inverse = mat4.clone(inverse);
    f._isWorld = false;

    return f;
  };
  //#endregion

  isFrame() {
    return true;
  }

  toString() {
    return `frame: { o: ${this.origin}, i: ${this.i}, j: ${this.j}, k: ${this.k} }`;
  }

  /**
   * Compose this frame with another transformation yielding a new frame.
   * @param t - the other transformation to compose with
   * @returns a new Frame
   */
  map(t: Frame): Frame {
    return this.compose(t) as Frame;
  }

  /**
   * Builds and returns the composition of t with the
   * transformation represented by this frame.
   * This can be use to transform a frame to another
   * by using simple transformations.
   * That is: resM = t.M · this.M
   * @param t - the transformation to compose with
   */
  compose(t: AffineGeoMatrix): AffineGeoMatrix {
    const { directMatrix: dm1, inverseMatrix: im1 } = this;
    const { directMatrix: dm2, inverseMatrix: im2 } = t;
    const direct = mat4.create();
    const inverse = mat4.create();
    mat4.multiply(direct, dm2, dm1);
    mat4.multiply(inverse, im1, im2);
    return Frame.fromMatrices(inverse, direct) as AffineGeoMatrix;
  }

  toTransform(): Transform {
    return Transform.fromMat4(this._direct);
  }

  /**
   * Invert the transformation defined for this frame.
   */
  invert(): AffineGeoMatrix {
    const t = new Frame();
    t._direct = mat4.clone(this._inverse);
    t._inverse = mat4.clone(this._direct);
    return t;
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
   * Convert a point, vector or frame from the global frame to this frame of reference
   * This allow to get a point from the global frame to the local frame.
   * The new point coordinates represent the input point coordinates in the local frame.
   * @param x - the point, vector or frame to convert
   * @returns a new point, vector or frame as defined in the local frame
   */
  relative(x: Point): Point;
  relative(x: UnitVector): UnitVector;
  relative(x: Vector): Vector;
  relative(x: Frame): Frame;
  relative(x: Point | UnitVector | Vector | Frame): Point | UnitVector | Vector | Frame {
    if (x && isFrame(x)) {
      const ro = this.origin.relative(x);
      const rz = this.k.relative(x);
      const rx = this.i.relative(x);
      const rf = Frame.from2Vectors(ro, rz, rx);
      return rf as any as Frame;
    }
    return x.relative(this);
  }

  /**
   * Take a point relative to this frame and return the point in the global frame.
   * @param x - the point, vector or frame to convert
   * @returns a new point, vector or frame as defined in the global frame
   */
  absolute(x: Point): Point;
  absolute(x: UnitVector): UnitVector;
  absolute(x: Vector): Vector;
  absolute(x: Frame): Frame;
  absolute(x: Point | UnitVector | Vector | Frame): Point | UnitVector | Vector | Frame {
    if (x && isFrame(x)) {
      const ro = this.origin.absolute(x);
      const rz = this.k.absolute(x);
      const rx = this.i.absolute(x);
      const rf = Frame.from2Vectors(ro, rz, rx);
      return rf as any as Frame;
    }
    return x.relative(this);
  }
}
