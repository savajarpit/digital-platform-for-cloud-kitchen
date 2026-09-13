import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  bucket: process.env.STORAGE_BUCKET,
  region: process.env.STORAGE_REGION || 'ap-south-1',
  // Leave both blank in staging/production — the EC2 instance role grants
  // S3 access and the AWS SDK's default credential chain picks it up.
  // Only set these for local dev machines without `aws configure` set up.
  accessKeyId: process.env.STORAGE_ACCESS_KEY_ID || undefined,
  secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY || undefined,
  // Leave empty for AWS S3. Set to the R2 account endpoint to use
  // Cloudflare R2 instead — same StorageService code, S3-compatible API.
  endpoint: process.env.STORAGE_ENDPOINT || undefined,
}));
