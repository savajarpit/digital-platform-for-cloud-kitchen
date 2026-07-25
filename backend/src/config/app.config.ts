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
}));
