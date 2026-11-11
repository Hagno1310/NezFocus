import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.js';

// Files of the app (SRS 5.3 Upload, 8.2 `attachments.storage_key`). Abstract class = DI token;
// e2e tests swap in MemoryObjectStorage because CI has no S3.
export abstract class ObjectStorage {
  // A URL the app PUTs the bytes to; it only takes this content type and length.
  abstract presignPut(
    key: string,
    contentType: string,
    size: number,
    expiresInSeconds: number,
  ): Promise<string>;
  // Undefined when nothing is stored under the key.
  abstract get(key: string): Promise<Buffer | undefined>;
  abstract put(key: string, body: Buffer, contentType: string): Promise<void>;
  abstract delete(keys: string[]): Promise<void>;
}

@Injectable()
export class S3ObjectStorage extends ObjectStorage implements OnModuleInit {
  private readonly logger = new Logger('ObjectStorage');
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService<Env, true>) {
    super();
    this.bucket = config.get('S3_BUCKET', { infer: true });
    this.client = new S3Client({
      endpoint: config.get('S3_ENDPOINT', { infer: true }),
      region: config.get('S3_REGION', { infer: true }),
      forcePathStyle: true, // SeaweedFS / MinIO
      // SDK ≥ 3.729 signs a CRC32 of the (empty) body into presigned PUT URLs by default, so
      // the phone's real bytes fail with BadDigest. Checksums only where S3 requires them.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      credentials: {
        accessKeyId: config.get('S3_ACCESS_KEY', { infer: true }),
        secretAccessKey: config.get('S3_SECRET_KEY', { infer: true }),
      },
    });
  }

  // Dev convenience: a fresh `pnpm dev:infra` has no bucket yet.
  async onModuleInit() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.client.send(
          new CreateBucketCommand({ Bucket: this.bucket }),
        );
      } catch (err) {
        this.logger.warn(`bucket ${this.bucket} not reachable: ${String(err)}`);
      }
    }
  }

  presignPut(key: string, contentType: string, size: number, expires: number) {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
        ContentLength: size,
      }),
      { expiresIn: expires },
    );
  }

  async get(key: string) {
    try {
      const res = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      const bytes = await res.Body?.transformToByteArray();
      return bytes ? Buffer.from(bytes) : undefined;
    } catch (err) {
      if (err instanceof NoSuchKey) return undefined;
      throw err;
    }
  }

  async put(key: string, body: Buffer, contentType: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async delete(keys: string[]) {
    if (!keys.length) return;
    await this.client.send(
      new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      }),
    );
  }
}

// Tests: `upload` stands in for the app's PUT to the presigned URL.
export class MemoryObjectStorage extends ObjectStorage {
  readonly objects = new Map<string, { body: Buffer; contentType: string }>();

  async presignPut(key: string) {
    return `memory://${key}`;
  }

  upload(url: string, body: Buffer, contentType = 'application/octet-stream') {
    this.objects.set(url.replace('memory://', ''), { body, contentType });
  }

  async get(key: string) {
    return this.objects.get(key)?.body;
  }

  async put(key: string, body: Buffer, contentType: string) {
    this.objects.set(key, { body, contentType });
  }

  async delete(keys: string[]) {
    for (const key of keys) this.objects.delete(key);
  }
}
