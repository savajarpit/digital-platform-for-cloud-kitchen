import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');

/**
 * Local-disk implementation for now — no S3/deployment account set up yet.
 * Public contract (buildKey/upload/delete/getPublicUrl) matches what an S3
 * implementation would expose, so swapping the storage backend later is a
 * change to this one file, not to any of its callers.
 */
@Injectable()
export class StorageService {
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl =
      this.config.get<string>('app.publicUrl') ?? 'http://localhost:3000';
  }

  buildKey(tenantId: string, resource: string, originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();
    return `${tenantId}/${resource}/${uuidv4()}${ext}`;
  }

  async upload(params: { key: string; buffer: Buffer }): Promise<string> {
    const destination = path.join(UPLOADS_ROOT, params.key);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, params.buffer);
    return this.getPublicUrl(params.key);
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(path.join(UPLOADS_ROOT, key));
    } catch {
      // Already gone — nothing to clean up.
    }
  }

  getPublicUrl(key: string): string {
    return `${this.baseUrl}/uploads/${key}`;
  }
}
