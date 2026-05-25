/// <reference lib="dom" />
import { describe, expect, test, vi } from 'vitest';
import { render } from 'solid-js/web';
import { createSignal, useContext } from 'solid-js';
import { Transform } from '@micurs/ts-geopro';
import { Select2D } from '../src/select-2d.tsx';
import { canvasContext } from '../src/canvas/canvas-context.ts';
import { selectionContext } from '../src/canvas/selection.ts';
import type { Viewport } from '../src/canvas/types.ts';

const createMockViewport = (): Viewport => ({
  ctx: {
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    strokeRect: vi.fn(),
    strokeStyle: '',
    lineWidth: 1,
    setLineDash: vi.fn(),
    beginPath: vi.fn(),
    stroke: vi.fn(),
    canvas: { width: 800, height: 600 },
  } as unknown as CanvasRenderingContext2D,
  scaleFactor: 1,
  trans: [0, 0],
  transform: Transform.identity(),
  dimensions: [800, 600],
  pan: [0, 0],
});

const contextStub = <T>(vp: () => T) => ({
  vp,
  redrawVersion: () => 0,
  requestRedraw: () => {},
  rAFWillClear: () => false,
});

function waitForEffects(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('Select2D component', () => {
  test('draws dashed rect when shapes register bounds', async () => {
    const [vp, _setVp] = createSignal<Viewport>(createMockViewport());

    const RegisterChild = () => {
      const selCtx = useContext(selectionContext);
      selCtx.registerBounds('test-shape', {
        minX: 0,
        minY: 0,
        maxX: 100,
        maxY: 60,
      });
      return null;
    };

    const container = document.createElement('div');
    const dispose = render(
      () => (
        <canvasContext.Provider value={contextStub(vp)}>
          <Select2D padding={4}>
            <RegisterChild />
          </Select2D>
        </canvasContext.Provider>
      ),
      container,
    );

    await waitForEffects();

    const ctx = vp()!.ctx;
    expect(ctx.setLineDash).toHaveBeenCalledWith([6, 4]);
    expect(ctx.strokeRect).toHaveBeenCalled();
    dispose();
  });

  test('no dashed rect when no bounds registered', async () => {
    const [vp, _setVp] = createSignal<Viewport>(createMockViewport());

    const container = document.createElement('div');
    const dispose = render(
      () => (
        <canvasContext.Provider value={contextStub(vp)}>
          <Select2D padding={4}>
            <div />
          </Select2D>
        </canvasContext.Provider>
      ),
      container,
    );

    await waitForEffects();

    const ctx = vp()!.ctx;
    expect(ctx.strokeRect).not.toHaveBeenCalled();
    dispose();
  });

  test('computes union bounds from multiple registered shapes', async () => {
    const [vp, _setVp] = createSignal<Viewport>(createMockViewport());

    const RegisterA = () => {
      const selCtx = useContext(selectionContext);
      selCtx.registerBounds('a', { minX: 0, minY: 0, maxX: 50, maxY: 50 });
      return null;
    };
    const RegisterB = () => {
      const selCtx = useContext(selectionContext);
      selCtx.registerBounds('b', { minX: 100, minY: 80, maxX: 200, maxY: 100 });
      return null;
    };

    const container = document.createElement('div');
    const dispose = render(
      () => (
        <canvasContext.Provider value={contextStub(vp)}>
          <Select2D padding={0}>
            <RegisterA />
            <RegisterB />
          </Select2D>
        </canvasContext.Provider>
      ),
      container,
    );

    await waitForEffects();

    const ctx = vp()!.ctx;
    const calls = (ctx.strokeRect as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const lastCall = calls[calls.length - 1]!;

    // With identity transform, Y is negated in screen coords.
    // World Y range [0, 100] → screen Y range [-100, 0].
    expect(lastCall[0]).toBe(0);
    expect(lastCall[1]).toBe(-100);
    expect(lastCall[2]).toBe(200);
    expect(lastCall[3]).toBe(100);
    dispose();
  });

  test('passes through canvas context to children', () => {
    const [vp, _setVp] = createSignal<Viewport>(createMockViewport());
    const capturedVp: Viewport[] = [];

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
          <Select2D>
            <Child />
          </Select2D>
        </canvasContext.Provider>
      ),
      container,
    );

    expect(capturedVp.length).toBeGreaterThan(0);
    expect(capturedVp[0]!.transform.isIdentity).toBe(true);
    dispose();
  });
});
