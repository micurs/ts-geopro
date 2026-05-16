import { createEffect, useContext } from 'solid-js';
import type { JSX } from 'solid-js';
import { canvasContext } from './canvas/canvas-context.ts';
import type { Viewport } from './canvas/types.ts';

/**
 * Function used by a canvas component to draw its geometry into a viewport.
 *
 * @template TProps - Props accepted by the generated SolidJS component.
 * @param viewport - Current canvas viewport from the nearest Canvas context.
 * @param props - Props passed to the generated component.
 */
export type CanvasDrawFn<TProps extends object> = (
  viewport: Viewport,
  props: TProps
) => void;

/**
 * Create a SolidJS canvas component from a drawing function.
 *
 * The generated component reads the nearest Canvas context, redraws reactively
 * when Solid tracks prop or context changes, and renders no DOM output.
 *
 * @template TProps - Props accepted by the generated SolidJS component.
 * @param draw - Drawing function called with the current viewport and props.
 * @returns A SolidJS component that delegates rendering to the provided draw function.
 */
export const buildCanvasComponent = <TProps extends object>(
  draw: CanvasDrawFn<TProps>
): ((props: TProps) => JSX.Element) => {
  return (props: TProps) => {
    const ctx = useContext(canvasContext);

    createEffect(() => {
      const vp = ctx?.vp();
      if (!vp) {
        return;
      }
      draw(vp, props);
    });

    return null;
  };
};
