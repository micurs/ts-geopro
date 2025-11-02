import { createContext } from 'solid-js';
import type { Viewport } from './types.ts';

export const canvasContext = createContext<{
  vp: () => Viewport | undefined;
}>({
  vp: () => undefined,
});
