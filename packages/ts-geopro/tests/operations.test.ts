import { describe, test, expect, it } from 'vitest';
import { deg2rad, Frame, Transform, compose, Point } from '../src';

describe('Operations', () => {
  test('Compose two opposite transformations should return the identity', () => {
    const t1 = Transform.rotationX(deg2rad(45));
    const t2 = Transform.rotationX(deg2rad(-45));
    const t3 = compose(t1, t2);

    expect(t3.isIdentity).toBe(true);
  });

  test('Compose two opposite frames should return the identity', () => {
    const p = Point.from(0, 0, 0);
    const f1 = Frame.rotationX(p, deg2rad(45));
    const f2 = Frame.rotationX(p, deg2rad(-45));
    const f3 = compose(f1, f2).toTransform();

    expect(f3.isIdentity).toBe(true);
  });
});
