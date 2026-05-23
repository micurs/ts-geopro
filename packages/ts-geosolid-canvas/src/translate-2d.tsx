import { createEffect, createMemo, useContext } from "solid-js";
import type { Component, JSX } from "solid-js";
import { canvasContext } from "./canvas/canvas-context.ts";
import { compose, Transform, Vector } from "@micurs/ts-geopro";

export interface Translate2DProps {
  vector: Vector;
  children: JSX.Element;
}

export const Translate2D: Component<Translate2DProps> = (props) => {
  const ctx = useContext(canvasContext);

  const translatedVp = createMemo(() => {
    const vp = ctx?.vp();
    const v = props.vector;

    if (!vp) {
      return undefined;
    }

    const translateTx = Transform.fromTranslation(v.x, -v.y, 0);
    const newTransform = compose(translateTx, vp.transform);

    return {
      ...vp,
      transform: newTransform,
    };
  });

  createEffect(() => {
    props.vector;
    ctx?.requestRedraw();
  });

  return (
    <canvasContext.Provider
      value={{
        vp: translatedVp,
        redrawVersion: ctx?.redrawVersion ?? (() => 0),
        requestRedraw: ctx?.requestRedraw ?? (() => {}),
        rAFWillClear: ctx?.rAFWillClear ?? (() => false),
      }}
    >
      {props.children}
    </canvasContext.Provider>
  );
};
