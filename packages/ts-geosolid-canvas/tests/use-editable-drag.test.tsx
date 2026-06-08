/// <reference lib="dom" />
import { describe, expect, test, vi } from 'vitest';
import { render } from 'solid-js/web';
import { createSignal } from 'solid-js';
import { Point, Transform, Vector } from '@micurs/ts-geopro';
import { useEditableDrag } from '../src/use-editable-drag.ts';
import type { UseEditableDragOptions } from '../src/use-editable-drag.ts';

// jsdom does not provide PointerEvent; polyfill with MouseEvent.
if (typeof PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
    }
  }
  (globalThis as Record<string, unknown>).PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
}

function makeCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 800;
  c.height = 600;
  c.setPointerCapture ??= () => {};
  document.body.appendChild(c);
  return c;
}

function TestComponent(props: {
  editable: () => boolean;
  canvas: HTMLCanvasElement;
  onDrag: ReturnType<typeof vi.fn>;
  onDragStart?: UseEditableDragOptions['onDragStart'];
}): null {
  useEditableDrag({
    editable: props.editable,
    getCanvas: () => props.canvas,
    getHandles: () => [Point.from(100, -100, 0)],
    getTransform: () => Transform.identity(),
    onDrag: props.onDrag,
    onDragStart: props.onDragStart,
  });
  return null;
}

function idle(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

describe('useEditableDrag editable toggle', () => {
  test('toggle false→true→false enables/disables drag', async () => {
    const [editable, setEditable] = createSignal(false);
    const onDragStart = vi.fn();
    const onDrag = vi.fn();
    const canvas = makeCanvas();

    const container = document.createElement('div');
    render(
      () => (
        <TestComponent
          editable={editable}
          canvas={canvas}
          onDrag={onDrag}
          onDragStart={onDragStart}
        />
      ),
      container,
    );

    await idle();

    // Initially not editable → drag should NOT fire
    canvas.dispatchEvent(new PointerEvent('pointerdown', {
      clientX: 100, clientY: 100, pointerId: 1, bubbles: true,
    }));
    canvas.dispatchEvent(new PointerEvent('pointermove', {
      clientX: 110, clientY: 100, pointerId: 1, bubbles: true,
    }));
    expect(onDrag).not.toHaveBeenCalled();
    expect(onDragStart).not.toHaveBeenCalled();

    // Toggle editable ON
    setEditable(true);
    await idle();

    // Now drag SHOULD fire
    onDragStart.mockClear();
    onDrag.mockClear();
    canvas.dispatchEvent(new PointerEvent('pointerdown', {
      clientX: 100, clientY: 100, pointerId: 2, bubbles: true,
    }));
    canvas.dispatchEvent(new PointerEvent('pointermove', {
      clientX: 110, clientY: 100, pointerId: 2, bubbles: true,
    }));
    expect(onDragStart).toHaveBeenCalled();
    expect(onDrag).toHaveBeenCalled();

    // Toggle editable OFF
    const dragCount = onDrag.mock.calls.length;
    setEditable(false);
    await idle();

    // Drag should NOT fire anymore
    canvas.dispatchEvent(new PointerEvent('pointerdown', {
      clientX: 100, clientY: 100, pointerId: 3, bubbles: true,
    }));
    canvas.dispatchEvent(new PointerEvent('pointermove', {
      clientX: 110, clientY: 100, pointerId: 3, bubbles: true,
    }));
    expect(onDragStart).toHaveBeenCalledTimes(1);
    expect(onDrag.mock.calls.length).toBe(dragCount);

    document.body.removeChild(canvas);
  });

  test('editable=true from mount works', async () => {
    const onDrag = vi.fn();
    const canvas = makeCanvas();

    const container = document.createElement('div');
    render(
      () => (
        <TestComponent
          editable={() => true}
          canvas={canvas}
          onDrag={onDrag}
        />
      ),
      container,
    );

    await idle();

    canvas.dispatchEvent(new PointerEvent('pointerdown', {
      clientX: 100, clientY: 100, pointerId: 1, bubbles: true,
    }));
    canvas.dispatchEvent(new PointerEvent('pointermove', {
      clientX: 110, clientY: 100, pointerId: 1, bubbles: true,
    }));
    expect(onDrag).toHaveBeenCalled();

    document.body.removeChild(canvas);
  });

  test('editable=false from mount stays inactive', async () => {
    const onDrag = vi.fn();
    const canvas = makeCanvas();

    const container = document.createElement('div');
    render(
      () => (
        <TestComponent
          editable={() => false}
          canvas={canvas}
          onDrag={onDrag}
        />
      ),
      container,
    );

    await idle();

    canvas.dispatchEvent(new PointerEvent('pointerdown', {
      clientX: 100, clientY: 100, pointerId: 1, bubbles: true,
    }));
    canvas.dispatchEvent(new PointerEvent('pointermove', {
      clientX: 110, clientY: 100, pointerId: 1, bubbles: true,
    }));
    expect(onDrag).not.toHaveBeenCalled();

    document.body.removeChild(canvas);
  });

  test('world delta computation in onDrag', async () => {
    const capturedDelta: Vector[] = [];
    const canvas = makeCanvas();

    const container = document.createElement('div');
    render(
      () => (
        <TestComponent
          editable={() => true}
          canvas={canvas}
          onDrag={(_i, d) => { capturedDelta.push(d); }}
        />
      ),
      container,
    );

    await idle();

    canvas.dispatchEvent(new PointerEvent('pointerdown', {
      clientX: 100, clientY: 100, pointerId: 1, bubbles: true,
    }));
    canvas.dispatchEvent(new PointerEvent('pointermove', {
      clientX: 120, clientY: 80, pointerId: 1, bubbles: true,
    }));

    // World delta: screen (20, -20) maps to world (20, 20) at identity
    expect(capturedDelta.length).toBeGreaterThan(0);
    const delta = capturedDelta[0]!;
    expect(delta.x).toBeCloseTo(20);
    expect(delta.y).toBeCloseTo(20);

    document.body.removeChild(canvas);
  });
});
