import * as bcrypt from 'bcryptjs';

export class HashUtil {
  static async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, 12);
  }

  static async compare(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }
}
