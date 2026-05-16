import { compose, Transform } from '@micurs/ts-geopro';
import type { Viewport } from './types.ts';

/**
 * Create a viewport object with a 2D transformation putting the
 * origin in the center of the canvas and the min canvas dimension set
 * as the size pass as parameter,
 * @param dim - dimension of the canvas
 * @param zoom - desired size of the min dimension
 */
export const getViewport = (
  ctx: CanvasRenderingContext2D,
  dim: [number, number],
  zoom: number,
  pan: [number, number] // Already scaled
): Viewport => {
  let scaleFactor = 1.0;

  scaleFactor = dim[0] < dim[1] ? zoom / dim[0] : zoom / dim[1];

  const centerX = dim[0] / 2;
  const centerY = dim[1] / 2;

  const center = Transform.fromTranslation(centerX, centerY, 0.0);
  const scale = Transform.fromScale(1 / scaleFactor, 1 / scaleFactor, 1.0);
  const panTrn = Transform.fromTranslation(pan[0], pan[1], 0.0);

  return {
    ctx,
    pan,
    trans: [centerX, centerY],
    scaleFactor,
    transform: compose(panTrn, scale, center),
    dimensions: [dim[0] * scaleFactor, dim[1] * scaleFactor],
  };
};
