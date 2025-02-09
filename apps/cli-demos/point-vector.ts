import { Point, Vector } from "@micurs/ts-geopro";


const p1 = Point.from(10,10,10);
const p2 = Point.from(2, 3, 8);

const v = Vector.fromPoints(p1, p2);

console.log(v.toString());