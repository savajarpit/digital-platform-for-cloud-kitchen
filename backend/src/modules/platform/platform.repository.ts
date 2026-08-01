import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Role, Status, Tenant } from '../../generated/prisma';

export interface CreateTenantWithOwnerInput {
  businessName: string;
  slug: string;
  customDomain?: string;
  ownerEmail: string;
  passwordHash: string;
  ownerFirstName: string;
  ownerLastName?: string;
}

@Injectable()
export class PlatformRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createTenantWithOwner(input: CreateTenantWithOwnerInput) {
    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: input.businessName,
          slug: input.slug,
          customDomain: input.customDomain,
        },
      });

      await Promise.all([
        tx.businessProfile.create({
          data: { tenantId: tenant.id, displayName: input.businessName },
        }),
        tx.orderAcceptanceSettings.create({ data: { tenantId: tenant.id } }),
        tx.notificationSettings.create({ data: { tenantId: tenant.id } }),
        tx.paymentSettings.create({ data: { tenantId: tenant.id } }),
        // Placeholder legal pages — customer signup requires these to exist
        // and be published (§9 consent gate). Arpit/the tenant should
        // rewrite these from Settings → Content before going live.
        tx.staticPage.create({
          data: {
            tenantId: tenant.id,
            slug: 'terms-of-service',
            title: 'Terms of Service',
            content:
              '# Terms of Service\n\nPlaceholder terms of service. Replace this from Settings → Content before going live.',
            isPublished: true,
          },
        }),
        tx.staticPage.create({
          data: {
            tenantId: tenant.id,
            slug: 'privacy-policy',
            title: 'Privacy Policy',
            content:
              '# Privacy Policy\n\nPlaceholder privacy policy. Replace this from Settings → Content before going live.',
            isPublished: true,
          },
        }),
        tx.staticPage.create({
          data: {
            tenantId: tenant.id,
            slug: 'about-us',
            title: 'About Us',
            content:
              '# About Us\n\nPlaceholder about page. Replace this from Settings → Content before going live.',
            isPublished: true,
          },
        }),
        tx.staticPage.create({
          data: {
            tenantId: tenant.id,
            slug: 'refund-policy',
            title: 'Refund & Return Policy',
            content:
              '# Refund & Return Policy\n\nPlaceholder refund/cancellation policy. Replace this from Settings → Content before going live.',
            isPublished: true,
          },
        }),
      ]);

      // SUPER_ADMIN-provisioned — no signup OTP flow needed, so the owner is
      // marked verified immediately.
      const owner = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: input.ownerEmail,
          passwordHash: input.passwordHash,
          firstName: input.ownerFirstName,
          lastName: input.ownerLastName,
          role: Role.OWNER,
          verifiedAt: new Date(),
        },
      });

      return { tenant, owner };
    });
  }

  findAllTenants() {
    return this.prisma.tenant.findMany({
      include: {
        businessProfile: { select: { displayName: true } },
        users: {
          where: { role: Role.OWNER },
          take: 1,
          select: { email: true },
        },
        platformSubscription: {
          select: {
            status: true,
            billingCycle: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findTenantById(id: string) {
    return this.prisma.tenant.findUnique({
      where: { id },
      include: {
        businessProfile: true,
        notificationSettings: true,
        paymentSettings: true,
        users: {
          where: { role: Role.OWNER },
          take: 1,
          select: { id: true, email: true },
        },
        platformSubscription: true,
      },
    });
  }

  findBySlug(slug: string): Promise<Tenant | null> {
    return this.prisma.tenant.findUnique({ where: { slug } });
  }

  findByCustomDomain(customDomain: string): Promise<Tenant | null> {
    return this.prisma.tenant.findUnique({ where: { customDomain } });
  }

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
  }

  updateTenant(
    id: string,
    data: { name?: string; customDomain?: string; status?: Status },
  ): Promise<Tenant> {
    return this.prisma.tenant.update({ where: { id }, data });
  }
}
