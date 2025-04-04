import { describe, test, expect } from 'vitest';
import { vec4, vec3 } from 'gl-matrix';

import { UnitVector, round, Vector, add } from '../src/index.ts';

describe('UnitVector basic operations', () => {
  const precision = 6;

  test('Set a unit-vector with coordinates', () => {
    const vec = UnitVector.fromValues(10, 20, 15);
    const l = Math.sqrt(10 * 10 + 20 * 20 + 15 * 15);
    expect(round(vec.x, precision)).toBe(round(10 / l, precision));
    expect(round(vec.y, precision)).toBe(round(20 / l, precision));
    expect(round(vec.z, precision)).toBe(round(15 / l, precision));
    expect(vec.coordinates.map((n) => round(n, precision))).toEqual([
      round(10 / l, precision),
      round(20 / l, precision),
      round(15 / l, precision),
      0,
    ]);
    expect(vec.isUnitVector()).toBe(true);
    expect(vec.length).toBe(1.0);
  });

  test('Compute a UnitVector from the sum of two vectors', () => {
    const vDir1 = Vector.from(1, 1, 0);
    const vDir2 = Vector.from(1, -1, 0);

    const inDir = UnitVector.from(add(vDir1, vDir2));

    expect(inDir.x).toBeCloseTo(1);
    expect(inDir.y).toBeCloseTo(0);
    expect(inDir.z).toBeCloseTo(0);
  });

  test('Set a unit-vector from a vector', () => {
    const vec = UnitVector.fromVector(Vector.fromValues(10, 20, 15));
    const l = Math.sqrt(10 * 10 + 20 * 20 + 15 * 15);
    expect(round(vec.x, precision)).toBe(round(10 / l, precision));
    expect(round(vec.y, precision)).toBe(round(20 / l, precision));
    expect(round(vec.z, precision)).toBe(round(15 / l, precision));
  });

  test('Set a unit-vector from a vec3', () => {
    const vec = UnitVector.fromVec3(vec3.fromValues(10, 20, 15));
    const l = Math.sqrt(10 * 10 + 20 * 20 + 15 * 15);
    expect(round(vec.x, precision)).toBe(round(10 / l, precision));
    expect(round(vec.y, precision)).toBe(round(20 / l, precision));
    expect(round(vec.z, precision)).toBe(round(15 / l, precision));
  });

  test('Set a unit-vector from a vec4', () => {
    const vec = UnitVector.fromVec4(vec4.fromValues(10, 20, 15, 7));
    const l = Math.sqrt(((10 / 7) * 10) / 7 + ((20 / 7) * 20) / 7 + ((15 / 7) * 15) / 7);
    expect(round(vec.x, precision)).toBe(round(10 / 7 / l, precision));
    expect(round(vec.y, precision)).toBe(round(20 / 7 / l, precision));
    expect(round(vec.z, precision)).toBe(round(15 / 7 / l, precision));
  });

  test('Get a String from a UnitVector', () => {
    const v = UnitVector.fromValues(10, 20, 15);
    expect(v.toString()).toEqual('UnitVector: [0.3713906705379486, 0.7427813410758972, 0.5570859909057617]');
  });
});

describe('UnitVector operations', () => {
  test('cross-product of two unit vectors', () => {
    const v1 = UnitVector.from(1, 0, 0);
    const v2 = UnitVector.from(0, 1, 0);
    const v3 = UnitVector.crossProduct(v1, v2);
    expect(v3.x).toBe(0);
    expect(v3.y).toBe(0);
    expect(v3.z).toBe(1);
    expect(v3.isUnitVector()).toBe(true);
  });

  test('dot product between 2 unitVectors', () => {
    const v1 = UnitVector.from(1, 0, 0);
    const v2 = UnitVector.from(0, 1, 0);
    const dotProd = v1.dot(v2);

    expect(dotProd).toBeCloseTo(0);
  });

  test('add 2 unit vectors', () => {
    const v1 = UnitVector.from(1, 0, 0);
    const v2 = UnitVector.from(0, 1, 0);
    const vExpected = UnitVector.from(1, 1, 0);

    const v3 = v1.add(v2);
    expect(v3.x).toBeCloseTo(vExpected.x);
    expect(v3.y).toBeCloseTo(vExpected.y);
    expect(v3.z).toBeCloseTo(vExpected.z);
  });

  test('cross-product of two UnitVectors', () => {
    const v1 = UnitVector.from(1, 0, 0);
    const v2 = UnitVector.from(0, 1, 0);
    const v3 = v1.crossProduct(v2);
    expect(v3.x).toBe(0);
    expect(v3.y).toBe(0);
    expect(v3.z).toBe(1);
    expect(v3.isUnitVector()).toBe(true);
  });

  test('invert a unit vector', () => {
    const v1 = UnitVector.from(1, 0, 0);
    const expectedV = UnitVector.from(-1, 0, 0);
    const v2 = v1.invert();
    expect(v2.x).toBeCloseTo(expectedV.x);
    expect(v2.y).toBeCloseTo(expectedV.y);
    expect(v2.z).toBeCloseTo(expectedV.z);
  });
});
