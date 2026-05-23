import { createRenderEffect, untrack, useContext } from 'solid-js';
import type { JSX } from 'solid-js';
import { canvasContext } from './canvas/canvas-context.ts';
import type { Viewport } from './canvas/types.ts';

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
      vp.ctx.setTransform(
        vp.transform.direct(0, 0),
        -vp.transform.direct(1, 0),
        vp.transform.direct(0, 1),
        -vp.transform.direct(1, 1),
        vp.transform.direct(3, 0),
        vp.transform.direct(3, 1)
      );
      draw(vp, props);
      if (!untrack(() => ctx?.rAFWillClear() ?? false)) {
        ctx?.requestRedraw();
      }
    });

    return null;
  };
};
