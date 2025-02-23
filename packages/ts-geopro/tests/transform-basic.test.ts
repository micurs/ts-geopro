import { describe, test, expect } from 'vitest';
import { mat4, vec4 } from 'gl-matrix';

import { Point, Rotation, Transform, Vector, deg2rad } from '../src';

describe('Transform basic operations', () => {
  test('Create an identity transformation', () => {
    const idTrans = Transform.identity();
    const p1 = Point.fromValues(10, 10, 10);
    const p2 = p1.map(idTrans);
    expect(p1.vec4).toEqual(p2.vec4);
    expect(idTrans.asFloat32Array.byteLength).toBe(Transform.Float32Size);
    expect(idTrans.isIdentity).toBe(true);

    const idMat = mat4.create();
    expect(idTrans.direct(0, 0)).toBeCloseTo(idMat[0]);
    expect(idTrans.direct(1, 1)).toBeCloseTo(idMat[5]);
    expect(idTrans.direct(2, 2)).toBeCloseTo(idMat[10]);
    expect(idTrans.direct(3, 3)).toBeCloseTo(idMat[15]);
    expect(idTrans.inverse(0, 0)).toBeCloseTo(idMat[0]);
    expect(idTrans.inverse(1, 1)).toBeCloseTo(idMat[5]);
    expect(idTrans.inverse(2, 2)).toBeCloseTo(idMat[10]);
    expect(idTrans.inverse(3, 3)).toBeCloseTo(idMat[15]);
  });

  test('Create a transformation from a Mat4', () => {
    const m1 = mat4.create();
    mat4.translate(m1, m1, [10, 10, 10]);
    mat4.rotateX(m1, m1, deg2rad(45));
    mat4.rotateY(m1, m1, deg2rad(45));
    const t1 = Transform.fromMat4(m1);
    const p1 = Point.fromValues(10, 10, 10);

    const tv = vec4.create();
    vec4.transformMat4(tv, p1.vec4, m1);

    const tp = t1.apply(p1);
    expect(tp.vec4).toEqual(tv);

    expect(t1.isIdentity).toBe(false);
  });

  test('Create a transform from a rotation', () => {
    const rotTransform = Transform.fromRotation(Rotation.fromAngles(deg2rad(90), 0, 0));
    const nonRotatingPoint = Point.fromValues(0, 0, 0);
    const rotatingPoint = Point.fromValues(0, 1, 0);

    const p1 = nonRotatingPoint.map(rotTransform);
    const p2 = rotatingPoint.map(rotTransform);

    expect(p1).toEqual(nonRotatingPoint);
    expect(p2.x).toBeCloseTo(0);
    expect(p2.y).toBeCloseTo(0);
    expect(p2.z).toBeCloseTo(1);
  });

  test('Create a transformation from a roto-translation', () => {
    const rotTransTransform = Transform.fromRotoTranslation(
      Rotation.fromAngles(deg2rad(90), 0, 0), // 90 degrees rotation around x
      Vector.fromValues(10, 0, 0) // 10 units translation along x
    );

    const originalPoint = Point.from(0, 1, 0);
    const transformedPoint = originalPoint.map(rotTransTransform);

    expect(transformedPoint.x).toBeCloseTo(10);
    expect(transformedPoint.y).toBeCloseTo(0);
    expect(transformedPoint.z).toBeCloseTo(1);
  });

  test('Create a transformation and make sure the invert works as expected', () => {
    const m1 = mat4.create();
    mat4.translate(m1, m1, [10, 10, 10]);
    mat4.rotateX(m1, m1, deg2rad(45));
    mat4.rotateY(m1, m1, deg2rad(45));
    const t1 = Transform.fromMat4(m1);

    const p1 = Point.fromValues(10, 10, 10);
    const p2 = p1.map(t1);

    const t2 = t1.invert();
    const p3 = p2.map(t2);

    expect(p1.vec3).toEqual(p3.vec3);
  });

  test('Create tw transformation and make sure their composition works as expected', () => {
    const m1 = mat4.create();
    const m2 = mat4.create();
    mat4.translate(m1, m1, [10, 10, 10]);
    mat4.rotateX(m1, m1, deg2rad(45));
    mat4.translate(m2, m2, [10, 10, 10]);
    mat4.rotateY(m2, m2, deg2rad(45));

    const t1 = Transform.fromMat4(m1);
    const t2 = Transform.fromMat4(m2);
    const t3 = t1.compose(t2);

    const p1 = Point.fromValues(10, 10, 10);
    const p2 = p1.map(t1);
    const p3 = p2.map(t2);
    const p4 = p1.map(t3);

    expect(p3.vec3).toEqual(p4.vec3);
  });

  test('Create a transformation with a move vector', () => {
    const t1 = Transform.fromMove(Vector.fromValues(10, 10, 10));
    const p1 = Point.fromValues(10, 10, 10);
    const p2 = p1.map(t1);
    expect(p2.coordinates).toEqual([20, 20, 20, 1]);
  });
});

describe('Transform extract operations', () => {
  test('Extract a translation from a transformation', () => {
    const t1 = Transform.fromTranslation(10, 12, 22);
    const t2 = Transform.fromMove(Vector.from(10, 24, 100));
    const mv1 = t1.positionVector;
    const mv2 = t2.positionVector;
    expect(mv1.coordinates).toEqual([10, 12, 22, 0]);
    expect(mv2.coordinates).toEqual([10, 24, 100, 0]);
  });

  test('Extract the scale factor from a transformation', () => {
    const t = Transform.fromScale(10, 11, 0.3);
    const scaleFactors = t.scaleVector;
    expect(scaleFactors.x).toBeCloseTo(10);
    expect(scaleFactors.y).toBeCloseTo(11);
    expect(scaleFactors.z).toBeCloseTo(0.3);
  });
});
