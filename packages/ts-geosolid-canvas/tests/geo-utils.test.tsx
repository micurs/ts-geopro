import { describe, expect, test } from 'vitest';
import { compose, Point, Transform } from '@micurs/ts-geopro';
import {
  applyWorldStandard,
  pointInConvexPolygon,
  rotationAround,
  screenToWorldPoint,
  worldToScreenPoint,
} from '../src/canvas/geo-utils.ts';

describe('screenToWorldPoint', () => {
  test('roundtrip world→screen→world with identity', () => {
    const M = Transform.identity();
    const world = Point.from(100, 200, 0);
    const screen = worldToScreenPoint(M, world);
    const result = screenToWorldPoint(M, screen);
    expect(result.x).toBeCloseTo(world.x);
    expect(result.y).toBeCloseTo(world.y);
  });

  test('inverts worldToScreenPoint with translation', () => {
    const M = Transform.fromTranslation(50, 100, 0);
    const screen = worldToScreenPoint(M, Point.from(30, 40, 0));
    const result = screenToWorldPoint(M, screen);
    expect(result.x).toBeCloseTo(30);
    expect(result.y).toBeCloseTo(40);
  });

  test('inverts worldToScreenPoint with rotation', () => {
    const M = compose(Transform.fromTranslation(400, 300, 0), Transform.fromRotationZ(Math.PI / 4));
    const world = Point.from(100, 50, 0);
    const screen = worldToScreenPoint(M, world);
    const result = screenToWorldPoint(M, screen);
    expect(result.x).toBeCloseTo(world.x);
    expect(result.y).toBeCloseTo(world.y);
  });

  test('inverts worldToScreenPoint with scale', () => {
    const M = compose(Transform.fromTranslation(400, 300, 0), Transform.fromScale(2, 2, 1));
    const world = Point.from(100, 50, 0);
    const screen = worldToScreenPoint(M, world);
    const result = screenToWorldPoint(M, screen);
    expect(result.x).toBeCloseTo(world.x);
    expect(result.y).toBeCloseTo(world.y);
  });

  test('returns origin for singular matrix', () => {
    const m = new Float32Array(16);
    m[0] = 0; m[5] = 0; m[10] = 1; m[15] = 1;
    const M = Transform.fromMat4(m);
    const result = screenToWorldPoint(M, Point.from(100, 100, 0));
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });
});

describe('rotationAround', () => {
  test('pivot stays fixed under transposed + Y-negated render', () => {
    const pivot = Point.from(150, 80, 0);
    const angle = Math.PI / 3;
    const baseTx = compose(Transform.fromTranslation(400, 300, 0));
    const R = rotationAround(angle, pivot);
    const M = compose(R, baseTx);
    const screen = worldToScreenPoint(M, pivot);
    const expected = worldToScreenPoint(baseTx, pivot);
    expect(screen.x).toBeCloseTo(expected.x, 4);
    expect(screen.y).toBeCloseTo(expected.y, 4);
  });

  test('point rotated 90° around origin', () => {
    const pivot = Point.origin();
    const M = rotationAround(Math.PI / 2, pivot);
    const p = Point.from(100, 0, 0);
    const result = applyWorldStandard(M, p);
    expect(result.x).toBeCloseTo(0, 5);
    expect(result.y).toBeCloseTo(100, 5);
  });

  test('multiple angles produce consistent round trip', () => {
    const pivot = Point.from(50, 30, 0);
    for (const angle of [0, Math.PI / 4, -Math.PI / 3, 1.7]) {
      const R = rotationAround(angle, pivot);
      const p = Point.from(80, 20, 0);
      const rotated = applyWorldStandard(R, p);
      const Rback = rotationAround(-angle, pivot);
      const back = applyWorldStandard(Rback, rotated);
      expect(back.x).toBeCloseTo(p.x, 5);
      expect(back.y).toBeCloseTo(p.y, 5);
    }
  });
});

describe('applyWorldStandard', () => {
  test('identity returns same point', () => {
    const p = Point.from(50, 100, 0);
    const result = applyWorldStandard(Transform.identity(), p);
    expect(result.x).toBe(p.x);
    expect(result.y).toBe(p.y);
  });

  test('translation moves point', () => {
    const T = Transform.fromTranslation(30, 50, 0);
    const p = Point.from(10, 20, 0);
    const result = applyWorldStandard(T, p);
    expect(result.x).toBeCloseTo(40);
    expect(result.y).toBeCloseTo(70);
  });

  test('rotation around origin', () => {
    const R = Transform.fromRotationZ(Math.PI / 2);
    const p = Point.from(100, 0, 0);
    const result = applyWorldStandard(R, p);
    expect(result.x).toBeCloseTo(0, 5);
    expect(result.y).toBeCloseTo(100, 5);
  });

  test('equals Point.map', () => {
    const T = compose(
      Transform.fromTranslation(100, 200, 0),
      Transform.fromRotationZ(Math.PI / 6),
      Transform.fromScale(2, 3, 1),
    );
    const p = Point.from(15, 25, 0);
    const result = applyWorldStandard(T, p);
    const expected = p.map(T);
    expect(result.x).toBeCloseTo(expected.x, 10);
    expect(result.y).toBeCloseTo(expected.y, 10);
  });
});

describe('pointInConvexPolygon', () => {
  const square = [
    Point.from(0, 0, 0),
    Point.from(100, 0, 0),
    Point.from(100, 100, 0),
    Point.from(0, 100, 0),
  ];

  test('inside', () => {
    expect(pointInConvexPolygon(Point.from(50, 50, 0), square)).toBe(true);
  });

  test('on edge', () => {
    expect(pointInConvexPolygon(Point.from(50, 0, 0), square)).toBe(true);
  });

  test('on vertex', () => {
    expect(pointInConvexPolygon(Point.from(0, 0, 0), square)).toBe(true);
  });

  test('outside left', () => {
    expect(pointInConvexPolygon(Point.from(-10, 50, 0), square)).toBe(false);
  });

  test('outside above', () => {
    expect(pointInConvexPolygon(Point.from(50, -10, 0), square)).toBe(false);
  });

  test('outside diagonally', () => {
    expect(pointInConvexPolygon(Point.from(200, 200, 0), square)).toBe(false);
  });

  test('outside near edge', () => {
    expect(pointInConvexPolygon(Point.from(50, -1, 0), square)).toBe(false);
  });

  test('empty corners', () => {
    expect(pointInConvexPolygon(Point.from(0, 0, 0), [])).toBe(true);
  });

  test('single corner', () => {
    expect(pointInConvexPolygon(Point.from(0, 0, 0), [Point.from(10, 10, 0)])).toBe(true);
  });

  test('two corners (line)', () => {
    const line = [Point.from(0, 0, 0), Point.from(100, 0, 0)];
    expect(pointInConvexPolygon(Point.from(50, 0, 0), line)).toBe(true);
    expect(pointInConvexPolygon(Point.from(50, 10, 0), line)).toBe(false);
  });

  test('triangle: inside', () => {
    const tri = [
      Point.from(0, 0, 0),
      Point.from(100, 0, 0),
      Point.from(50, 100, 0),
    ];
    expect(pointInConvexPolygon(Point.from(50, 50, 0), tri)).toBe(true);
    expect(pointInConvexPolygon(Point.from(0, 50, 0), tri)).toBe(false);
  });
});
