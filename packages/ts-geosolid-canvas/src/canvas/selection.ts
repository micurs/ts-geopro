import { createContext, createEffect, onCleanup, useContext } from 'solid-js';

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface SelectionContextValue {
  registerBounds: (id: string, box: BoundingBox) => void;
  unregisterBounds: (id: string) => void;
}

export const selectionContext = createContext<SelectionContextValue>({
  registerBounds: () => {},
  unregisterBounds: () => {},
});

export function useShapeBoundsRegistration(
  id: string,
  getBounds: () => BoundingBox,
): void {
  const ctx = useContext(selectionContext);
  if (!ctx) {
    return;
  }
  createEffect(() => {
    ctx.registerBounds(id, getBounds());
    onCleanup(() => ctx.unregisterBounds(id));
  });
}
