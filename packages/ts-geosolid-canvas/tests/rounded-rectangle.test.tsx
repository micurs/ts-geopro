/// <reference lib="dom" />
import { describe, expect, test, vi } from 'vitest';
import { render } from 'solid-js/web';
import { createSignal } from 'solid-js';
import { Point, Transform, Vector } from '@micurs/ts-geopro';
import {
  RoundedRectangle,
  clampRadius,
  drawRoundedRectangle,
} from '../src/rounded-rectangle.tsx';
import type { RoundedRectangleProps } from '../src/rounded-rectangle.tsx';
import { canvasContext } from '../src/canvas/canvas-context.ts';
import {
  selectionContext,
  type SelectionCommit,
  type SelectionContextValue,
} from '../src/canvas/selection.ts';
import type { BoundingBox } from '../src/types.ts';
import type { Viewport } from '../src/canvas/types.ts';

// jsdom does not provide PointerEvent; polyfill with MouseEvent.
if (typeof PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
    }
  }
  (globalThis as Record<string, unknown>).PointerEvent =
    PointerEventPolyfill as unknown as typeof PointerEvent;
}

function createPointerEvent(
  type: string,
  init: Partial<PointerEventInit> = {},
): PointerEvent {
  return new PointerEvent(type, { bubbles: true, cancelable: true, ...init });
}

const createMockViewport = (): Viewport => {
  const ctx = {
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 0,
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arcTo: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    closePath: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn(),
    setLineDash: vi.fn(),
    clearRect: vi.fn(),
    isPointInPath: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
  return {
    ctx,
    scaleFactor: 1,
    trans: [0, 0],
    transform: Transform.identity(),
    dimensions: [800, 600],
    pan: [0, 0],
  };
};

const canvasContextStub = (vp: () => Viewport | undefined) => ({
  vp,
  redrawVersion: () => 0,
  requestRedraw: () => {},
  rAFWillClear: () => false,
});

function waitForEffects(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// ----------------------------------------------------------------------------
// drawRoundedRectangle — pure rendering tests (no component, no Solid)
// ----------------------------------------------------------------------------

describe('drawRoundedRectangle rendering', () => {
  test('stroke path uses explicit radius at each corner', () => {
    const vp = createMockViewport();
    drawRoundedRectangle(vp, {
      id: 'test',
      center: Point.from(50, 50, 0),
      width: 100,
      height: 60,
      radius: 10,
      color: '#ff0000',
      strokeWidth: 2,
    });

    const ctx = vp.ctx;
    expect(ctx.strokeStyle).toBe('#ff0000');
    // getScaledWidth(2, 1) === 2 / max(1,1) === 2
    expect(ctx.lineWidth).toBe(2);
    expect(ctx.beginPath).toHaveBeenCalledTimes(1);
    expect(ctx.closePath).toHaveBeenCalledTimes(1);
    expect(ctx.stroke).toHaveBeenCalledTimes(1);

    // Top edge starts past the top-left arc.
    const moveToCalls = (ctx.moveTo as ReturnType<typeof vi.fn>).mock.calls;
    expect(moveToCalls[0]).toEqual([10, 80]);

    // 4 straight edges (one per side).
    const lineToCalls = (ctx.lineTo as ReturnType<typeof vi.fn>).mock.calls;
    expect(lineToCalls).toHaveLength(4);
    expect(lineToCalls[0]).toEqual([90, 80]); // top edge → top-right tangent
    expect(lineToCalls[1]).toEqual([100, 30]); // right edge
    expect(lineToCalls[2]).toEqual([10, 20]); // bottom edge
    expect(lineToCalls[3]).toEqual([0, 70]); // left edge

    // 4 corner arcs, each with radius 10.
    const arcToCalls = (ctx.arcTo as ReturnType<typeof vi.fn>).mock.calls;
    expect(arcToCalls).toHaveLength(4);
    arcToCalls.forEach((c) => expect(c[4]).toBe(10));
    // Top-right corner: corner=(100,80), end tangent=(100,70).
    expect(arcToCalls[0]).toEqual([100, 80, 100, 70, 10]);
    // Bottom-right corner: corner=(100,20), end tangent=(90,20).
    expect(arcToCalls[1]).toEqual([100, 20, 90, 20, 10]);
    // Bottom-left corner: corner=(0,20), end tangent=(0,30).
    expect(arcToCalls[2]).toEqual([0, 20, 0, 30, 10]);
    // Top-left corner: corner=(0,80), end tangent=(10,80).
    expect(arcToCalls[3]).toEqual([0, 80, 10, 80, 10]);
  });

  test('fill path fills then strokes', () => {
    const vp = createMockViewport();
    drawRoundedRectangle(vp, {
      id: 'test',
      center: Point.from(50, 50, 0),
      width: 100,
      height: 60,
      radius: 10,
      fill: '#00ff00',
    });

    expect(vp.ctx.fillStyle).toBe('#00ff00');
    expect(vp.ctx.fill).toHaveBeenCalledTimes(1);
    expect(vp.ctx.stroke).toHaveBeenCalledTimes(1);
    // fill must happen before stroke (call index ordering).
    const fillIdx = (vp.ctx.fill as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    const strokeIdx = (vp.ctx.stroke as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    expect(fillIdx).toBeLessThan(strokeIdx);
  });

  test('default color is black and strokeWidth is 1', () => {
    const vp = createMockViewport();
    drawRoundedRectangle(vp, {
      id: 'test',
      center: Point.from(0, 0, 0),
      width: 50,
      height: 50,
      radius: 5,
    });

    expect(vp.ctx.strokeStyle).toBe('black');
    expect(vp.ctx.lineWidth).toBe(1);
  });

  test('zero radius produces a plain rectangle path', () => {
    const vp = createMockViewport();
    drawRoundedRectangle(vp, {
      id: 'test',
      center: Point.from(50, 50, 0),
      width: 100,
      height: 60,
      radius: 0,
    });

    const moveToCalls = (vp.ctx.moveTo as ReturnType<typeof vi.fn>).mock.calls;
    // r=0 collapses the start to the actual top-left corner.
    expect(moveToCalls[0]).toEqual([0, 80]);

    const arcToCalls = (vp.ctx.arcTo as ReturnType<typeof vi.fn>).mock.calls;
    // All 4 arcTo calls still happen with radius 0; stroke + fill pipeline intact.
    expect(arcToCalls).toHaveLength(4);
    arcToCalls.forEach((c) => expect(c[4]).toBe(0));
    expect(vp.ctx.stroke).toHaveBeenCalledTimes(1);
  });

  test('overlarge radius is clamped to min(width, height)/2', () => {
    const vp = createMockViewport();
    drawRoundedRectangle(vp, {
      id: 'test',
      center: Point.from(50, 50, 0),
      width: 100,
      height: 60,
      radius: 1000, // min(100,60)/2 = 30 is the real cap.
    });

    const arcToCalls = (vp.ctx.arcTo as ReturnType<typeof vi.fn>).mock.calls;
    expect(arcToCalls).toHaveLength(4);
    arcToCalls.forEach((c) => expect(c[4]).toBe(30));
    // Start point uses the clamped radius too.
    const moveToCalls = (vp.ctx.moveTo as ReturnType<typeof vi.fn>).mock.calls;
    expect(moveToCalls[0]).toEqual([30, 80]);
  });

  test('negative radius clamps to 0', () => {
    const vp = createMockViewport();
    drawRoundedRectangle(vp, {
      id: 'test',
      center: Point.from(0, 0, 0),
      width: 40,
      height: 40,
      radius: -7,
    });
    const arcToCalls = (vp.ctx.arcTo as ReturnType<typeof vi.fn>).mock.calls;
    arcToCalls.forEach((c) => expect(c[4]).toBe(0));
  });
});

// ----------------------------------------------------------------------------
// clampRadius — direct unit tests
// ----------------------------------------------------------------------------

describe('clampRadius', () => {
  test('clamps to 0..min(w,h)/2', () => {
    expect(clampRadius(5, 100, 60)).toBe(5);
    expect(clampRadius(0, 100, 60)).toBe(0);
    expect(clampRadius(30, 100, 60)).toBe(30);
    expect(clampRadius(31, 100, 60)).toBe(30);
    expect(clampRadius(50, 100, 60)).toBe(30);
    expect(clampRadius(-5, 100, 60)).toBe(0);
    expect(clampRadius(Number.POSITIVE_INFINITY, 100, 60)).toBe(30);
    expect(clampRadius(Number.NaN, 100, 60)).toBe(0);
  });

  test('returns 0 for degenerate dimensions', () => {
    expect(clampRadius(5, 0, 0)).toBe(0);
    expect(clampRadius(5, -10, 20)).toBe(0);
  });
});

// ----------------------------------------------------------------------------
// Component tests — handle rendering + direct drag + selection commit
// ----------------------------------------------------------------------------

/**
 * Build a viewport whose ctx.canvas is a real HTMLCanvasElement so
 * useEditableDrag can attach pointer listeners. The drawing methods are
 * vi.fn mocks so we can assert against the call log.
 */
function setupEditableViewport(): { vp: Viewport; canvas: HTMLCanvasElement } {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  // jsdom doesn't implement setPointerCapture.
  canvas.setPointerCapture ??= () => {};
  canvas.releasePointerCapture ??= () => {};
  canvas.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
      width: 800,
      height: 600,
    }) as DOMRect;
  document.body.appendChild(canvas);

  const ctx = {
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 0,
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arcTo: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    closePath: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn(),
    setLineDash: vi.fn(),
    clearRect: vi.fn(),
    isPointInPath: vi.fn(),
    canvas,
  } as unknown as CanvasRenderingContext2D;

  const vp: Viewport = {
    ctx,
    scaleFactor: 1,
    trans: [0, 0],
    transform: Transform.identity(),
    dimensions: [800, 600],
    pan: [0, 0],
  };
  return { vp, canvas };
}

function makeSelectionStub(): {
  stub: SelectionContextValue;
  bounds: Map<string, BoundingBox>;
  handlers: Map<string, (commit: SelectionCommit) => void>;
} {
  const bounds = new Map<string, BoundingBox>();
  const handlers = new Map<string, (commit: SelectionCommit) => void>();
  const stub: SelectionContextValue = {
    registerBounds: (id, box) => {
      bounds.set(id, box);
    },
    unregisterBounds: (id) => {
      bounds.delete(id);
    },
    registerTransformHandler: (id, handler) => {
      handlers.set(id, handler);
    },
    unregisterTransformHandler: (id) => {
      handlers.delete(id);
    },
  };
  return { stub, bounds, handlers };
}

function lastArcPositions(
  ctx: CanvasRenderingContext2D,
  count: number,
): Array<[number, number, number]> {
  const calls = (ctx.arc as ReturnType<typeof vi.fn>).mock.calls.slice(-count);
  return calls.map((c) => [c[0] as number, c[1] as number, c[2] as number]);
}

function dispatchDown(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): void {
  canvas.dispatchEvent(
    createPointerEvent('pointerdown', { clientX, clientY, pointerId: 1 }),
  );
}

function dispatchMove(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): void {
  canvas.dispatchEvent(
    createPointerEvent('pointermove', { clientX, clientY, pointerId: 1 }),
  );
}

function dispatchUp(canvas: HTMLCanvasElement): void {
  canvas.dispatchEvent(
    createPointerEvent('pointerup', { pointerId: 1 }),
  );
}

describe('RoundedRectangle component', () => {
  test('editable=true draws 5 handles', async () => {
    const { vp, canvas } = setupEditableViewport();
    const [vpSig] = createSignal<Viewport>(vp);
    const sel = makeSelectionStub();

    const container = document.createElement('div');
    const dispose = render(
      () => (
        <canvasContext.Provider value={canvasContextStub(vpSig)}>
          <selectionContext.Provider value={sel.stub}>
            <RoundedRectangle
              id="r1"
              center={Point.from(150, -150, 0)}
              width={100}
              height={60}
              radius={10}
              editable
            />
          </selectionContext.Provider>
        </canvasContext.Provider>
      ),
      container,
    );

    await waitForEffects();

    // drawHandle calls ctx.arc once per handle. Solid may run the render
    // effect twice on mount (the `createEffect(() => setX(props.X))` sync
    // pattern can trigger a second pass), so we only assert that the last 5
    // arcs correspond to the 5 expected handle positions.
    const arcs = lastArcPositions(vp.ctx, 5);
    expect(arcs).toHaveLength(5);
    arcs.forEach((c) => expect(c[2]).toBe(5));
    // Handle order is [radius, BL, BR, TR, TL] (radius first so hit-test
    // priority goes to the radius handle when it overlaps a corner).
    const expected = [
      [110, 120], // radius handle on the top edge (cx - hw + r = 100 + 10)
      [100, 180], // BL
      [200, 180], // BR
      [200, 120], // TR
      [100, 120], // TL
    ];
    arcs.forEach((c, i) => {
      expect(c[0]).toBeCloseTo(expected[i]![0]);
      expect(c[1]).toBeCloseTo(expected[i]![1]);
    });

    dispose();
    document.body.removeChild(canvas);
  });

  test('editable=false draws no handles', async () => {
    const { vp, canvas } = setupEditableViewport();
    const [vpSig] = createSignal<Viewport>(vp);
    const sel = makeSelectionStub();

    const container = document.createElement('div');
    const dispose = render(
      () => (
        <canvasContext.Provider value={canvasContextStub(vpSig)}>
          <selectionContext.Provider value={sel.stub}>
            <RoundedRectangle
              id="r1"
              center={Point.from(150, -150, 0)}
              width={100}
              height={60}
              radius={10}
            />
          </selectionContext.Provider>
        </canvasContext.Provider>
      ),
      container,
    );

    await waitForEffects();

    const arcCalls = (vp.ctx.arc as ReturnType<typeof vi.fn>).mock.calls;
    expect(arcCalls.length).toBe(0);

    dispose();
    document.body.removeChild(canvas);
  });

  test('corner handle drag resizes the rectangle', async () => {
    const { vp, canvas } = setupEditableViewport();
    const [vpSig] = createSignal<Viewport>(vp);
    const sel = makeSelectionStub();

    // center=(150,-150) puts screen handles in the positive 0..800/0..600
    // range under the identity transform.
    //   Radius handle world (110,-120) → screen (110,120)  [drawn first]
    //   BL world (100,-180)  → screen (100,180)
    //   BR world (200,-180)  → screen (200,180)
    //   TR world (200,-120)  → screen (200,120)
    //   TL world (100,-120)  → screen (100,120)
    const container = document.createElement('div');
    const dispose = render(
      () => (
        <canvasContext.Provider value={canvasContextStub(vpSig)}>
          <selectionContext.Provider value={sel.stub}>
            <RoundedRectangle
              id="r1"
              center={Point.from(150, -150, 0)}
              width={100}
              height={60}
              radius={10}
              editable
            />
          </selectionContext.Provider>
        </canvasContext.Provider>
      ),
      container,
    );

    await waitForEffects();

    // Grab the BR corner handle (screen 200,180) and drag it 50px right.
    dispatchDown(canvas, 200, 180);
    dispatchMove(canvas, 250, 180);
    dispatchUp(canvas);
    await waitForEffects();

    // After drag: pivot = TL world (100,-120); newCorner = (250,-180).
    //   center = ((100+250)/2, (-120+-180)/2) = (175, -150)
    //   w = 150, h = 60, r stays 10 (still ≤ 30 = min(150,60)/2).
    const box = sel.bounds.get('r1')!;
    expect(box.min.x).toBeCloseTo(100); // 175 - 150/2 = 100
    expect(box.max.x).toBeCloseTo(250); // 175 + 150/2 = 250
    expect(box.min.y).toBeCloseTo(-180); // -150 - 60/2 = -180
    expect(box.max.y).toBeCloseTo(-120); // -150 + 60/2 = -120

    dispose();
    document.body.removeChild(canvas);
  });

  test('corner drag clamps radius when width shrinks below 2r', async () => {
    const { vp, canvas } = setupEditableViewport();
    const [vpSig] = createSignal<Viewport>(vp);
    const sel = makeSelectionStub();

    const container = document.createElement('div');
    const dispose = render(
      () => (
        <canvasContext.Provider value={canvasContextStub(vpSig)}>
          <selectionContext.Provider value={sel.stub}>
            <RoundedRectangle
              id="r1"
              center={Point.from(150, -150, 0)}
              width={100}
              height={60}
              radius={10}
              editable
            />
          </selectionContext.Provider>
        </canvasContext.Provider>
      ),
      container,
    );

    await waitForEffects();

    // Shrink width by dragging BR from screen (200,180) to (110,180):
    //   newCorner world = (110,-180). w = |110 - 100| = 10. max r = 5.
    dispatchDown(canvas, 200, 180);
    dispatchMove(canvas, 110, 180);
    dispatchUp(canvas);
    await waitForEffects();

    // After drag: pivot = TL world (100,-120); newCorner = (110,-180).
    //   center = ((100+110)/2, (-120+-180)/2) = (105, -150)
    //   w = 10, h = 60, r = clampRadius(10, 10, 60) = 5.
    // Radius handle world = (105 - 5 + 5, -150 + 30) = (105, -120)
    //   → screen (105, 120). It's the FIRST arc in the handle draw order.
    const arcs = lastArcPositions(vp.ctx, 5);
    const radiusHandleScreen = arcs[0]!;
    expect(radiusHandleScreen[0]).toBeCloseTo(105);
    expect(radiusHandleScreen[1]).toBeCloseTo(120);

    dispose();
    document.body.removeChild(canvas);
  });

  test('radius handle drag enlarges radius along the top edge', async () => {
    const { vp, canvas } = setupEditableViewport();
    const [vpSig] = createSignal<Viewport>(vp);
    const sel = makeSelectionStub();

    const container = document.createElement('div');
    const dispose = render(
      () => (
        <canvasContext.Provider value={canvasContextStub(vpSig)}>
          <selectionContext.Provider value={sel.stub}>
            <RoundedRectangle
              id="r1"
              center={Point.from(150, -150, 0)}
              width={100}
              height={60}
              radius={10}
              editable
            />
          </selectionContext.Provider>
        </canvasContext.Provider>
      ),
      container,
    );

    await waitForEffects();

    // Grab the radius handle at screen (110,120) and drag it 10 world units
    // right along the top edge: dispatchMove to (120,120) → world delta (+10,0).
    //   mouse world = (120,-120). new r = max(0, 120-100) = 20, clamp = 20.
    dispatchDown(canvas, 110, 120);
    dispatchMove(canvas, 120, 120);
    dispatchUp(canvas);
    await waitForEffects();

    // r = 20 → handle world = (150 - 50 + 20, -150 + 30) = (120, -120)
    //   → screen (120, 120). Max allowed is min(100,60)/2 = 30, so 20 is fine.
    // Radius handle is the FIRST arc in the draw order.
    const arcs = lastArcPositions(vp.ctx, 5);
    const radiusHandleScreen = arcs[0]!;
    expect(radiusHandleScreen[0]).toBeCloseTo(120);
    expect(radiusHandleScreen[1]).toBeCloseTo(120);

    dispose();
    document.body.removeChild(canvas);
  });

  test('radius handle is reachable when radius=0 (priority hit test)', async () => {
    const { vp, canvas } = setupEditableViewport();
    const [vpSig] = createSignal<Viewport>(vp);
    const sel = makeSelectionStub();

    // Start with radius=0: the radius handle sits exactly on the TL corner
    // (screen 100,120). Without priority, the corner would win and a resize
    // would start instead of a radius drag.
    const container = document.createElement('div');
    const dispose = render(
      () => (
        <canvasContext.Provider value={canvasContextStub(vpSig)}>
          <selectionContext.Provider value={sel.stub}>
            <RoundedRectangle
              id="r1"
              center={Point.from(150, -150, 0)}
              width={100}
              height={60}
              radius={0}
              editable
            />
          </selectionContext.Provider>
        </canvasContext.Provider>
      ),
      container,
    );

    await waitForEffects();

    // Pointerdown on the overlapping handle position, then drag right 20px.
    // If the corner won, center/width/height would change; if the radius
    // handle wins, only the radius grows.
    dispatchDown(canvas, 100, 120);
    dispatchMove(canvas, 120, 120);
    dispatchUp(canvas);
    await waitForEffects();

    // After radius-handle drag: r = max(0, 120-100) = 20. Center / w / h
    // unchanged. Bounds stay (-50..-150? no): center (150,-150), w=100, h=60.
    const box = sel.bounds.get('r1')!;
    expect(box.min.x).toBeCloseTo(100);
    expect(box.max.x).toBeCloseTo(200);
    expect(box.min.y).toBeCloseTo(-180);
    expect(box.max.y).toBeCloseTo(-120);

    // Radius handle should now be at world (150 - 50 + 20, -150 + 30) =
    // (120, -120) → screen (120, 120). It's the FIRST arc in the draw order.
    const arcs = lastArcPositions(vp.ctx, 5);
    const radiusHandleScreen = arcs[0]!;
    expect(radiusHandleScreen[0]).toBeCloseTo(120);
    expect(radiusHandleScreen[1]).toBeCloseTo(120);

    dispose();
    document.body.removeChild(canvas);
  });

  test('radius handle drag clamps at 0 when pulled outward', async () => {
    const { vp, canvas } = setupEditableViewport();
    const [vpSig] = createSignal<Viewport>(vp);
    const sel = makeSelectionStub();

    const container = document.createElement('div');
    const dispose = render(
      () => (
        <canvasContext.Provider value={canvasContextStub(vpSig)}>
          <selectionContext.Provider value={sel.stub}>
            <RoundedRectangle
              id="r1"
              center={Point.from(150, -150, 0)}
              width={100}
              height={60}
              radius={10}
              editable
            />
          </selectionContext.Provider>
        </canvasContext.Provider>
      ),
      container,
    );

    await waitForEffects();

    // Pull the radius handle back past the TL corner: dispatchMove to (90,120)
    //   → world delta (-20, 0). mouse world = (90,-120).
    //   new r = max(0, 90-100) = 0.
    dispatchDown(canvas, 110, 120);
    dispatchMove(canvas, 90, 120);
    dispatchUp(canvas);
    await waitForEffects();

    // r = 0. Handle world = (150 - 50 + 0, -150 + 30) = (100, -120)
    //   → screen (100, 120) — coincides with the TL corner. Radius handle
    //   is the FIRST arc in the draw order.
    const arcs = lastArcPositions(vp.ctx, 5);
    const radiusHandleScreen = arcs[0]!;
    expect(radiusHandleScreen[0]).toBeCloseTo(100);
    expect(radiusHandleScreen[1]).toBeCloseTo(120);

    dispose();
    document.body.removeChild(canvas);
  });

  test('radius handle drag clamps at min(w,h)/2 when pulled too far', async () => {
    const { vp, canvas } = setupEditableViewport();
    const [vpSig] = createSignal<Viewport>(vp);
    const sel = makeSelectionStub();

    const container = document.createElement('div');
    const dispose = render(
      () => (
        <canvasContext.Provider value={canvasContextStub(vpSig)}>
          <selectionContext.Provider value={sel.stub}>
            <RoundedRectangle
              id="r1"
              center={Point.from(150, -150, 0)}
              width={100}
              height={60}
              radius={10}
              editable
            />
          </selectionContext.Provider>
        </canvasContext.Provider>
      ),
      container,
    );

    await waitForEffects();

    // Drag the radius handle far right along the top edge: dispatchMove to
    // (210, 120) → world delta (+100, 0). mouse world = (210,-120).
    //   new r = max(0, 210-100) = 110, clamped to max = 30.
    dispatchDown(canvas, 110, 120);
    dispatchMove(canvas, 210, 120);
    dispatchUp(canvas);
    await waitForEffects();

    const arcs = lastArcPositions(vp.ctx, 5);
    const radiusHandleScreen = arcs[0]!;
    // r clamped to 30 → handle world = (150 - 50 + 30, -150 + 30) = (130, -120)
    //   → screen (130, 120).
    expect(radiusHandleScreen[0]).toBeCloseTo(130);
    expect(radiusHandleScreen[1]).toBeCloseTo(120);

    dispose();
    document.body.removeChild(canvas);
  });

  test('translate commit moves the center and preserves radius', async () => {
    const { vp, canvas } = setupEditableViewport();
    const [vpSig] = createSignal<Viewport>(vp);
    const sel = makeSelectionStub();

    const container = document.createElement('div');
    const dispose = render(
      () => (
        <canvasContext.Provider value={canvasContextStub(vpSig)}>
          <selectionContext.Provider value={sel.stub}>
            <RoundedRectangle
              id="r1"
              center={Point.from(0, 0, 0)}
              width={100}
              height={60}
              radius={10}
            />
          </selectionContext.Provider>
        </canvasContext.Provider>
      ),
      container,
    );

    await waitForEffects();

    const handler = sel.handlers.get('r1')!;
    handler({ type: 'translate', delta: Vector.from(50, 30, 0) });
    await waitForEffects();

    const box = sel.bounds.get('r1')!;
    // center moved by (50,30): (-50+50, -30+30) = (0,0) for min? wait...
    //   new center = (50, 30). min = (50 - 50, 30 - 30) = (0, 0).
    //   max = (50 + 50, 30 + 30) = (100, 60).
    expect(box.min.x).toBeCloseTo(0);
    expect(box.min.y).toBeCloseTo(0);
    expect(box.max.x).toBeCloseTo(100);
    expect(box.max.y).toBeCloseTo(60);

    // Verify the radius is preserved: the 5th handle is only drawn when
    // editable, but the rendered path's first moveTo reflects r through its
    // x coordinate = center.x - w/2 + r. The most recent path's first moveTo
    // (i.e. the last beginPath→moveTo pair) should be (0+10, 30+30) = (10, 60).
    const moveToCalls = (vp.ctx.moveTo as ReturnType<typeof vi.fn>).mock.calls;
    const lastMove = moveToCalls[moveToCalls.length - 1]!;
    expect(lastMove[0]).toBeCloseTo(10);
    expect(lastMove[1]).toBeCloseTo(60);

    dispose();
    document.body.removeChild(canvas);
  });

  test('scale commit scales center/width/height and radius by min(|sx|,|sy|)', async () => {
    const { vp, canvas } = setupEditableViewport();
    const [vpSig] = createSignal<Viewport>(vp);
    const sel = makeSelectionStub();

    const container = document.createElement('div');
    const dispose = render(
      () => (
        <canvasContext.Provider value={canvasContextStub(vpSig)}>
          <selectionContext.Provider value={sel.stub}>
            <RoundedRectangle
              id="r1"
              center={Point.from(0, 0, 0)}
              width={100}
              height={60}
              radius={10}
            />
          </selectionContext.Provider>
        </canvasContext.Provider>
      ),
      container,
    );

    await waitForEffects();

    const handler = sel.handlers.get('r1')!;
    handler({
      type: 'scale',
      scale: Vector.from(0.5, 0.5, 0),
      pivot: Point.from(0, 0, 0),
    });
    await waitForEffects();

    const box = sel.bounds.get('r1')!;
    expect(box.min.x).toBeCloseTo(-25); // w=50, h=30, center stays (0,0)
    expect(box.max.x).toBeCloseTo(25);
    expect(box.min.y).toBeCloseTo(-15);
    expect(box.max.y).toBeCloseTo(15);

    // Radius scaled by min(0.5, 0.5) = 0.5 → 5. First moveTo of last path:
    //   (center.x - w/2 + r, center.y + h/2) = (0 - 25 + 5, 0 + 15) = (-20, 15).
    const moveToCalls = (vp.ctx.moveTo as ReturnType<typeof vi.fn>).mock.calls;
    const lastMove = moveToCalls[moveToCalls.length - 1]!;
    expect(lastMove[0]).toBeCloseTo(-20);
    expect(lastMove[1]).toBeCloseTo(15);

    dispose();
    document.body.removeChild(canvas);
  });

  test('scale commit clamps radius to new min(w,h)/2', async () => {
    const { vp, canvas } = setupEditableViewport();
    const [vpSig] = createSignal<Viewport>(vp);
    const sel = makeSelectionStub();

    const container = document.createElement('div');
    const dispose = render(
      () => (
        <canvasContext.Provider value={canvasContextStub(vpSig)}>
          <selectionContext.Provider value={sel.stub}>
            <RoundedRectangle
              id="r1"
              center={Point.from(0, 0, 0)}
              width={100}
              height={60}
              radius={30} // already at max (30 = min(100,60)/2)
            />
          </selectionContext.Provider>
        </canvasContext.Provider>
      ),
      container,
    );

    await waitForEffects();

    const handler = sel.handlers.get('r1')!;
    // Scale down by 0.2 → w=20, h=12, raw r=30*0.2=6. New max = min(20,12)/2 = 6.
    handler({
      type: 'scale',
      scale: Vector.from(0.2, 0.2, 0),
      pivot: Point.from(0, 0, 0),
    });
    await waitForEffects();

    // r = clampRadius(6, 20, 12) = 6 (exactly the new max).
    //   First moveTo = (0 - 10 + 6, 0 + 6) = (-4, 6).
    const moveToCalls = (vp.ctx.moveTo as ReturnType<typeof vi.fn>).mock.calls;
    const lastMove = moveToCalls[moveToCalls.length - 1]!;
    expect(lastMove[0]).toBeCloseTo(-4);
    expect(lastMove[1]).toBeCloseTo(6);

    dispose();
    document.body.removeChild(canvas);
  });
});

// Re-export for type-only consumers in the test harness above.
export type { RoundedRectangleProps };
