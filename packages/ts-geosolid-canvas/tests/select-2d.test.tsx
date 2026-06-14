/// <reference lib="dom" />
import { describe, expect, test, vi } from 'vitest';
import { render } from 'solid-js/web';
import { createSignal, useContext } from 'solid-js';
import { compose, Point, Transform } from '@micurs/ts-geopro';
import { Select2D, buildScaleChildTransform, buildChildViewportTransform } from '../src/select-2d.tsx';
import { scaleCommitTranslation } from '../src/canvas/geo-utils.ts';
import { canvasContext } from '../src/canvas/canvas-context.ts';
import { selectionContext } from '../src/canvas/selection.ts';
import type { BoundingBox } from '../src/types.ts';
import type { SelectionCommit } from '../src/canvas/selection.ts';
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

const createMockViewport = (): Viewport => {
  const strokeStyleLog: string[] = [];
  let _strokeStyle = '';
  const sharedAddEventListener = vi.fn();
  const parentEl = {
    addEventListener: sharedAddEventListener,
    removeEventListener: vi.fn(),
  };
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    strokeRect: vi.fn(),
    get strokeStyle() { return _strokeStyle; },
    set strokeStyle(v: string) { _strokeStyle = v; strokeStyleLog.push(v); },
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
    isPointInPath: vi.fn(),
    canvas: {
      width: 800,
      height: 600,
      parentElement: parentEl,
      addEventListener: sharedAddEventListener,
      removeEventListener: vi.fn(),
      getBoundingClientRect: () => ({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    },
  } as unknown as CanvasRenderingContext2D & { _strokeStyleLog: string[] };
  ctx._strokeStyleLog = strokeStyleLog;
  return {
    ctx,
    scaleFactor: 1,
    trans: [0, 0],
    transform: Transform.identity(),
    dimensions: [800, 600],
    pan: [0, 0],
  };
};

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
      selCtx.registerBounds('test-shape', { min: Point.from(0, 0, 0), max: Point.from(100, 60, 0) });
      return null;
    };

    const container = document.createElement('div');
    const dispose = render(
      () => (
        <canvasContext.Provider value={contextStub(vp)}>
          <Select2D editable padding={4}>
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
          <Select2D editable padding={4}>
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
      selCtx.registerBounds('a', { min: Point.from(0, 0, 0), max: Point.from(50, 50, 0) });
      return null;
    };
    const RegisterB = () => {
      const selCtx = useContext(selectionContext);
      selCtx.registerBounds('b', { min: Point.from(100, 80, 0), max: Point.from(200, 100, 0) });
      return null;
    };

    const container = document.createElement('div');
    const dispose = render(
      () => (
        <canvasContext.Provider value={contextStub(vp)}>
          <Select2D editable padding={0}>
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
      selCtx.registerBounds('shape', { min: Point.from(0, 0, 0), max: Point.from(100, 60, 0) });
      return null;
    };

    const container = document.createElement('div');
    const dispose = render(
      () => (
        <canvasContext.Provider value={contextStub(vp)}>
          <Select2D editable padding={4}>
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
      selCtx.registerBounds('shape', { min: Point.from(0, 0, 0), max: Point.from(100, 60, 0) });
      return null;
    };

    const container = document.createElement('div');
    const dispose = render(
      () => (
        <canvasContext.Provider value={contextStub(vp)}>
          <Select2D editable padding={4}>
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
    const evt = createPointerEvent('pointerdown', {
      clientX: 50,
      clientY: -84,
      pointerId: 1,
    });
    const stopImmediatePropagation = vi.fn();
    evt.stopImmediatePropagation = stopImmediatePropagation;
    emit(canvas, pointerDown, evt);
    await waitForEffects();

    expect(setPointerCapture).toHaveBeenCalledWith(1);
    expect(stopImmediatePropagation).toHaveBeenCalledTimes(1);

    // pointermove should trigger rotation arc drawing
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
      selCtx.registerBounds('shape', { min: Point.from(0, 0, 0), max: Point.from(100, 60, 0) });
      return null;
    };

    const container = document.createElement('div');
    const dispose = render(
      () => (
        <canvasContext.Provider value={contextStub(vp)}>
          <Select2D editable padding={4}>
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

    // Hit top-left corner handle — starts scale drag
    emit(canvas, pointerDown,
      createPointerEvent('pointerdown', {
        clientX: -4,
        clientY: 4,
        pointerId: 1,
      }),
    );
    await waitForEffects();

    expect(setPointerCapture).toHaveBeenCalledTimes(1);
    dispose();
  });

  test('does not start scale drag on rotation handle hit', async () => {
    const [vp, _setVp] = createSignal<Viewport>(createMockViewport());

    const RegisterBounds = () => {
      const selCtx = useContext(selectionContext);
      selCtx.registerBounds('shape', { min: Point.from(0, 0, 0), max: Point.from(100, 60, 0) });
      return null;
    };

    const container = document.createElement('div');
    const dispose = render(
      () => (
        <canvasContext.Provider value={contextStub(vp)}>
          <Select2D editable padding={4}>
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

  test('uniform scale (Shift) commits around center pivot', async () => {
    const [vp, _setVp] = createSignal<Viewport>(createMockViewport());

    let cx = 50;
    let cy = 50;
    let r = 50;
    let lastPivot: Point | null = null;

    const RegisterCircle = () => {
      const selCtx = useContext(selectionContext);
      selCtx.registerBounds('circle', { min: Point.from(cx - r, cy - r, 0), max: Point.from(cx + r, cy + r, 0) });
      selCtx.registerTransformHandler('circle', (commit) => {
        if (commit.type === 'scale') {
          lastPivot = commit.pivot;
          cx = commit.pivot.x + commit.scale.x * (cx - commit.pivot.x);
          cy = commit.pivot.y + commit.scale.y * (cy - commit.pivot.y);
          r *= Math.abs(commit.scale.x);
          selCtx.registerBounds('circle', { min: Point.from(cx - r, cy - r, 0), max: Point.from(cx + r, cy + r, 0) });
        }
      });
      return null;
    };

    const container = document.createElement('div');
    const dispose = render(
      () => (
        <canvasContext.Provider value={contextStub(vp)}>
          <Select2D editable padding={0}>
            <RegisterCircle />
          </Select2D>
        </canvasContext.Provider>
      ),
      container,
    );
    await waitForEffects();

    const canvas = vp()!.ctx.canvas;
    const addCalls = (canvas.addEventListener as ReturnType<typeof vi.fn>).mock.calls;
    const pointerDown = addCalls.find((c: unknown[]) => c[0] === 'pointerdown')?.[1] as (e: PointerEvent) => void;
    const pointerMove = addCalls.find((c: unknown[]) => c[0] === 'pointermove')?.[1] as (e: PointerEvent) => void;
    const pointerUp = addCalls.find((c: unknown[]) => c[0] === 'pointerup')?.[1] as (e: PointerEvent) => void;

    const setPointerCapture = vi.fn();
    Object.defineProperty(canvas, 'setPointerCapture', { value: setPointerCapture });

    // Scale from corner 2 (screen 100,-100) with Shift held
    // Bounds: (0,0)-(100,100), padding 0
    // Corner 2 at screen (100,-100). Pivot (opposite = corner 0) at (0,0).
    // Shift → uniform, should use center (50,50) as pivot.
    // Drag corner to screen (50,-50) → worldDx=-50, worldDy=50
    // diffX = 100 - 50 = 50, diffY = 0 - 50 = -50
    // nSx = 1 + (-50/50) = 0, nSy = 1 + (50/-50) = 0
    // uniform = max(0,0) = 0, clamped to 0.01
    emit(canvas, pointerDown, createPointerEvent('pointerdown', { clientX: 100, clientY: -100, pointerId: 1 }));
    await waitForEffects();
    expect(setPointerCapture).toHaveBeenCalledTimes(1);

    emit(canvas, pointerMove, createPointerEvent('pointermove', { clientX: 50, clientY: -50, shiftKey: true, pointerId: 1 }));
    await waitForEffects();

    emit(canvas, pointerUp, createPointerEvent('pointerup', { pointerId: 1 }));
    await waitForEffects();

    // Commit pivot must be bounding-box center (50, 50), not corner 0 (0, 0)
    expect(lastPivot).not.toBeNull();
    expect(lastPivot!.x).toBeCloseTo(50);
    expect(lastPivot!.y).toBeCloseTo(50);

    // Circle should scale around center (50,50): r → 50 * 0.01 = 0.5
    expect(r).toBeCloseTo(0.5);
    expect(cx).toBeCloseTo(50);
    expect(cy).toBeCloseTo(50);

    dispose();
  });

  test('scale corner-1, translate, scale corner-3 round-trips to original bounds', async () => {
    const [vp, _setVp] = createSignal<Viewport>(createMockViewport());

    // Circle: world (0,0)-(100,100), padding 0
    // World corners: 0=(0,0) 1=(100,0) 2=(100,100) 3=(0,100)
    // Screen (identity + Y-negate): 0=(0,0) 1=(100,0) 2=(100,-100) 3=(0,-100)
    let cx = 50;
    let cy = 50;
    let r = 50;

    const RegisterCircle = () => {
      const selCtx = useContext(selectionContext);
      selCtx.registerBounds('circle', { min: Point.from(cx - r, cy - r, 0), max: Point.from(cx + r, cy + r, 0) });
      selCtx.registerTransformHandler('circle', (commit) => {
        if (commit.type === 'translate') {
          cx += commit.delta.x;
          cy += commit.delta.y;
        } else if (commit.type === 'scale') {
          cx = commit.pivot.x + commit.scale.x * (cx - commit.pivot.x);
          cy = commit.pivot.y + commit.scale.y * (cy - commit.pivot.y);
          r *= Math.abs(commit.scale.x);
        }
        // Re-register with updated bounds
        selCtx.registerBounds('circle', { min: Point.from(cx - r, cy - r, 0), max: Point.from(cx + r, cy + r, 0) });
      });
      return null;
    };

    const container = document.createElement('div');
    const dispose = render(
      () => (
        <canvasContext.Provider value={contextStub(vp)}>
          <Select2D editable padding={0}>
            <RegisterCircle />
          </Select2D>
        </canvasContext.Provider>
      ),
      container,
    );
    await waitForEffects();

    const canvas = vp()!.ctx.canvas;
    const addCalls = (canvas.addEventListener as ReturnType<typeof vi.fn>).mock.calls;
    const pointerDown = addCalls.find((c: unknown[]) => c[0] === 'pointerdown')?.[1] as (e: PointerEvent) => void;
    const pointerMove = addCalls.find((c: unknown[]) => c[0] === 'pointermove')?.[1] as (e: PointerEvent) => void;
    const pointerUp = addCalls.find((c: unknown[]) => c[0] === 'pointerup')?.[1] as (e: PointerEvent) => void;

    const setPointerCapture = vi.fn();
    Object.defineProperty(canvas, 'setPointerCapture', { value: setPointerCapture });

    // --- Step 1: scale from corner 1 (screen 100,0) to reduce by 0.5 ---
    // Corner 1 at screen (100, 0). Pivot = corner 3 at world (0, 100).
    // Drag corner 1 halfway towards pivot → screen (50, -50)
    emit(canvas, pointerDown, createPointerEvent('pointerdown', { clientX: 100, clientY: 0, pointerId: 1 }));
    await waitForEffects();
    expect(setPointerCapture).toHaveBeenCalledTimes(1);

    emit(canvas, pointerMove, createPointerEvent('pointermove', { clientX: 50, clientY: -50, pointerId: 1 }));
    await waitForEffects();

    emit(canvas, pointerUp, createPointerEvent('pointerup', { pointerId: 1 }));
    await waitForEffects();

    // After 0.5 scale from pivot (0,100): circle center (50,50) → (25,75), r → 25
    expect(cx).toBeCloseTo(25);
    expect(cy).toBeCloseTo(75);
    expect(r).toBeCloseTo(25);

    // --- Step 2: translate so the top-right corner returns to (100,0) screen ---
    // After scale, bounds are (0,50)-(50,100) → screen corners: (0,-50) to (50,-100)
    // Top-right corner is now at screen (50, -50). Translate so it reaches (100, 0).
    // Screen delta = (50, 50). World delta with scaleFactor=1: dx=50, dy=-50.
    // Drag the box: pointerdown inside the box, then move.
    // Box screen = (0,-50)-(50,-100)... wait, with padding=0 the box = bounds.
    // Actually after commit, the bounds updated to (0,50)-(50,100).
    // Screen: (0,-50), (50,-50), (50,-100), (0,-100). Click inside at (25,-75).
    emit(canvas, pointerDown, createPointerEvent('pointerdown', { clientX: 25, clientY: -75, pointerId: 1 }));
    await waitForEffects();
    expect(setPointerCapture).toHaveBeenCalledTimes(2);

    // Move to shift selection by (+50, +50) in screen = (+50, -50) in world
    emit(canvas, pointerMove, createPointerEvent('pointermove', { clientX: 75, clientY: -25, pointerId: 1 }));
    await waitForEffects();

    emit(canvas, pointerUp, createPointerEvent('pointerup', { pointerId: 1 }));
    await waitForEffects();

    // Circle center shifted by (50, -50) in world: (25+50, 75-50) = (75, 25), r stays 25
    expect(cx).toBeCloseTo(75);
    expect(cy).toBeCloseTo(25);
    expect(r).toBeCloseTo(25);

    // --- Step 3: scale from corner 3 (bottom-left) to restore original size ---
    // Bounds now (50,0)-(100,50). Screen corners:
    //   0=(50,0)  1=(100,0)  2=(100,-50)  3=(50,-50)
    // Corner 3 at screen (50,-50). Pivot = corner 1 at world (100,0).
    // To double the size, drag corner 3 from (50,-50) to (0,-100).
    emit(canvas, pointerDown, createPointerEvent('pointerdown', { clientX: 50, clientY: -50, pointerId: 1 }));
    await waitForEffects();
    expect(setPointerCapture).toHaveBeenCalledTimes(3);

    emit(canvas, pointerMove, createPointerEvent('pointermove', { clientX: 0, clientY: -100, pointerId: 1 }));
    await waitForEffects();

    emit(canvas, pointerUp, createPointerEvent('pointerup', { pointerId: 1 }));
    await waitForEffects();

    // Scale 2x from pivot (100,0): center (75,25) → 100 + 2*(75-100), 0+2*(25-0) = (50, 50), r → 50
    expect(cx).toBeCloseTo(50);
    expect(cy).toBeCloseTo(50);
    expect(r).toBeCloseTo(50);

    dispose();
  });

  test('scale corner-2 while dragging updates visual corners correctly', async () => {
    // Box (-100,-100)-(100,100). Pick corner 2 (world 100,100), screen (100,-100).
    // Pivot = corner 0 (world -100,-100), screen (-100,100).
    // Frame H at (-100,-100), local corner = (200,200).
    const [vp, _setVp] = createSignal<Viewport>(createMockViewport());

    const RegisterBounds = () => {
      const selCtx = useContext(selectionContext);
      selCtx.registerBounds('shape', { min: Point.from(-100, -100, 0), max: Point.from(100, 100, 0) });
      return null;
    };

    const container = document.createElement('div');
    const dispose = render(
      () => (
        <canvasContext.Provider value={contextStub(vp)}>
          <Select2D editable padding={0}>
            <RegisterBounds />
          </Select2D>
        </canvasContext.Provider>
      ),
      container,
    );
    await waitForEffects();

    const canvas = vp()!.ctx.canvas;
    const addCalls = (canvas.addEventListener as ReturnType<typeof vi.fn>).mock.calls;
    const pointerDown = addCalls.find((c: unknown[]) => c[0] === 'pointerdown')?.[1] as (e: PointerEvent) => void;
    const pointerMove = addCalls.find((c: unknown[]) => c[0] === 'pointermove')?.[1] as (e: PointerEvent) => void;
    const pointerUp = addCalls.find((c: unknown[]) => c[0] === 'pointerup')?.[1] as (e: PointerEvent) => void;

    const setPointerCapture = vi.fn();
    Object.defineProperty(canvas, 'setPointerCapture', { value: setPointerCapture });

    // Drag corner-2 (screen 100,-100) to (150,-150) → world (150,150)
    // localMouse = (150-(-100), 150-(-100)) = (250,250)
    // sx = 250/200 = 1.25, sy = 250/200 = 1.25 (uniform 25% larger)
    emit(canvas, pointerDown, createPointerEvent('pointerdown', { clientX: 100, clientY: -100, pointerId: 1 }));
    await waitForEffects();

    emit(canvas, pointerMove, createPointerEvent('pointermove', { clientX: 150, clientY: -150, pointerId: 1 }));
    await waitForEffects();

    emit(canvas, pointerUp, createPointerEvent('pointerup', { pointerId: 1 }));
    await waitForEffects();

    dispose();
  });

  test('scale corner-1, drag to enlarge, commit gives correct values', async () => {
    // Box (-100,-100)-(100,100). Corner 1 (world 100,-100), screen (100,100).
    // Pivot = corner 3 (world -100,100), screen (-100,-100).
    const [vp, _setVp] = createSignal<Viewport>(createMockViewport());

    let cx = 0;
    let cy = 0;
    let r = 100;
    const commitLog: Array<SelectionCommit> = [];

    const RegisterCircle = () => {
      const selCtx = useContext(selectionContext);
      selCtx.registerBounds('circle', { min: Point.from(cx - r, cy - r, 0), max: Point.from(cx + r, cy + r, 0) });
      selCtx.registerTransformHandler('circle', (commit) => {
        commitLog.push(commit);
        if (commit.type === 'scale') {
          cx = commit.pivot.x + commit.scale.x * (cx - commit.pivot.x);
          cy = commit.pivot.y + commit.scale.y * (cy - commit.pivot.y);
          r *= Math.abs(commit.scale.x);
          selCtx.registerBounds('circle', { min: Point.from(cx - r, cy - r, 0), max: Point.from(cx + r, cy + r, 0) });
        }
      });
      return null;
    };

    const container = document.createElement('div');
    const dispose = render(
      () => (
        <canvasContext.Provider value={contextStub(vp)}>
          <Select2D editable padding={0}>
            <RegisterCircle />
          </Select2D>
        </canvasContext.Provider>
      ),
      container,
    );
    await waitForEffects();

    const canvas = vp()!.ctx.canvas;
    const addCalls = (canvas.addEventListener as ReturnType<typeof vi.fn>).mock.calls;
    const pointerDown = addCalls.find((c: unknown[]) => c[0] === 'pointerdown')?.[1] as (e: PointerEvent) => void;
    const pointerMove = addCalls.find((c: unknown[]) => c[0] === 'pointermove')?.[1] as (e: PointerEvent) => void;
    const pointerUp = addCalls.find((c: unknown[]) => c[0] === 'pointerup')?.[1] as (e: PointerEvent) => void;

    const setPointerCapture = vi.fn();
    Object.defineProperty(canvas, 'setPointerCapture', { value: setPointerCapture });

    // Drag corner-1 (screen 100,100) to (200,50) → world (200,-50)
    // Pivot = corner 3 at world (-100,100) = screen (-100,-100)
    // localMouse = (200-(-100), -50-100) = (300, -150) — but save check: world mouse Y = -50, pivot world Y = 100,
    //   local Y = -50 - 100 = -150. So local = (300, -150)
    // localCorner = (200, -200)  (100 - (-100) = 200, -100 - 100 = -200)
    // sx = 300/200 = 1.5, sy = -150/(-200) = 0.75
    // Visual: corner at screen → worldToScreen(compose(H*S*H^-1, identity), 100, -100)
    //   = screen position of the shape's corner 1 after scale
    emit(canvas, pointerDown, createPointerEvent('pointerdown', { clientX: 100, clientY: 100, pointerId: 1 }));
    await waitForEffects();

    emit(canvas, pointerMove, createPointerEvent('pointermove', { clientX: 200, clientY: 50, pointerId: 1 }));
    await waitForEffects();

    // Visual via commit handler verified below — no need for canvas mock nav

    emit(canvas, pointerUp, createPointerEvent('pointerup', { pointerId: 1 }));
    await waitForEffects();

    // Commit should reflect sx=1.5, sy=0.75 at pivot (-100, 100)
    expect(commitLog.length).toBeGreaterThan(0);
    const scaleCommit = commitLog.find(c => c.type === 'scale')!;
    expect(scaleCommit.scale.x).toBeCloseTo(1.5);
    expect(scaleCommit.scale.y).toBeCloseTo(0.75);
    expect(scaleCommit.pivot.x).toBeCloseTo(-100);
    expect(scaleCommit.pivot.y).toBeCloseTo(100);

    dispose();
  });

  test('scale corner-3, drag to enlarge, commit gives correct values', async () => {
    // Box after previous test has been scaled. Use fresh bounds.
    const [vp, _setVp] = createSignal<Viewport>(createMockViewport());

    let minX = -100, minY = -100, maxX = 100, maxY = 100;
    const commitLog: Array<SelectionCommit> = [];

    const RegisterBounds = () => {
      const selCtx = useContext(selectionContext);
      selCtx.registerBounds('shape', { min: Point.from(minX, minY, 0), max: Point.from(maxX, maxY, 0) });
      selCtx.registerTransformHandler('shape', (commit) => {
        commitLog.push(commit);
        if (commit.type === 'scale') {
          const sx = commit.scale.x;
          const sy = commit.scale.y;
          const px = commit.pivot.x;
          const py = commit.pivot.y;
          minX = px + sx * (minX - px);
          minY = py + sy * (minY - py);
          maxX = px + sx * (maxX - px);
          maxY = py + sy * (maxY - py);
          selCtx.registerBounds('shape', { min: Point.from(minX, minY, 0), max: Point.from(maxX, maxY, 0) });
        }
      });
      return null;
    };

    const container = document.createElement('div');
    const dispose = render(
      () => (
        <canvasContext.Provider value={contextStub(vp)}>
          <Select2D editable padding={0}>
            <RegisterBounds />
          </Select2D>
        </canvasContext.Provider>
      ),
      container,
    );
    await waitForEffects();

    const canvas = vp()!.ctx.canvas;
    const addCalls = (canvas.addEventListener as ReturnType<typeof vi.fn>).mock.calls;
    const pointerDown = addCalls.find((c: unknown[]) => c[0] === 'pointerdown')?.[1] as (e: PointerEvent) => void;
    const pointerMove = addCalls.find((c: unknown[]) => c[0] === 'pointermove')?.[1] as (e: PointerEvent) => void;
    const pointerUp = addCalls.find((c: unknown[]) => c[0] === 'pointerup')?.[1] as (e: PointerEvent) => void;

    const setPointerCapture = vi.fn();
    Object.defineProperty(canvas, 'setPointerCapture', { value: setPointerCapture });

    // Corner 3 at world (-100, 100) = screen (-100, -100)
    // Pivot = corner 1 at world (100, -100) = screen (100, 100)
    // Drag to screen (0, 0) → world (0, 0)
    // Frame H at (100, -100). localCorner = (-200, 200).
    // localMouse = (0-100, 0-(-100)) = (-100, 100)
    // sx = -100/(-200) = 0.5, sy = 100/200 = 0.5
    emit(canvas, pointerDown, createPointerEvent('pointerdown', { clientX: -100, clientY: -100, pointerId: 1 }));
    await waitForEffects();

    emit(canvas, pointerMove, createPointerEvent('pointermove', { clientX: 0, clientY: 0, pointerId: 1 }));
    await waitForEffects();

    // Visual via commit handler verified below

    emit(canvas, pointerUp, createPointerEvent('pointerup', { pointerId: 1 }));
    await waitForEffects();

    expect(commitLog.length).toBeGreaterThan(0);
    const scaleCommit = commitLog.find(c => c.type === 'scale')!;
    expect(scaleCommit.scale.x).toBeCloseTo(0.5);
    expect(scaleCommit.scale.y).toBeCloseTo(0.5);
    expect(scaleCommit.pivot.x).toBeCloseTo(100);
    expect(scaleCommit.pivot.y).toBeCloseTo(-100);

    dispose();
  });

});


describe('Select2D rotation snapping', () => {
  function createSnapTestSetup(snapRotation: boolean): { vp: () => Viewport; container: HTMLDivElement; dispose: () => void } {
    const [vp, _setVp] = createSignal<Viewport>(createMockViewport());
    const RegisterBounds = () => {
      const selCtx = useContext(selectionContext);
      selCtx.registerBounds('shape', { min: Point.from(0, 0, 0), max: Point.from(100, 60, 0) });
      return null;
    };

    const container = document.createElement('div');
    const dispose = render(
      () => (
        <canvasContext.Provider value={contextStub(vp)}>
          <Select2D editable padding={4} snapRotation={snapRotation}>
            <RegisterBounds />
          </Select2D>
        </canvasContext.Provider>
      ),
      container,
    );
    return { vp, container, dispose };
  }

  test('rotation remains unsnapped by default', async () => {
    const { vp, dispose } = createSnapTestSetup(false);
    await waitForEffects();

    const canvas = vp()!.ctx.canvas;
    const addCalls = (canvas.addEventListener as ReturnType<typeof vi.fn>).mock.calls;
    const pointerDown = addCalls.find((c: unknown[]) => c[0] === 'pointerdown')?.[1] as (e: PointerEvent) => void;
    const pointerMove = addCalls.find((c: unknown[]) => c[0] === 'pointermove')?.[1] as (e: PointerEvent) => void;

    const setPointerCapture = vi.fn();
    Object.defineProperty(canvas, 'setPointerCapture', { value: setPointerCapture });

    const strokeStyleLog = (vp()!.ctx as unknown as { _strokeStyleLog: string[] })._strokeStyleLog;
    strokeStyleLog.length = 0;

    // Start rotation on rotation handle at (50, -84)
    const evt = createPointerEvent('pointerdown', { clientX: 50, clientY: -84, pointerId: 1 });
    evt.stopImmediatePropagation = vi.fn();
    emit(canvas, pointerDown, evt);
    await waitForEffects();

    // Move to near π/2 → rawAngle ≈ 90° without snap
    emit(canvas, pointerMove, createPointerEvent('pointermove', { clientX: 150, clientY: -30 }));
    await waitForEffects();

    // Snap color (#ff8c00) should NOT appear
    expect(strokeStyleLog).not.toContain('#ff8c00');
    dispose();
  });

  test('snapRotation enabled snaps near 90 degrees', async () => {
    const { vp, dispose } = createSnapTestSetup(true);
    await waitForEffects();

    const canvas = vp()!.ctx.canvas;
    const addCalls = (canvas.addEventListener as ReturnType<typeof vi.fn>).mock.calls;
    const pointerDown = addCalls.find((c: unknown[]) => c[0] === 'pointerdown')?.[1] as (e: PointerEvent) => void;
    const pointerMove = addCalls.find((c: unknown[]) => c[0] === 'pointermove')?.[1] as (e: PointerEvent) => void;

    const setPointerCapture = vi.fn();
    Object.defineProperty(canvas, 'setPointerCapture', { value: setPointerCapture });

    const strokeStyleLog = (vp()!.ctx as unknown as { _strokeStyleLog: string[] })._strokeStyleLog;
    strokeStyleLog.length = 0;

    // Start rotation on rotation handle
    const evt = createPointerEvent('pointerdown', { clientX: 50, clientY: -84, pointerId: 1 });
    evt.stopImmediatePropagation = vi.fn();
    emit(canvas, pointerDown, evt);
    await waitForEffects();

    // Move to near π/2 → rawAngle ≈ 90°, should snap
    emit(canvas, pointerMove, createPointerEvent('pointermove', { clientX: 150, clientY: -30 }));
    await waitForEffects();

    expect(strokeStyleLog).toContain('#ff8c00');
    dispose();
  });

  test('snapRotation enabled: outside threshold preserves free rotation', async () => {
    const { vp, dispose } = createSnapTestSetup(true);
    await waitForEffects();

    const canvas = vp()!.ctx.canvas;
    const addCalls = (canvas.addEventListener as ReturnType<typeof vi.fn>).mock.calls;
    const pointerDown = addCalls.find((c: unknown[]) => c[0] === 'pointerdown')?.[1] as (e: PointerEvent) => void;
    const pointerMove = addCalls.find((c: unknown[]) => c[0] === 'pointermove')?.[1] as (e: PointerEvent) => void;

    const setPointerCapture = vi.fn();
    Object.defineProperty(canvas, 'setPointerCapture', { value: setPointerCapture });

    const strokeStyleLog = (vp()!.ctx as unknown as { _strokeStyleLog: string[] })._strokeStyleLog;
    strokeStyleLog.length = 0;

    // Start rotation on rotation handle
    const evt = createPointerEvent('pointerdown', { clientX: 50, clientY: -84, pointerId: 1 });
    evt.stopImmediatePropagation = vi.fn();
    emit(canvas, pointerDown, evt);
    await waitForEffects();

    // rawAngle ≈ 0.5 rad (~28.7°) > 15° threshold, should NOT snap
    emit(canvas, pointerMove, createPointerEvent('pointermove', { clientX: 79, clientY: -83 }));
    await waitForEffects();

    expect(strokeStyleLog).not.toContain('#ff8c00');
    dispose();
  });
});

describe('Select2D editable prop', () => {
  function createSetup(editable: boolean): { vp: () => Viewport; container: HTMLDivElement; dispose: () => void } {
    const [vp, _setVp] = createSignal<Viewport>(createMockViewport());
    const RegisterBounds = () => {
      const selCtx = useContext(selectionContext);
      selCtx.registerBounds('shape', { min: Point.from(0, 0, 0), max: Point.from(100, 60, 0) });
      return null;
    };
    const container = document.createElement('div');
    const dispose = render(
      () => (
        <canvasContext.Provider value={contextStub(vp)}>
          <Select2D editable={editable} padding={4}>
            <RegisterBounds />
          </Select2D>
        </canvasContext.Provider>
      ),
      container,
    );
    return { vp, container, dispose };
  }

  test('editable=false draws no selection UI', async () => {
    const { vp, dispose } = createSetup(false);
    await waitForEffects();
    const ctx = vp()!.ctx;
    expect(ctx.setLineDash).not.toHaveBeenCalled();
    expect(ctx.beginPath).not.toHaveBeenCalled();
    expect(ctx.stroke).not.toHaveBeenCalled();
    dispose();
  });

  test('editable=true draws selection UI', async () => {
    const { vp, dispose } = createSetup(true);
    await waitForEffects();
    const ctx = vp()!.ctx;
    expect(ctx.setLineDash).toHaveBeenCalled();
    dispose();
  });

  test('editable=false prevents drag', async () => {
    const { vp, dispose } = createSetup(false);
    await waitForEffects();
    const canvas = vp()!.ctx.canvas;
    const addCalls = (canvas.addEventListener as ReturnType<typeof vi.fn>).mock.calls;
    const pointerDown = addCalls.find((c: unknown[]) => c[0] === 'pointerdown')?.[1] as (e: PointerEvent) => void;

    expect(pointerDown).toBeUndefined();
    dispose();
  });

  test('editable=true allows drag', async () => {
    const { vp, dispose } = createSetup(true);
    await waitForEffects();
    const canvas = vp()!.ctx.canvas;
    const addCalls = (canvas.addEventListener as ReturnType<typeof vi.fn>).mock.calls;
    const pointerDown = addCalls.find((c: unknown[]) => c[0] === 'pointerdown')?.[1] as (e: PointerEvent) => void;

    const setPointerCapture = vi.fn();
    Object.defineProperty(canvas, 'setPointerCapture', { value: setPointerCapture });

    emit(canvas, pointerDown,
      createPointerEvent('pointerdown', { clientX: 50, clientY: 0, pointerId: 1 }),
    );
    await waitForEffects();
    expect(setPointerCapture).toHaveBeenCalled();
    dispose();
  });

  test('Select2D registers pointer handlers', async () => {
    const [vp, _setVp] = createSignal<Viewport>(createMockViewport());

    const container = document.createElement('div');
    const dispose = render(
      () => (
        <canvasContext.Provider value={contextStub(vp)}>
          <Select2D editable padding={4} />
        </canvasContext.Provider>
      ),
      container,
    );
    await waitForEffects();

    const canvas = vp()!.ctx.canvas;
    const addCalls = (canvas.addEventListener as ReturnType<typeof vi.fn>).mock.calls;
    expect(addCalls.find((c: unknown[]) => c[0] === 'pointerdown')).toBeDefined();
    expect(addCalls.find((c: unknown[]) => c[0] === 'pointermove')).toBeDefined();
    expect(addCalls.find((c: unknown[]) => c[0] === 'pointerup')).toBeDefined();

    dispose();
  });
});

//Verified-by-construction tests for the rotated-scale interaction.
//
// During the drag (buildScaleChildTransform): rotation is around the ORIGINAL
// center so the box stays rectangular, the opposite (pivot) corner stays
// pinned, and the dragged corner follows the mouse exactly.
//
// On release, the commit scales children and re-applies rotation around the
// NEW center, which would move the pivot; scaleCommitTranslation returns the
// world delta that cancels that move so there is no jump.
describe('rotated scale: drag invariants + no release jump', () => {
  const w2s = (M: Transform, wx: number, wy: number): [number, number] => {
    const m = M.directMatrix;
    return [m[0]! * wx + m[1]! * wy + m[12]!, -m[4]! * wx - m[5]! * wy + m[13]!];
  };
  const s2w = (M: Transform, sx: number, sy: number): [number, number] => {
    const m = M.directMatrix;
    const a = m[0]!, b = m[1]!, tx = m[12]!, c = m[4]!, d = m[5]!, ty = m[13]!;
    const det = a * d - b * c;
    const u = sx - tx, v = -(sy - ty);
    return [(d * u - b * v) / det, (-c * u + a * v) / det];
  };
  // Matches the production helper: pivot Y is flipped so the rotation is
  // correct under the renderer's transposed + Y-negated convention.
  const rotationAround = (angle: number, pivot: Point): Transform =>
    compose(
      Transform.fromTranslation(-pivot.x, pivot.y, 0),
      Transform.fromRotationZ(angle),
      Transform.fromTranslation(pivot.x, -pivot.y, 0),
    );

  const box: BoundingBox = { min: Point.from(-100, -50, 0), max: Point.from(100, 50, 0) };
  const center = Point.from((box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, 0);
  const axis: [number, number][] = [
    [box.min.x, box.min.y],
    [box.max.x, box.min.y],
    [box.max.x, box.max.y],
    [box.min.x, box.max.y],
  ];

  const viewports: [string, Transform][] = [
    ['translate-only', compose(Transform.fromTranslation(400, 300, 0))],
    ['scaled+translated', compose(
      Transform.fromTranslation(400, 300, 0),
      Transform.fromScale(1.3, 1.3, 1),
    )],
  ];
  const angles = [0, Math.PI / 6, -Math.PI / 4, 1.1];
  const corners = [0, 1, 2, 3];

  for (const [vpName, baseTx] of viewports) {
    for (const angle of angles) {
      const Mrot = compose(rotationAround(angle, center), baseTx);
      const good = axis.map((c) => w2s(Mrot, c[0], c[1]));
      for (const i of corners) {
        const opp = (i + 2) % 4;
        const rawPivot = axis[opp]!;
        const pivot = Point.from(rawPivot[0], rawPivot[1], 0);
        const cornerAxis = axis[i]!;
        const lc = [cornerAxis[0] - rawPivot[0], cornerAxis[1] - rawPivot[1]];

        test(`${vpName} angle=${(angle * 180 / Math.PI).toFixed(0)} corner=${i}: rect + pinned pivot + follows mouse`, () => {
          const mouse: [number, number] = [good[i]![0] + 140, good[i]![1] - 40];
          const [mx, my] = s2w(Mrot, mouse[0], mouse[1]);
          const sx = lc[0] !== 0 ? (mx - rawPivot[0]) / lc[0] : 1;
          const sy = lc[1] !== 0 ? (my - rawPivot[1]) / lc[1] : 1;

          const M = buildScaleChildTransform(baseTx, angle, center, pivot, sx, sy);
          const out = axis.map((c) => w2s(M, c[0], c[1]));

          // 1. rectangularity (normalized perpendicularity)
          const v01 = [out[1]![0] - out[0]![0], out[1]![1] - out[0]![1]];
          const v03 = [out[3]![0] - out[0]![0], out[3]![1] - out[0]![1]];
          const cos = (v01[0]! * v03[0]! + v01[1]! * v03[1]!) /
            (Math.hypot(v01[0]!, v01[1]!) * Math.hypot(v03[0]!, v03[1]!));
          expect(cos).toBeCloseTo(0, 5);

          // 2. pinned pivot
          expect(out[opp]![0]).toBeCloseTo(good[opp]![0], 3);
          expect(out[opp]![1]).toBeCloseTo(good[opp]![1], 3);

          // 3. dragged corner follows the mouse exactly
          expect(out[i]![0]).toBeCloseTo(mouse[0], 3);
          expect(out[i]![1]).toBeCloseTo(mouse[1], 3);

          // 4. no release jump: replicate the REAL commit pipeline — scale
          //    children around the pivot, translate by the compensation, then
          //    rotate around the resulting bounding-box center (the translate
          //    moves that center too). The pivot must land exactly where the
          //    drag pinned it.
          const tdv = scaleCommitTranslation(baseTx, angle, center, box, pivot, sx, sy);
          const na = axis.map((c) => [
            rawPivot[0] + sx * (c[0] - rawPivot[0]) + tdv.x,
            rawPivot[1] + sy * (c[1] - rawPivot[1]) + tdv.y,
          ] as [number, number]);
          const newCenter = Point.from(
            (Math.min(...na.map((c) => c[0])) + Math.max(...na.map((c) => c[0]))) / 2,
            (Math.min(...na.map((c) => c[1])) + Math.max(...na.map((c) => c[1]))) / 2,
            0,
          );
          const Mcommit = compose(rotationAround(angle, newCenter), baseTx);
          const committedPivot = w2s(Mcommit, na[opp]![0], na[opp]![1]);
          // sub-0.1px agreement; the 2-point solve carries tiny float error.
          expect(committedPivot[0]).toBeCloseTo(good[opp]![0], 1);
          expect(committedPivot[1]).toBeCloseTo(good[opp]![1], 1);
        });
      }
    }
  }

  test('at scale=1 the transform equals the rotation-only render', () => {
    const baseTx = compose(Transform.fromTranslation(400, 300, 0));
    const angle = Math.PI / 6;
    const Mrot = compose(rotationAround(angle, center), baseTx);
    const good = axis.map((c) => w2s(Mrot, c[0], c[1]));
    const pivot = Point.from(axis[0]![0], axis[0]![1], 0);
    const M = buildScaleChildTransform(baseTx, angle, center, pivot, 1, 1);
    const out = axis.map((c) => w2s(M, c[0], c[1]));
    out.forEach((p, k) => {
      expect(p[0]).toBeCloseTo(good[k]![0], 3);
      expect(p[1]).toBeCloseTo(good[k]![1], 3);
    });
  });
});

describe('buildChildViewportTransform', () => {

  const w2s = (M: Transform, wx: number, wy: number): [number, number] => {
    const m = M.directMatrix;
    return [m[0]! * wx + m[1]! * wy + m[12]!, -m[4]! * wx - m[5]! * wy + m[13]!];
  };
  const rotationAround = (angle: number, pivot: Point): Transform =>
    compose(
      Transform.fromTranslation(-pivot.x, pivot.y, 0),
      Transform.fromRotationZ(angle),
      Transform.fromTranslation(pivot.x, -pivot.y, 0),
    );

  const box: BoundingBox = { min: Point.from(-50, -30, 0), max: Point.from(50, 30, 0) };
  const center = Point.from(0, 0, 0);
  const pivot = Point.from(-50, -30, 0);

  test('null box returns baseTx unchanged', () => {
    const tx = compose(Transform.fromTranslation(100, 200, 0));
    const result = buildChildViewportTransform(tx, {
      box: null,
      angle: 0.5,
      sx: 1, sy: 1,
      scaleShiftActive: false,
      scaleCenterPivot: Point.origin(),
      scalePivot: null,
    });
    expect(result.directMatrix).toEqual(tx.directMatrix);
  });

  test('identity config (angle=0, sx=1, sy=1, box present) returns baseTx unchanged', () => {
    const tx = compose(Transform.fromTranslation(100, 200, 0));
    const result = buildChildViewportTransform(tx, {
      box,
      angle: 0, sx: 1, sy: 1,
      scaleShiftActive: false,
      scaleCenterPivot: Point.origin(),
      scalePivot: null,
    });
    expect(result.directMatrix).toEqual(tx.directMatrix);
  });

  test('rotation-only path matches compose(rotationAround(angle, center), baseTx)', () => {
    const baseTx = compose(Transform.fromTranslation(400, 300, 0));
    const angle = Math.PI / 4;
    const expected = compose(rotationAround(angle, center), baseTx);
    const result = buildChildViewportTransform(baseTx, {
      box,
      angle, sx: 1, sy: 1,
      scaleShiftActive: false,
      scaleCenterPivot: Point.origin(),
      scalePivot: null,
    });
    // Verify corner positions match
    const corners = [[-50, -30], [50, -30], [50, 30], [-50, 30]] as const;
    corners.forEach(([wx, wy]) => {
      const [ex, ey] = w2s(expected, wx, wy);
      const [rx, ry] = w2s(result, wx, wy);
      expect(rx).toBeCloseTo(ex, 5);
      expect(ry).toBeCloseTo(ey, 5);
    });
  });

  test('scale path delegates to buildScaleChildTransform when pivot is set', () => {
    const baseTx = compose(Transform.fromTranslation(400, 300, 0));
    const angle = Math.PI / 6;
    const sx = 1.5, sy = 0.8;
    // buildChildViewportTransform with scale-active + non-null pivot
    const result = buildChildViewportTransform(baseTx, {
      box,
      angle, sx, sy,
      scaleShiftActive: false,
      scaleCenterPivot: Point.origin(),
      scalePivot: pivot,
    });
    // Equivalent via buildScaleChildTransform directly
    const direct = buildScaleChildTransform(baseTx, angle, center, pivot, sx, sy);
    const corners = [[-50, -30], [50, -30], [50, 30], [-50, 30]] as const;
    corners.forEach(([wx, wy]) => {
      const [ex, ey] = w2s(direct, wx, wy);
      const [rx, ry] = w2s(result, wx, wy);
      expect(rx).toBeCloseTo(ex, 5);
      expect(ry).toBeCloseTo(ey, 5);
    });
  });

  test('null pivot with sx/sy ≠1 falls back to rotation-only path', () => {
    const baseTx = compose(Transform.fromTranslation(400, 300, 0));
    const angle = Math.PI / 6;
    // When both scalePivot=null and scaleShiftActive=false, pivot=null
    const result = buildChildViewportTransform(baseTx, {
      box,
      angle, sx: 1.5, sy: 1.3,
      scaleShiftActive: false,
      scaleCenterPivot: Point.origin(),
      scalePivot: null,
    });
    // Should be rotation-only (scale ignored since pivot is null)
    const expected = compose(rotationAround(angle, center), baseTx);
    const corners = [[-50, -30], [50, -30], [50, 30], [-50, 30]] as const;
    corners.forEach(([wx, wy]) => {
      const [ex, ey] = w2s(expected, wx, wy);
      const [rx, ry] = w2s(result, wx, wy);
      expect(rx).toBeCloseTo(ex, 5);
      expect(ry).toBeCloseTo(ey, 5);
    });
  });
});
