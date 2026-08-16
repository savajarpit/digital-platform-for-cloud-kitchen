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
import { FEATURE_CATALOG } from '../../common/enums/feature.enum';
import { slugify } from '../../common/utils/slug.util';
import {
  defaultHomePageContent,
  defaultSubscriptionSettings,
  defaultPlanFeatures,
  defaultPlanFaqs,
} from '../../common/constants/tenant-default-content';

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
    const existingTenant = await prisma.tenant.findFirst();
    let newTenantId: string | null = null;
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
      newTenantId = tenant.id;

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

      await prisma.homePageContent.create({
        data: { tenantId: tenant.id, ...defaultHomePageContent() },
      });

      await prisma.subscriptionSettings.create({
        data: { tenantId: tenant.id, ...defaultSubscriptionSettings() },
      });

      await prisma.planFeature.createMany({
        data: defaultPlanFeatures().map((f) => ({ tenantId: tenant.id, ...f })),
      });

      await prisma.planFaq.createMany({
        data: defaultPlanFaqs().map((f) => ({ tenantId: tenant.id, ...f })),
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

    for (const feature of FEATURE_CATALOG) {
      await prisma.feature.upsert({
        where: { key: feature.key },
        update: { name: feature.name, description: feature.description },
        create: feature,
      });
    }
    console.log(`Feature catalog synced (${FEATURE_CATALOG.length} entries).`);
    // No default TenantFeature rows are created here — a new tenant simply
    // has no rows, which the features service already treats as "disabled"
    // for every key. Premium features are opt-in per sale (SUPER_ADMIN
    // enables them from the platform module), never accidentally free.

    // A brand-new tenant's OWNER gets every permission granted by default —
    // otherwise the fine-grained permission guard would lock the owner out
    // of their own business immediately after signup. SUPER_ADMIN can later
    // ratchet this down per-tenant; STAFF stays ungranted by default on
    // purpose (opt-in, per Arpit's own requirement).
    if (newTenantId) {
      const allPermissions = await prisma.permission.findMany();
      for (const permission of allPermissions) {
        await prisma.rolePermission.upsert({
          where: {
            tenantId_role_permissionId: {
              tenantId: newTenantId,
              role: Role.OWNER,
              permissionId: permission.id,
            },
          },
          update: { granted: true },
          create: {
            tenantId: newTenantId,
            role: Role.OWNER,
            permissionId: permission.id,
            granted: true,
          },
        });
      }
      console.log(
        `OWNER granted all ${allPermissions.length} permissions for new tenant.`,
      );
    }

    await seedSampleMenu(prisma);
    await seedDefaultLegalPages(prisma);
    await seedDefaultPlatformPages(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Arpit's own platform-level pages (About Us, Refund & Cancellation Policy)
 * — global, not tenant-scoped, distinct from each tenant's own StaticPage
 * rows above. Placeholder content; Arpit should rewrite these from
 * `/admin/platform/pages` before going live. Safe to re-run — only fills in
 * a slug that's missing.
 */
async function seedDefaultPlatformPages(prisma: PrismaClient): Promise<void> {
  const defaults: { slug: string; title: string; content: string }[] = [
    {
      slug: 'about-us',
      title: 'About Us',
      content:
        '# About Us\n\nPlaceholder about page for the platform itself. Replace this from Platform → Pages before going live.',
    },
    {
      slug: 'refund-policy',
      title: 'Refund & Cancellation Policy',
      content:
        '# Refund & Cancellation Policy\n\nPlaceholder refund/cancellation policy for the platform subscription itself. Replace this from Platform → Pages before going live.',
    },
  ];

  for (const page of defaults) {
    const existing = await prisma.platformPage.findUnique({
      where: { slug: page.slug },
    });
    if (existing) continue;

    await prisma.platformPage.create({ data: { ...page, isPublished: true } });
    console.log(`Seeded default platform page "${page.slug}".`);
  }
}

/**
 * Signup now requires a tenant to have published terms-of-service and
 * privacy-policy StaticPages (customer consent, §9) — without this, every
 * existing/test tenant's signup would break the moment that check shipped.
 * Placeholder content only; a real tenant should rewrite these from
 * `/admin/settings/content` before going live. Safe to re-run — only fills
 * in a tenant that's missing one of the two slugs.
 */
async function seedDefaultLegalPages(prisma: PrismaClient): Promise<void> {
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true },
  });

  const defaults: { slug: string; title: string; content: string }[] = [
    {
      slug: 'terms-of-service',
      title: 'Terms of Service',
      content:
        '# Terms of Service\n\nPlaceholder terms of service. Replace this from Settings → Content before going live.',
    },
    {
      slug: 'privacy-policy',
      title: 'Privacy Policy',
      content:
        '# Privacy Policy\n\nPlaceholder privacy policy. Replace this from Settings → Content before going live.',
    },
    {
      slug: 'about-us',
      title: 'About Us',
      content:
        '# About Us\n\nPlaceholder about page. Replace this from Settings → Content before going live.',
    },
    {
      slug: 'refund-policy',
      title: 'Refund & Return Policy',
      content:
        '# Refund & Return Policy\n\nPlaceholder refund/cancellation policy. Replace this from Settings → Content before going live.',
    },
  ];

  for (const tenant of tenants) {
    for (const page of defaults) {
      const existing = await prisma.staticPage.findUnique({
        where: { tenantId_slug: { tenantId: tenant.id, slug: page.slug } },
      });
      if (existing) continue;

      await prisma.staticPage.create({
        data: { tenantId: tenant.id, ...page, isPublished: true },
      });
      console.log(
        `Seeded default "${page.slug}" page for tenant "${tenant.name}".`,
      );
    }
  }
}

/**
 * Sample menu data so a freshly-provisioned tenant's storefront isn't empty.
 * Runs for every tenant that has zero categories — safe to re-run.
 */
async function seedSampleMenu(prisma: PrismaClient): Promise<void> {
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true },
  });

  for (const tenant of tenants) {
    const categoryCount = await prisma.category.count({
      where: { tenantId: tenant.id },
    });
    if (categoryCount > 0) continue;

    const salads = await prisma.category.create({
      data: {
        tenantId: tenant.id,
        name: 'Salads',
        slug: 'salads',
        sortOrder: 0,
      },
    });
    const bowls = await prisma.category.create({
      data: { tenantId: tenant.id, name: 'Bowls', slug: 'bowls', sortOrder: 1 },
    });
    const beverages = await prisma.category.create({
      data: {
        tenantId: tenant.id,
        name: 'Beverages',
        slug: 'beverages',
        sortOrder: 2,
      },
    });

    await prisma.meal.createMany({
      data: [
        {
          tenantId: tenant.id,
          categoryId: salads.id,
          name: 'Mediterranean Quinoa Salad',
          description:
            'Quinoa, chickpeas, feta, olives, cherry tomatoes, herb dressing.',
          priceInPaise: 24900,
          nutrition: {
            calories: 420,
            protein: '18g',
            carbs: '45g',
            fat: '16g',
          },
          isVegetarian: true,
          sortOrder: 0,
        },
        {
          tenantId: tenant.id,
          categoryId: salads.id,
          name: 'Grilled Chicken Caesar',
          description:
            'Grilled chicken, romaine, parmesan, whole-grain croutons.',
          priceInPaise: 27900,
          nutrition: {
            calories: 480,
            protein: '38g',
            carbs: '22g',
            fat: '24g',
          },
          isVegetarian: false,
          sortOrder: 1,
        },
        {
          tenantId: tenant.id,
          categoryId: bowls.id,
          name: 'Peanut Tofu Buddha Bowl',
          description: 'Brown rice, tofu, edamame, carrots, peanut-lime sauce.',
          priceInPaise: 26900,
          nutrition: {
            calories: 510,
            protein: '22g',
            carbs: '58g',
            fat: '20g',
          },
          isVegetarian: true,
          sortOrder: 0,
        },
        {
          tenantId: tenant.id,
          categoryId: bowls.id,
          name: 'Paneer Tikka Millet Bowl',
          description:
            'Millet, grilled paneer tikka, mint chutney, pickled onions.',
          priceInPaise: 25900,
          nutrition: {
            calories: 460,
            protein: '24g',
            carbs: '48g',
            fat: '18g',
          },
          isVegetarian: true,
          sortOrder: 1,
        },
        {
          tenantId: tenant.id,
          categoryId: beverages.id,
          name: 'Cold-Pressed Green Juice',
          description: 'Spinach, cucumber, apple, celery, ginger.',
          priceInPaise: 12900,
          nutrition: { calories: 90, protein: '2g', carbs: '20g', fat: '0g' },
          isVegetarian: true,
          sortOrder: 0,
        },
      ],
    });

    console.log(`Sample menu seeded for tenant "${tenant.name}".`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
