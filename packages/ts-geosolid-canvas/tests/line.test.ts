import { describe, test, expect, vi } from 'vitest';
import { Point } from '@micurs/ts-geopro';
import { drawLine } from '../src/line.tsx';
import type { Viewport } from '../src/canvas/types.ts';

describe('Line component', () => {
  const createMockViewport = (): Viewport => {
    const ctx = {
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 0,
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    return {
      ctx,
      scaleFactor: 1,
      trans: { x: 0, y: 0, z: 0 },
      transform: {} as any,
      dimensions: { width: 800, height: 600 },
      pan: { x: 0, y: 0 },
    };
  };

  test('drawLine renders basic line without arrows', () => {
    const vp = createMockViewport();
    const lineProps = {
      from: Point.from(0, 0, 0),
      to: Point.from(100, 100, 0),
      color: '#ff0000',
      width: 2,
    };

    drawLine(vp, lineProps);

    expect(vp.ctx.strokeStyle).toBe('#ff0000');
    expect(vp.ctx.beginPath).toHaveBeenCalled();
    expect(vp.ctx.moveTo).toHaveBeenCalledWith(0, 0);
    expect(vp.ctx.lineTo).toHaveBeenCalledWith(100, 100);
    expect(vp.ctx.stroke).toHaveBeenCalled();
  });

  test('drawLine with end arrow draws arrowhead', () => {
    const vp = createMockViewport();
    const lineProps = {
      from: Point.from(0, 0, 0),
      to: Point.from(100, 100, 0),
      color: '#00ff00',
      width: 1,
      end: 'arrow' as const,
      endSize: 8,
      endStyle: 'empty' as const,
    };

    drawLine(vp, lineProps);

    // Basic line should be drawn
    expect(vp.ctx.moveTo).toHaveBeenCalledWith(0, 0);
    expect(vp.ctx.lineTo).toHaveBeenCalledWith(100, 100);

    // Arrow should trigger additional drawing calls
    expect(vp.ctx.stroke).toHaveBeenCalled();
  });

  test('drawLine with start arrow draws arrowhead at start', () => {
    const vp = createMockViewport();
    const lineProps = {
      from: Point.from(0, 0, 0),
      to: Point.from(100, 100, 0),
      start: 'arrow' as const,
      startSize: 5,
      startStyle: 'empty' as const,
    };

    drawLine(vp, lineProps);

    expect(vp.ctx.stroke).toHaveBeenCalled();
  });

  test('drawLine with filled arrow uses fill', () => {
    const vp = createMockViewport();
    const lineProps = {
      from: Point.from(0, 0, 0),
      to: Point.from(100, 100, 0),
      end: 'arrow' as const,
      endStyle: 'filled' as const,
      endSize: 8,
    };

    drawLine(vp, lineProps);

    expect(vp.ctx.fill).toHaveBeenCalled();
  });

  test('drawLine with custom endColor uses specified color', () => {
    const vp = createMockViewport();
    const strokeStyleValues: string[] = [];

    // Track strokeStyle changes
    Object.defineProperty(vp.ctx, 'strokeStyle', {
      set(value: string) {
        strokeStyleValues.push(value);
      },
      get() {
        return strokeStyleValues[strokeStyleValues.length - 1] || '';
      },
    });

    const lineProps = {
      from: Point.from(0, 0, 0),
      to: Point.from(100, 100, 0),
      color: '#ff0000',
      end: 'arrow' as const,
      endColor: '#0000ff',
      endStyle: 'empty' as const,
    };

    drawLine(vp, lineProps);

    // Line color should be red, then arrow color should be blue
    expect(strokeStyleValues).toContain('#ff0000');
    expect(strokeStyleValues).toContain('#0000ff');
  });

  test('drawLine with both arrows draws at both ends', () => {
    const vp = createMockViewport();
    const lineProps = {
      from: Point.from(0, 0, 0),
      to: Point.from(100, 100, 0),
      start: 'arrow' as const,
      end: 'arrow' as const,
      startSize: 6,
      endSize: 6,
    };

    drawLine(vp, lineProps);

    // Should have multiple stroke calls (line + 2 arrows)
    expect(vp.ctx.stroke).toHaveBeenCalled();
  });

  test('drawLine defaults work correctly', () => {
    const vp = createMockViewport();
    const lineProps = {
      from: Point.from(0, 0, 0),
      to: Point.from(100, 100, 0),
    };

    drawLine(vp, lineProps);

    // Default color should be black
    expect(vp.ctx.strokeStyle).toBe('black');
  });

  test('drawLine with circle end cap draws circle', () => {
    const vp = createMockViewport();
    const lineProps = {
      from: Point.from(0, 0, 0),
      to: Point.from(100, 100, 0),
      end: 'circle' as const,
      endSize: 6,
      endStyle: 'filled' as const,
    };

    // Add arc method to mock ctx
    vp.ctx.arc = vi.fn();

    drawLine(vp, lineProps);

    expect(vp.ctx.arc).toHaveBeenCalled();
    expect(vp.ctx.fill).toHaveBeenCalled();
  });

  test('drawLine with circle at start and arrow at end', () => {
    const vp = createMockViewport();
    const lineProps = {
      from: Point.from(0, 0, 0),
      to: Point.from(100, 100, 0),
      start: 'circle' as const,
      end: 'arrow' as const,
      startSize: 5,
      endSize: 8,
      startStyle: 'filled' as const,
      endStyle: 'empty' as const,
    };

    // Add arc method to mock ctx
    vp.ctx.arc = vi.fn();

    drawLine(vp, lineProps);

    expect(vp.ctx.arc).toHaveBeenCalled();
    expect(vp.ctx.stroke).toHaveBeenCalled();
    expect(vp.ctx.fill).toHaveBeenCalled();
  });
});
