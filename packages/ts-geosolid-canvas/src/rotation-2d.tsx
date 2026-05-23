import { createEffect, createMemo, useContext } from "solid-js";
import type { Component, JSX } from "solid-js";
import { canvasContext } from "./canvas/canvas-context.ts";
import { compose, Point, Rotation, Transform } from "@micurs/ts-geopro";

export interface Rotation2DProps {
  angle: number;
  center?: Point;
  children: JSX.Element;
}

export const Rotation2D: Component<Rotation2DProps> = (props) => {
  const ctx = useContext(canvasContext);

  const rotatedVp = createMemo(() => {
    const vp = ctx?.vp();
    const angle = props.angle;
    const center = props.center ?? Point.from(0, 0, 0);

    if (!vp) {
      return undefined;
    }

    const rotZ = Transform.fromRotation(Rotation.rotationZ(angle));
    const centerTx = Transform.fromTranslation(center.x, -center.y, 0);
    const centerNegTx = Transform.fromTranslation(-center.x, center.y, 0);

    const rotationTx = compose(centerNegTx, rotZ, centerTx);
    const newTransform = compose(rotationTx, vp.transform);

    return {
      ...vp,
      transform: newTransform,
    };
  });

  createEffect(() => {
    props.angle;
    props.center;
    ctx?.requestRedraw();
  });

  return (
    <canvasContext.Provider
      value={{
        vp: rotatedVp,
        redrawVersion: ctx?.redrawVersion ?? (() => 0),
        requestRedraw: ctx?.requestRedraw ?? (() => {}),
        rAFWillClear: ctx?.rAFWillClear ?? (() => false),
      }}
    >
      {props.children}
    </canvasContext.Provider>
  );
};
