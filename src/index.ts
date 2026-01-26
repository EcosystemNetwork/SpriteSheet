// Main exports
export { generateSpriteSheet, generateSpriteSheetFromFiles, loadImage, loadImages, trimSprite } from './generator.js';
export { MaxRectsPacker, packRectangles, nextPowerOfTwo } from './packer.js';
export type {
  Sprite,
  PackedSprite,
  SpriteSheetConfig,
  SpriteSheetResult,
  SpriteSheetMetadata,
  SpriteFrame,
  Rectangle,
  FreeRectangle,
} from './types.js';
