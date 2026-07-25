import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT ?? '587', 10) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER || '',
  password: process.env.SMTP_PASSWORD || '',
  fromAddress: process.env.MAIL_FROM_ADDRESS || 'no-reply@example.com',
  fromName: process.env.MAIL_FROM_NAME || 'Platform',
}));
