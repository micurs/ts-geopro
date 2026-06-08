import { createRenderEffect, useContext } from 'solid-js';
import type { JSX } from 'solid-js';
import { canvasContext } from './canvas/canvas-context.ts';
import { drawInWorldCoordinates } from './canvas/canvas-geopro.ts';
import type { Viewport } from './canvas/types.ts';
import { requestRedrawIfNeeded } from './canvas/utils.ts';

export type CanvasDrawFn<TProps extends object> = (
  viewport: Viewport,
  props: TProps
) => void;

export const buildCanvasComponent = <TProps extends object>(
  draw: CanvasDrawFn<TProps>
): ((props: TProps) => JSX.Element) => {
  return (props: TProps) => {
    const ctx = useContext(canvasContext);

    createRenderEffect(() => {
      ctx?.redrawVersion();
      const vp = ctx?.vp();
      if (!vp) {
        return;
      }
      drawInWorldCoordinates(vp.ctx, vp.transform, () => {
        draw(vp, props);
      });
      requestRedrawIfNeeded(ctx);
    });

    return null;
  };
};
