import type { Viewport } from './types.ts';

export const renderGrid = (ctx: CanvasRenderingContext2D, viewport: Viewport) => {
  const [dimX, dimY] = viewport.dimensions;
  const zoom = Math.min(dimX, dimY);
  const d = Math.log10(zoom);
  const g = Math.floor(d);
  const G = Math.pow(10, g); // This is our step
  const GM = G / 10;

  const yLim = dimY / 2;
  const xLim = dimX / 2;
  const step = Math.round(Math.max(dimX, dimY) / G) * 2;

  const start = -G * step;
  const end = G * step;
  const alpha = 1 - Math.abs(d - Math.floor(d));

  // Dense Grid
  ctx.lineWidth = 1 / viewport.scale[0];
  ctx.strokeStyle = 'grey';
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  for (let x = start; x <= end; x += GM) {
    ctx.moveTo(x, -yLim);
    ctx.lineTo(x, +yLim);
  }
  for (let y = start; y <= end; y += GM) {
    ctx.moveTo(-xLim, y);
    ctx.lineTo(xLim, y);
  }
  ctx.stroke();

  // Main Grid
  ctx.lineWidth = (1 / viewport.scale[0]) * (alpha + 1);
  ctx.strokeStyle = 'grey';
  ctx.globalAlpha = 1;
  ctx.beginPath();
  for (let x = start; x <= end; x += G) {
    ctx.moveTo(x, -yLim);
    ctx.lineTo(x, +yLim);
  }
  for (let y = start; y <= end; y += G) {
    ctx.moveTo(-xLim, y);
    ctx.lineTo(xLim, y);
  }
  ctx.stroke();

  ctx.globalAlpha = 1;
};
