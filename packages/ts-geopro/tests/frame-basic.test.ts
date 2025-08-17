import { describe, test, expect } from 'vitest';

import { Point, Frame, UnitVector, Vector, deg2rad, round, rad2deg, isFrame, Ray, add, Transform, Rotation } from '../src';
import { mat4 } from 'gl-matrix';

describe('Frame basic operations', () => {
  const prec = 6;

  test('Create a world frame', () => {
    const f = Frame.world();
    expect(f.isFrame()).toBe(true);
    expect(f.o.x).toBe(0);
    expect(f.o.y).toBe(0);
    expect(f.o.z).toBe(0);
    expect(f.origin.x).toBe(0);
    expect(f.origin.y).toBe(0);
    expect(f.origin.z).toBe(0);

    expect(f.i.x).toBe(1);
    expect(f.i.y).toBe(0);
    expect(f.i.z).toBe(0);

    expect(f.j.x).toBe(0);
    expect(f.j.y).toBe(1);
    expect(f.j.z).toBe(0);

    expect(f.k.x).toBe(0);
    expect(f.k.y).toBe(0);
    expect(f.k.z).toBe(1);

    expect(isFrame(f)).toBe(true);

    const idMat = mat4.create();
    expect(f.direct(0, 0)).toBeCloseTo(idMat[0]);
    expect(f.direct(1, 1)).toBeCloseTo(idMat[5]);
    expect(f.direct(2, 2)).toBeCloseTo(idMat[10]);
    expect(f.direct(3, 3)).toBeCloseTo(idMat[15]);
    expect(f.inverse(0, 0)).toBeCloseTo(idMat[0]);
    expect(f.inverse(1, 1)).toBeCloseTo(idMat[5]);
    expect(f.inverse(2, 2)).toBeCloseTo(idMat[10]);
    expect(f.inverse(3, 3)).toBeCloseTo(idMat[15]);

    expect(f.asFloat32Array.byteLength).toBe(Transform.Float32Size);
  });

  test('Create a frame from a point and two vectors', () => {
    const o = Point.from(10, 10, 10);
    const v1 = Vector.fromValues(0, 0, 10);
    const v2 = Vector.fromValues(10, 0, 0);
    const f = Frame.from2Vectors(o, v1, v2);

    expect(f.isFrame()).toBe(true);
    expect(f.o.x).toBe(10);
    expect(f.o.y).toBe(10);
    expect(f.o.z).toBe(10);

    expect(f.i.x).toBe(1);
    expect(f.i.y).toBe(0);
    expect(f.i.z).toBe(0);

    expect(f.j.x).toBe(0);
    expect(f.j.y).toBe(1);
    expect(f.j.z).toBe(0);

    expect(f.k.x).toBe(0);
    expect(f.k.y).toBe(0);
    expect(f.k.z).toBe(1);
  });

  test('Create a frame from a point and two unit vectors', () => {
    const o = Point.from(10, 10, 10);
    const v1 = UnitVector.fromValues(0, 0, 1);
    const v2 = UnitVector.fromValues(1, 0, 0);
    const f = Frame.from2Vectors(o, v1, v2);

    expect(f.isFrame()).toBe(true);
    expect(f.o.x).toBe(10);
    expect(f.o.y).toBe(10);
    expect(f.o.z).toBe(10);

    expect(f.i.x).toBe(1);
    expect(f.i.y).toBe(0);
    expect(f.i.z).toBe(0);

    expect(f.j.x).toBe(0);
    expect(f.j.y).toBe(1);
    expect(f.j.z).toBe(0);

    expect(f.k.x).toBe(0);
    expect(f.k.y).toBe(0);
    expect(f.k.z).toBe(1);
  });

  test('Compute the relative position of a point in a frame - on the origin', () => {
    const o = Point.from(10, 10, 10);
    const v1 = Vector.fromValues(0, 0, 1);
    const v2 = Vector.fromValues(1, 0, 0);
    const f = Frame.from2Vectors(o, v1, v2);
    const p = Point.from(10, 10, 10);
    const rp = p.relative(f);
    expect(rp.x).toBe(0);
    expect(rp.y).toBe(0);
    expect(rp.z).toBe(0);

    const rp1 = Point.relative(p, f);
    expect(rp).toEqual(rp1);
  });

  test('Compute the relative position of a point in a random frame', () => {
    const o = Point.from(10, 22, 38);
    const v1 = UnitVector.fromValues(0.6, 1, 1);
    const v2 = UnitVector.fromValues(1, 0, 0);
    const f = Frame.from2Vectors(o, v1, v2);

    // Create a point that is 5 units away from the origin in each direction to f
    const p = add(
      o, // from the origin
      Vector.fromUnitAndLength(f.i, 5), // 5 units in the i direction
      Vector.fromUnitAndLength(f.j, 5), // 5 units in the j direction
      Vector.fromUnitAndLength(f.k, 5) // 5 units in the k direction
    );

    const rp = p.relative(f);
    expect(rp.x).toBeCloseTo(5);
    expect(rp.y).toBeCloseTo(5);
    expect(rp.z).toBeCloseTo(5);
  });

  test('Create a relative point in a random frame and get its absolute coordinates', () => {
    const o = Point.from(-22, 22, -138);
    const v1 = UnitVector.fromValues(0.2, 0.9, 0);
    const v2 = UnitVector.fromValues(1, 0, 1);
    const f = Frame.from2Vectors(o, v1, v2);

    const relToFPoint = Point.from(5, 5, 5);
    const wcPoint = relToFPoint.absolute(f); // Get the absolute coordinates of rp in the frame f

    // Compute the expected point in world coordinates
    const expectedWcPoint = add(
      f.o, // From the origin of the frame
      Vector.fromUnitAndLength(f.i, relToFPoint.x), // 5 units in the i direction
      Vector.fromUnitAndLength(f.j, relToFPoint.y), // 5 units in the j direction
      Vector.fromUnitAndLength(f.k, relToFPoint.z) // 5 units in the k direction
    );

    expect(wcPoint.x).toBeCloseTo(expectedWcPoint.x);
    expect(wcPoint.y).toBeCloseTo(expectedWcPoint.y);
    expect(wcPoint.z).toBeCloseTo(expectedWcPoint.z);
  });

  test('Compute the relative position of a point in a frame - on the X axis', () => {
    const o = Point.from(10, 10, 10);
    const v1 = Vector.fromValues(0, 0, 1);
    const v2 = Vector.fromValues(1, 0, 0);
    const f = Frame.from2Vectors(o, v1, v2);
    const p = Point.from(20, 10, 10);
    const rel = p.relative(f);
    expect(rel.x).toBe(10);
    expect(rel.y).toBe(0);
    expect(rel.z).toBe(0);
  });

  test('Compute the relative coordinates of a vector in a (rotated) frame - on the X axis', () => {
    const o = Point.from(10, 10, 10);
    const v1 = Vector.fromValues(0, 1, 0);
    const v2 = Vector.fromValues(1, 0, 0);
    const f = Frame.from2Vectors(o, v1, v2);

    // f k is Y, j is -Z, i is X
    const v = Vector.fromValues(0, 0, 10);
    const rel = v.relative(f);
    const abs = rel.absolute(f);

    expect(rel.x).toBe(0);
    expect(rel.y).toBe(10);
    expect(rel.z).toBe(0);

    expect(abs.x).toBe(0);
    expect(abs.y).toBe(0);
    expect(abs.z).toBe(10);
  });

  test('Compute the relative coordinates of a unit-vector in a (rotated) frame - on the X axis', () => {
    const o = Point.from(10, 10, 10);
    const v1 = Vector.fromValues(0, 1, 0);
    const v2 = Vector.fromValues(1, 0, 0);
    const f = Frame.from2Vectors(o, v1, v2);

    // f k is Y, j is -Z, i is X
    const v = UnitVector.fromValues(0, 0, 10);
    const rel = v.relative(f);
    const abs = rel.absolute(f);

    expect(rel.x).toBe(0);
    expect(rel.y).toBe(1);
    expect(rel.z).toBe(0);

    expect(abs.x).toBe(0);
    expect(abs.y).toBe(0);
    expect(abs.z).toBe(1);
  });

  test('Compute the relative position of a point in a (rotated) frame of reference', () => {
    const f = Frame.from2Vectors(
      Point.from(10, 10, 10), // origin
      Vector.from(0, 1, 0), // z-axes
      Vector.from(1, 0, 0) // x-axes
    );
    // f k is Y, j is -Z, i is X
    const p = Point.from(10, 15, 0);
    const relPoint = p.relative(f);

    expect(relPoint.x).toBe(0);
    expect(relPoint.y).toBe(10);
    expect(relPoint.z).toBe(5);

    const abs = relPoint.absolute(f);
    const abs1 = Point.absolute(relPoint, f);

    expect(abs.x).toBe(10);
    expect(abs.y).toBe(15);
    expect(abs.z).toBe(0);

    expect(abs).toEqual(abs1);
  });

  test('Compute the absolute and relative position of a point defined in a frame', () => {
    const o = Point.from(10, 10, 10);
    const v1 = Vector.fromValues(0, 0, 1);
    const v2 = Vector.fromValues(1, 0, 0);
    const f = Frame.from2Vectors(o, v1, v2);
    const p = Point.from(0, 0, 0);
    // Assume p is relative to the frame => get its world absolute coordinates
    const abs = p.absolute(f);
    expect(abs.x).toBeCloseTo(10);
    expect(abs.y).toBeCloseTo(10);
    expect(abs.z).toBeCloseTo(10);

    // Assume p is in world coordinates => get its frame relative coordinates
    const rel = p.relative(f);
    expect(rel.x).toBe(-10);
    expect(rel.y).toBe(-10);
    expect(rel.z).toBe(-10);
  });

  test('Compute the absolute and relative position of a ray defined in a frame', () => {
    const o = Point.from(10, 10, 10);
    const v1 = Vector.fromValues(0, 0, 1);
    const v2 = Vector.fromValues(1, 0, 0);
    const f = Frame.from2Vectors(o, v1, v2);

    const expectedI = UnitVector.fromValues(1, 0, 0);
    const expectedK = UnitVector.fromValues(0, 0, 1);

    expect(f.i.x).toBeCloseTo(expectedI.x);
    expect(f.i.y).toBeCloseTo(expectedI.y);
    expect(f.i.z).toBeCloseTo(expectedI.z);

    expect(f.k.x).toBeCloseTo(expectedK.x);
    expect(f.k.y).toBeCloseTo(expectedK.y);
    expect(f.k.z).toBeCloseTo(expectedK.z);

    const ray = Ray.fromPointAndVector(Point.from(0, 0, 0), Vector.fromValues(1, 1, 1));

    // Ray is defined in the frame f => get its world coordinates
    const rayAbs = ray.absolute(f);
    expect(rayAbs.o.x).toBeCloseTo(10); // The 0,0,0 in f is 10,10,10 in world
    expect(rayAbs.o.y).toBeCloseTo(10);
    expect(rayAbs.o.z).toBeCloseTo(10);
    expect(rayAbs.d.x).toBeCloseTo(ray.d.x);
    expect(rayAbs.d.y).toBeCloseTo(ray.d.y);
    expect(rayAbs.d.z).toBeCloseTo(ray.d.z);

    // Ray is defined in world coordinates => get its frame coordinates
    const rayRel = ray.relative(f);
    expect(rayRel.o.x).toBe(-10);
    expect(rayRel.o.y).toBe(-10);
    expect(rayRel.o.z).toBe(-10);
    expect(rayRel.d.x).toBeCloseTo(ray.d.x);
    expect(rayRel.d.y).toBeCloseTo(ray.d.y);
    expect(rayRel.d.z).toBeCloseTo(ray.d.z);
  });

  test('Compute a reference frame rotate 90 degrees around the X axis', () => {
    const f = Frame.from(
      Transform.fromRotoTranslation(
        //
        Rotation.rotationX(deg2rad(90)), //
        Vector.from(0, 1, 0) //
      )
    );

    // i is X, j is Z, k is -Y
    const p = Point.from(0, 1, 0);

    const abs = p.relative(f);
    expect(abs.x).toBeCloseTo(0);
    expect(abs.y).toBeCloseTo(0);
    expect(abs.z).toBeCloseTo(0);
  });

  test('Compute a reference frame rotate 90 degrees around the Y axis', () => {
    const f = Frame.from(
      Transform.fromRotoTranslation(
        //
        Rotation.rotationY(deg2rad(90)), //
        Vector.from(-1, 0, 0) //
      )
    );

    // i is X, j is Z, k is -Y
    const p = Point.from(-1, 0, 0);

    const abs = p.relative(f);
    expect(abs.x).toBe(0);
    expect(abs.y).toBe(0);
    expect(abs.z).toBe(0);
  });

  test('Compute a reference frame rotate 90 degrees around the Z axis', () => {
    const f = Frame.from(
      Transform.fromRotoTranslation(
        //
        Rotation.rotationZ(deg2rad(90)), //
        Vector.from(10, 10, 10) //
      )
    );
    // i is X, j is Z, k is -Y
    const p0 = Point.from(10, 10, 10);
    const p1 = Point.from(11, 11, 11);

    const relP0 = p0.relative(f);
    const relP1 = p1.relative(f);
    expect(relP0.x).toBeCloseTo(0);
    expect(relP0.y).toBeCloseTo(0);
    expect(relP0.z).toBeCloseTo(0);
    expect(relP1.x).toBeCloseTo(1);
    expect(relP1.y).toBeCloseTo(-1);
    expect(relP1.z).toBeCloseTo(1);
  });

  test('Compute 2 frames and compose them into a third one', () => {
    const o1 = Vector.from(1, 1, 1);
    const f1 = Frame.from(Transform.fromMove(o1));
    const o2 = Vector.from(-1, -1, -1);
    const f2 = Frame.from(Transform.fromMove(o2));

    // Combine the two frames to a new frame that is back into the origin
    const f1f2 = f1.map(f2);

    expect(f1f2.o.x).toBe(0);
    expect(f1f2.o.y).toBe(0);
    expect(f1f2.o.z).toBe(0);

    const f1f2inv = f2.map(f1);
    expect(f1f2inv.o.x).toBe(0);
    expect(f1f2inv.o.y).toBe(0);
    expect(f1f2inv.o.z).toBe(0);
  });

  test('Compute 2 frames - rotX - and compose them into a third one', () => {
    const f1 = Frame.from(
      Transform.fromRotoTranslation(
        //
        Rotation.rotationX(rad2deg(90)), //
        Vector.from(1, 1, 1)
      )
    );
    const f2 = f1.invert() as Frame;
    const f1f2 = f1.map(f2);

    expect(f1f2.o.x).toBeCloseTo(0);
    expect(f1f2.o.y).toBeCloseTo(0);
    expect(f1f2.o.z).toBeCloseTo(0);
  });

  test('Compute 2 frames - rotY - and compose them into a third one', () => {
    const f1 = Frame.from(
      Transform.fromRotoTranslation(
        Rotation.rotationY(rad2deg(90)), // rot
        Vector.from(1, 1, 1) // trans
      )
    );
    const f2 = f1.invert() as Frame;
    const f1f2 = f1.map(f2);

    expect(round(f1f2.o.x, prec)).toBe(0);
    expect(round(f1f2.o.y, prec)).toBe(0);
    expect(round(f1f2.o.z, prec)).toBe(0);
  });

  test('Compute 2 frames - RotZ - and compose them into a third one', () => {
    const f1 = Frame.from(
      Transform.fromRotoTranslation(
        Rotation.rotationZ(rad2deg(90)), //
        Vector.from(1, 1, 1) //
      )
    );
    const f2 = f1.invert() as Frame;
    const f1f2 = f1.map(f2);

    expect(f1f2.o.x).toBeCloseTo(0);
    expect(f1f2.o.y).toBeCloseTo(0);
    expect(f1f2.o.z).toBeCloseTo(0);
  });

  test('Create a standard frame using the lookAt function', () => {
    const eye = Point.from(1, 1, 0);
    const frame = Frame.lookAt(eye, Point.from(1, 1, -1), UnitVector.fromValues(0, 1, 0));
    expect(frame.o).toEqual(eye);

    expect(frame.i.x).toBe(1);
    expect(frame.i.y).toBe(0);
    expect(frame.i.z).toBe(0);

    expect(frame.j.x).toBe(0);
    expect(frame.j.y).toBe(1);
    expect(frame.j.z).toBe(0);

    expect(frame.k.x).toBe(0);
    expect(frame.k.y).toBe(0);
    expect(frame.k.z).toBe(1);
  });

  test('Create 2 frames and get one as relative to the other', () => {
    const o = Point.from(10, 10, 10);
    const t = Point.from(0, 0, 20);
    const v1 = Vector.fromValues(0, 0, 1);
    const v2 = Vector.fromValues(1, 0, 0);
    const dy = UnitVector.fromValues(0, 1, 0);

    const f1 = Frame.from2Vectors(o, v1, v2);
    const f2 = Frame.lookAt(o, t, dy);

    // f2 is relative to f1 => retrieve the world coordinates of f2
    const f2World = f2.absolute(f1);
    expect(f2World.o.x).toBe(20);
    expect(f2World.o.y).toBe(20);
    expect(f2World.o.z).toBe(20);
  });

  test('Converting a frame to a string', () => {
    const o = Point.from(10, 10, 10);
    const v1 = Vector.fromValues(0, 0, 1);
    const v2 = Vector.fromValues(1, 0, 0);
    const f = Frame.from2Vectors(o, v1, v2);

    const str = f.toString();
    expect(str).toBe(
      'Frame: { o: {Point: [10.0000, 10.0000, 10.0000]}, i: {UnitVector: [1, 0, 0]}, j: {UnitVector: [0, 1, 0]}, k: {UnitVector: [0, 0, 1]} }'
    );
  });
});

describe('Frame to Transform conversion', () => {
  test('Convert a frame to a transform', () => {
    const o = Point.from(10, 10, 10);
    const v1 = Vector.fromValues(0, 0, 1);
    const v2 = Vector.fromValues(1, 0, 0);
    const f = Frame.from2Vectors(o, v1, v2);

    const t = f.toTransform();
    expect(t.direct(0, 0)).toBe(f.direct(0, 0));
    expect(t.direct(1, 1)).toBe(f.direct(1, 1));
    expect(t.direct(2, 2)).toBe(f.direct(2, 2));
    expect(t.direct(3, 3)).toBe(f.direct(3, 3));

    const pTrans = o.map(t);
    const pFramed = o.map(f);

    expect(pTrans.x).toBe(pFramed.x);
    expect(pTrans.y).toBe(pFramed.y);
    expect(pTrans.z).toBe(pFramed.z);
  });

  test('Convert a Point from absolute to relative', () => {
    const frameBase = Frame.from2Vectors(
      Point.from(10, 10, 10), // origin
      Vector.fromValues(0, 0, 1), // z
      Vector.fromValues(1, 0, 0) // x
    );
    const wcPoint = Point.from(5, 25, 20);

    const pointRelative = wcPoint.relative(frameBase);

    expect(pointRelative.x).toBe(-5);
    expect(pointRelative.y).toBe(15);
    expect(pointRelative.z).toBe(10);
  });

  test('Convert a Point from relative to absolute', () => {
    const frameBase = Frame.from2Vectors(
      Point.from(10, 10, 10), // origin
      Vector.fromValues(0, 0, 1), // z
      Vector.fromValues(1, 0, 0) // x
    );
    const relativePoint = Point.from(-5, 15, 10);

    const wcPoint = relativePoint.absolute(frameBase);

    expect(wcPoint.x).toBe(5);
    expect(wcPoint.y).toBe(25);
    expect(wcPoint.z).toBe(20);
  });

  test('Convert a Frame from absolute to relative', () => {
    const frameBase = Frame.from2Vectors(
      Point.from(10, 10, 10), // origin
      Vector.fromValues(0, 0, 1), // z
      Vector.fromValues(1, 0, 0) // x
    );

    const frameToConvert = Frame.from2Vectors(
      Point.from(20, 20, 20), // origin 10 units away from the base frame in each direction
      Vector.fromValues(0, 0, 1), // same z
      Vector.fromValues(1, 0, 0) // same x
    );

    const frameRelative = frameToConvert.relative(frameBase);

    expect(frameRelative.o.x).toBe(10);
    expect(frameRelative.o.y).toBe(10);
    expect(frameRelative.o.z).toBe(10);
  });

  test('Convert a Frame from relative to absolute', () => {
    const frameBase = Frame.from2Vectors(
      Point.from(10, 10, 10), // Origin
      Vector.fromValues(0, 0, 1), // z-axis
      Vector.fromValues(1, 0, 0) // x-axis
    );

    const frameRelative = Frame.from2Vectors(
      Point.from(10, 10, 10), // Origin: 10 units away from the base frame in each direction
      Vector.fromValues(0, 0, 1), // same z
      Vector.fromValues(1, 0, 0) // same x
    );

    const frameAbsolute = frameRelative.absolute(frameBase);

    // In wc we expect the origin to be at 20, 20, 20
    expect(frameAbsolute.o.x).toBe(20);
    expect(frameAbsolute.o.y).toBe(20);
    expect(frameAbsolute.o.z).toBe(20);
  });
});
