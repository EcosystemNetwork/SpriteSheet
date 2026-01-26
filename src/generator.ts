import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs/promises';
import { glob } from 'glob';
import { packRectangles } from './packer.js';
import type {
  Sprite,
  PackedSprite,
  SpriteSheetConfig,
  SpriteSheetResult,
  SpriteSheetMetadata,
  SpriteFrame,
} from './types.js';

const DEFAULT_CONFIG: Required<SpriteSheetConfig> = {
  padding: 1,
  maxWidth: 4096,
  maxHeight: 4096,
  format: 'png',
  quality: 90,
  trim: false,
  powerOfTwo: false,
  sort: true,
};

/**
 * Load a single image file and return sprite data
 */
export async function loadImage(filePath: string): Promise<Sprite> {
  const data = await fs.readFile(filePath);
  const metadata = await sharp(data).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error(`Could not read dimensions of image: ${filePath}`);
  }

  const name = path.basename(filePath, path.extname(filePath));

  return {
    name,
    width: metadata.width,
    height: metadata.height,
    data,
    path: filePath,
  };
}

/**
 * Load multiple images from files or glob patterns
 */
export async function loadImages(patterns: string[]): Promise<Sprite[]> {
  const sprites: Sprite[] = [];
  const seenNames = new Set<string>();

  for (const pattern of patterns) {
    const files = await glob(pattern, { nodir: true });

    for (const file of files) {
      const sprite = await loadImage(file);

      // Ensure unique names
      let uniqueName = sprite.name;
      let counter = 1;
      while (seenNames.has(uniqueName)) {
        uniqueName = `${sprite.name}_${counter}`;
        counter++;
      }
      seenNames.add(uniqueName);
      sprite.name = uniqueName;

      sprites.push(sprite);
    }
  }

  return sprites;
}

/**
 * Trim transparent pixels from a sprite
 */
export async function trimSprite(sprite: Sprite): Promise<Sprite> {
  const image = sharp(sprite.data);
  const trimmed = await image.trim().toBuffer();
  const metadata = await sharp(trimmed).metadata();

  return {
    ...sprite,
    data: trimmed,
    width: metadata.width ?? sprite.width,
    height: metadata.height ?? sprite.height,
  };
}

/**
 * Generate a sprite sheet from an array of sprites
 */
export async function generateSpriteSheet(
  sprites: Sprite[],
  config: SpriteSheetConfig = {}
): Promise<SpriteSheetResult> {
  const cfg: Required<SpriteSheetConfig> = { ...DEFAULT_CONFIG, ...config };

  if (sprites.length === 0) {
    throw new Error('No sprites provided');
  }

  // Optionally trim sprites
  let processedSprites = sprites;
  if (cfg.trim) {
    processedSprites = await Promise.all(sprites.map(trimSprite));
  }

  // Sort sprites by area (largest first) for better packing
  const indexedSprites = processedSprites.map((sprite, index) => ({
    sprite,
    index,
  }));

  if (cfg.sort) {
    indexedSprites.sort(
      (a, b) =>
        b.sprite.width * b.sprite.height - a.sprite.width * a.sprite.height
    );
  }

  // Prepare rectangles for packing
  const rectangles = indexedSprites.map((item) => ({
    width: item.sprite.width,
    height: item.sprite.height,
    index: item.index,
  }));

  // Pack the rectangles
  const packResult = packRectangles(
    rectangles,
    cfg.maxWidth,
    cfg.maxHeight,
    cfg.padding,
    cfg.powerOfTwo
  );

  if (!packResult) {
    throw new Error(
      `Could not pack sprites within ${cfg.maxWidth}x${cfg.maxHeight} dimensions`
    );
  }

  // Create packed sprites with positions
  const packedSprites: PackedSprite[] = packResult.packed.map((packed) => {
    const sprite = processedSprites[packed.index];
    return {
      ...sprite,
      x: packed.x,
      y: packed.y,
    };
  });

  // Create the sprite sheet image
  const sheetWidth = packResult.width;
  const sheetHeight = packResult.height;

  // Start with a transparent background
  const composites = await Promise.all(
    packedSprites.map(async (sprite) => {
      // Ensure the image is in RGBA format
      const buffer = await sharp(sprite.data)
        .ensureAlpha()
        .raw()
        .toBuffer();

      return {
        input: buffer,
        raw: {
          width: sprite.width,
          height: sprite.height,
          channels: 4 as const,
        },
        left: sprite.x,
        top: sprite.y,
      };
    })
  );

  let sheetImage = sharp({
    create: {
      width: sheetWidth,
      height: sheetHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite(composites);

  // Apply output format
  let outputBuffer: Buffer;
  switch (cfg.format) {
    case 'jpeg':
      outputBuffer = await sheetImage.jpeg({ quality: cfg.quality }).toBuffer();
      break;
    case 'webp':
      outputBuffer = await sheetImage.webp({ quality: cfg.quality }).toBuffer();
      break;
    case 'png':
    default:
      outputBuffer = await sheetImage.png().toBuffer();
      break;
  }

  // Generate metadata
  const frames: Record<string, SpriteFrame> = {};
  const originalSpriteMap = new Map(sprites.map((s) => [s.name, s]));
  for (const sprite of packedSprites) {
    const originalSprite = originalSpriteMap.get(sprite.name);
    frames[sprite.name] = {
      frame: {
        x: sprite.x,
        y: sprite.y,
        w: sprite.width,
        h: sprite.height,
      },
      rotated: false,
      trimmed: cfg.trim,
      sourceSize: {
        w: originalSprite?.width ?? sprite.width,
        h: originalSprite?.height ?? sprite.height,
      },
      spriteSourceSize: {
        x: 0,
        y: 0,
        w: sprite.width,
        h: sprite.height,
      },
    };
  }

  const metadata: SpriteSheetMetadata = {
    frames,
    meta: {
      app: 'spritesheet-generator',
      version: '1.0.0',
      image: `spritesheet.${cfg.format}`,
      format: cfg.format.toUpperCase(),
      size: {
        w: sheetWidth,
        h: sheetHeight,
      },
      scale: 1,
    },
  };

  return {
    image: outputBuffer,
    metadata,
    width: sheetWidth,
    height: sheetHeight,
  };
}

/**
 * Generate a sprite sheet from file paths/patterns and save to disk
 */
export async function generateSpriteSheetFromFiles(
  patterns: string[],
  outputPath: string,
  config: SpriteSheetConfig = {}
): Promise<SpriteSheetResult> {
  const sprites = await loadImages(patterns);

  if (sprites.length === 0) {
    throw new Error('No images found matching the provided patterns');
  }

  const result = await generateSpriteSheet(sprites, config);

  // Determine output paths
  const outputDir = path.dirname(outputPath);
  const baseName = path.basename(outputPath, path.extname(outputPath));
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const imagePath = path.join(outputDir, `${baseName}.${cfg.format}`);
  const jsonPath = path.join(outputDir, `${baseName}.json`);

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  // Update metadata with actual image filename
  result.metadata.meta.image = path.basename(imagePath);

  // Write files
  await Promise.all([
    fs.writeFile(imagePath, result.image),
    fs.writeFile(jsonPath, JSON.stringify(result.metadata, null, 2)),
  ]);

  return result;
}
