import { describe, test, expect } from 'vitest';

import { Transform, UnitVector, deg2rad } from '../src';

describe('UnitVector transformations', () => {
  test('UnitVector.map(t) on a translation returns the same UnitVector', () => {
    const v = UnitVector.fromValues(10, 20, 15);
    const t = Transform.fromTranslation(2, 2, 2);

    const v2 = v.map(t);
    expect(v2.x).toBeCloseTo(v.x);
    expect(v2.y).toBeCloseTo(v.y);
    expect(v2.z).toBeCloseTo(v.z);
  });

  test('UnitVector.map(t) on a rotation returns a rotated UnitVector', () => {
    const v = UnitVector.fromValues(1, 0, 0);
    const t = Transform.fromRotationZ(deg2rad(180));

    const v2 = v.map(t);
    expect(v2.x).toBeCloseTo(-1);
    expect(v2.y).toBeCloseTo(0);
    expect(v2.z).toBeCloseTo(0);

    const v3 = v2.unMap(t);
    expect(v3.x).toBeCloseTo(v.x);
    expect(v3.y).toBeCloseTo(v.y);
    expect(v3.z).toBeCloseTo(v.z);
  });
});
