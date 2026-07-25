/**
 * One-time bootstrap for a new client deployment: creates the tenant, its
 * business profile + default settings rows, seeds the global permission
 * catalog, and creates the first OWNER login. Safe to re-run — it upserts
 * the permission catalog and refuses to create a second tenant if one
 * already exists in this database.
 *
 * Usage: set SEED_* env vars (see .env.example), then:
 *   npx ts-node -r tsconfig-paths/register src/database/prisma/seed.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../../generated/prisma';
import { PERMISSION_CATALOG } from '../../common/enums/permission.enum';

dotenv.config({
  path: path.resolve(
    __dirname,
    '../../..',
    `.env.${process.env.NODE_ENV || 'development'}`,
  ),
});

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function main() {
  const adapter = new PrismaPg({
    connectionString: requireEnv('DATABASE_URL'),
  });
  const prisma = new PrismaClient({ adapter });

  try {
    const existingTenant = await prisma.tenant.findFirst();
    if (existingTenant) {
      console.log(
        `A tenant already exists in this database (${existingTenant.name}). Skipping tenant bootstrap.`,
      );
    } else {
      const businessName = requireEnv('SEED_BUSINESS_NAME');
      const ownerEmail = requireEnv('SEED_OWNER_EMAIL');
      const ownerPassword = requireEnv('SEED_OWNER_PASSWORD');
      const ownerFirstName = requireEnv('SEED_OWNER_FIRST_NAME');

      const tenant = await prisma.tenant.create({
        data: {
          name: businessName,
          slug: process.env.SEED_BUSINESS_SLUG || slugify(businessName),
        },
      });

      await prisma.businessProfile.create({
        data: {
          tenantId: tenant.id,
          displayName: businessName,
          timezone: process.env.SEED_TIMEZONE || 'Asia/Kolkata',
          currency: process.env.SEED_CURRENCY || 'INR',
          defaultLocale: process.env.SEED_DEFAULT_LOCALE || 'en',
          themeConfig: {
            primaryColor: process.env.SEED_PRIMARY_COLOR || '#16A34A',
            secondaryColor: process.env.SEED_SECONDARY_COLOR || '#0EA5E9',
            accentColor: process.env.SEED_ACCENT_COLOR || '#F59E0B',
          },
        },
      });

      await prisma.orderAcceptanceSettings.create({
        data: {
          tenantId: tenant.id,
          operatingHours: {
            mon: { open: '09:00', close: '21:00' },
            tue: { open: '09:00', close: '21:00' },
            wed: { open: '09:00', close: '21:00' },
            thu: { open: '09:00', close: '21:00' },
            fri: { open: '09:00', close: '21:00' },
            sat: { open: '09:00', close: '21:00' },
            sun: { open: '09:00', close: '21:00' },
          },
          dailyCutoffTime: '18:00',
        },
      });

      await prisma.notificationSettings.create({
        data: { tenantId: tenant.id },
      });

      await prisma.paymentSettings.create({
        data: { tenantId: tenant.id },
      });

      const passwordHash = await bcrypt.hash(ownerPassword, 12);
      await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: ownerEmail,
          passwordHash,
          firstName: ownerFirstName,
          lastName: process.env.SEED_OWNER_LAST_NAME || null,
          role: Role.OWNER,
        },
      });

      console.log(`Tenant "${businessName}" created with owner ${ownerEmail}.`);
    }

    for (const permission of PERMISSION_CATALOG) {
      await prisma.permission.upsert({
        where: { key: permission.key },
        update: {
          description: permission.description,
          category: permission.category,
        },
        create: permission,
      });
    }
    console.log(
      `Permission catalog synced (${PERMISSION_CATALOG.length} entries).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
