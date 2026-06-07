/// <reference lib="dom" />
import { describe, expect, test, vi } from "vitest";
import { Point, Transform } from "@micurs/ts-geopro";
import { drawEllipse } from "../src/ellipse.tsx";
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
    ellipse: vi.fn(),
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

describe("drawEllipse rendering", () => {
  test("draws basic ellipse stroke", () => {
    const vp = createMockViewport();
    drawEllipse(vp, {
      id: "test",
      center: Point.from(50, 50, 0),
      width: 100,
      height: 60,
      color: "#ff0000",
      strokeWidth: 2,
    });

    expect(vp.ctx.strokeStyle).toBe("#ff0000");
    expect(vp.ctx.ellipse).toHaveBeenCalledWith(50, 50, 50, 30, 0, 0, 2 * Math.PI);
  });

  test("draws filled ellipse", () => {
    const vp = createMockViewport();
    drawEllipse(vp, {
      id: "test",
      center: Point.from(50, 50, 0),
      width: 100,
      height: 60,
      fill: "#00ff00",
    });

    expect(vp.ctx.fillStyle).toBe("#00ff00");
    expect(vp.ctx.fill).toHaveBeenCalled();
    expect(vp.ctx.stroke).toHaveBeenCalled();
  });

  test("default color is black", () => {
    const vp = createMockViewport();
    drawEllipse(vp, {
      id: "test",
      center: Point.from(0, 0, 0),
      width: 50,
      height: 50,
    });

    expect(vp.ctx.strokeStyle).toBe("black");
  });
});
