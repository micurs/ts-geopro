import { Frame } from './frame.ts';
import { Point } from './point.ts';
import { UnitVector } from './unit-vector.ts';
import { Vector } from './vector.ts';

export class Ray {
  private _origin: Point;
  private _direction: UnitVector;

  private constructor() {
    this._origin = Point.from(0, 0, 0);
    this._direction = UnitVector.fromValues(1, 0, 0);
  }

  //#region Static builders

  static fromPoints(o: Point, d: Point): Ray {
    const r = new Ray();
    r._origin = o;
    r._direction = UnitVector.fromVector(Vector.fromPoints(d, o));
    return r;
  }

  static fromPointAndVector(o: Point, d: Vector): Ray {
    const r = new Ray();
    r._origin = o;
    r._direction = UnitVector.fromVector(d);
    return r;
  }

  //#endregion Static builders

  get o(): Point {
    return this._origin;
  }

  get d(): UnitVector {
    return this._direction;
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
}
