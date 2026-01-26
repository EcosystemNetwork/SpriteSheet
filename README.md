# SpriteSheet Generator

A comprehensive sprite sheet generator dev tool for combining multiple images into a single texture atlas with JSON metadata.

## Features

- **Efficient Bin Packing**: Uses the MaxRects algorithm for optimal sprite placement
- **Multiple Output Formats**: PNG, JPEG, and WebP support
- **Configurable Padding**: Add spacing between sprites to prevent texture bleeding
- **Trimming Support**: Optionally trim transparent pixels from sprites
- **Power of Two**: Constrain output dimensions to powers of two for GPU compatibility
- **Glob Patterns**: Load images using flexible file patterns
- **JSON Metadata**: Generates metadata compatible with popular game engines

## Installation

```bash
npm install spritesheet-generator
```

## CLI Usage

```bash
# Basic usage
spritesheet "images/*.png" -o output/spritesheet

# With options
spritesheet "sprites/**/*.png" -o atlas -p 2 --format webp --power-of-two

# Multiple patterns
spritesheet "characters/*.png" "items/*.png" -o game-atlas
```

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <path>` | Output file path (without extension) | `./spritesheet` |
| `-p, --padding <number>` | Padding between sprites in pixels | `1` |
| `--max-width <number>` | Maximum sprite sheet width | `4096` |
| `--max-height <number>` | Maximum sprite sheet height | `4096` |
| `-f, --format <format>` | Output format (png, jpeg, webp) | `png` |
| `-q, --quality <number>` | Quality for JPEG/WebP (1-100) | `90` |
| `--trim` | Trim transparent pixels from sprites | `false` |
| `--power-of-two` | Constrain dimensions to power of two | `false` |
| `--no-sort` | Disable sorting sprites by size | - |

## Programmatic API

```typescript
import { generateSpriteSheet, loadImages } from 'spritesheet-generator';

// Load images from files
const sprites = await loadImages(['./images/*.png']);

// Generate sprite sheet
const result = await generateSpriteSheet(sprites, {
  padding: 2,
  format: 'png',
  powerOfTwo: true,
});

// Access results
console.log('Dimensions:', result.width, 'x', result.height);
console.log('Metadata:', result.metadata);

// Or generate and save directly
import { generateSpriteSheetFromFiles } from 'spritesheet-generator';

await generateSpriteSheetFromFiles(
  ['./sprites/*.png'],
  './output/atlas',
  { padding: 1, format: 'webp' }
);
```

### API Types

```typescript
interface SpriteSheetConfig {
  padding?: number;        // Padding between sprites (default: 1)
  maxWidth?: number;       // Maximum width (default: 4096)
  maxHeight?: number;      // Maximum height (default: 4096)
  format?: 'png' | 'jpeg' | 'webp';  // Output format (default: 'png')
  quality?: number;        // JPEG/WebP quality 1-100 (default: 90)
  trim?: boolean;          // Trim transparent pixels (default: false)
  powerOfTwo?: boolean;    // Power of two dimensions (default: false)
  sort?: boolean;          // Sort by size for better packing (default: true)
}

interface SpriteSheetResult {
  image: Buffer;           // The sprite sheet image data
  metadata: SpriteSheetMetadata;  // JSON metadata
  width: number;           // Final width
  height: number;          // Final height
}
```

## Output Metadata Format

The generated JSON metadata is compatible with popular frameworks like Phaser and PixiJS:

```json
{
  "frames": {
    "sprite-name": {
      "frame": { "x": 0, "y": 0, "w": 32, "h": 32 },
      "rotated": false,
      "trimmed": false,
      "sourceSize": { "w": 32, "h": 32 },
      "spriteSourceSize": { "x": 0, "y": 0, "w": 32, "h": 32 }
    }
  },
  "meta": {
    "app": "spritesheet-generator",
    "version": "1.0.0",
    "image": "spritesheet.png",
    "format": "PNG",
    "size": { "w": 256, "h": 256 },
    "scale": 1
  }
}
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Type checking
npm run lint
```

## License

MIT