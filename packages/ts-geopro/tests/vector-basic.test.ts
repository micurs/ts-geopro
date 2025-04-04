import { describe, test, expect } from 'vitest';
import { vec4, vec3 } from 'gl-matrix';

import { Point, Vector } from '../src/index.ts';

describe('Vector basic operations', () => {
  test('Set a vector with coordinates', () => {
    const v3 = vec3.fromValues(10, 20, 15);
    const v4 = vec4.fromValues(10, 20, 15, 0);
    const vec = Vector.from(10, 20, 15);
    const vecFromVec3 = Vector.from(v3);
    const vecFromVec4 = Vector.from(v4);
    expect(vec.x).toBe(10);
    expect(vec.y).toBe(20);
    expect(vec.z).toBe(15);
    expect(vec.isUnitVector).toBe(false);
    expect(vec.isVector).toBe(true);
    expect(vec.coordinates).toEqual([10, 20, 15, 0]);
    expect(vec.vec3).toEqual(v3);
    expect(vec.vec4).toEqual(v4);
    expect(vecFromVec3.vec4).toEqual(v4);
    expect(vecFromVec4.vec3).toEqual(v3);

    expect(vec.triplet).toEqual([10, 20, 15]);
  });

  test('Create a vector from a point', () => {
    const p = Point.from(10, 20, 15);
    const v = Vector.from(p);
    expect(v.x).toBe(10);
    expect(v.y).toBe(20);
    expect(v.z).toBe(15);
  });

  test('Set a vector with a vec4', () => {
    const v = Vector.fromVec4([10, 20, 15, 10]);
    expect(v.x).toBe(1);
    expect(v.y).toBe(2);
    expect(v.z).toBe(1.5);
  });

  test('Set a vector with a vec3', () => {
    const v = Vector.fromVec3([10, 20, 15]);
    expect(v.x).toBe(10);
    expect(v.y).toBe(20);
    expect(v.z).toBe(15);
  });

  test('Get a String from a UnitVector', () => {
    const v = Vector.fromValues(10, 20, 15);
    expect(v.toString()).toEqual('Vector: [10, 20, 15]');
  });

  test('Get the vector length', () => {
    const v = Vector.fromVec3([10, 20, 15]);
    const lsq = 10 * 10 + 20 * 20 + 15 * 15;
    expect(v.length).toBe(Math.sqrt(lsq));
    expect(v.lengthSquare).toBe(lsq);
  });

  test('crossProduct of Vectors returns a Vector perpendicular to both', () => {
    const v1 = Vector.fromValues(1, 0, 0);
    const v2 = Vector.fromValues(0, 1, 0);
    const v3 = Vector.crossProduct(v1, v2);
    expect(v3.x).toBe(0);
    expect(v3.y).toBe(0);
    expect(v3.z).toBe(1);
    expect(v3.isUnitVector).toBe(false);
  });

  test('dotProduct of Vectors returns a scalar', () => {
    const v1 = Vector.fromValues(1, 0, 0);
    const v2 = Vector.fromValues(0, 1, 0);
    const s1 = v1.dot(v2);
    const s2 = Vector.dot(v1, v2);
    expect(s1).toBe(0);
    expect(s2).toBe(0);
  });

  test('scale a vector returns a vector', () => {
    const v1 = Vector.fromValues(1, 2, 3);
    const v2 = v1.scale(10);
    expect(v2.coordinates).toEqual([10, 20, 30, 0]);
  });
});

describe('Vector operations', () => {
  test('Add two vectors', () => {
    const v1 = Vector.fromValues(1, 2, 3);
    const v2 = Vector.fromValues(4, 5, 6);
    const v3 = v1.add(v2);
    expect(v3.x).toBe(5);
    expect(v3.y).toBe(7);
    expect(v3.z).toBe(9);
  });

  test('Cross-product of two vectors', () => {
    const v1 = Vector.fromValues(1, 0, 0);
    const v2 = Vector.fromValues(0, 1, 0);
    const v3 = Vector.crossProduct(v1, v2);
    const v4 = v1.crossProduct(v2);

    expect(v3.x).toBe(0);
    expect(v3.y).toBe(0);
    expect(v3.z).toBe(1);

    expect(v4.x).toBe(0);
    expect(v4.y).toBe(0);
    expect(v4.z).toBe(1);
  });

  test('Dot-product of two vectors', () => {
    const v1 = Vector.fromValues(1, 0, 0);
    const v2 = Vector.fromValues(0, 1, 0);
    const s = v1.dot(v2);
    expect(s).toBe(0);
  });

  test('Component-wise multiplication of two vectors', () => {
    const v1 = Vector.fromValues(1, 2, 3);
    const v2 = Vector.fromValues(4, 5, 6);
    const v3 = v1.multiply(v2);
    expect(v3.x).toBe(4);
    expect(v3.y).toBe(10);
    expect(v3.z).toBe(18);
  });
});
