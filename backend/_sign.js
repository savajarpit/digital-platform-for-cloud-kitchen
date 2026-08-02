const { PrismaClient } = require('./src/generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');
const crypto = require('crypto');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });

function decrypt(encrypted, key) {
  const [ivHex, tagHex, dataHex] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const derivedKey = crypto.createHash('sha256').update(key).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

(async () => {
  const settings = await p.paymentSettings.findFirst({ where: { tenantId: 'c22b9873-46db-4468-af93-5d76e7da429c' } });
  const keySecret = decrypt(settings.razorpayKeySecretEncrypted, process.env.ENCRYPTION_KEY);
  const razorpayOrderId = process.argv[2];
  const razorpayPaymentId = 'pay_TEST' + Math.random().toString(36).slice(2, 10);
  const signature = crypto.createHmac('sha256', keySecret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest('hex');
  console.log(JSON.stringify({ razorpayOrderId, razorpayPaymentId, razorpaySignature: signature }));
  await p.$disconnect();
})();
