import { describe, it, expect } from 'vitest';
import { Rotation, UnitVector, Point, Transform } from '../src';
import { map } from '../src/operations.ts';

describe('Rotation', () => {
  it('should create a rotation from an axis and an angle', () => {
    const axis = UnitVector.from(0, 0, 1);
    const angle = Math.PI / 2;
    const rotation = Rotation.fromAxisAngle(axis, angle);
    const transform = Transform.fromRotation(rotation);
    const p = Point.from(1, 0, 0);
    const rotated = map(transform)<Point>(p);
    expect(rotated.x).toBeCloseTo(0);
    expect(rotated.y).toBeCloseTo(1);
    expect(rotated.z).toBeCloseTo(0);
  });
});
