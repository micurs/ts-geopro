import { describe, test, expect, it } from 'vitest';
import { deg2rad, Frame, Transform, compose, map, Point, Vector, add, Rotation } from '../src';

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
});
