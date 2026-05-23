/// <reference lib="dom" />
import { describe, expect, test } from 'vitest';
import { render } from 'solid-js/web';
import { createSignal, useContext } from 'solid-js';
import { Point, Transform, Rotation } from '@micurs/ts-geopro';
import { Rotation2D } from '../src/rotation-2d.tsx';
import { canvasContext } from '../src/canvas/canvas-context.ts';
import type { Viewport } from '../src/canvas/types.ts';

const contextStub = <T>(vp: () => T) => ({
  vp,
  redrawVersion: () => 0,
  requestRedraw: () => {},
  rAFWillClear: () => false,
});

const createMockViewport = (): Viewport => ({
  ctx: {
    save: () => {},
    restore: () => {},
    setTransform: () => {},
    clearRect: () => {},
    canvas: { width: 800, height: 600 },
  } as unknown as CanvasRenderingContext2D,
  scaleFactor: 1,
  trans: [0, 0],
  transform: Transform.identity(),
  dimensions: [800, 600],
  pan: [0, 0],
});

describe('Rotation2D component', () => {
  test('applies rotation to viewport transform', () => {
    const capturedVp: Viewport[] = [];
    const [vp, _setVp] = createSignal<Viewport>(createMockViewport());

    const Child = () => {
      const ctx = useContext(canvasContext);
      const current = ctx?.vp();
      if (current) {
        capturedVp.push(current);
      }
      return <div />;
    };

    const container = document.createElement('div');
    const dispose = render(
      () => (
        <canvasContext.Provider value={contextStub(vp)}>
          <Rotation2D angle={Math.PI / 2}>
            <Child />
          </Rotation2D>
        </canvasContext.Provider>
      ),
      container
    );

    expect(capturedVp.length).toBeGreaterThan(0);
    const childVp = capturedVp[0]!;

    const rotZ = Transform.fromRotation(Rotation.rotationZ(Math.PI / 2));
    const expectedTransform = Transform.identity().compose(rotZ);
    expect(childVp.transform.direct(0, 0)).toBeCloseTo(expectedTransform.direct(0, 0));
    expect(childVp.transform.direct(0, 1)).toBeCloseTo(expectedTransform.direct(0, 1));
    expect(childVp.transform.direct(1, 0)).toBeCloseTo(expectedTransform.direct(1, 0));
    expect(childVp.transform.direct(1, 1)).toBeCloseTo(expectedTransform.direct(1, 1));
    dispose();
  });

  test('default center is origin', () => {
    const capturedVp: Viewport[] = [];
    const [vp, _setVp] = createSignal<Viewport>(createMockViewport());

    const Child = () => {
      const ctx = useContext(canvasContext);
      const current = ctx?.vp();
      if (current) {
        capturedVp.push(current);
      }
      return <div />;
    };

    const container = document.createElement('div');
    const dispose = render(
      () => (
        <canvasContext.Provider value={contextStub(vp)}>
          <Rotation2D angle={0}>
            <Child />
          </Rotation2D>
        </canvasContext.Provider>
      ),
      container
    );

    expect(capturedVp.length).toBeGreaterThan(0);
    const childVp = capturedVp[0]!;
    expect(childVp.transform.direct(3, 0)).toBe(0);
    expect(childVp.transform.direct(3, 1)).toBe(0);
    dispose();
  });

  test('zero angle produces identity rotation', () => {
    const capturedVp: Viewport[] = [];
    const [vp, _setVp] = createSignal<Viewport>(createMockViewport());

    const Child = () => {
      const ctx = useContext(canvasContext);
      const current = ctx?.vp();
      if (current) {
        capturedVp.push(current);
      }
      return <div />;
    };

    const container = document.createElement('div');
    const dispose = render(
      () => (
        <canvasContext.Provider value={contextStub(vp)}>
          <Rotation2D angle={0}>
            <Child />
          </Rotation2D>
        </canvasContext.Provider>
      ),
      container
    );

    expect(capturedVp.length).toBeGreaterThan(0);
    const childVp = capturedVp[0]!;
    expect(childVp.transform.direct(0, 0)).toBeCloseTo(1);
    expect(childVp.transform.direct(1, 1)).toBeCloseTo(1);
    dispose();
  });

  test('custom center translates correctly', () => {
    const capturedVp: Viewport[] = [];
    const [vp, _setVp] = createSignal<Viewport>(createMockViewport());
    const center = Point.from(100, 200, 0);

    const Child = () => {
      const ctx = useContext(canvasContext);
      const current = ctx?.vp();
      if (current) {
        capturedVp.push(current);
      }
      return <div />;
    };

    const container = document.createElement('div');
    const dispose = render(
      () => (
        <canvasContext.Provider value={contextStub(vp)}>
          <Rotation2D angle={Math.PI} center={center}>
            <Child />
          </Rotation2D>
        </canvasContext.Provider>
      ),
      container
    );

    expect(capturedVp.length).toBeGreaterThan(0);
    const childVp = capturedVp[0]!;
    // Pi rotation around screen-center (100,200) → world-center (100,-200):
    // centerTx = translate(100, -200), centerNegTx = translate(-100, 200)
    // rotationTx = centerTx * rotZ(pi) * centerNegTx
    // = [-1 0 0 200; 0 -1 0 -400; 0 0 1 0; 0 0 0 1]
    expect(childVp.transform.direct(0, 0)).toBeCloseTo(-1);
    expect(childVp.transform.direct(1, 1)).toBeCloseTo(-1);
    expect(childVp.transform.direct(3, 0)).toBeCloseTo(200);
    expect(childVp.transform.direct(3, 1)).toBeCloseTo(-400);
    dispose();
  });
});
