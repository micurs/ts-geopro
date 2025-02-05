import { describe, test, expect, it } from 'vitest';
import { deg2rad, Frame, Transform, composeTransformations, composeFrames, map, Point } from '../src';

describe('Operations', () => {
  test('Compose two opposite transformations should return the identity', () => {
    const t1 = Transform.rotationX(deg2rad(45));
    const t2 = Transform.rotationX(deg2rad(-45));
    const t3 = composeTransformations(t1, t2);

    expect(t3.isIdentity).toBe(true);
  });

  test('Compose two opposite frames should return the identity', () => {
    const p = Point.from(0, 0, 0);
    const f1 = Frame.rotationX(p, deg2rad(45));
    const f2 = Frame.rotationX(p, deg2rad(-45));
    const f3 = composeFrames(f1, f2).toTransform();

    expect(f3.isIdentity).toBe(true);
  });

  test('Map a point with a transformation ', () => {
    const p = Point.from(10, 20, 15);
    const t = Transform.translation(10, 20, 30);
    const p1 = map(t)(p);
    expect(p1.x).toBe(20);
    expect(p1.y).toBe(40);
    expect(p1.z).toBe(45);
  });
});
