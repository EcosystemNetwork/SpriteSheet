#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import { generateSpriteSheetFromFiles } from './generator.js';
import type { SpriteSheetConfig } from './types.js';

const program = new Command();

program
  .name('spritesheet')
  .description('Comprehensive sprite sheet generator tool')
  .version('1.0.0');

program
  .argument('<patterns...>', 'Image file patterns or paths to include (supports globs)')
  .option('-o, --output <path>', 'Output file path (without extension)', './spritesheet')
  .option('-p, --padding <number>', 'Padding between sprites in pixels', '1')
  .option('--max-width <number>', 'Maximum sprite sheet width', '4096')
  .option('--max-height <number>', 'Maximum sprite sheet height', '4096')
  .option('-f, --format <format>', 'Output format (png, jpeg, webp)', 'png')
  .option('-q, --quality <number>', 'Quality for JPEG/WebP (1-100)', '90')
  .option('--trim', 'Trim transparent pixels from sprites', false)
  .option('--power-of-two', 'Constrain dimensions to power of two', false)
  .option('--no-sort', 'Disable sorting sprites by size')
  .action(async (patterns: string[], options) => {
    try {
      const config: SpriteSheetConfig = {
        padding: parseInt(options.padding, 10),
        maxWidth: parseInt(options.maxWidth, 10),
        maxHeight: parseInt(options.maxHeight, 10),
        format: options.format as 'png' | 'jpeg' | 'webp',
        quality: parseInt(options.quality, 10),
        trim: options.trim,
        powerOfTwo: options.powerOfTwo,
        sort: options.sort,
      };

      // Resolve output path
      const outputPath = path.resolve(options.output);

      console.log(`Processing ${patterns.length} pattern(s)...`);

      const result = await generateSpriteSheetFromFiles(patterns, outputPath, config);

      const spriteCount = Object.keys(result.metadata.frames).length;
      console.log(`✓ Generated sprite sheet with ${spriteCount} sprite(s)`);
      console.log(`  Dimensions: ${result.width}x${result.height}`);
      console.log(`  Output: ${outputPath}.${config.format}`);
      console.log(`  Metadata: ${outputPath}.json`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
