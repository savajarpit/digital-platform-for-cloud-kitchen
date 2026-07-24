import { defineConfig } from 'prisma/config';
import 'dotenv/config';

export default defineConfig({
  schema: 'src/database/prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL as string,
  },
});
