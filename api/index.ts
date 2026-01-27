import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    name: 'spritesheet-generator',
    version: '1.0.0',
    description: 'Comprehensive sprite sheet generator dev tool',
    docs: 'https://github.com/EcosystemNetwork/SpriteSheet#readme',
    endpoints: {
      '/api': 'This info endpoint',
      '/api/generate': 'POST endpoint to generate sprite sheets (accepts JSON with sprites array and optional config)',
    },
    usage: {
      generate: {
        method: 'POST',
        body: {
          sprites: [
            { name: 'sprite1', data: '<base64 encoded image>' },
            { name: 'sprite2', data: '<base64 encoded image>' },
          ],
          config: {
            padding: 1,
            maxWidth: 4096,
            maxHeight: 4096,
            format: 'png',
            quality: 90,
            trim: false,
            powerOfTwo: false,
            sort: true,
          },
        },
        response: {
          image: '<base64 encoded sprite sheet>',
          metadata: '<sprite sheet metadata object>',
          width: '<sprite sheet width>',
          height: '<sprite sheet height>',
        },
      },
    },
  });
}
