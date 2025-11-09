
import { describe, it, expect } from 'vitest';
import { mat4 } from 'gl-matrix';

import { Point, Projection, Transform, Vector } from '../src';

describe('Projection', () => {
  it('should create an orthographic projection', () => {
    const proj = Projection.orthographic(-1, 1, -1, 1, 0.1, 100);
    const p = Point.from(0, 0, -1);
    const projected = proj.apply(p);
    expect(projected.x).toBeCloseTo(0);
    expect(projected.y).toBeCloseTo(0);
    expect(projected.z).toBeCloseTo(-0.98198, 4);
  });

  it('should create a perspective projection', () => {
    const proj = Projection.perspective(Math.PI / 4, 1, 0.1, 100);
    const p = Point.from(0, 0, -1);
    const projected = proj.apply(p);
    expect(projected.x).toBeCloseTo(0);
    expect(projected.y).toBeCloseTo(0);
    expect(projected.z).toBeCloseTo(0.8018, 4);
  });

  it('should invert the projection', () => {
    const proj = Projection.perspective(Math.PI / 4, 1, 0.1, 100);
    const inverted = proj.invert();
    const p = Point.from(0, 0, -1);
    const projected = proj.apply(p);
    const unprojected = inverted.apply(projected);
    expect(unprojected.x).toBeCloseTo(p.x);
    expect(unprojected.y).toBeCloseTo(p.y);
    expect(unprojected.z).toBeCloseTo(p.z);
  });

  it('should compose with a transform', () => {
    const proj = Projection.perspective(Math.PI / 4, 1, 0.1, 100);
    const transform = Transform.fromTranslation(1, 0, 0);
    const composed = proj.compose(transform);
    const p = Point.from(0, 0, -1);
    const projected = composed.apply(p);
    expect(projected.x).toBeCloseTo(1);
    expect(projected.y).toBeCloseTo(0);
    expect(projected.z).toBeCloseTo(0.8018, 4);
  });

  it('should not be a frame', () => {
    const proj = Projection.perspective(Math.PI / 4, 1, 0.1, 100);
    expect(proj.isFrame()).toBe(false);
  });

  it('should return NaN sentinel when homogenization fails', () => {
    const proj = Projection.perspective(Math.PI / 2, 1, 0.1, 10);
    const basePoint = Point.from(0, 0, -1);

    const malformedPoint = {
      absolute: basePoint.absolute.bind(basePoint),
      relative: basePoint.relative.bind(basePoint),
      unMap: basePoint.unMap.bind(basePoint),
      map: (t: Parameters<Point['map']>[0]) => {
        const mapped = basePoint.map(t);
        (mapped as unknown as { _coord: Float32Array })._coord[3] = 0;
        return mapped;
      },
    } satisfies Parameters<Projection['apply']>[0];

    const projected = proj.apply(malformedPoint);
    expect(Number.isNaN(projected.x)).toBe(true);
    expect(Number.isNaN(projected.y)).toBe(true);
    expect(Number.isNaN(projected.z)).toBe(true);
  });

  it('should skip homogenization for non-point entities', () => {
    const proj = Projection.perspective(Math.PI / 4, 1, 0.1, 100);
    const vector = Vector.from(1, 2, 3);

    const projectedVector = proj.apply(vector);
    const expected = vector.map(proj);

    expect(projectedVector).toBeInstanceOf(Vector);
    expect(projectedVector.coordinates).toEqual(expected.coordinates);
  });

  it('compose should match sequential application with a transform', () => {
    const proj = Projection.perspective(Math.PI / 3, 16 / 9, 0.1, 250);
    const transform = Transform.fromTranslation(1, -2, 3);
    const point = Point.from(0.25, -0.75, -4);

    const composed = proj.compose(transform).apply(point);
    const sequential = proj.apply(point).map(transform);

    expect(composed.x).toBeCloseTo(sequential.x, 5);
    expect(composed.y).toBeCloseTo(sequential.y, 5);
    expect(composed.z).toBeCloseTo(sequential.z, 5);
  });

  it('toTransform should preserve the projection matrix', () => {
    const proj = Projection.perspective(Math.PI / 3, 4 / 3, 0.5, 500);
    const transform = proj.toTransform();

    expect(mat4.equals(transform.directMatrix, proj.directMatrix)).toBe(true);

    const point = Point.from(0.5, -0.25, -2);
    const projectedPoint = proj.apply(point);
    const transformedPoint = point.map(transform);

    expect(transformedPoint.x).toBeCloseTo(projectedPoint.x, 5);
    expect(transformedPoint.y).toBeCloseTo(projectedPoint.y, 5);
    expect(transformedPoint.z).toBeCloseTo(projectedPoint.z, 5);
  });
});
