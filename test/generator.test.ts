import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import sharp from 'sharp';
import { generateSpriteSheet, loadImages } from '../src/generator.js';
import { nextPowerOfTwo } from '../src/packer.js';
import type { Sprite } from '../src/types.js';

const TEST_DIR = path.join(os.tmpdir(), 'spritesheet-test');
const TEST_IMAGES_DIR = path.join(TEST_DIR, 'images');

// Helper to create test images
async function createTestImage(
  filename: string,
  width: number,
  height: number,
  color: { r: number; g: number; b: number }
): Promise<string> {
  const filePath = path.join(TEST_IMAGES_DIR, filename);
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { ...color, alpha: 1 },
    },
  })
    .png()
    .toFile(filePath);
  return filePath;
}

describe('Generator', () => {
  beforeAll(async () => {
    // Create test directory and images
    await fs.mkdir(TEST_IMAGES_DIR, { recursive: true });

    // Create some test images
    await createTestImage('red.png', 32, 32, { r: 255, g: 0, b: 0 });
    await createTestImage('green.png', 32, 32, { r: 0, g: 255, b: 0 });
    await createTestImage('blue.png', 64, 64, { r: 0, g: 0, b: 255 });
    await createTestImage('yellow.png', 16, 32, { r: 255, g: 255, b: 0 });
  });

  afterAll(async () => {
    // Clean up test directory
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  describe('loadImages', () => {
    it('should load images from glob pattern', async () => {
      const sprites = await loadImages([path.join(TEST_IMAGES_DIR, '*.png')]);

      expect(sprites.length).toBe(4);
      expect(sprites.every((s) => s.width > 0 && s.height > 0)).toBe(true);
    });

    it('should assign unique names to sprites', async () => {
      const sprites = await loadImages([path.join(TEST_IMAGES_DIR, '*.png')]);
      const names = sprites.map((s) => s.name);
      const uniqueNames = new Set(names);

      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe('generateSpriteSheet', () => {
    it('should generate a sprite sheet from sprites', async () => {
      const sprites = await loadImages([path.join(TEST_IMAGES_DIR, '*.png')]);
      const result = await generateSpriteSheet(sprites);

      expect(result.image).toBeInstanceOf(Buffer);
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(Object.keys(result.metadata.frames).length).toBe(4);
    });

    it('should respect padding configuration', async () => {
      const sprites = await loadImages([path.join(TEST_IMAGES_DIR, '*.png')]);
      const result = await generateSpriteSheet(sprites, { padding: 5 });

      // Check that sprites have padding between them
      const frames = Object.values(result.metadata.frames);
      for (const frame of frames) {
        expect(frame.frame.x).toBeGreaterThanOrEqual(5);
        expect(frame.frame.y).toBeGreaterThanOrEqual(5);
      }
    });

    it('should generate valid metadata', async () => {
      const sprites = await loadImages([path.join(TEST_IMAGES_DIR, '*.png')]);
      const result = await generateSpriteSheet(sprites);

      expect(result.metadata.meta.app).toBe('spritesheet-generator');
      expect(result.metadata.meta.version).toBe('1.0.0');
      expect(result.metadata.meta.size.w).toBe(result.width);
      expect(result.metadata.meta.size.h).toBe(result.height);
    });

    it('should support different output formats', async () => {
      const sprites = await loadImages([path.join(TEST_IMAGES_DIR, '*.png')]);

      const pngResult = await generateSpriteSheet(sprites, { format: 'png' });
      const jpegResult = await generateSpriteSheet(sprites, { format: 'jpeg' });
      const webpResult = await generateSpriteSheet(sprites, { format: 'webp' });

      // All should produce valid buffers
      expect(pngResult.image.length).toBeGreaterThan(0);
      expect(jpegResult.image.length).toBeGreaterThan(0);
      expect(webpResult.image.length).toBeGreaterThan(0);

      // Verify format by checking metadata
      expect(pngResult.metadata.meta.format).toBe('PNG');
      expect(jpegResult.metadata.meta.format).toBe('JPEG');
      expect(webpResult.metadata.meta.format).toBe('WEBP');
    });

    it('should throw error for empty sprites array', async () => {
      await expect(generateSpriteSheet([])).rejects.toThrow('No sprites provided');
    });

    it('should constrain to power of two when configured', async () => {
      const sprites = await loadImages([path.join(TEST_IMAGES_DIR, '*.png')]);
      const result = await generateSpriteSheet(sprites, { powerOfTwo: true });

      // Check dimensions are powers of two using imported utility
      expect(nextPowerOfTwo(result.width)).toBe(result.width);
      expect(nextPowerOfTwo(result.height)).toBe(result.height);
    });

    it('should handle custom Sprite objects', async () => {
      // Create sprites directly without loading from files
      const customSprites: Sprite[] = [
        {
          name: 'custom1',
          width: 32,
          height: 32,
          data: await sharp({
            create: {
              width: 32,
              height: 32,
              channels: 4,
              background: { r: 100, g: 100, b: 100, alpha: 1 },
            },
          })
            .png()
            .toBuffer(),
        },
        {
          name: 'custom2',
          width: 48,
          height: 48,
          data: await sharp({
            create: {
              width: 48,
              height: 48,
              channels: 4,
              background: { r: 200, g: 200, b: 200, alpha: 1 },
            },
          })
            .png()
            .toBuffer(),
        },
      ];

      const result = await generateSpriteSheet(customSprites);

      expect(Object.keys(result.metadata.frames)).toContain('custom1');
      expect(Object.keys(result.metadata.frames)).toContain('custom2');
    });
  });
});
