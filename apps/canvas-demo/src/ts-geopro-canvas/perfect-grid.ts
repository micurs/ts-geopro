import type { Viewport } from './types.ts';

export const renderPerfectGrid = (ctx: CanvasRenderingContext2D, viewport: Viewport) => {
  const [dimX, dimY] = viewport.dimensions;
  const [panX, panY] = viewport.pan;

  const zoom = Math.max(dimX, dimY);
  const d = Math.log10(zoom);
  const g = Math.floor(d);
  const G = Math.pow(10, g); // This is our optimal step!
  const GM = G / 10; // This is our optimal sub-step!

  const semDimX = dimX / 2;
  const semDimY = dimY / 2;
  const limX = [-semDimX - panX - GM, semDimX - panX + GM];
  const limY = [-semDimY + panY - GM, semDimY + panY + GM];

  const alpha = 1 - Math.abs(d - Math.floor(d));

  // Dense Grid
  ctx.lineWidth = viewport.scaleFactor;
  ctx.strokeStyle = 'grey';
  ctx.globalAlpha = alpha * 0.5;
  ctx.beginPath();
  for (let x = GM; x <= limX[1]; x += GM) {
    ctx.moveTo(x, limY[1]);
    ctx.lineTo(x, limY[0]);
  }
  for (let x = -GM; x > limX[0]; x -= GM) {
    ctx.moveTo(x, limY[1]);
    ctx.lineTo(x, limY[0]);
  }
  for (let y = GM; y <= limY[1]; y += GM) {
    ctx.moveTo(limX[0], y);
    ctx.lineTo(limX[1], y);
  }
  for (let y = -GM; y > limY[0]; y -= GM) {
    ctx.moveTo(limX[0], y);
    ctx.lineTo(limX[1], y);
  }
  ctx.stroke();

  // Main Grid
  ctx.lineWidth = viewport.scaleFactor * (alpha + 1);
  ctx.strokeStyle = 'grey';
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  for (let x = G; x <= limX[1]; x += G) {
    ctx.moveTo(x, limY[1]);
    ctx.lineTo(x, limY[0]);
  }
  for (let x = -G; x > limX[0]; x -= G) {
    ctx.moveTo(x, limY[1]);
    ctx.lineTo(x, limY[0]);
  }
  for (let y = G; y <= limY[1]; y += G) {
    ctx.moveTo(limX[0], y);
    ctx.lineTo(limX[1], y);
  }
  for (let y = -G; y > limY[0]; y -= G) {
    ctx.moveTo(limX[0], y);
    ctx.lineTo(limX[1], y);
  }
  ctx.stroke();

  // Main Axes
  ctx.lineWidth = viewport.scaleFactor * (alpha + 3);
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = 'red';
  ctx.beginPath();
  ctx.moveTo(limX[0], 0);
  ctx.lineTo(limX[1], 0);
  ctx.stroke();
  ctx.strokeStyle = 'green';
  ctx.beginPath();
  ctx.moveTo(0, limY[1]);
  ctx.lineTo(0, limY[0]);
  ctx.stroke();

  ctx.globalAlpha = 1;
};
