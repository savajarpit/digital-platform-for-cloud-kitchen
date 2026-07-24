import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from 'crypto';

export class CryptoUtil {
  private static readonly ALGORITHM = 'aes-256-gcm';

  static encrypt(text: string, secretKey: string): string {
    const key = createHash('sha256').update(secretKey).digest();
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  static decrypt(encrypted: string, secretKey: string): string {
    const [ivHex, tagHex, dataHex] = encrypted.split(':');
    const key = createHash('sha256').update(secretKey).digest();
    const decipher = createDecipheriv(
      this.ALGORITHM,
      key,
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return (
      decipher.update(Buffer.from(dataHex, 'hex')) + decipher.final('utf8')
    );
  }

  static generateToken(bytes = 32): string {
    return randomBytes(bytes).toString('hex');
  }

  static generateOtp(digits = 6): string {
    return String(Math.floor(Math.random() * 10 ** digits)).padStart(
      digits,
      '0',
    );
  }
}
