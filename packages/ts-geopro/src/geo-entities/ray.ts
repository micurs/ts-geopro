import { Frame } from './frame.ts';
import { Point } from './point.ts';
import type { GeoEntity, GeoMatrix } from '../types.ts';
import { UnitVector } from './unit-vector.ts';
import { Vector } from './vector.ts';

export class Ray implements GeoEntity<Ray> {
  protected _origin: Point;
  protected _direction: UnitVector;

  protected constructor() {
    this._origin = Point.from(0, 0, 0);
    this._direction = UnitVector.fromValues(1, 0, 0);
  }

  //#region Static builders

  static from(o: Point, d: Vector | UnitVector): Ray {
    return Ray.fromPointAndVector(o, d);
  }

  static fromPoints(o: Point, d: Point): Ray {
    const r = new Ray();
    r._origin = o;
    r._direction = UnitVector.fromPoints(d, o);
    return r;
  }

  static fromPointAndVector(o: Point, d: Vector | UnitVector): Ray {
    const r = new Ray();
    r._origin = o;
    r._direction = UnitVector.from(d);
    return r;
  }

  //#endregion Static builders

  //#region GeoEntity implementation

  map(t: GeoMatrix): Ray {
    const to = this.o.map(t);
    const tv = this.d.map(t);
    return Ray.fromPointAndVector(to, tv);
  }

  unMap(t: GeoMatrix): Ray {
    const to = this.o.unMap(t);
    const tv = this.d.unMap(t);
    return Ray.fromPointAndVector(to, tv);
  }

  /**
   * Convert the Ray relative to the given frame to a frame in world coordinate
   * @param f
   */
  relative(f: Frame): Ray {
    const rw = new Ray();
    rw._origin = this._origin.relative(f);
    rw._direction = this._direction.relative(f);
    return rw;
  }

  /**
   * Convert the Ray relative to the given frame to a frame in world coordinate
   * @param f
   */
  absolute(f: Frame): Ray {
    const rw = new Ray();
    rw._origin = this._origin.absolute(f);
    rw._direction = this._direction.absolute(f);
    return rw;
  }

  //#endregion GeoEntity implementation

  //#region Simple Getters

  get o(): Point {
    return this._origin;
  }

  get d(): UnitVector {
    return this._direction;
  }

  //#endregion Simple Getters

  /**
   * Compute the point at a given distance along the ray
   * @param t - the distance along the ray
   * @returns the point at distance t along the ray
   */
  on(...ts: number[]): Point[] {
    return ts.map((t) => this._origin.add(this._direction.toVector().scale(t)));
  }

  pointOn(t: number): Point {
    return this._origin.add(this._direction.toVector().scale(t));
  }

  /**
   * Project a point onto the ray.
   * This is the point on the ray that is closest to the given point.
   * @param p - any point in space
   * @returns a new point on the ray that is closest to the given point
   */
  project(p: Point): Point {
    const v1 = Vector.fromPoints(p, this._origin);
    const v2 = this._direction.toVector();
    const t = Vector.dot(v1, v2);
    return this._origin.add(v2.scale(t));
  }

  /**
   * Compute the pair of points that are closest to each other on two rays.
   * The result is independent of whether the rays are infinite lines or
   * actually limited to the positive half‑line.  In the current library the
   * `Ray` type is treated as an infinite line, so the formula below works for
   * skew, parallel and intersecting cases.
   *
   * @param other The other ray.
   * @returns a pair of parameters [s,t] such that this.pointOn(s) and other.pointOn(t)
   * are the closest points on the two rays.
   */
  minDistancePoints(other: Ray): [number, number] {
    const p1 = this.o;
    const d1 = this.d; // UnitVector
    const p2 = other.o;
    const d2 = other.d;

    // Vector between origins
    const w0 = p1.subtract(p2); // Vector

    const crossUV = d1.crossProduct(d2); // UnitVector (norm 1)
    const sinTheta = crossUV.length; // |u × v|, sin(theta)

    const EPS = 1e-10;

    if (Math.abs(sinTheta) < EPS) {
      const pOnOther = other.project(p1);
      // Parallel (or almost) – use projection of p1 onto line L2
      // const t = e; // d2 · w0
      return [0, pOnOther.subtract(other.o).length];
    }

    const b = d1.dot(d2); // d1 · d2  (both unit → |b| ≤ 1)
    const d = d1.dot(w0); // d1 · w0
    const e = d2.dot(w0); // d2 · w0
    const denomSq = sinTheta * sinTheta;

    const s = (-d + b * e) / denomSq;
    const t = (e - b * d) / denomSq;

    return [s, t];
  }
}

// A Plane is represented as a Ray where
//   o = a point on the plane
//   d = the plane normal (a UnitVector)
export class Plane extends Ray {
  protected constructor() {
    super();
  }

  static override from(o: Point, d: Vector | UnitVector): Plane {
    const plane = new Plane();
    plane._origin = o;
    plane._direction = UnitVector.from(d);
    return plane;
  }

  /**
   * Intersect the plane defined by this ray (origin is on the plane, direction is the plane normal)
   * with another ray (the “parameter line”).
   *
   * The plane equation is: n · (p − p0) = 0
   * with n = this.d (a UnitVector) and p0 = this.o.
   * The parametric line is: L(t) = line.o + t * line.d.
   *
   * Solving for t gives:
   *   t = - n · (line.o - p0) / (n · line.d)
   *
   * @param line - the ray whose parameter line is to be intersected
   * @returns the scalar parameter `t` such that `line.on(t)` lies on the plane.
   *          If the line is parallel to the plane, the function returns `NaN`.
   */
  intersectWith = (line: Line): number => {
    const n = this.d; // UnitVector – plane normal
    const p0 = this.o; // Point on the plane

    const l0 = line.o; // Origin of the parameter line
    const dl = line.d; // Direction of the parameter line

    // Compute dot products
    const denom = n.dot(dl); // n · dl
    if (denom === 0) {
      // Parallel – either no intersection or the line lies in the plane.
      // Returning NaN follows the requirement of a numeric result.
      return NaN;
    }

    const numer = n.dot(l0.subtract(p0)); // n · (l0 - p0)
    const t = -numer / denom;
    return t;
  };
}

// A Line is represented as a Ray where
//   o = a point on the line
//   d = the line direction (a UnitVector)
export class Line extends Ray {
  protected constructor() {
    super();
  }

  static override from(o: Point, d: Vector | UnitVector): Line {
    const line = new Line();
    line._origin = o;
    line._direction = UnitVector.from(d);
    return line;
  }
}
