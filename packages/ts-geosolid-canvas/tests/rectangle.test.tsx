/// <reference lib="dom" />
import { describe, expect, test, vi } from "vitest";
import { Point, Transform } from "@micurs/ts-geopro";
import { drawRectangle } from "../src/rectangle.tsx";
import type { Viewport } from "../src/canvas/types.ts";

const createMockViewport = (): Viewport => {
  const ctx = {
    strokeStyle: "",
    fillStyle: "",
    lineWidth: 0,
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    strokeRect: vi.fn(),
    fillRect: vi.fn(),
    closePath: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn(),
    setLineDash: vi.fn(),
    clearRect: vi.fn(),
    isPointInPath: vi.fn(),
    canvas: {
      width: 800,
      height: 600,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getBoundingClientRect: () => ({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    },
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

describe("drawRectangle rendering", () => {
  test("draws basic rectangle stroke", () => {
    const vp = createMockViewport();
    drawRectangle(vp, {
      id: "test",
      center: Point.from(50, 50, 0),
      width: 100,
      height: 60,
      color: "#ff0000",
      strokeWidth: 2,
    });

    expect(vp.ctx.strokeStyle).toBe("#ff0000");
    expect(vp.ctx.strokeRect).toHaveBeenCalledWith(0, 20, 100, 60);
  });

  test("draws filled rectangle", () => {
    const vp = createMockViewport();
    drawRectangle(vp, {
      id: "test",
      center: Point.from(50, 50, 0),
      width: 100,
      height: 60,
      fill: "#00ff00",
    });

    expect(vp.ctx.fillStyle).toBe("#00ff00");
    expect(vp.ctx.fillRect).toHaveBeenCalledWith(0, 20, 100, 60);
    expect(vp.ctx.strokeRect).toHaveBeenCalled();
  });

  test("default color is black", () => {
    const vp = createMockViewport();
    drawRectangle(vp, {
      id: "test",
      center: Point.from(0, 0, 0),
      width: 50,
      height: 50,
    });

    expect(vp.ctx.strokeStyle).toBe("black");
  });
});
