import { compose, Transform } from '@micurs/ts-geopro';
import type { Viewport } from './types.ts';

/**
 * Create a viewport object with a 2D transformation putting the
 * origin in the center of the canvas and the min canvas dimension set
 * as the size pass as parameter,
 * @param dim - dimension of the canvas
 * @param size - desired size of the min dimension
 */

export const getViewport = (width: number, height: number, size = 2.0): Viewport => {
  let scaleFactorX = 1.0;
  let scaleFactorY = 1.0;
  const trnX = width / 2;
  const trnY = height / 2;

  if (width < height) {
    scaleFactorX = width / size;
    scaleFactorY = scaleFactorX;
  } else {
    scaleFactorY = height / size;
    scaleFactorX = scaleFactorY;
  }

  const scale = Transform.fromScale(scaleFactorX, scaleFactorY, 1.0);
  const trn = Transform.fromTranslation(trnX, trnY, 0.0);

  return {
    trans: [trnX, trnY],
    scale: [scaleFactorX, scaleFactorY],
    transform: compose(scale, trn),
    dimensions: [width / scaleFactorX, height / scaleFactorY],
  };
};
