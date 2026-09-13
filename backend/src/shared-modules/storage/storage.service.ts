import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

/**
 * All tenant images/files live in S3 (see backend/.claude/skills/storage-s3).
 * Region/bucket/endpoint come from storage.config.ts. Credentials are left
 * unset in staging/production — the EC2 instance role grants S3 access and
 * the AWS SDK's default credential chain picks it up automatically.
 */
@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly endpoint?: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('storage.bucket')!;
    this.region = this.config.get<string>('storage.region')!;
    this.endpoint = this.config.get<string>('storage.endpoint');
    const accessKeyId = this.config.get<string>('storage.accessKeyId');
    const secretAccessKey = this.config.get<string>(
      'storage.secretAccessKey',
    );

    this.s3 = new S3Client({
      region: this.region,
      endpoint: this.endpoint,
      // Omit entirely (rather than passing undefined fields) so the SDK
      // falls back to its default credential chain — env vars, shared
      // config, or the EC2 instance role — instead of an empty credential set.
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
    });
  }

  buildKey(tenantId: string, resource: string, originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();
    return `${tenantId}/${resource}/${uuidv4()}${ext}`;
  }

  async upload(params: {
    key: string;
    buffer: Buffer;
    mimeType?: string;
  }): Promise<string> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
        Body: params.buffer,
        ContentType: params.mimeType,
      }),
    );
    return this.getPublicUrl(params.key);
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  getPublicUrl(key: string): string {
    if (this.endpoint) return `${this.endpoint}/${this.bucket}/${key}`;
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}
