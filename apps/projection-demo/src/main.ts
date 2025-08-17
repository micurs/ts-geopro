import { cube } from './cube.ts';
import { drawGrid, drawShape, drawWorldFrame } from './draw.ts';
import './style.css';
import { Point, Projection, Transform, UnitVector, map, compose } from '@micurs/ts-geopro';
import type { Context3D } from './types.ts';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const width = (canvas.width = globalThis.innerWidth);
const height = (canvas.height = globalThis.innerHeight);
const viewAngle = Math.PI / 3.8; // 60 degrees
let eye = Point.from(6, 6, 2); // Camera position
let worldToCamera = Transform.lookAt(eye, Point.origin(), UnitVector.from(0, 0, 1));
let projection = Projection.perspective(viewAngle, width / height, 0.1, 100);

let angle = 0;

const context3D: Context3D = {
  ctx,
  projection: map(compose(worldToCamera, projection)), // map creates a function that applies both transforms
  width,
  height,
  dpr: 1,
};

function animate() {
  const { width, height } = context3D;
  angle += 0.005;
  const rotationCam = Transform.fromRotationZ(0.0005); // Rotation.fromAxisAngle(UnitVector.from(1, -1, 1), angle);
  const rotation1 = Transform.fromRotationX(angle); // Rotation.fromAxisAngle(UnitVector.from(1, -1, 1), angle);
  const rotation2 = Transform.fromRotationZ(angle / 2); //  Rotation.fromAxisAngle(UnitVector.from(1, 0, 1), angle);
  const transform = compose(rotation1, rotation2);

  // Clear canvas with identity transform, then restore NDC transform
  ctx.resetTransform();
  ctx.clearRect(0, 0, width, height);

  // Set up canvas transformation to convert NDC coordinates to screen coordinates
  ctx.setTransform(width / 2, 0, 0, -height / 2, width / 2, height / 2);

  // Camera and projection
  eye = eye.map(rotationCam);
  worldToCamera = Transform.lookAt(eye, Point.origin(), UnitVector.from(0, 0, 1));
  context3D.projection = map(compose(worldToCamera, projection));

  // Drawing
  drawGrid(context3D);
  drawWorldFrame(context3D);
  const tCube = {
    vertices: cube.vertices.map(map(transform)),
    edges: cube.edges,
    faces: cube.faces,
  };
  drawShape(context3D, tCube, eye);
  requestAnimationFrame(animate);
}

// Improve sharpness on HiDPI: scale canvas to devicePixelRatio and draw in CSS pixel units
const dpr = Math.max(1, Math.min(globalThis.devicePixelRatio || 1, 3));
const resize = () => {
  const { clientWidth, clientHeight } = canvas;
  const [width, height] = [Math.floor(clientWidth * dpr), Math.floor(clientHeight * dpr)];
  canvas.width = width;
  canvas.height = height;
  context3D.width = width;
  context3D.height = height;
  context3D.dpr = dpr;
  projection = Projection.perspective(viewAngle, clientWidth / clientHeight, 0.1, 1000);
  context3D.projection = map(compose(worldToCamera, projection));
};
resize(); // Initial resize to set canvas size
globalThis.addEventListener('resize', resize);

animate();
