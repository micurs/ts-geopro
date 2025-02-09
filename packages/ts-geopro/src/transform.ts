import { mat4, vec3, type ReadonlyMat4 } from 'gl-matrix';
import { Point } from './point.ts';
import { UnitVector } from './unit-vector.ts';
import { Vector } from './vector.ts';
import { Rotation } from './rotation.ts';
import type { AffineGeoMatrix, Col, GeoMatrix, InvertibleGroMatrix, Row } from './types.ts';

export class Transform implements GeoMatrix, InvertibleGroMatrix {
  _direct: mat4;
  _inverse: mat4;
  _isIdentity: boolean = true;

  private constructor() {
    this._direct = mat4.create();
    this._inverse = mat4.create();
    mat4.invert(this._inverse, this._direct);
    this._isIdentity = true;
  }

  //#region Basic accessors

  direct(row: Row, col: Col): number {
    return this._direct[4 * row + col]!;
  }

  inverse(row: Row, col: Col): number {
    return this._inverse[4 * row + col]!;
  }

  get directMatrix(): mat4 {
    return this._direct;
  }
  get inverseMatrix() {
    return this._inverse;
  }

  // get values(): IterableIterator<number> {
  //   return this._direct.values();
  // }

  // get inverseValues(): IterableIterator<number> {
  //   return this._inverse.values();
  // }

  // static get bufferSize(): number {
  //   return 16 * 4;
  // }
  //#endregion

  //#region Static builders

  /**
   * Create an identity transformation
   * @returns a new identity transformation
   */
  static identity() {
    const t = new Transform();
    return t;
  }

  static fromRotation(rot: Rotation) {
    const t = new Transform();
    mat4.fromQuat(t._direct, rot.quat);
    mat4.invert(t._inverse, t._direct);
    t._isIdentity = false;
    return t;
  }

  static fromMat4(direct: mat4) {
    const t = new Transform();
    const inverse = mat4.create();
    mat4.invert(inverse, direct);
    t._direct = mat4.clone(direct);
    t._inverse = mat4.clone(inverse);
    t._isIdentity = false;
    return t;
  }

  /* c8 ignore start */
  static lookAt(eye: Point, target: Point, up: UnitVector) {
    const t = new Transform();
    mat4.lookAt(t._direct, eye.vec3(), target.vec3(), up.vec3());
    mat4.invert(t._inverse, t._direct);
    t._isIdentity = false;
    return t;
  }
  /* c8 ignore stop */

  /* c8 ignore start */
  // static perspective(fovy: number, aspect: number, near: number, far: number) {
  //   const t = new Transform();
  //   mat4.perspective(t._direct, fovy, aspect, near, far);
  //   mat4.invert(t._inverse, t._direct);
  //   t._isIdentity = false;
  //   return t;
  // }
  /* c8 ignore stop */

  static invert(s: Transform): Transform {
    const t = new Transform();
    t._direct = mat4.clone(s._inverse);
    t._inverse = mat4.clone(s._direct);
    t._isIdentity = false;
    return t;
  }

  static fromTranslation(tx: number, ty: number, tz: number) {
    const t = new Transform();
    mat4.translate(t._direct, t._direct, [tx, ty, tz]);
    mat4.invert(t._inverse, t._direct);
    t._isIdentity = false;
    return t;
  }

  static fromMove(mv: Vector) {
    const t = new Transform();
    mat4.translate(t._direct, t._direct, mv.vec3());
    mat4.invert(t._inverse, t._direct);
    t._isIdentity = false;
    return t;
  }

  static fromRotationX(a: number) {
    const t = new Transform();
    mat4.rotateX(t._direct, t._direct, a);
    mat4.invert(t._inverse, t._direct);
    t._isIdentity = false;
    return t;
  }

  static fromRotationY(a: number) {
    const t = new Transform();
    mat4.rotateY(t._direct, t._direct, a);
    mat4.invert(t._inverse, t._direct);
    t._isIdentity = false;
    return t;
  }

  static fromRotationZ(a: number) {
    const t = new Transform();
    mat4.rotateZ(t._direct, t._direct, a);
    mat4.invert(t._inverse, t._direct);
    t._isIdentity = false;
    return t;
  }

  static fromScale(tx: number, ty: number, tz: number) {
    const t = new Transform();
    mat4.scale(t._direct, t._direct, [tx, ty, tz]);
    mat4.invert(t._inverse, t._direct);
    t._isIdentity = false;
    return t;
  }

  /**
   * Create a transform that represents a rotation and then a
   * translation transformation, in that order
   * @param rot - the rotation
   * @param mv - the translation
   */
  static fromRotoTranslation(rot: Rotation, mv: Vector) {
    const t = new Transform();
    mat4.fromRotationTranslation(t._direct, rot.quat, mv.vec3());
    mat4.invert(t._inverse, t._direct);
    t._isIdentity = false;
    return t;
  }

  /**
   * Create a transform that represents a rotation and then a
   * translation and a final scale transformation, in that order
   * @param rot - the rotation
   * @param mv - the translation
   * @param scale - the scale
   * @returns a full transformation that represents the rotation, translation and scale
   */
  static fromRotOTranslationScale(rot: Rotation, mv: Vector, scale: Vector) {
    const t = new Transform();
    mat4.fromRotationTranslationScale(t._direct, rot.quat, mv.vec3(), scale.vec3());
    mat4.invert(t._inverse, t._direct);
    t._isIdentity = false;
    return t;
  }

  static fromMatrices(inverse: ReadonlyMat4, direct: ReadonlyMat4) {
    const f = new Transform();
    f._direct = mat4.clone(direct);
    f._inverse = mat4.clone(inverse);
    return f;
  }
  //#endregion

  /**
   * Need to work on this
   */
  /*
  static fromRotation(angle: number, axes: Ray): Transform {
    const t = new Transform();

    const transToOrigin = mat4.create();
    const rot = quat.create();
    const rotMat = mat4.create();
    const transToPoint = mat4.create();

    mat4.fromTranslation(transToPoint, axes.o.vec3());
    mat4.invert(transToOrigin, transToPoint);
    quat.setAxisAngle(rot, axes.d.vec3(), angle);

    mat4.fromQuat(rotMat, rot);

    // The full transformation is: transBack · rotM · transTo
    mat4.multiply(t._direct, transToPoint, rotMat);
    mat4.multiply(t._direct, t._direct, transToOrigin);

    mat4.invert(t._inverse, t._direct);
    t._isIdentity = false;
    return t;
  }
  */

  isFrame() {
    return false;
  }

  buffer(): ArrayBuffer {
    return new Float32Array(this._direct.values());
  }

  inverseBuffer(): ArrayBuffer {
    return new Float32Array(this._inverse.values());
  }

  /**
   * Applies the transformation to a point
   * @param p - the point to transform
   */
  apply<T extends { map: (t: Transform) => T }>(v: T): T {
    return v.map(this);
  }

  /**
   * Builds and returns the composition of t with this transformation
   * That is: resM = t.M · this.M
   * @param t - the transformation to compose with
   */
  compose(trans: AffineGeoMatrix): AffineGeoMatrix {
    const { directMatrix: dm1, inverseMatrix: im1 } = this;
    const { directMatrix: dm2, inverseMatrix: im2 } = trans;
    const direct = mat4.create();
    const inverse = mat4.create();
    mat4.multiply(direct, dm2, dm1);
    mat4.multiply(inverse, im1, im2);
    return Transform.fromMatrices(inverse, direct) as AffineGeoMatrix;
  }

  transpose() {
    const t = new Transform();
    mat4.transpose(t._direct, this._direct);
    mat4.invert(t._inverse, t._direct);
    t._isIdentity = false;
    return t;
  }

  // translation(x: number, y: number, z: number) {
  //   const t = Transform.fromTranslation(x, y, z);
  //   return this.compose(t);
  // }

  // rotationX(a: number) {
  //   const t = Transform.fromRotationX(a);
  //   return this.compose(t);
  // }

  // rotationY(a: number) {
  //   const t = Transform.fromRotationY(a);
  //   return this.compose(t);
  // }

  // rotationZ(a: number) {
  //   const t = Transform.fromRotationZ(a);
  //   return this.compose(t);
  // }

  // scale(tx: number, ty: number, tz: number) {
  //   const t = Transform.fromScale(tx, ty, tz);
  //   return this.compose(t);
  // }

  invert() {
    const t = new Transform();
    t._direct = mat4.clone(this._inverse);
    t._inverse = mat4.clone(this._direct);
    t._isIdentity = this._isIdentity;
    return t;
  }

  get isIdentity() {
    return this._isIdentity || mat4.equals(this._direct, this._inverse);
  }

  get scaleVector(): Vector {
    const t = vec3.create();
    mat4.getScaling(t, this._direct);
    return Vector.fromValues(t[0], t[1], t[2]);
  }

  /**
   * Return the translation part of the transformation
   */
  get positionVector(): Vector {
    const t = vec3.create();
    mat4.getTranslation(t, this._direct);
    return Vector.fromValues(t[0], t[1], t[2]);
  }
}
