---
name: storage-s3
description: >
  Read for any file storage task: S3 upload, presigned URLs,
  file validation, multipart upload, or storage service setup.
  Works with AWS S3 and Cloudflare R2 (S3-compatible).
  Read general-guidelines.md → nestjs.md → this file.
  AWS SDK docs: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/
  NestJS upload: https://docs.nestjs.com/techniques/file-upload
---

# Storage / S3 Skill

## PROJECT DECISIONS

```
Provider:   AWS S3 (default) or Cloudflare R2 (S3-compatible, same code)
Location:   src/shared-modules/storage/
Service:    StorageService — @Global(), inject anywhere
SDK:        @aws-sdk/client-s3 v3 (modular, tree-shakeable)
Naming:     {tenantId}/{resource}/{uuid}.{ext}  — never original filename
Validation: Validate MIME type + file size before upload — never trust client
```

---

## INSTALL

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install multer @types/multer
```

---

## STORAGE SERVICE

```typescript
// src/shared-modules/storage/storage.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Injectable()
export class StorageService {
  private s3: S3Client;
  private bucket: string;

  constructor(private config: ConfigService) {
    this.bucket = config.get<string>('storage.bucket');
    this.s3 = new S3Client({
      region: config.get<string>('storage.region', 'auto'),
      endpoint: config.get<string>('storage.endpoint'),  // for R2: https://accountid.r2.cloudflarestorage.com
      credentials: {
        accessKeyId:     config.get<string>('storage.accessKeyId'),
        secretAccessKey: config.get<string>('storage.secretAccessKey'),
      },
    });
  }

  // Generate safe file key
  buildKey(tenantId: string, resource: string, originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();
    return `${tenantId}/${resource}/${uuidv4()}${ext}`;
  }

  // Upload file buffer
  async upload(params: {
    key: string;
    buffer: Buffer;
    mimeType: string;
    size?: number;
  }): Promise<string> {
    await this.s3.send(new PutObjectCommand({
      Bucket:      this.bucket,
      Key:         params.key,
      Body:        params.buffer,
      ContentType: params.mimeType,
    }));
    return this.getPublicUrl(params.key);
  }

  // Delete file
  async delete(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  // Presigned URL — client uploads directly to S3 (no server memory pressure)
  async getPresignedUploadUrl(key: string, mimeType: string, expiresIn = 300): Promise<string> {
    return getSignedUrl(
      this.s3,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: mimeType }),
      { expiresIn },
    );
  }

  // Presigned URL for private file download
  async getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn },
    );
  }

  // Public URL (for public buckets)
  getPublicUrl(key: string): string {
    const endpoint = this.config.get<string>('storage.endpoint');
    if (endpoint) return `${endpoint}/${this.bucket}/${key}`;
    return `https://${this.bucket}.s3.${this.config.get('storage.region')}.amazonaws.com/${key}`;
  }
}
```

---

## FILE UPLOAD CONTROLLER PATTERN

```typescript
import { Post, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';

@Post('upload')
@ApiConsumes('multipart/form-data')
@ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
@UseInterceptors(FileInterceptor('file', {
  limits: { fileSize: 5 * 1024 * 1024 },    // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.mimetype)) {
      cb(new BadRequestException(`File type not allowed: ${file.mimetype}`), false);
    } else {
      cb(null, true);
    }
  },
}))
async uploadFile(
  @UploadedFile() file: Express.Multer.File,
  @CurrentUser('tenantId') tenantId: string,
) {
  if (!file) throw new BadRequestException('No file uploaded');
  const key = this.storageService.buildKey(tenantId, 'avatars', file.originalname);
  const url = await this.storageService.upload({
    key,
    buffer: file.buffer,
    mimeType: file.mimetype,
  });
  return { url, key };
}
```

---

## FILE VALIDATION RULES

```
Images:     jpeg, png, webp, gif — max 5MB
Documents:  pdf, docx, xlsx     — max 10MB
Videos:     mp4, webm           — max 100MB
Never allow: .exe, .sh, .js, .php, or any executable

Always:
✅ Validate MIME type server-side (not just extension)
✅ Set max file size in FileInterceptor limits
✅ Use uuid in key — never use original filename directly
✅ Store only the key in DB — not the full URL (URLs can change)
✅ Generate presigned URL on demand — not stored
```

---

## KEY NAMING

```
{tenantId}/{resource}/{uuid}.{ext}

Examples:
tenant-abc/avatars/550e8400-e29b-41d4-a716-446655440000.jpg
tenant-abc/documents/550e8400-e29b-41d4-a716-446655440001.pdf
tenant-abc/products/550e8400-e29b-41d4-a716-446655440002.webp
```

---

## ENV VARIABLES

```bash
# AWS S3
STORAGE_BUCKET=my-app-bucket
STORAGE_REGION=us-east-1
STORAGE_ACCESS_KEY_ID=AKIA...
STORAGE_SECRET_ACCESS_KEY=...
STORAGE_ENDPOINT=              # leave empty for AWS S3

# Cloudflare R2 (S3-compatible — same StorageService code)
STORAGE_BUCKET=my-app-bucket
STORAGE_REGION=auto
STORAGE_ACCESS_KEY_ID=...
STORAGE_SECRET_ACCESS_KEY=...
STORAGE_ENDPOINT=https://accountid.r2.cloudflarestorage.com
```

---

## KEY DOCS

```
AWS SDK v3:           https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/
Presigned URLs:       https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html
Cloudflare R2:        https://developers.cloudflare.com/r2/
NestJS file upload:   https://docs.nestjs.com/techniques/file-upload
```