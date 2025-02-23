import { describe, test, expect } from 'vitest';
import { deg2rad, Frame, Transform, compose, map, Point, Vector, add, Rotation } from '../src';
import { absolute, relative } from '../src/operations.ts';

describe('Operations', () => {
  test('Compose two opposite transformations should return the identity', () => {
    const t1 = Transform.fromRotationX(deg2rad(45));
    const t2 = Transform.fromRotationX(deg2rad(-45));
    const t3 = compose(t1, t2);

    expect(t3.isIdentity).toBe(true);
  });

  test('Compose two opposite frames should return the identity', () => {
    const move = Vector.from(0, 0, 0);
    const rot1 = Rotation.rotationX(deg2rad(45));
    const rot2 = Rotation.rotationX(deg2rad(-45));

    const f1 = Frame.from(Transform.fromRotoTranslation(rot1, move));
    const f2 = Frame.from(Transform.fromRotoTranslation(rot2, move));

    // const f1 = Frame.fromRotationX(p, deg2rad(45));
    // const f2 = Frame.fromRotationX(p, deg2rad(-45));
    const f3 = compose(f1, f2);

    expect(f3.isWorld).toBe(true);
  });

  test('Map a point with a transformation ', () => {
    const p = Point.from(10, 20, 15);
    const t = Transform.fromTranslation(10, 10, 10);
    const p1 = map(t)(p);
    expect(p1.x).toBe(20);
    expect(p1.y).toBe(30);
    expect(p1.z).toBe(25);
  });

  test('Add a vector to a point', () => {
    const p = Point.from(10, 20, 15);
    const v = Vector.from(10, 20, 15);
    const p1 = add(p, v);
    expect(p1.x).toBe(20);
    expect(p1.y).toBe(40);
    expect(p1.z).toBe(30);
  });

  test('get the Absolute and Relative coordinates of a relative point', () => {
    const o = Point.from(10, 20, 15);
    const z = Vector.from(0, 0, 1);
    const x = Vector.from(1, 0, 0);
    const frame = Frame.from2Vectors(o, z, x);

    const absPoint: Point = absolute(frame)(Point.from(1, 1, 1));
    expect(absPoint.x).toBe(11);
    expect(absPoint.y).toBe(21);
    expect(absPoint.z).toBe(16);

    const relPoint: Point = relative(frame)(absPoint);
    expect(relPoint.x).toBe(1);
    expect(relPoint.y).toBe(1);
    expect(relPoint.z).toBe(1);
  });
});
