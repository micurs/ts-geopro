import { describe, test, expect } from 'vitest';

import { Point, Ray, UnitVector, Vector, Plane, Line } from '../src/index.ts';

describe('Ray basic operations', () => {
  test('Create a ray from two points', () => {
    const o = Point.fromValues(10, 10, 10);
    const d = Point.fromValues(15, 15, 15);
    const uv = UnitVector.fromValues(5, 5, 5);

    const r = Ray.fromPoints(o, d);
    expect(r.o.x).toBeCloseTo(10);
    expect(r.o.y).toBeCloseTo(10);
    expect(r.o.z).toBeCloseTo(10);
    expect(r.d.x).toBeCloseTo(uv.x);
    expect(r.d.y).toBeCloseTo(uv.y);
    expect(r.d.z).toBeCloseTo(uv.z);
  });

  test('Create a ray from a point and a vector', () => {
    const o = Point.fromValues(10, 10, 10);
    const d = Vector.fromValues(5, 5, 5);
    const uv = UnitVector.fromValues(5, 5, 5);
    const r = Ray.fromPointAndVector(o, d);
    expect(r.o.x).toBeCloseTo(10);
    expect(r.o.y).toBeCloseTo(10);
    expect(r.o.z).toBeCloseTo(10);
    expect(r.d.x).toBeCloseTo(uv.x);
    expect(r.d.y).toBeCloseTo(uv.y);
    expect(r.d.z).toBeCloseTo(uv.z);
  });

  test('Create a ray from a point and a unit vector', () => {
    const o = Point.fromValues(10, 10, 10);
    const uv = UnitVector.fromValues(5, 5, 5);
    const r = Ray.fromPointAndVector(o, Vector.from(uv));
    expect(r.o.x).toBe(10);
    expect(r.o.y).toBe(10);
    expect(r.o.z).toBe(10);
    expect(r.d.x).toBeCloseTo(uv.x);
    expect(r.d.y).toBeCloseTo(uv.y);
    expect(r.d.z).toBeCloseTo(uv.z);
  });
});

describe('Ray.minDistancePoints', () => {
  // helper to compare two points with a tolerance
  const expectPointsClose = (a: Point, b: Point, tolerance = 1e-6) => {
    expect(a.x).toBeCloseTo(b.x, tolerance);
    expect(a.y).toBeCloseTo(b.y, tolerance);
    expect(a.z).toBeCloseTo(b.z, tolerance);
  };

  test('skew lines – returns the pair of closest points', () => {
    // L1 : (0,0,0) + s * (1,0,0)
    const p1 = Point.from(0, 0, 0);
    const d1 = UnitVector.from(1, 0, 0);
    const L1 = Ray.fromPointAndVector(p1, d1);

    // L2 : (0,1,1) + t * (0,1,0)
    const p2 = Point.from(0, 1, 1);
    const d2 = UnitVector.from(0, 1, 0);
    const L2 = Ray.fromPointAndVector(p2, d2);

    const [tOnL1, tOnL2] = L1.minDistancePoints(L2);

    // Expected points calculated analytically:
    //   pointOnL1 = (0,0,0)
    //   pointOnL2 = (0,0,1)
    const expectedL1 = Point.from(0, 0, 0);
    const expectedL2 = Point.from(0, 0, 1);

    const pointOnL1 = L1.pointOn(tOnL1);
    const pointOnL2 = L2.pointOn(tOnL2);
    expectPointsClose(pointOnL1, expectedL1);
    expectPointsClose(pointOnL2, expectedL2);

    // Check the distance matches |(p1 - p2) · (d1 × d2)| / |d1 × d2|
    const cross = Vector.from(d1.crossProduct(d2));
    const denom = cross.length;
    const dist = Math.abs(Vector.fromPoints(p2, p1).dot(cross)) / denom;
    expect(pointOnL1.subtract(pointOnL2).lengthSquare).toBeCloseTo(dist);
  });

  test('parallel lines – returns any pair of closest points', () => {
    // L1 : (0,0,0) + s * (1,0,0)
    const L1 = Ray.fromPointAndVector(Point.from(0, 0, 0), UnitVector.from(1, 0, 0));

    // L2 : (0,1,0) + t * (1,0,0) – parallel to L1, offset by y=1
    const L2 = Ray.fromPointAndVector(Point.from(0, 1, 0), UnitVector.from(1, 0, 0));

    const [tOnL1, tOnL2] = L1.minDistancePoints(L2);

    const pointOnL1 = L1.pointOn(tOnL1);
    const pointOnL2 = L2.pointOn(tOnL2);

    // The minimal distance is 1 in the y‑direction.
    const expectedDistance = 1;
    const actualDistance = pointOnL1.subtract(pointOnL2).length;
    expect(actualDistance).toBeCloseTo(expectedDistance);

    // The x‑coordinate of the returned points must be equal (the lines are parallel along x)
    expect(pointOnL1.x).toBeCloseTo(pointOnL2.x);
  });

  test('intersecting lines – both returned points are the intersection', () => {
    // L1 : (0,0,0) + s * (1,1,0)
    const L1 = Ray.from(Point.from(0, 0, 0), UnitVector.from(1, 1, 0));

    // L2 : (1,0,0) + t * (-1,1,0)
    const L2 = Ray.from(Point.from(1, 0, 0), UnitVector.from(-1, 1, 0));

    const [tOnL1, tOnL2] = L1.minDistancePoints(L2);

    const pointOnL1 = L1.pointOn(tOnL1);
    const pointOnL2 = L2.pointOn(tOnL2);

    // Both points should coincide at the intersection (0.5,0.5,0)
    const expected = Point.from(0.5, 0.5, 0);
    expectPointsClose(pointOnL1, expected);
    expectPointsClose(pointOnL2, expected);

    // The distance between the returned points must be zero
    expect(pointOnL1.subtract(pointOnL2).length).toBeCloseTo(0);
  });
});

describe('Ray.planeIntersectionWithLine', () => {
  test('intersection at a single point', () => {
    // Plane: z = 0 (normal (0,0,1))
    const plane = Plane.from(Point.from(0, 0, 0), UnitVector.from(0, 0, 1));

    // Line: starts at (0,0,5) and goes downward along -z
    const line = Line.from(Point.from(0, 0, 5), Vector.from(0, 0, -1));

    // The intersection parameter v should be 5 (since line.origin + 5 * d = (0,0,0))
    const v = plane.intersectWith(line);
    expect(v).toBeCloseTo(5, 6);

    // Verify that the point obtained from the line matches the plane origin
    const intersection = line.pointOn(v);
    expect(intersection.x).toBeCloseTo(plane.o.x, 6);
    expect(intersection.y).toBeCloseTo(plane.o.y, 6);
    expect(intersection.z).toBeCloseTo(plane.o.z, 6);
  });

  test('line parallel to plane – no intersection', () => {
    // Plane: z = 0
    const plane = Plane.from(Point.from(0, 0, 0), UnitVector.from(0, 0, 1));

    // Line direction parallel to plane (x‑axis), offset in z
    const line = Line.from(Point.from(0, 0, 5), Vector.from(1, 0, 0));

    const v = plane.intersectWith(line);
    // No intersection → NaN
    expect(Number.isNaN(v)).toBeTruthy();
  });

  test('line lies in the plane – infinite intersections', () => {
    // Plane: z = 0
    const plane = Plane.from(Point.from(0, 0, 0), UnitVector.from(0, 0, 1));

    // Line in the plane (starts on the plane, direction parallel to plane)
    const line = Line.from(Point.from(0, 0, 0), Vector.from(1, 0, 0));

    const v = plane.intersectWith(line);
    // Infinite solutions – implementation may return Infinity
    expect(v).toBe(NaN);
  });
});
