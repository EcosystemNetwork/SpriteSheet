import { describe, it, expect } from 'vitest';
import { MaxRectsPacker, packRectangles, nextPowerOfTwo } from '../src/packer.js';

describe('MaxRectsPacker', () => {
  it('should pack a single rectangle', () => {
    const packer = new MaxRectsPacker(100, 100);
    const result = packer.insert(50, 50);

    expect(result).not.toBeNull();
    expect(result?.x).toBe(0);
    expect(result?.y).toBe(0);
    expect(result?.width).toBe(50);
    expect(result?.height).toBe(50);
  });

  it('should pack multiple rectangles', () => {
    const packer = new MaxRectsPacker(100, 100);

    const rect1 = packer.insert(50, 50);
    const rect2 = packer.insert(50, 50);

    expect(rect1).not.toBeNull();
    expect(rect2).not.toBeNull();
    expect(rect1?.x).toBe(0);
    expect(rect1?.y).toBe(0);
    // Second rectangle should be placed somewhere else
    expect(rect2?.x !== 0 || rect2?.y !== 0).toBe(true);
  });

  it('should return null when rectangle does not fit', () => {
    const packer = new MaxRectsPacker(50, 50);
    const result = packer.insert(100, 100);

    expect(result).toBeNull();
  });

  it('should pack rectangles efficiently', () => {
    const packer = new MaxRectsPacker(100, 100);

    // Pack 4 rectangles that should fit exactly
    const rects = [];
    for (let i = 0; i < 4; i++) {
      const rect = packer.insert(50, 50);
      if (rect) rects.push(rect);
    }

    expect(rects.length).toBe(4);
  });
});

describe('packRectangles', () => {
  it('should pack rectangles with padding', () => {
    const rectangles = [
      { width: 20, height: 20, index: 0 },
      { width: 20, height: 20, index: 1 },
    ];

    const result = packRectangles(rectangles, 100, 100, 2);

    expect(result).not.toBeNull();
    expect(result?.packed.length).toBe(2);
    // With padding of 2, positions should have padding offset
    expect(result?.packed[0].x).toBe(2);
    expect(result?.packed[0].y).toBe(2);
  });

  it('should return null when rectangles cannot fit', () => {
    const rectangles = [
      { width: 200, height: 200, index: 0 },
    ];

    const result = packRectangles(rectangles, 100, 100);

    expect(result).toBeNull();
  });

  it('should handle empty input', () => {
    const result = packRectangles([], 100, 100);

    expect(result).not.toBeNull();
    expect(result?.packed.length).toBe(0);
    expect(result?.width).toBe(0);
    expect(result?.height).toBe(0);
  });

  it('should constrain to power of two when requested', () => {
    const rectangles = [
      { width: 30, height: 30, index: 0 },
    ];

    const result = packRectangles(rectangles, 256, 256, 1, true);

    expect(result).not.toBeNull();
    // Should round up to nearest power of 2
    expect(result?.width).toBe(32);
    expect(result?.height).toBe(32);
  });
});

describe('nextPowerOfTwo', () => {
  it('should return correct power of two values', () => {
    expect(nextPowerOfTwo(1)).toBe(1);
    expect(nextPowerOfTwo(2)).toBe(2);
    expect(nextPowerOfTwo(3)).toBe(4);
    expect(nextPowerOfTwo(5)).toBe(8);
    expect(nextPowerOfTwo(15)).toBe(16);
    expect(nextPowerOfTwo(17)).toBe(32);
    expect(nextPowerOfTwo(100)).toBe(128);
    expect(nextPowerOfTwo(256)).toBe(256);
  });

  it('should handle edge cases', () => {
    expect(nextPowerOfTwo(0)).toBe(1);
    expect(nextPowerOfTwo(-1)).toBe(1);
  });
});
