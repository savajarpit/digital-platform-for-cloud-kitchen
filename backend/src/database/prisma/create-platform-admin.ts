/**
 * One-time bootstrap for the platform's own SUPER_ADMIN account (Arpit's own
 * login — "code admin", full access across every tenant). There is no
 * self-serve signup path to this role by design (see PermissionsGuard/
 * general-guidelines) — running this script directly is the only way to
 * create it. Safe to re-run: refuses if a SUPER_ADMIN already exists, or if
 * the given email is already taken.
 *
 * `tenantId` on User is a required FK, but SUPER_ADMIN bypasses every
 * tenant-scoping check by role alone (see PermissionsGuard/TenantGuard) —
 * which tenant this row points at is functionally irrelevant, so this just
 * attaches to the first tenant found (there must be at least one; run
 * `npm run db:seed` first if none exists yet).
 *
 * Usage: set PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD /
 * PLATFORM_ADMIN_FIRST_NAME (optional, defaults to "Platform") /
 * PLATFORM_ADMIN_LAST_NAME (optional), then:
 *   npx ts-node -r tsconfig-paths/register src/database/prisma/create-platform-admin.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../../generated/prisma';

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

async function main() {
  const adapter = new PrismaPg({
    connectionString: requireEnv('DATABASE_URL'),
  });
  const prisma = new PrismaClient({ adapter });

  try {
    const email = requireEnv('PLATFORM_ADMIN_EMAIL').toLowerCase();
    const password = requireEnv('PLATFORM_ADMIN_PASSWORD');
    const firstName = process.env.PLATFORM_ADMIN_FIRST_NAME || 'Platform';
    const lastName = process.env.PLATFORM_ADMIN_LAST_NAME || 'Admin';

    const existingSuperAdmin = await prisma.user.findFirst({
      where: { role: Role.SUPER_ADMIN },
    });
    if (existingSuperAdmin) {
      console.log(
        `A SUPER_ADMIN already exists (${existingSuperAdmin.email}). Not creating another.`,
      );
      return;
    }

    // email is unique per tenant now, not globally — findFirst (not
    // findUnique) since there's no tenant to scope this bootstrap check to
    // yet (the tenant it'll attach to is picked further down).
    const existingUser = await prisma.user.findFirst({ where: { email } });
    if (existingUser) {
      throw new Error(`A user with email "${email}" already exists.`);
    }

    const tenant = await prisma.tenant.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (!tenant) {
      throw new Error(
        'No tenant exists yet — run `npm run db:seed` first, then re-run this script.',
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role: Role.SUPER_ADMIN,
        tenantId: tenant.id,
        verifiedAt: new Date(),
      },
    });

    console.log(`Created SUPER_ADMIN: ${admin.email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
