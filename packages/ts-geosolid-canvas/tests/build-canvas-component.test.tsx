/// <reference lib="dom" />
import { describe, expect, test } from 'vitest';
import { render } from 'solid-js/web';
import { createSignal } from 'solid-js';
import { buildCanvasComponent } from '../src/build-canvas-component.tsx';
import { canvasContext } from '../src/canvas/canvas-context.ts';
import type { Viewport } from '../src/canvas/types.ts';
import { Transform } from '@micurs/ts-geopro';

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

interface TestProps {
  x: number;
}

describe('buildCanvasComponent', () => {
  test('calls requestRedraw on prop change', () => {
    let redrawCount = 0;
    const requestRedraw = () => { redrawCount++; };
    const vp = createSignal<Viewport>(createMockViewport());
    const redrawVersion = createSignal(0);
    const rAFWillClear = createSignal(false);

    const contextValue = {
      vp: vp[0],
      redrawVersion: redrawVersion[0],
      requestRedraw,
      rAFWillClear: rAFWillClear[0],
    };

    const TestComponent = buildCanvasComponent<TestProps>((_vp, props) => {
      props.x;
    });

    const container = document.createElement('div');
    const [x, setX] = createSignal(0);

    render(
      () => (
        <canvasContext.Provider value={contextValue}>
          <TestComponent x={x()} />
        </canvasContext.Provider>
      ),
      container,
    );

    const countBefore = redrawCount;
    setX(42);

    expect(redrawCount).toBe(countBefore + 1);
  });

  test('skips requestRedraw when rAFWillClear is true', () => {
    let redrawCount = 0;
    const requestRedraw = () => { redrawCount++; };
    const vp = createSignal<Viewport>(createMockViewport());
    const redrawVersion = createSignal(0);
    const rAFWillClear = createSignal(false);

    const contextValue = {
      vp: vp[0],
      redrawVersion: redrawVersion[0],
      requestRedraw,
      rAFWillClear: rAFWillClear[0],
    };

    const TestComponent = buildCanvasComponent<TestProps>((_vp, props) => {
      props.x;
    });

    const container = document.createElement('div');
    const [x, setX] = createSignal(0);

    render(
      () => (
        <canvasContext.Provider value={contextValue}>
          <TestComponent x={x()} />
        </canvasContext.Provider>
      ),
      container,
    );

    const countBefore = redrawCount;
    rAFWillClear[1](true);
    setX(100);

    expect(redrawCount).toBe(countBefore);
  });

  test('handles prop change after rAFWillClear toggle', () => {
    let redrawCount = 0;
    const requestRedraw = () => { redrawCount++; };
    const vp = createSignal<Viewport>(createMockViewport());
    const redrawVersion = createSignal(0);
    const rAFWillClear = createSignal(false);

    const contextValue = {
      vp: vp[0],
      redrawVersion: redrawVersion[0],
      requestRedraw,
      rAFWillClear: rAFWillClear[0],
    };

    const TestComponent = buildCanvasComponent<TestProps>((_vp, props) => {
      props.x;
    });

    const container = document.createElement('div');
    const [x, setX] = createSignal(0);

    render(
      () => (
        <canvasContext.Provider value={contextValue}>
          <TestComponent x={x()} />
        </canvasContext.Provider>
      ),
      container,
    );

    rAFWillClear[1](true);
    setX(100);
    rAFWillClear[1](false);
    const countBefore = redrawCount;
    setX(200);

    expect(redrawCount).toBe(countBefore + 1);
  });
});
