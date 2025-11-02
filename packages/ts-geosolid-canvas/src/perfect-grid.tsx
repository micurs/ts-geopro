import { createEffect, useContext } from 'solid-js';
import { canvasContext } from './canvas/canvas-context.ts';

import type { Component } from 'solid-js';
import type { Viewport } from './canvas/types.ts';

interface PerfectGridProps {
  showOrigin?: boolean; // Whether to show the origin axes
  alpha?: number; // Opacity of the grid lines, default is 0.5
  steps?: number; // Number of steps for the grid, default is 10
}

export const renderPerfectGrid = (viewport: Viewport, props: PerfectGridProps) => {
  const ctx = viewport.ctx;
  const gridSteps = props.steps ?? 10;
  const [dimX, dimY] = viewport.dimensions;
  const [panX, panY] = viewport.pan;

  const zoom = Math.max(dimX, dimY);
  const d = Math.log10(zoom);
  const g = Math.floor(d);
  const G = Math.pow(gridSteps, g); // This is our optimal step!
  const GM = G / gridSteps; // This is our optimal sub-step!

  const semDimX = dimX / 2;
  const semDimY = dimY / 2;
  const limX: [number, number] = [-semDimX - panX - GM, semDimX - panX + GM];
  const limY: [number, number] = [-semDimY + panY - GM, semDimY + panY + GM];
  const mainAlpha = props.alpha ?? 1.0;
  const subGridAlpha = Math.max(0.01, 1 - Math.abs(d - g)) * mainAlpha;
  const mainGridAlpha = mainAlpha;

  // Dense Grid
  ctx.lineWidth = viewport.scaleFactor;
  ctx.strokeStyle = `white`;
  ctx.globalAlpha = subGridAlpha;
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
  ctx.lineWidth = viewport.scaleFactor * (subGridAlpha + 1);
  ctx.strokeStyle = 'white';
  ctx.globalAlpha = mainGridAlpha;
  ctx.beginPath();
  for (let x = 0; x <= limX[1]; x += G) {
    ctx.moveTo(x, limY[1]);
    ctx.lineTo(x, limY[0]);
  }
  for (let x = -G; x > limX[0]; x -= G) {
    ctx.moveTo(x, limY[1]);
    ctx.lineTo(x, limY[0]);
  }
  for (let y = 0; y <= limY[1]; y += G) {
    ctx.moveTo(limX[0], y);
    ctx.lineTo(limX[1], y);
  }
  for (let y = -G; y > limY[0]; y -= G) {
    ctx.moveTo(limX[0], y);
    ctx.lineTo(limX[1], y);
  }
  ctx.stroke();

  // Main Axes
  if (props.showOrigin) {
    ctx.lineWidth = viewport.scaleFactor * (subGridAlpha + 3);
    ctx.globalAlpha = mainAlpha;
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
  }
  ctx.globalAlpha = 1;
};

export const PerfectGrid: Component<PerfectGridProps> = (props: PerfectGridProps) => {
  const ctx = useContext(canvasContext);

  /* redraw if props or canvasContext changes */
  createEffect(() => {
    const vp = ctx?.vp();
    if (!vp) {
      return;
    }
    renderPerfectGrid(vp, props);
  });

  return null;
};
