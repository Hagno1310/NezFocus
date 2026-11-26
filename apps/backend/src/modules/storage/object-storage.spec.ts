import type { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.js';
import { S3ObjectStorage } from './object-storage.js';

const config = {
  get: (key: string) =>
    ({
      S3_BUCKET: 'nezfocus',
      S3_ENDPOINT: 'http://s3:8333',
      S3_PUBLIC_ENDPOINT: 'https://files.nezfocus.app',
      S3_REGION: 'us-east-1',
      S3_ACCESS_KEY: 'k',
      S3_SECRET_KEY: 's',
    })[key],
} as unknown as ConfigService<Env, true>;

describe('S3ObjectStorage', () => {
  it('deletes more than 1000 keys in batches S3 accepts', async () => {
    const storage = new S3ObjectStorage(config);
    const sizes: number[] = [];
    (
      storage as unknown as {
        client: { send: (c: { input: { Delete: { Objects: [] } } }) => void };
      }
    ).client.send = async (c) => void sizes.push(c.input.Delete.Objects.length);
    await storage.delete(Array.from({ length: 2500 }, (_, i) => `k${i}`));
    expect(sizes).toEqual([1000, 1000, 500]);
  });

  it('signs phone URLs for the public host, not the internal one', async () => {
    const url = await new S3ObjectStorage(config).presignGet('a/b.png', 60);
    expect(new URL(url).host).toBe('files.nezfocus.app');
  });
});
