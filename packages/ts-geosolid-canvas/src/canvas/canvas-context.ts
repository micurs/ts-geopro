import { createContext } from 'solid-js';
import type { Viewport } from './types.ts';

export interface CanvasContextValue {
  vp: () => Viewport | undefined;
  redrawVersion: () => number;
  requestRedraw: () => void;
  rAFWillClear: () => boolean;
}

export const canvasContext = createContext<CanvasContextValue>({
  vp: () => undefined,
  redrawVersion: () => 0,
  requestRedraw: () => {},
  rAFWillClear: () => false,
});
