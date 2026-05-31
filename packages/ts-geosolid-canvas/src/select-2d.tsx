import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  untrack,
  useContext,
} from "solid-js";
import type { Component, JSX } from "solid-js";
import { canvasContext } from "./canvas/canvas-context.ts";
import { selectionContext } from "./canvas/selection.ts";
import {
  drawCenterCrosshair,
  drawPointerLine,
  drawRotationArc,
} from "./canvas/drawing.ts";
import type { BoundingBox } from "./types.ts";
import type { SelectionCommit } from "./canvas/selection.ts";
import {
  applyWorldStandard,
  pointInConvexPolygon,
  rotationAround,
  scaleCommitTranslation,
  screenToWorldPoint,
  worldToScreenPoint,
} from "./canvas/geo-utils.ts";
import { compose, Point, Transform, Vector } from "@micurs/ts-geopro";

export interface Select2DProps {
  children: JSX.Element;
  /** Selection dashed border color (default: '#00aaff') */
  color?: string;
  /** Handle fill color (default: '#ffffff') */
  handleColor?: string;
  /** Handle fill color when hovered (default: '#ffdd00') */
  handleHighlightColor?: string;
  /** Padding around union bounds in world units (default: 6) */
  padding?: number;
}

const DEFAULT_COLOR = "#00aaff";
const DEFAULT_HANDLE_COLOR = "#ffffff";
const DEFAULT_HANDLE_HIGHLIGHT_COLOR = "#ffdd00";
const DEFAULT_PADDING = 6;

const HANDLE_RADIUS = 5;
const HANDLE_HIT_RADIUS = 7;
const ROTATION_HANDLE_OFFSET = 20;

/**
 * Build the child viewport transform for scaling a (possibly rotated)
 * selection, verified-by-construction.
 *
 * ## How it works
 *
 * 1. **Rotation around original center** — `rotationAround(angle, center)`
 *    is applied first. This matches the rotation-only render path exactly.
 *
 * 2. **Axis-aligned scale around rotated pivot** — the scale `Sax` is
 *    anchored at `pivot` after it is rotated into world space by `Rc`
 *    (via standard column-major multiply, since this is a world-space
 *    computation, not a screen render). The scale is applied in axis-aligned
 *    world space — `pivot + sx*(x-pivot.x), pivot + sy*(y-pivot.y)` — which
 *    keeps the box rectangular regardless of the rotation angle.
 *
 * 3. **Screen-space pin** — after composing `Rc · Sax · baseTx`, the pivot
 *    corner is offset in screen space so that its rendered position matches
 *    the rotation-only render. This guarantees the opposite (pinned) corner
 *    stays fixed and the dragged corner follows the mouse exactly.
 *
 * ## Why original center?
 *
 * Scaling shifts the box center. Rotating around the ORIGINAL center during
 * drag keeps the dragged corner under the cursor. On commit the rotation
 * re-applies around the NEW center — the caller compensates with
 * `scaleCommitTranslation()` to eliminate the release jump.
 *
 * ## Compose order
 *
 * `compose(Rc, Sax, baseTx)` produces `baseTx · Sax · Rc`, applied as:
 * Rc first → Sax → baseTx last. See `compose()` docs.
 *
 * @param baseTx  World→screen transform excluding the selection rotation
 *                (e.g. `translateTx · vp.transform`). Used as the base
 *                that everything else composes on top of.
 * @param angle   Current selection rotation angle in radians. Zero means
 *                no rotation component (scale-only).
 * @param center  Box center at drag start, in world coordinates. Rotation
 *                is applied around this point via `rotationAround`. Must
 *                be the same center used by the rotation-only render path.
 * @param pivot   Opposite-corner pivot in world coordinates, axis-aligned
 *                (un-rotated box space). The scale anchors at this corner
 *                so that the opposite (dragged) corner follows the mouse.
 * @param sx      X-axis scale factor. 1 = no scale. Computed as the
 *                un-rotated mouse X delta divided by the initial corner
 *                extent along X.
 * @param sy      Y-axis scale factor. Same semantics as `sx`.
 * @returns       A Transform equivalent to `baseTx` with the selection
 *                rotation and drag-scale composed in, plus a screen-space
 *                pin offset so the pivot corner matches the rotation-only
 *                render.
 */
export function buildScaleChildTransform(
  baseTx: Transform,
  angle: number,
  center: Point,
  pivot: Point,
  sx: number,
  sy: number,
): Transform {
  const Rc = rotationAround(angle, center);
  // Pivot rotated into world (standard apply), so axis-aligned scale anchors
  // at the displayed pivot position.
  const piv = applyWorldStandard(Rc, pivot);
  const Sax = compose(
    Transform.fromTranslation(-piv.x, -piv.y, 0),
    Transform.fromScale(sx, sy, 1),
    Transform.fromTranslation(piv.x, piv.y, 0),
  );
  // axis child -> Rc -> Sax -> base. (compose applies args left-to-right.)
  let M = compose(Rc, Sax, baseTx);

  // Pin the pivot: where the rotation-only path renders the pivot corner.
  const target = worldToScreenPoint(compose(Rc, baseTx), pivot);
  const cur = worldToScreenPoint(M, pivot);
  const dm = Float32Array.from(M.directMatrix);
  dm[12] = dm[12]! + (target.x - cur.x);
  dm[13] = dm[13]! + (target.y - cur.y);
  M = Transform.fromMat4(dm);
  return M;
}

/**
 * Draw a selection handle as a filled-and-stroked circle.
 *
 * @param ctx   - canvas 2D context (identity transform, screen coordinates)
 * @param pos   - handle center (screen pixels)
 * @param r     - handle radius (screen pixels)
 * @param fill  - fill color
 */
/**
 * Draw the selection bounding-box outline as a closed path through its four
 * screen-space corners.
 */
function drawBox(ctx: CanvasRenderingContext2D, corners: CornerQuad): void {
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  ctx.lineTo(corners[1].x, corners[1].y);
  ctx.lineTo(corners[2].x, corners[2].y);
  ctx.lineTo(corners[3].x, corners[3].y);
  ctx.closePath();
  ctx.stroke();
}

function drawHandle(
  ctx: CanvasRenderingContext2D,
  pos: Point,
  r: number,
  fill: string,
): void {
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, r, 0, 2 * Math.PI);
  ctx.fillStyle = fill;
  ctx.strokeStyle = "#333333";
  ctx.lineWidth = 1.5;
  ctx.fill();
  ctx.stroke();
}

type CornerQuad = [Point, Point, Point, Point];

interface SelectionRefs {
  positions: Point[];
}

/**
 * Create a `pointermove` handler that hit-tests against the selection
 * handles and the selection box interior.
 *
 * Handles are tested by Euclidean distance (`HANDLE_HIT_RADIUS`). The box
 * interior uses `pointInConvexPolygon` on the four corner screen positions.
 * Results are written into Solid signals so the draw effect can update
 * hover visuals.
 *
 * The `sel` ref is mutated each frame by the draw effect (the `positions`
 * array is replaced in-place), so this handler always reads the latest
 * handle/box screen coordinates without allocating signals per handle.
 *
 * @param sel              Mutable ref whose `positions` array is updated
 *                         every frame by the draw effect. Elements 0-3 are
 *                         box corners (screen coords), element 4 is the
 *                         rotation handle.
 * @param setHoveredHandle Signal setter: -1 = no handle hovered, 0-4 = the
 *                         hovered handle index.
 * @param setHoveredBox    Signal setter: true when the pointer is inside
 *                         the selection box polygon (and not on a handle).
 * @returns                A `pointermove` event handler to attach to the
 *                         canvas.
 */
function createPointerMoveHandler(
  sel: SelectionRefs,
  setHoveredHandle: (v: number) => void,
  setHoveredBox: (v: boolean) => void,
): (e: PointerEvent) => void {
  return (e: PointerEvent) => {
    const canvas = e.currentTarget as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const sp = Point.from(
      e.clientX - rect.left,
      e.clientY - rect.top,
      0,
    );

    const hitRadiusSq = HANDLE_HIT_RADIUS * HANDLE_HIT_RADIUS;
    const found = sel.positions.findIndex((h) => {
      const dx = sp.x - h.x;
      const dy = sp.y - h.y;
      return dx * dx + dy * dy < hitRadiusSq;
    });
    setHoveredHandle(found);

    setHoveredBox(
      found === -1 &&
        sel.positions.length >= 4 &&
        pointInConvexPolygon(sp, sel.positions.slice(0, 4)),
    );
  };
}

/**
 * Select2D — a SolidJS component that wraps children with draggable
 * selection UI (translate / scale / rotate).
 *
 * ## Interaction modes
 *
 * - **Translate**: pointer-down inside the selection box drags all children
 *   in world space. Uses the parent viewport's scale factor to convert
 *   screen pixels to world units.
 * - **Scale**: pointer-down on a corner handle (indices 0-3) starts a
 *   corner-drag scale. Scale factors are computed in axis-aligned
 *   (un-rotated) box space so the box stays rectangular at any rotation.
 *   Holding Shift pivots around the centre (uniform scale).
 * - **Rotate**: pointer-down on the rotation handle (index 4, above the
 *   top edge) starts a rotation drag. Rotation is virtual — it stays in
 *   the `childViewport` transform and is never committed to children.
 *
 * ## Architecture
 *
 * The component provides its own `canvasContext` (overriding the parent)
 * with a `childViewport` that composes the parent viewport, the current
 * drag delta, the virtual rotation, and any active scale preview transform.
 * Children receive this viewport and render through it automatically.
 *
 * Selection outline and handles are drawn directly on the canvas in a
 * `createEffect` that reads childViewport, union bounds, and hover signals.
 *
 * @see buildScaleChildTransform  How the scale preview transform is built.
 * @see rotationAround            How the rotation transform is built.
 * @see scaleCommitTranslation    How the release-jump is eliminated.
 */
export const Select2D: Component<Select2DProps> = (props) => {
  const ctx = useContext(canvasContext);
  const [boundsMap, setBoundsMap] = createSignal<Map<string, BoundingBox>>(
    new Map(),
  );

  const transformHandlers = new Map<
    string,
    (commit: SelectionCommit) => void
  >();

  const selValue = {
    registerBounds: (id: string, box: BoundingBox) => {
      setBoundsMap((prev) => {
        const next = new Map(prev);
        next.set(id, box);
        return next;
      });
    },
    unregisterBounds: (id: string) => {
      setBoundsMap((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    },
    registerTransformHandler: (
      id: string,
      handler: (commit: SelectionCommit) => void,
    ) => {
      transformHandlers.set(id, handler);
    },
    unregisterTransformHandler: (id: string) => {
      transformHandlers.delete(id);
    },
  };

  const unionBounds = createMemo(() => {
    const map = boundsMap();
    if (map.size === 0) {
      return null;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const box of map.values()) {
      minX = Math.min(minX, box.min.x);
      minY = Math.min(minY, box.min.y);
      maxX = Math.max(maxX, box.max.x);
      maxY = Math.max(maxY, box.max.y);
    }
    return { min: Point.from(minX, minY, 0), max: Point.from(maxX, maxY, 0) };
  });

  const padding = () => props.padding ?? DEFAULT_PADDING;
  const color = () => props.color ?? DEFAULT_COLOR;
  const handleColor = () => props.handleColor ?? DEFAULT_HANDLE_COLOR;
  const handleHighlightColor = () =>
    props.handleHighlightColor ?? DEFAULT_HANDLE_HIGHLIGHT_COLOR;

  const [hoveredBox, setHoveredBox] = createSignal(false);
  const [hoveredHandle, setHoveredHandle] = createSignal(-1);
  const [dragDelta, setDragDelta] = createSignal(Vector.from(0, 0, 0));

  const [rotationAngle, setRotationAngle] = createSignal(0);
  const [isRotating, setIsRotating] = createSignal(false);
  const [rotPointerPos, setRotPointerPos] = createSignal<Point | null>(null);
  const [rotInitAngle, setRotInitAngle] = createSignal(0);
  const [arcDelta, setArcDelta] = createSignal(0);

  const [scaleDelta, setScaleDelta] = createSignal<[number, number]>([1, 1]);

  let dragging = false;
  let dragScreenStart: Point | null = null;
  let dragBase = Vector.from(0, 0, 0);

  let rotating = false;
  let rotationBase = 0;
  let lastMouseAngle = 0;

  // Scale uses an axis-aligned (un-rotated) box space so the scale factors
  // are always world-axis-aligned. The selection's rotation is applied
  // separately via the same center rotation used by the rotation-only path,
  // which keeps the scaled box rectangular and the rotation direction
  // consistent regardless of angle. See childViewport / buildScaleChildTransform.
  let scaling = false;
  let scaleShiftActive = false;
  // Axis-aligned pivot (opposite corner) in un-rotated box world space.
  // scaleLocalCorner = draggedCorner - pivot (as [dx, dy]).
  let scalePivot: Point | null = null;
  let scaleLocalCorner: Vector = Vector.from(0, 0, 0);
  // Box center captured at drag start (rotation is around this point).
  let scaleCenter: Point = Point.origin();
  // For Shift (uniform) scale we pivot around the center instead.
  let scaleCenterPivot: Point = Point.origin();
  let scaleCenterLocalCorner: Vector = Vector.from(0, 0, 0);
  // Padded (un-rotated) box bounds captured at drag start, used to compute the
  // commit compensation translation.
  let scaleBox: BoundingBox = { min: Point.origin(), max: Point.origin() };
  // Mouse screen position and scaleDelta at scale drag start, used for
  // delta-based nSx/nSy computation that avoids Sax-sandwich distortion.
  let capturedMouseScreen: Point = Point.origin();
  let capturedScale: [number, number] = [1, 1];

  const childViewport = createMemo(() => {
    const vp = ctx?.vp();
    if (!vp) {
      return undefined;
    }
    const d = dragDelta();
    const angle = rotationAngle();
    const [sx, sy] = scaleDelta();
    const box = unionBounds();

    const translateTx = Transform.fromTranslation(d.x, -d.y, 0);
    let childTx = compose(translateTx, vp.transform);

    if (box && (angle !== 0 || sx !== 1 || sy !== 1)) {
      const center = Point.from(
        (box.min.x + box.max.x) / 2,
        (box.min.y + box.max.y) / 2,
        0,
      );
      const sxActive = sx !== 1 || sy !== 1;

      const pivot = scaleShiftActive ? scaleCenterPivot : scalePivot;

      if (sxActive && pivot !== null) {
        // Axis-aligned scale in un-rotated box space + rotation around the
        // ORIGINAL box center, so the dragged corner follows the cursor.
        const baseTx = compose(translateTx, vp.transform);
        childTx = buildScaleChildTransform(
          baseTx,
          angle,
          center,
          pivot,
          sx,
          sy,
        );
      } else {
        // Center-based: rotation around box center.
        childTx = compose(
          rotationAround(angle, center),
          translateTx,
          vp.transform,
        );
      }
    }

    return { ...vp, transform: childTx };
  });

  const selRefs: SelectionRefs = {
    positions: [],
  };

  createEffect(() => {
    ctx?.redrawVersion();
    const vp = childViewport();
    const box = unionBounds();
    const rotatingNow = isRotating();
    const hovBox = hoveredBox();
    const hovHandle = hoveredHandle();
    const rotPtr = rotPointerPos();
    const initAngle = rotInitAngle();
    const rotArcDelta = arcDelta();

    if (!vp) {
      return;
    }
    if (!box) {
      selRefs.positions = [];
      if (!untrack(() => ctx?.rAFWillClear() ?? false)) {
        ctx?.requestRedraw();
      }
      return;
    }

    const p = padding();
    const col = color();
    const M = vp.transform;

    // The selection box outline tracks the children exactly: the UNPADDED
    // child corners go through the childViewport transform M (which contains
    // rotation + any active scale Sax), then the visual padding is added in
    // SCREEN space as a CONSTANT outward offset along the box's local axes.
    // Padding must NOT pass through M — otherwise Sax would scale the padding,
    // making the handle drift away from the cursor as the box resizes.
    const unpadded: CornerQuad = [
      worldToScreenPoint(M, box.min),
      worldToScreenPoint(M, Point.from(box.max.x, box.min.y, 0)),
      worldToScreenPoint(M, box.max),
      worldToScreenPoint(M, Point.from(box.min.x, box.max.y, 0)),
    ];

    // Constant screen-space padding magnitude (world units → pixels), applied
    // along the box's rotated local x/y axes derived from the scaled corners.
    const padPx = p / vp.scaleFactor;
    const exVec = Vector.fromPoints(unpadded[1], unpadded[0]); // local +x
    const eyVec = Vector.fromPoints(unpadded[3], unpadded[0]); // local +y
    const exLen = exVec.length;
    const eyLen = eyVec.length;
    const padX = exLen > 1e-9
      ? exVec.scale(padPx / exLen)
      : Vector.from(padPx, 0, 0);
    const padY = eyLen > 1e-9
      ? eyVec.scale(padPx / eyLen)
      : Vector.from(0, padPx, 0);

    const screenCorners: CornerQuad = [
      unpadded[0].add(padX.scale(-1)).add(padY.scale(-1)),
      unpadded[1].add(padX).add(padY.scale(-1)),
      unpadded[2].add(padX).add(padY),
      unpadded[3].add(padX.scale(-1)).add(padY),
    ];

    const c0 = screenCorners[3]!;
    const c1 = screenCorners[2]!;
    const topMid = c0.add(Vector.fromPoints(c1, c0).scale(0.5));
    const eVec = Vector.fromPoints(c1, c0);
    const eLen = eVec.length;

    const sc0 = screenCorners[0];
    const sc2 = screenCorners[2];
    const center = sc0.add(Vector.fromPoints(sc2, sc0).scale(0.5));

    let normal: Vector;
    if (eLen < 1e-9) {
      const d = Vector.fromPoints(center, topMid);
      if (d.length < 1e-9) {
        normal = Vector.from(0, -1, 0);
      } else {
        normal = d.scale(1 / d.length);
      }
    } else {
      const eVecDir = eVec.scale(1 / eLen);
      const perp = Vector.from(eVecDir.y, -eVecDir.x, 0);
      const outwardCW = Vector.fromPoints(topMid, center).dot(perp);
      normal = outwardCW > 0 ? perp : perp.scale(-1);
    }

    selRefs.positions = [
      screenCorners[0],
      screenCorners[1],
      screenCorners[2],
      screenCorners[3],
      Point.from(
        topMid.x + normal.x * ROTATION_HANDLE_OFFSET,
        topMid.y + normal.y * ROTATION_HANDLE_OFFSET,
        0,
      ),
    ];

    vp.ctx.save();
    vp.ctx.setTransform(1, 0, 0, 1, 0, 0);

    const isSelected = hovBox || hovHandle !== -1 || scaling || rotatingNow;
    vp.ctx.globalAlpha = isSelected ? 1 : 0.7;
    vp.ctx.strokeStyle = col;
    vp.ctx.lineWidth = isSelected ? 2 : 1;
    vp.ctx.setLineDash([6, 4]);

    drawBox(vp.ctx, screenCorners);

    if (scaling) {
      vp.ctx.globalAlpha = 0.12;
      vp.ctx.setLineDash([]);
      drawBox(vp.ctx, unpadded);
      vp.ctx.globalAlpha = isSelected ? 1 : 0.7;
      vp.ctx.setLineDash([6, 4]);
    }

    const rotHandlePos = selRefs.positions[4]!;
    vp.ctx.beginPath();
    vp.ctx.moveTo(topMid.x, topMid.y);
    vp.ctx.lineTo(rotHandlePos.x, rotHandlePos.y);
    vp.ctx.stroke();

    // Center crosshair, only while rotating
    if (rotatingNow) {
      vp.ctx.setLineDash([]);
      drawCenterCrosshair(vp.ctx, center, col);
    }

    // Line and arc from center to mouse cursor while rotating
    if (rotatingNow && rotPtr) {
      drawPointerLine(vp.ctx, center, rotPtr, col);
      drawRotationArc(vp.ctx, center, 50, initAngle, rotArcDelta, col);
    }

    vp.ctx.globalAlpha = 1;
    vp.ctx.setLineDash([]);

    selRefs.positions.forEach((pos, i) => {
      const radius = hovHandle === i || (rotatingNow && i === 4)
        ? HANDLE_RADIUS + 2
        : HANDLE_RADIUS;
      drawHandle(vp.ctx, pos, radius,
        i === hovHandle ? handleHighlightColor() : handleColor());
    });

    vp.ctx.restore();

    if (!untrack(() => ctx?.rAFWillClear() ?? false)) {
      ctx?.requestRedraw();
    }
  });

  createEffect(() => {
    const vp = childViewport();
    const canvas = vp?.ctx.canvas;
    if (!canvas) {
      return;
    }

    const hoverHandler = createPointerMoveHandler(
      selRefs,
      setHoveredHandle,
      setHoveredBox,
    );

    const onPointerDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const sp = Point.from(e.clientX - rect.left, e.clientY - rect.top, 0);

      for (let i = 0; i < selRefs.positions.length; i++) {
        const h = selRefs.positions[i]!;
        const d = Vector.fromPoints(h, sp);
        if (d.lengthSquare < HANDLE_HIT_RADIUS * HANDLE_HIT_RADIUS) {
          if (i === 4) {
            e.stopImmediatePropagation();
            const p0 = selRefs.positions[0]!;
            const p2 = selRefs.positions[2]!;
            const mid = p0.add(Vector.fromPoints(p2, p0).scale(0.5));
            // Angle of cursor relative to rotation center (screen space)
            const angle = Math.atan2(sp.y - mid.y, sp.x - mid.x);
            setRotInitAngle(angle);
            lastMouseAngle = angle;
            setArcDelta(0);
            rotationBase = untrack(() => rotationAngle());
            rotating = true;
            setIsRotating(true);
            canvas.setPointerCapture(e.pointerId);
          } else if (i < 4) {
            e.stopImmediatePropagation();
            const box = untrack(() => unionBounds());
            if (box) {
              // Use UNPADDED child corners for the scale pivot and factors.
              // The selection outline's padding is purely visual — it must
              // not affect which vertex stays fixed during resize.
              const axisCorners: Point[] = [
                box.min,
                Point.from(box.max.x, box.min.y, 0),
                box.max,
                Point.from(box.min.x, box.max.y, 0),
              ];
              const opp = (i + 2) % 4;
              const rawPivot = axisCorners[opp]!;
              const corner = axisCorners[i]!;
              const ctr = Point.from(
                (box.min.x + box.max.x) / 2,
                (box.min.y + box.max.y) / 2,
                0,
              );
              scaleShiftActive = false;
              scaleCenter = ctr;
              scaleBox = { min: box.min, max: box.max };
              // Corner-pivot scale (non-uniform): pivot at opposite corner.
              scalePivot = rawPivot;
              scaleLocalCorner = Vector.fromPoints(corner, rawPivot);
              // Center-pivot scale (uniform / Shift): pivot at box center.
              scaleCenterPivot = ctr;
              scaleCenterLocalCorner = Vector.fromPoints(corner, ctr);
              // Capture initial state for delta-based nSx/nSy.
              capturedMouseScreen = sp;
              capturedScale = untrack(() => scaleDelta());
              scaling = true;
              canvas.setPointerCapture(e.pointerId);
            }
          }
          return;
        }
      }

      if (
        selRefs.positions.length >= 4 &&
        pointInConvexPolygon(sp, selRefs.positions.slice(0, 4))
      ) {
        e.stopImmediatePropagation();
        dragScreenStart = sp;
        dragBase = untrack(() => dragDelta());
        dragging = true;
        canvas.setPointerCapture(e.pointerId);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (rotating) {
        e.stopImmediatePropagation();
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        setRotPointerPos(Point.from(sx, sy, 0));
        const p0 = selRefs.positions[0]!;
        const p2 = selRefs.positions[2]!;
        const midX = (p0.x + p2.x) / 2;
        const midY = (p0.y + p2.y) / 2;
        const curAngle = Math.atan2(sy - midY, sx - midX);
        let delta = curAngle - lastMouseAngle;
        if (delta > Math.PI) delta -= 2 * Math.PI;
        if (delta < -Math.PI) delta += 2 * Math.PI;
        lastMouseAngle = curAngle;
        setArcDelta((prev) => {
          let next = prev + delta;
          if (next > Math.PI * 2) next -= Math.PI * 2;
          if (next < -Math.PI * 2) next += Math.PI * 2;
          return next;
        });
        setRotationAngle(rotationBase + curAngle - rotInitAngle());
        return;
      }

      if (scaling) {
        e.stopImmediatePropagation();
        const parentVp = ctx?.vp();
        if (parentVp) {
          const rect = canvas.getBoundingClientRect();
          const sx = e.clientX - rect.left;
          const sy = e.clientY - rect.top;
          const d = untrack(() => dragDelta());
          const angle = untrack(() => rotationAngle());
          const tTx = Transform.fromTranslation(d.x, -d.y, 0);
          const baseTx = compose(tTx, parentVp.transform);
          // Convert the mouse into axis-aligned box space by inverting the
          // rotation-only render transform. This un-rotates the pointer so
          // scale factors are computed along world axes (matching the
          // axis-aligned pivot/corner captured on pointer down).
          const axisTx = compose(rotationAround(angle, scaleCenter), baseTx);
          const worldMouse = screenToWorldPoint(axisTx, Point.from(sx, sy, 0));
          const shiftHeld = e.shiftKey;
          scaleShiftActive = shiftHeld;
          const pivot = shiftHeld ? scaleCenterPivot : scalePivot;
          const lc = shiftHeld ? scaleCenterLocalCorner : scaleLocalCorner;
          if (pivot) {
            // Delta-based nSx: use the mouse movement relative to the captured
            // start position. This avoids the Sax-sandwich distortion — the
            // render includes Sax, but axisTx doesn't, so absolute worldMouse
            // through axisTx is wrong once scaleDelta ≠ [1,1]. By measuring
            // relative movement and adding it to the captured initial scale,
            // the padding offset (which is constant across frames) cancels out.
            const initialWorld = screenToWorldPoint(
              axisTx, capturedMouseScreen,
            );
            const worldDeltaX = worldMouse.x - initialWorld.x;
            const worldDeltaY = worldMouse.y - initialWorld.y;
            const initSx = capturedScale[0];
            const initSy = capturedScale[1];
            let nSx = lc.x !== 0 ? initSx + worldDeltaX / lc.x : 1;
            let nSy = lc.y !== 0 ? initSy + worldDeltaY / lc.y : 1;
            if (shiftHeld) {
              const uniform = Math.max(Math.abs(nSx), Math.abs(nSy));
              nSx = uniform;
              nSy = uniform;
            }
            setScaleDelta([Math.max(0.01, nSx), Math.max(0.01, nSy)]);
          }
        }
        return;
      }

      if (dragging && dragScreenStart) {
        e.stopImmediatePropagation();
        const parentVp = ctx?.vp();
        if (parentVp) {
          const rect = canvas.getBoundingClientRect();
          const sx = e.clientX - rect.left;
          const sy = e.clientY - rect.top;
          const sf = parentVp.scaleFactor;
          const worldDx = (sx - dragScreenStart.x) * sf;
          const worldDy = -(sy - dragScreenStart.y) * sf;
          setDragDelta(
            Vector.from(dragBase.x + worldDx, dragBase.y + worldDy, 0),
          );
        }
        return;
      }
      hoverHandler(e);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (rotating) {
        e.stopImmediatePropagation();
        rotating = false;
        setIsRotating(false);
        setRotPointerPos(null);
        return;
      }
      if (scaling) {
        e.stopImmediatePropagation();
        scaling = false;
        // Commit scale to children then reset. The scale is axis-aligned in
        // the children's (un-rotated) world space around the axis pivot, so
        // the existing axis-aligned commit format applies directly and the
        // selection's virtual rotation is preserved.
        const pivot = scaleShiftActive ? scaleCenterPivot : scalePivot;
        if (transformHandlers.size > 0 && pivot) {
          const [sx, sy] = untrack(() => scaleDelta());
          const angle = untrack(() => rotationAngle());
          const commit: SelectionCommit = {
            type: "scale",
            scale: Vector.from(sx, sy, 0),
            pivot,
          };
          transformHandlers.forEach((h) => h(commit));

          // The drag preview rotated around the ORIGINAL center; after the
          // scale the selection rotation re-applies around the NEW center,
          // which would move the pinned pivot corner and make the box jump.
          // Apply a compensating translate so the pivot stays fixed.
          if (angle !== 0) {
            const parentVp = ctx?.vp();
            if (parentVp) {
              const d = untrack(() => dragDelta());
              const baseTx = compose(
                Transform.fromTranslation(d.x, -d.y, 0),
                parentVp.transform,
              );
              const dv = scaleCommitTranslation(
                baseTx, angle, scaleCenter, scaleBox, pivot, sx, sy,
              );
              if (dv.x !== 0 || dv.y !== 0) {
                const tCommit: SelectionCommit = {
                  type: "translate",
                  delta: dv,
                };
                transformHandlers.forEach((h) => h(tCommit));
              }
            }
          }
          setScaleDelta([1, 1]);
        }
        scalePivot = null;
        return;
      }
      if (dragging) {
        e.stopImmediatePropagation();
        dragging = false;
        dragScreenStart = null;
        // Commit translate to children then reset
        if (transformHandlers.size > 0) {
          const d = untrack(() => dragDelta());
          if (d.x !== 0 || d.y !== 0) {
            const commit: SelectionCommit = {
              type: "translate",
              delta: d,
            };
            transformHandlers.forEach((h) => h(commit));
            setDragDelta(Vector.from(0, 0, 0));
            dragBase = Vector.from(0, 0, 0);
          }
        }
      }
    };

    const onPointerLeave = () => {
      setHoveredBox(false);
      setHoveredHandle(-1);
    };

    canvas.addEventListener("pointerdown", onPointerDown, { capture: true });
    canvas.addEventListener("pointermove", onPointerMove, { capture: true });
    canvas.addEventListener("pointerup", onPointerUp, { capture: true });
    canvas.addEventListener("pointerleave", onPointerLeave, { capture: true });
    onCleanup(() => {
      canvas.removeEventListener("pointerdown", onPointerDown, {
        capture: true,
      });
      canvas.removeEventListener("pointermove", onPointerMove, {
        capture: true,
      });
      canvas.removeEventListener("pointerup", onPointerUp, { capture: true });
      canvas.removeEventListener("pointerleave", onPointerLeave, {
        capture: true,
      });
    });
  });

  const ctxValue = {
    vp: childViewport,
    redrawVersion: ctx?.redrawVersion ?? (() => 0),
    requestRedraw: ctx?.requestRedraw ?? (() => {}),
    rAFWillClear: ctx?.rAFWillClear ?? (() => false),
  };

  return (
    <canvasContext.Provider value={ctxValue}>
      <selectionContext.Provider value={selValue}>
        {props.children}
      </selectionContext.Provider>
    </canvasContext.Provider>
  );
};
