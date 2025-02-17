import { Transform, Point, map, compose } from '@micurs/ts-geopro';

const translation = Transform.fromTranslation(10.0, 10.0, 0);
// map is curried -> get a translation function
const translate = map(translation);
const p1 = Point.from(0.0, 0.0, 0.0);

console.log('Point translated: ', ` ${p1} =>`, translate(p1).toString());

const rotation = Transform.fromRotationX(Math.PI/2);
const rotate = map(rotation);
const p2 = Point.from(0,1,0);

console.log('Point rotate: ', ` ${p2} =>`, rotate(p2).toString());

const rotTranslation = compose(rotation, translation);
const rotTranslate = map(rotTranslation);
const p3 = Point.from(0, 1, 0);
console.log('Point rotate-translate: ', ` ${p2} =>`, rotTranslate(p2).toString());


