import type { Renderable, Scene } from './types.ts';

export const createScene = (): Scene => ({
  entities: [],
});

export const addEntity = (scene: Scene, entity: Renderable) => {
  scene.entities.push(entity);
};
