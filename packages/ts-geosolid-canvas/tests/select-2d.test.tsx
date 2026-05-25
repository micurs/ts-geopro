/// <reference lib="dom" />
import { describe, expect, test, vi } from 'vitest';
import { render } from 'solid-js/web';
import { createSignal, useContext } from 'solid-js';
import { Transform } from '@micurs/ts-geopro';
import { Select2D } from '../src/select-2d.tsx';
import { canvasContext } from '../src/canvas/canvas-context.ts';
import { selectionContext } from '../src/canvas/selection.ts';
import type { Viewport } from '../src/canvas/types.ts';

if (typeof PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
    }
  }
  (globalThis as Record<string, unknown>).PointerEvent = PointerEventPolyfill;
}

function createPointerEvent(type: string, init: Partial<PointerEventInit> = {}): PointerEvent {
  return new PointerEvent(type, { bubbles: true, cancelable: true, ...init });
}

function emit(canvas: HTMLCanvasElement, handler: (e: PointerEvent) => void, event: PointerEvent): void {
  Object.defineProperty(event, 'currentTarget', { value: canvas });
  handler(event);
}

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
    arc: vi.fn(),
    fill: vi.fn(),
    fillStyle: '',
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
    canvas: {
      width: 800,
      height: 600,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getBoundingClientRect: () => ({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    },
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
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
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
    const moveToCalls = (ctx.moveTo as ReturnType<typeof vi.fn>).mock.calls;
    // First moveTo should be screen top-left corner of padded union bounds
    expect(moveToCalls.length).toBeGreaterThan(0);
    const firstMoveTo = moveToCalls[0]!;

    // With identity transform, Y is negated in screen coords.
    // Union bounds: [0,0] to [200,100] with no padding.
    // World corner 0 (0, 0) → screen (0, 0).
    expect(firstMoveTo[0]).toBe(0);
    expect(firstMoveTo[1]).toBe(0);
    dispose();
  });

  test('starts drag on pointerdown inside box', async () => {
    const [vp, _setVp] = createSignal<Viewport>(createMockViewport());

    const RegisterBounds = () => {
      const selCtx = useContext(selectionContext);
      selCtx.registerBounds('shape', {
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
            <RegisterBounds />
          </Select2D>
        </canvasContext.Provider>
      ),
      container,
    );

    await waitForEffects();

    const canvas = vp()!.ctx.canvas;
    const addCalls = (canvas.addEventListener as ReturnType<typeof vi.fn>)
      .mock.calls;

    const pointerDown = addCalls.find((c: unknown[]) =>
      c[0] === 'pointerdown'
    )?.[1] as (e: PointerEvent) => void;
    const pointerMove = addCalls.find((c: unknown[]) =>
      c[0] === 'pointermove'
    )?.[1] as (e: PointerEvent) => void;
    const pointerUp = addCalls.find((c: unknown[]) =>
      c[0] === 'pointerup'
    )?.[1] as (e: PointerEvent) => void;

    expect(pointerDown).toBeDefined();
    expect(pointerMove).toBeDefined();
    expect(pointerUp).toBeDefined();

    const setPointerCapture = vi.fn();
    Object.defineProperty(canvas, 'setPointerCapture', {
      value: setPointerCapture,
    });

    // Draw effect runs during rendering, populating selRefs with
    // shape bounds → screen rect [-4, -64] to [104, 4].
    // Direct pointerdown inside box should start drag without prior hover.
    emit(canvas, pointerDown,
      createPointerEvent('pointerdown', {
        clientX: 50,
        clientY: 0,
        pointerId: 1,
      }),
    );
    await waitForEffects();

    expect(setPointerCapture).toHaveBeenCalledWith(1);

    // pointermove during drag
    emit(canvas, pointerMove,
      createPointerEvent('pointermove', {
        clientX: 100,
        clientY: 0,
      }),
    );
    await waitForEffects();

    // pointerup ends drag
    emit(canvas, pointerUp, createPointerEvent('pointerup', {}));
    await waitForEffects();

    // dragDelta persists, verify re-drag works
    emit(canvas, pointerDown,
      createPointerEvent('pointerdown', {
        clientX: 60,
        clientY: 0,
        pointerId: 2,
      }),
    );
    await waitForEffects();

    expect(setPointerCapture).toHaveBeenCalledWith(2);

    emit(canvas, pointerUp, createPointerEvent('pointerup', {}));
    await waitForEffects();

    dispose();
  });

  test('starts rotation drag on rotation handle hit', async () => {
    const [vp, _setVp] = createSignal<Viewport>(createMockViewport());

    const RegisterBounds = () => {
      const selCtx = useContext(selectionContext);
      selCtx.registerBounds('shape', {
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
            <RegisterBounds />
          </Select2D>
        </canvasContext.Provider>
      ),
      container,
    );

    await waitForEffects();

    const canvas = vp()!.ctx.canvas;
    const addCalls = (canvas.addEventListener as ReturnType<typeof vi.fn>)
      .mock.calls;
    const pointerDown = addCalls.find((c: unknown[]) =>
      c[0] === 'pointerdown'
    )?.[1] as (e: PointerEvent) => void;
    const pointerMove = addCalls.find((c: unknown[]) =>
      c[0] === 'pointermove'
    )?.[1] as (e: PointerEvent) => void;

    expect(pointerDown).toBeDefined();
    expect(pointerMove).toBeDefined();

    const setPointerCapture = vi.fn();
    Object.defineProperty(canvas, 'setPointerCapture', {
      value: setPointerCapture,
    });

    // Screen rect: [-4, -64] to [104, 4], rotation handle at (50, -84)
    emit(canvas, pointerDown,
      createPointerEvent('pointerdown', {
        clientX: 50,
        clientY: -84,
        pointerId: 1,
      }),
    );
    await waitForEffects();

    expect(setPointerCapture).toHaveBeenCalledWith(1);

    // pointermove to right: simulate dragging handle to right of center
    emit(canvas, pointerMove,
      createPointerEvent('pointermove', {
        clientX: 100,
        clientY: -84,
      }),
    );
    await waitForEffects();

    dispose();
  });

  test('does not start rotation drag on corner handle hit', async () => {
    const [vp, _setVp] = createSignal<Viewport>(createMockViewport());

    const RegisterBounds = () => {
      const selCtx = useContext(selectionContext);
      selCtx.registerBounds('shape', {
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
            <RegisterBounds />
          </Select2D>
        </canvasContext.Provider>
      ),
      container,
    );

    await waitForEffects();

    const canvas = vp()!.ctx.canvas;
    const addCalls = (canvas.addEventListener as ReturnType<typeof vi.fn>)
      .mock.calls;
    const pointerDown = addCalls.find((c: unknown[]) =>
      c[0] === 'pointerdown'
    )?.[1] as (e: PointerEvent) => void;

    expect(pointerDown).toBeDefined();

    const setPointerCapture = vi.fn();
    Object.defineProperty(canvas, 'setPointerCapture', {
      value: setPointerCapture,
    });

    // Hit top-left corner handle at (-4, 4)
    emit(canvas, pointerDown,
      createPointerEvent('pointerdown', {
        clientX: -4,
        clientY: 4,
        pointerId: 1,
      }),
    );
    await waitForEffects();

    expect(setPointerCapture).not.toHaveBeenCalled();
    dispose();
  });

  test('does not start drag on handle hit', async () => {
    const [vp, _setVp] = createSignal<Viewport>(createMockViewport());

    const RegisterBounds = () => {
      const selCtx = useContext(selectionContext);
      selCtx.registerBounds('shape', {
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
            <RegisterBounds />
          </Select2D>
        </canvasContext.Provider>
      ),
      container,
    );

    await waitForEffects();

    const canvas = vp()!.ctx.canvas;
    const addCalls = (canvas.addEventListener as ReturnType<typeof vi.fn>)
      .mock.calls;
    const pointerDown = addCalls.find((c: unknown[]) =>
      c[0] === 'pointerdown'
    )?.[1] as (e: PointerEvent) => void;

    const setPointerCapture = vi.fn();
    Object.defineProperty(canvas, 'setPointerCapture', {
      value: setPointerCapture,
    });

    const pointerMove = addCalls.find((c: unknown[]) =>
      c[0] === 'pointermove'
    )?.[1] as (e: PointerEvent) => void;
    emit(canvas, pointerMove, createPointerEvent('pointermove'));
    await waitForEffects();

    emit(canvas, pointerDown,
      createPointerEvent('pointerdown', {
        clientX: 50,
        clientY: 30,
        pointerId: 1,
      }),
    );
    await waitForEffects();

    expect(setPointerCapture).not.toHaveBeenCalled();
    dispose();
  });
});
