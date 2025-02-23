import { Frame } from './frame.ts';
import { Point } from './point.ts';
import type { GeoEntity } from '../types.ts';
import { UnitVector } from './unit-vector.ts';
import { Vector } from './vector.ts';
import { Transform } from '../transform.ts';

export class Ray implements GeoEntity<Ray> {
  private _origin: Point;
  private _direction: UnitVector;

  private constructor() {
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

  map(t: Transform): Ray {
    const to = this.o.map(t);
    const tv = this.d.map(t);
    return Ray.fromPointAndVector(to, tv);
  }

  unMap(t: Transform): Ray {
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
}
