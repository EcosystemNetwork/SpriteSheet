import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    name: 'spritesheet-generator',
    version: '1.0.0',
    description: 'Comprehensive sprite sheet generator dev tool',
    docs: 'https://github.com/EcosystemNetwork/SpriteSheet#readme',
    endpoints: {
      '/api': 'This info endpoint',
    },
  });
}
