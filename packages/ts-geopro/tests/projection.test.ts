
import { describe, it, expect } from 'vitest';
import { Point, Projection, Transform } from '../src';

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
});
