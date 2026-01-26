import type { Rectangle, FreeRectangle } from './types.js';

/**
 * MaxRects bin packing algorithm implementation
 * Efficiently packs rectangles into a bin using the MaxRects algorithm
 */
export class MaxRectsPacker {
  private binWidth: number;
  private binHeight: number;
  private freeRectangles: FreeRectangle[];

  constructor(width: number, height: number) {
    this.binWidth = width;
    this.binHeight = height;
    this.freeRectangles = [{ x: 0, y: 0, width, height }];
  }

  /**
   * Insert a rectangle into the bin
   * @returns The packed rectangle with position, or null if it doesn't fit
   */
  insert(width: number, height: number): Rectangle | null {
    // Find the best position using Best Short Side Fit
    let bestRect: FreeRectangle | null = null;
    let bestShortSideFit = Infinity;
    let bestLongSideFit = Infinity;

    for (const freeRect of this.freeRectangles) {
      // Try to place the rectangle in this free space
      if (width <= freeRect.width && height <= freeRect.height) {
        const leftoverHoriz = Math.abs(freeRect.width - width);
        const leftoverVert = Math.abs(freeRect.height - height);
        const shortSideFit = Math.min(leftoverHoriz, leftoverVert);
        const longSideFit = Math.max(leftoverHoriz, leftoverVert);

        if (
          shortSideFit < bestShortSideFit ||
          (shortSideFit === bestShortSideFit && longSideFit < bestLongSideFit)
        ) {
          bestRect = freeRect;
          bestShortSideFit = shortSideFit;
          bestLongSideFit = longSideFit;
        }
      }
    }

    if (!bestRect) {
      return null;
    }

    // Place the rectangle
    const result: Rectangle = {
      x: bestRect.x,
      y: bestRect.y,
      width,
      height,
    };

    // Split free rectangles
    this.splitFreeRectangles(result);
    this.pruneFreeRectangles();

    return result;
  }

  /**
   * Split free rectangles that overlap with the placed rectangle
   */
  private splitFreeRectangles(placedRect: Rectangle): void {
    const newFreeRectangles: FreeRectangle[] = [];

    for (const freeRect of this.freeRectangles) {
      if (this.rectanglesIntersect(freeRect, placedRect)) {
        // Split the free rectangle around the placed one
        const newRects = this.splitRectangle(freeRect, placedRect);
        newFreeRectangles.push(...newRects);
      } else {
        newFreeRectangles.push(freeRect);
      }
    }

    this.freeRectangles = newFreeRectangles;
  }

  /**
   * Check if two rectangles intersect
   */
  private rectanglesIntersect(a: FreeRectangle, b: Rectangle): boolean {
    const bX = b.x ?? 0;
    const bY = b.y ?? 0;
    return (
      a.x < bX + b.width &&
      a.x + a.width > bX &&
      a.y < bY + b.height &&
      a.y + a.height > bY
    );
  }

  /**
   * Split a free rectangle around a placed rectangle
   */
  private splitRectangle(
    freeRect: FreeRectangle,
    placedRect: Rectangle
  ): FreeRectangle[] {
    const results: FreeRectangle[] = [];
    const placedX = placedRect.x ?? 0;
    const placedY = placedRect.y ?? 0;

    // Left part
    if (placedX > freeRect.x) {
      results.push({
        x: freeRect.x,
        y: freeRect.y,
        width: placedX - freeRect.x,
        height: freeRect.height,
      });
    }

    // Right part
    if (placedX + placedRect.width < freeRect.x + freeRect.width) {
      results.push({
        x: placedX + placedRect.width,
        y: freeRect.y,
        width: freeRect.x + freeRect.width - (placedX + placedRect.width),
        height: freeRect.height,
      });
    }

    // Top part
    if (placedY > freeRect.y) {
      results.push({
        x: freeRect.x,
        y: freeRect.y,
        width: freeRect.width,
        height: placedY - freeRect.y,
      });
    }

    // Bottom part
    if (placedY + placedRect.height < freeRect.y + freeRect.height) {
      results.push({
        x: freeRect.x,
        y: placedY + placedRect.height,
        width: freeRect.width,
        height: freeRect.y + freeRect.height - (placedY + placedRect.height),
      });
    }

    return results;
  }

  /**
   * Remove redundant free rectangles that are fully contained within others
   */
  private pruneFreeRectangles(): void {
    const pruned: FreeRectangle[] = [];

    for (let i = 0; i < this.freeRectangles.length; i++) {
      let isContained = false;

      for (let j = 0; j < this.freeRectangles.length; j++) {
        if (i !== j && this.isContained(this.freeRectangles[i], this.freeRectangles[j])) {
          isContained = true;
          break;
        }
      }

      if (!isContained) {
        pruned.push(this.freeRectangles[i]);
      }
    }

    this.freeRectangles = pruned;
  }

  /**
   * Check if rectangle a is fully contained within rectangle b
   */
  private isContained(a: FreeRectangle, b: FreeRectangle): boolean {
    return (
      a.x >= b.x &&
      a.y >= b.y &&
      a.x + a.width <= b.x + b.width &&
      a.y + a.height <= b.y + b.height
    );
  }

  /**
   * Get the occupancy rate of the bin
   */
  getOccupancy(usedArea: number): number {
    return usedArea / (this.binWidth * this.binHeight);
  }
}

/**
 * Pack rectangles into a bin with automatic size detection
 * @param rectangles Array of rectangles to pack
 * @param maxWidth Maximum width constraint
 * @param maxHeight Maximum height constraint
 * @param padding Padding between rectangles
 * @param powerOfTwo Whether to constrain to power of two dimensions
 * @returns Packed rectangles with their positions
 */
export function packRectangles(
  rectangles: { width: number; height: number; index: number }[],
  maxWidth: number,
  maxHeight: number,
  padding: number = 0,
  powerOfTwo: boolean = false
): { packed: { x: number; y: number; index: number }[]; width: number; height: number } | null {
  if (rectangles.length === 0) {
    return { packed: [], width: 0, height: 0 };
  }

  // Add padding to each rectangle
  const paddedRects = rectangles.map((r) => ({
    width: r.width + padding * 2,
    height: r.height + padding * 2,
    index: r.index,
  }));

  // Calculate total area to estimate initial bin size
  const totalArea = paddedRects.reduce((sum, r) => sum + r.width * r.height, 0);
  const maxRectWidth = Math.max(...paddedRects.map((r) => r.width));
  const maxRectHeight = Math.max(...paddedRects.map((r) => r.height));

  // Start with a bin size that's at least the maximum dimension and sqrt of area
  let binWidth = Math.max(maxRectWidth, Math.ceil(Math.sqrt(totalArea)));
  let binHeight = Math.max(maxRectHeight, Math.ceil(Math.sqrt(totalArea)));

  // Ensure we don't exceed max dimensions
  binWidth = Math.min(binWidth, maxWidth);
  binHeight = Math.min(binHeight, maxHeight);

  // Try to pack with increasing bin sizes
  while (binWidth <= maxWidth && binHeight <= maxHeight) {
    const packer = new MaxRectsPacker(binWidth, binHeight);
    const packed: { x: number; y: number; index: number }[] = [];
    let success = true;
    let actualMaxX = 0;
    let actualMaxY = 0;

    for (const rect of paddedRects) {
      const result = packer.insert(rect.width, rect.height);
      if (result && result.x !== undefined && result.y !== undefined) {
        // Add padding offset to position
        packed.push({
          x: result.x + padding,
          y: result.y + padding,
          index: rect.index,
        });
        actualMaxX = Math.max(actualMaxX, result.x + rect.width);
        actualMaxY = Math.max(actualMaxY, result.y + rect.height);
      } else {
        success = false;
        break;
      }
    }

    if (success) {
      let finalWidth = actualMaxX;
      let finalHeight = actualMaxY;

      if (powerOfTwo) {
        finalWidth = nextPowerOfTwo(finalWidth);
        finalHeight = nextPowerOfTwo(finalHeight);
      }

      return { packed, width: finalWidth, height: finalHeight };
    }

    // Increase bin size
    if (binWidth <= binHeight) {
      binWidth = Math.min(binWidth * 2, maxWidth);
    } else {
      binHeight = Math.min(binHeight * 2, maxHeight);
    }

    // If we've maxed out both dimensions and still failed, try the full max size once
    if (binWidth === maxWidth && binHeight === maxHeight) {
      const finalPacker = new MaxRectsPacker(maxWidth, maxHeight);
      const finalPacked: { x: number; y: number; index: number }[] = [];
      let finalSuccess = true;
      let finalMaxX = 0;
      let finalMaxY = 0;

      for (const rect of paddedRects) {
        const result = finalPacker.insert(rect.width, rect.height);
        if (result && result.x !== undefined && result.y !== undefined) {
          finalPacked.push({
            x: result.x + padding,
            y: result.y + padding,
            index: rect.index,
          });
          finalMaxX = Math.max(finalMaxX, result.x + rect.width);
          finalMaxY = Math.max(finalMaxY, result.y + rect.height);
        } else {
          finalSuccess = false;
          break;
        }
      }

      if (finalSuccess) {
        let width = finalMaxX;
        let height = finalMaxY;

        if (powerOfTwo) {
          width = nextPowerOfTwo(width);
          height = nextPowerOfTwo(height);
        }

        return { packed: finalPacked, width, height };
      }

      return null; // Can't fit within constraints
    }
  }

  return null;
}

/**
 * Calculate the next power of two for a given number
 */
export function nextPowerOfTwo(n: number): number {
  if (n <= 0) return 1;
  n--;
  n |= n >> 1;
  n |= n >> 2;
  n |= n >> 4;
  n |= n >> 8;
  n |= n >> 16;
  return n + 1;
}
