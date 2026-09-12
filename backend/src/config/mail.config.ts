import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT ?? '587', 10) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER || '',
  password: process.env.SMTP_PASSWORD || '',
  fromAddress: process.env.MAIL_FROM_ADDRESS || 'no-reply@example.com',
  fromName: process.env.MAIL_FROM_NAME || 'Platform',
  // DEV ONLY. Set true to skip TLS certificate-chain verification for SMTP.
  // Needed on machines where antivirus "SSL scanning" / a corporate proxy /
  // a VPN intercepts the connection and presents its own CA — Node then
  // fails with "self-signed certificate in certificate chain". Never enable
  // in production; fix the trust store there instead (NODE_EXTRA_CA_CERTS).
  allowSelfSignedTls: process.env.SMTP_ALLOW_SELF_SIGNED === 'true',
}));
