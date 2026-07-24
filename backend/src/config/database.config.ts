import { registerAs } from '@nestjs/config';

export const DB_DRIVER = process.env.DB_DRIVER || 'prisma';
export const PROJECT_TYPE = process.env.PROJECT_TYPE || 'multi_tenant';

export default registerAs('database', () => ({
  driver: DB_DRIVER,
  projectType: PROJECT_TYPE,
  url: process.env.DATABASE_URL,
  mongoUri: process.env.MONGO_URI,
}));
