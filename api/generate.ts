import type { VercelRequest, VercelResponse } from '@vercel/node';
import sharp from 'sharp';
import { packRectangles } from '../src/packer.js';
import type { SpriteSheetConfig, SpriteSheetMetadata, SpriteFrame, Sprite, PackedSprite } from '../src/types.js';

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

interface SpriteInput {
  name: string;
  data: string; // base64 encoded image data
}

async function processSprite(input: SpriteInput): Promise<Sprite> {
  const buffer = Buffer.from(input.data, 'base64');
  const metadata = await sharp(buffer).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error(`Could not read dimensions of image: ${input.name}`);
  }

  return {
    name: input.name,
    width: metadata.width,
    height: metadata.height,
    data: buffer,
  };
}

async function generateSpriteSheet(
  sprites: Sprite[],
  config: SpriteSheetConfig = {}
): Promise<{ image: Buffer; metadata: SpriteSheetMetadata; width: number; height: number }> {
  const cfg: Required<SpriteSheetConfig> = { ...DEFAULT_CONFIG, ...config };

  if (sprites.length === 0) {
    throw new Error('No sprites provided');
  }

  let processedSprites = sprites;
  if (cfg.trim) {
    processedSprites = await Promise.all(
      sprites.map(async (sprite) => {
        const image = sharp(sprite.data);
        const trimmed = await image.trim().toBuffer();
        const metadata = await sharp(trimmed).metadata();
        return {
          ...sprite,
          data: trimmed,
          width: metadata.width ?? sprite.width,
          height: metadata.height ?? sprite.height,
        };
      })
    );
  }

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

  const rectangles = indexedSprites.map((item) => ({
    width: item.sprite.width,
    height: item.sprite.height,
    index: item.index,
  }));

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

  const packedSprites: PackedSprite[] = packResult.packed.map((packed) => {
    const sprite = processedSprites[packed.index];
    return {
      ...sprite,
      x: packed.x,
      y: packed.y,
    };
  });

  const sheetWidth = packResult.width;
  const sheetHeight = packResult.height;

  const composites = await Promise.all(
    packedSprites.map(async (sprite) => {
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

  const sheetImage = sharp({
    create: {
      width: sheetWidth,
      height: sheetHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite(composites);

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { sprites, config } = req.body as {
      sprites: SpriteInput[];
      config?: SpriteSheetConfig;
    };

    if (!sprites || !Array.isArray(sprites) || sprites.length === 0) {
      return res.status(400).json({
        error: 'Missing or invalid sprites array. Provide an array of {name, data} objects where data is base64 encoded.',
      });
    }

    // Validate sprite inputs
    for (const sprite of sprites) {
      if (!sprite.name || typeof sprite.name !== 'string') {
        return res.status(400).json({ error: 'Each sprite must have a name string' });
      }
      if (!sprite.data || typeof sprite.data !== 'string') {
        return res.status(400).json({ error: 'Each sprite must have base64 encoded data' });
      }
    }

    // Process sprites
    const processedSprites = await Promise.all(sprites.map(processSprite));

    // Generate sprite sheet
    const result = await generateSpriteSheet(processedSprites, config);

    // Return result
    res.status(200).json({
      image: result.image.toString('base64'),
      metadata: result.metadata,
      width: result.width,
      height: result.height,
    });
  } catch (error) {
    console.error('Sprite sheet generation error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate sprite sheet',
    });
  }
}
