import { describe, expect, test } from 'vitest';
import { vec3, vec4 } from 'gl-matrix';
import {
  Frame,
  Point,
  UnitVector,
  Vector,
  isFrame,
  isUnitVector,
  isVec3,
  isVec4,
  isVector,
} from '../src';

const plainObject = <T extends object>(value: T): T => value;

describe('operations guards', () => {
  test('isVec4 recognises Float32Array and rejects impostors', () => {
    const good = vec4.fromValues(1, 2, 3, 4);

    expect(isVec4(good)).toBe(true);
    expect(isVec4([1, 2, 3, 4])).toBe(true);
    expect(isVec4(vec3.fromValues(1, 2, 3))).toBe(false);
    expect(isVec4(null)).toBe(false);
    expect(isVec4(plainObject({ length: 4 }))).toBe(false);
  });

  test('isVec3 recognises Float32Array and rejects impostors', () => {
    const good = vec3.fromValues(1, 2, 3);

    expect(isVec3(good)).toBe(true);
    expect(isVec3([1, 2, 3])).toBe(true);
    expect(isVec3(vec4.fromValues(1, 2, 3, 1))).toBe(false);
    expect(isVec3(undefined)).toBe(false);
    expect(isVec3(plainObject({ length: 3 }))).toBe(false);
  });

  test('isFrame only accepts actual Frame instances', () => {
    const frame = Frame.world();
    const impostor = plainObject({ isFrame: () => true });

    expect(isFrame(frame)).toBe(true);
    expect(isFrame(impostor)).toBe(false);
    expect(isFrame(null)).toBe(false);
  });

  test('isVector only accepts actual Vector instances', () => {
    const vector = Vector.from(1, 2, 3);
    const impostor = plainObject({ isVector: true });

    expect(isVector(vector)).toBe(true);
    expect(isVector(impostor)).toBe(false);
    expect(isVector(Point.from(0, 0, 0))).toBe(false);
  });

  test('isUnitVector only accepts actual UnitVector instances', () => {
    const unit = UnitVector.from(1, 0, 0);
    const impostor = plainObject({ isUnitVector: () => true });

    expect(isUnitVector(unit)).toBe(true);
    expect(isUnitVector(impostor)).toBe(false);
    expect(isUnitVector(Vector.from(0, 1, 0))).toBe(false);
  });
});
