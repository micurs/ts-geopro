/// <reference lib="dom" />
import { describe, expect, test, vi } from 'vitest';
import { render } from 'solid-js/web';
import { createSignal, useContext } from 'solid-js';
import { Transform, Vector } from '@micurs/ts-geopro';
import { Translate2D } from '../src/translate-2d.tsx';
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

describe('Translate2D component', () => {
  test('applies vector translation to viewport transform', () => {
    const capturedVp: Viewport[] = [];
    const [vp, _setVp] = createSignal<Viewport>(createMockViewport());
    const vec = Vector.from(100, 50, 0);

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
          <Translate2D vector={vec}>
            <Child />
          </Translate2D>
        </canvasContext.Provider>
      ),
      container
    );

    expect(capturedVp.length).toBeGreaterThan(0);
    const childVp = capturedVp[0]!;
    const expectedTx = Transform.fromTranslation(100, -50, 0);
    expect(childVp.transform.direct(3, 0)).toBeCloseTo(expectedTx.direct(3, 0));
    expect(childVp.transform.direct(3, 1)).toBeCloseTo(expectedTx.direct(3, 1));
    dispose();
  });

  test('zero vector produces identity translation offset', () => {
    const capturedVp: Viewport[] = [];
    const [vp, _setVp] = createSignal<Viewport>(createMockViewport());
    const zeroVec = Vector.from(0, 0, 0);

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
          <Translate2D vector={zeroVec}>
            <Child />
          </Translate2D>
        </canvasContext.Provider>
      ),
      container
    );

    expect(capturedVp.length).toBeGreaterThan(0);
    const childVp = capturedVp[0]!;
    expect(childVp.transform.direct(3, 0)).toBeCloseTo(0);
    expect(childVp.transform.direct(3, 1)).toBeCloseTo(0);
    dispose();
  });

  test('requests redraw when vector changes', () => {
    const requestRedraw = vi.fn();
    const [vp, _setVp] = createSignal<Viewport>(createMockViewport());

    const container = document.createElement('div');
    const [vec, setVec] = createSignal(Vector.from(0, 0, 0));

    const dispose = render(
      () => (
        <canvasContext.Provider value={{
          vp,
          redrawVersion: () => 0,
          requestRedraw,
          rAFWillClear: () => false,
        }}>
          <Translate2D vector={vec()}>
            <div />
          </Translate2D>
        </canvasContext.Provider>
      ),
      container
    );

    // Initial render triggers the effect once
    expect(requestRedraw).toHaveBeenCalledTimes(1);
    setVec(Vector.from(50, 0, 0));
    expect(requestRedraw).toHaveBeenCalledTimes(2);
    setVec(Vector.from(100, 0, 0));
    expect(requestRedraw).toHaveBeenCalledTimes(3);
    dispose();
  });

  test('applies Y-negation to vector', () => {
    const capturedVp: Viewport[] = [];
    const [vp, _setVp] = createSignal<Viewport>(createMockViewport());
    const vec = Vector.from(0, 100, 0);

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
          <Translate2D vector={vec}>
            <Child />
          </Translate2D>
        </canvasContext.Provider>
      ),
      container
    );

    expect(capturedVp.length).toBeGreaterThan(0);
    const childVp = capturedVp[0]!;
    // Y=100 in screen coords -> -Y in world coords -> translation.y = -100
    expect(childVp.transform.direct(3, 1)).toBeCloseTo(-100);
    dispose();
  });
});
