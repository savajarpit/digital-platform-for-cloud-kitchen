import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT ?? '3000', 10) || 3000,
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
  ],
  // Hostname for the SUPER_ADMIN platform console — recognized by
  // TenantContextMiddleware and let through without a tenant match.
  platformAdminHost: process.env.PLATFORM_ADMIN_HOST || undefined,
  // The platform's own shared domain — a tenant with no customDomain yet is
  // reachable at {slug}.{platformRootDomain} (see TenantResolverService).
  platformRootDomain: process.env.PLATFORM_ROOT_DOMAIN || undefined,
  // Used by CryptoUtil to encrypt per-tenant secrets at rest (WhatsApp/email
  // provider credentials, Razorpay keys).
  encryptionKey: process.env.ENCRYPTION_KEY,
  // Base URL of the Next.js frontend — used to build links sent in emails
  // (password reset). Not the tenant's own domain: those are resolved from
  // the request that triggers the email, not needed for a server-side link.
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
  // This API's own public base URL — used to build absolute URLs for
  // locally-stored uploads (see shared-modules/storage). Swap to a real S3/R2
  // bucket URL later; StorageService is the only place that needs to change.
  publicUrl:
    process.env.PUBLIC_API_URL ||
    `http://localhost:${parseInt(process.env.PORT ?? '3000', 10) || 3000}`,
}));
