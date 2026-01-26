/**
 * Configuration options for the sprite sheet generator
 */
export interface SpriteSheetConfig {
  /** Padding between sprites in pixels (default: 1) */
  padding?: number;
  /** Maximum width of the output sprite sheet (default: 4096) */
  maxWidth?: number;
  /** Maximum height of the output sprite sheet (default: 4096) */
  maxHeight?: number;
  /** Output format for the sprite sheet image */
  format?: 'png' | 'jpeg' | 'webp';
  /** Quality for JPEG/WebP output (1-100, default: 90) */
  quality?: number;
  /** Whether to trim transparent pixels from sprites (default: false) */
  trim?: boolean;
  /** Power of two constraint for dimensions (default: false) */
  powerOfTwo?: boolean;
  /** Whether to sort sprites by size for better packing (default: true) */
  sort?: boolean;
}

/**
 * Represents an individual sprite/image to be packed
 */
export interface Sprite {
  /** Unique name/identifier for the sprite */
  name: string;
  /** Width of the sprite in pixels */
  width: number;
  /** Height of the sprite in pixels */
  height: number;
  /** Raw image data buffer */
  data: Buffer;
  /** Original file path (optional) */
  path?: string;
}

/**
 * Represents a sprite that has been positioned in the sheet
 */
export interface PackedSprite extends Sprite {
  /** X position in the sprite sheet */
  x: number;
  /** Y position in the sprite sheet */
  y: number;
}

/**
 * Rectangle for bin packing algorithm
 */
export interface Rectangle {
  /** Width of the rectangle */
  width: number;
  /** Height of the rectangle */
  height: number;
  /** X position (set after packing) */
  x?: number;
  /** Y position (set after packing) */
  y?: number;
}

/**
 * A free rectangle in the packing space
 */
export interface FreeRectangle extends Rectangle {
  x: number;
  y: number;
}

/**
 * Frame data for a sprite in the metadata
 */
export interface SpriteFrame {
  /** Position and dimensions of the sprite in the sheet */
  frame: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  /** Whether the sprite was rotated */
  rotated: boolean;
  /** Whether the sprite was trimmed */
  trimmed: boolean;
  /** Original sprite dimensions */
  sourceSize: {
    w: number;
    h: number;
  };
  /** Sprite rectangle within original bounds */
  spriteSourceSize: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

/**
 * Output metadata for the sprite sheet
 */
export interface SpriteSheetMetadata {
  /** Frame data for each sprite, keyed by sprite name */
  frames: Record<string, SpriteFrame>;
  /** Metadata about the sprite sheet */
  meta: {
    /** Application that generated the sprite sheet */
    app: string;
    /** Version of the generator */
    version: string;
    /** Name of the output image file */
    image: string;
    /** Format of the output image */
    format: string;
    /** Dimensions of the sprite sheet */
    size: {
      w: number;
      h: number;
    };
    /** Scale factor */
    scale: number;
  };
}

/**
 * Result of generating a sprite sheet
 */
export interface SpriteSheetResult {
  /** The combined sprite sheet image buffer */
  image: Buffer;
  /** Metadata describing sprite positions */
  metadata: SpriteSheetMetadata;
  /** Width of the generated sprite sheet */
  width: number;
  /** Height of the generated sprite sheet */
  height: number;
}
