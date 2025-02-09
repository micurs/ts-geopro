import { Point, Vector, UnitVector, add } from '@micurs/ts-geopro';

const p1 = Point.from(2, 3, 8);
const p2 = Point.from(10, 10, 10);

const fromTwoPoints = Vector.fromPoints(p2, p1);

console.log('Vector from 2 points: ', ` ${p2} - ${p1} =`, fromTwoPoints.toString());

// Create and manipulate vectors
const v1 = Vector.from(1, 0, 0);
const v2 = Vector.from(0, 1, 0);
const crossProduct = UnitVector.crossProduct(v1, v2);

console.log('UnitVector from cross product: ', ` ${v1} X ${v2} =`, crossProduct.toString());

const pStart = Point.from(4, 5, 10);
const vDir = Vector.from(6, 5, 0);

const newPoint = add(pStart, vDir);

console.log('Point from Point + Vector: ', ` ${pStart} + ${vDir} =`, newPoint.toString());

const vDir1 = Vector.from(1, 1, 0);
const vDir2 = Vector.from(1, -1, 0);

const inBetweenDir = UnitVector.from(add(vDir1, vDir2));

console.log('Direction in between two vectors: ', ` ${vDir1} + ${vDir2} =`, inBetweenDir.toString());
