import { describe, expect, test, vi } from 'vitest';
import { compose, Point, Transform } from '@micurs/ts-geopro';
import {
  applyStandardWorldTransform,
  canvasTransformFromGeoTransform,
  drawInScreenCoordinates,
  drawInWorldCoordinates,
  resetCanvasTransform,
  screenPointToWorld,
  screenVectorToWorld,
  setCanvasWorldTransform,
  worldPointToScreen,
} from '../src/canvas/canvas-geopro.ts';

function mockCtx(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe('canvasTransformFromGeoTransform', () => {
  test('identity with Y-negated d', () => {
    const M = Transform.identity();
    const [a, b, c, d, e, f] = canvasTransformFromGeoTransform(M);
    // d is negated per the render convention (world Y-up → screen Y-down)
    expect(a).toBeCloseTo(1);
    expect(b).toBeCloseTo(0);
    expect(c).toBeCloseTo(0);
    expect(d).toBeCloseTo(-1);
    expect(e).toBeCloseTo(0);
    expect(f).toBeCloseTo(0);
  });

  test('translation with Y-negation', () => {
    const M = Transform.fromTranslation(100, 200, 0);
    const [a, b, c, d, e, f] = canvasTransformFromGeoTransform(M);
    // e/f are direct access without negation (unlike b/d)
    expect(a).toBeCloseTo(1);
    expect(b).toBeCloseTo(0);
    expect(c).toBeCloseTo(0);
    expect(d).toBeCloseTo(-1);
    expect(e).toBeCloseTo(100);
    expect(f).toBeCloseTo(200);
  });

  test('scale with Y-negation', () => {
    const M = Transform.fromScale(2, 3, 1);
    const [a, b, c, d, e, f] = canvasTransformFromGeoTransform(M);
    expect(a).toBeCloseTo(2);
    expect(b).toBeCloseTo(0);
    expect(c).toBeCloseTo(0);
    expect(d).toBeCloseTo(-3);
    expect(e).toBeCloseTo(0);
    expect(f).toBeCloseTo(0);
  });

  test('scale with negative Y', () => {
    const M = Transform.fromScale(2, -3, 1);
    const [a, b, c, d] = canvasTransformFromGeoTransform(M);
    expect(a).toBeCloseTo(2);
    expect(b).toBeCloseTo(0);
    expect(c).toBeCloseTo(0);
    // d = -M[5] = -(-3) = 3
    expect(d).toBeCloseTo(3);
  });

  test('rotation by 90°', () => {
    const M = compose(Transform.fromRotationZ(Math.PI / 2));
    const [a, b, c, d] = canvasTransformFromGeoTransform(M);
    // direct(row,col) accesses _direct[4*row+col] (treats matrix as row-major).
    // For rotation Z: m[0]=cos, m[1]=sin, m[4]=-sin, m[5]=cos
    // a = direct(0,0) = cos90=0
    // b = -direct(1,0) = -m[4] = -(-sin90) = 1
    // c = direct(0,1) = m[1] = sin90 = 1
    // d = -direct(1,1) = -m[5] = -cos90 = 0
    expect(a).toBeCloseTo(0);
    expect(b).toBeCloseTo(1);
    expect(c).toBeCloseTo(1);
    expect(d).toBeCloseTo(0);
  });
});

describe('setCanvasWorldTransform', () => {
  test('calls setTransform with correct six values', () => {
    const ctx = mockCtx();
    const M = Transform.fromTranslation(50, -30, 0);
    setCanvasWorldTransform(ctx, M);
    // Y-negated render convention: d = -M[5] = -1, f = M[13] = -30
    expect(ctx.setTransform).toHaveBeenCalled();
    const args = ctx.setTransform.mock.calls[0];
    expect(args[0]).toBeCloseTo(1);
    expect(args[1]).toBeCloseTo(0);
    expect(args[2]).toBeCloseTo(0);
    expect(args[3]).toBeCloseTo(-1);
    expect(args[4]).toBeCloseTo(50);
    expect(args[5]).toBeCloseTo(-30);
  });
});

describe('resetCanvasTransform', () => {
  test('calls setTransform with identity', () => {
    const ctx = mockCtx();
    resetCanvasTransform(ctx);
    expect(ctx.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);
  });
});

describe('drawInWorldCoordinates', () => {
  test('save, set transform, draw, restore in order', () => {
    const ctx = mockCtx();
    const M = Transform.identity();
    const draw = vi.fn();

    drawInWorldCoordinates(ctx, M, draw);
    expect(ctx.save).toHaveBeenCalledTimes(1);
    expect(ctx.setTransform).toHaveBeenCalled();
    expect(draw).toHaveBeenCalledTimes(1);
    expect(ctx.restore).toHaveBeenCalledTimes(1);
  });

  test('restore still runs when callback throws', () => {
    const ctx = mockCtx();
    const draw = () => { throw new Error('boom'); };
    expect(() => drawInWorldCoordinates(ctx, Transform.identity(), draw)).toThrow('boom');
    expect(ctx.save).toHaveBeenCalledTimes(1);
    expect(ctx.restore).toHaveBeenCalledTimes(1);
  });
});

describe('drawInScreenCoordinates', () => {
  test('save, reset, draw, restore in order', () => {
    const ctx = mockCtx();
    const draw = vi.fn();

    drawInScreenCoordinates(ctx, draw);
    expect(ctx.save).toHaveBeenCalledTimes(1);
    expect(ctx.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);
    expect(draw).toHaveBeenCalledTimes(1);
    expect(ctx.restore).toHaveBeenCalledTimes(1);
  });

  test('restore still runs when callback throws', () => {
    const ctx = mockCtx();
    const draw = () => { throw new Error('boom'); };
    expect(() => drawInScreenCoordinates(ctx, draw)).toThrow('boom');
    expect(ctx.save).toHaveBeenCalledTimes(1);
    expect(ctx.restore).toHaveBeenCalledTimes(1);
  });
});

describe('worldPointToScreen / screenPointToWorld roundtrip', () => {
  test('identity roundtrip', () => {
    const M = Transform.identity();
    const world = Point.from(42, 73, 0);
    const screen = worldPointToScreen(M, world);
    const back = screenPointToWorld(M, screen);
    expect(back.x).toBeCloseTo(world.x);
    expect(back.y).toBeCloseTo(world.y);
  });

  test('composed transform roundtrip', () => {
    const M = compose(
      Transform.fromTranslation(400, 300, 0),
      Transform.fromRotationZ(Math.PI / 6),
      Transform.fromScale(2, 2, 1),
    );
    const world = Point.from(50, 30, 0);
    const screen = worldPointToScreen(M, world);
    const back = screenPointToWorld(M, screen);
    expect(back.x).toBeCloseTo(world.x);
    expect(back.y).toBeCloseTo(world.y);
  });
});

describe('screenVectorToWorld', () => {
  test('converts with Y negation at unit scale', () => {
    const result = screenVectorToWorld(1, { x: 10, y: 20, z: 0 });
    expect(result.x).toBe(10);
    expect(result.y).toBe(-20);
  });

  test('scales by factor', () => {
    const result = screenVectorToWorld(0.5, { x: 100, y: 50, z: 0 });
    expect(result.x).toBe(50);
    expect(result.y).toBe(-25);
  });
});

describe('applyStandardWorldTransform', () => {
  test('matches Point.map', () => {
    const T = compose(
      Transform.fromTranslation(10, 20, 0),
      Transform.fromRotationZ(Math.PI / 4),
    );
    const p = Point.from(5, 5, 0);
    const r1 = applyStandardWorldTransform(T, p);
    const r2 = p.map(T);
    expect(r1.x).toBeCloseTo(r2.x);
    expect(r1.y).toBeCloseTo(r2.y);
  });
});
