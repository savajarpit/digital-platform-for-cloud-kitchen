import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlatformRepository } from './platform.repository';
import { PermissionsRepository } from '../permissions/permissions.repository';
import { SettingsService } from '../settings/settings.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { UpdateNotificationSettingsDto } from '../settings/dto/update-notification-settings.dto';
import { UpdatePaymentSettingsDto } from '../settings/dto/update-payment-settings.dto';
import { HashUtil } from '../../common/utils/hash.util';
import { slugify } from '../../common/utils/slug.util';
import { Role } from '../../generated/prisma';
import {
  redactNotificationSettings,
  redactPaymentSettings,
} from '../../common/utils/settings-redaction.util';

/**
 * Permissions a tenant's OWNER does NOT get by default on provisioning —
 * confirmed 2026-07-26: most tenant owners aren't technical enough to source
 * a Razorpay secret or SMTP config correctly, so Arpit enters those himself
 * here in the platform module. SUPER_ADMIN can still override per-tenant via
 * the role-permission grid if a specific owner is capable and wants control.
 */
const OWNER_EXCLUDED_PERMISSIONS_BY_DEFAULT = new Set([
  'settings.payment.edit',
  'settings.notifications.edit',
]);

// A tenant's slug doubles as its {slug}.{platformRootDomain} subdomain
// (see TenantResolverService) — never let one of these words be squatted,
// the platform itself may need them as real subdomains later.
const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'app',
  'www',
  'platform',
  'mail',
  'static',
  'cdn',
]);

@Injectable()
export class PlatformService {
  constructor(
    private readonly platformRepo: PlatformRepository,
    private readonly permissionsRepo: PermissionsRepository,
    private readonly settingsService: SettingsService,
  ) {}

  async createTenant(dto: CreateTenantDto) {
    const existingEmail = await this.platformRepo.findUserByEmail(
      dto.ownerEmail,
    );
    if (existingEmail) throw new ConflictException('Email already in use');

    if (dto.customDomain) {
      const existingDomain = await this.platformRepo.findByCustomDomain(
        dto.customDomain,
      );
      if (existingDomain) throw new ConflictException('Domain already in use');
    }

    const slug = await this.generateUniqueSlug(dto.businessName);
    const passwordHash = await HashUtil.hash(dto.ownerPassword);

    const { tenant, owner } = await this.platformRepo.createTenantWithOwner({
      businessName: dto.businessName,
      slug,
      customDomain: dto.customDomain,
      ownerEmail: dto.ownerEmail,
      passwordHash,
      ownerFirstName: dto.ownerFirstName,
      ownerLastName: dto.ownerLastName,
    });

    await this.grantDefaultOwnerPermissions(tenant.id);

    return {
      tenant,
      owner: {
        id: owner.id,
        email: owner.email,
        firstName: owner.firstName,
        lastName: owner.lastName,
        role: owner.role,
      },
    };
  }

  listTenants() {
    return this.platformRepo.findAllTenants();
  }

  async getTenant(id: string) {
    const tenant = await this.platformRepo.findTenantById(id);
    if (!tenant) throw new NotFoundException('Tenant not found');

    const { notificationSettings, paymentSettings, ...rest } = tenant;
    return {
      ...rest,
      notificationSettings: notificationSettings
        ? redactNotificationSettings(notificationSettings)
        : null,
      paymentSettings: paymentSettings
        ? redactPaymentSettings(paymentSettings)
        : null,
    };
  }

  async updateTenant(id: string, dto: UpdateTenantDto) {
    await this.assertTenantExists(id);

    if (dto.customDomain) {
      const existingDomain = await this.platformRepo.findByCustomDomain(
        dto.customDomain,
      );
      if (existingDomain && existingDomain.id !== id) {
        throw new ConflictException('Domain already in use');
      }
    }

    return this.platformRepo.updateTenant(id, {
      name: dto.businessName,
      customDomain: dto.customDomain,
      status: dto.status,
      poweredByBrandingEnabled: dto.poweredByBrandingEnabled,
    });
  }

  async updateTenantNotifications(
    tenantId: string,
    dto: UpdateNotificationSettingsDto,
  ) {
    await this.assertTenantExists(tenantId);
    const settings = await this.settingsService.updateNotificationSettings(
      tenantId,
      dto,
    );
    return redactNotificationSettings(settings);
  }

  async updateTenantPayment(tenantId: string, dto: UpdatePaymentSettingsDto) {
    await this.assertTenantExists(tenantId);
    const settings = await this.settingsService.updatePaymentSettings(
      tenantId,
      dto,
    );
    return redactPaymentSettings(settings);
  }

  private async assertTenantExists(id: string): Promise<void> {
    const tenant = await this.platformRepo.findTenantById(id);
    if (!tenant) throw new NotFoundException('Tenant not found');
  }

  private async grantDefaultOwnerPermissions(tenantId: string): Promise<void> {
    const allPermissions = await this.permissionsRepo.findAllPermissions();
    for (const permission of allPermissions) {
      const granted = !OWNER_EXCLUDED_PERMISSIONS_BY_DEFAULT.has(
        permission.key,
      );
      await this.permissionsRepo.upsertGrant(
        tenantId,
        Role.OWNER,
        permission.id,
        granted,
      );
    }
  }

  private async generateUniqueSlug(businessName: string): Promise<string> {
    const base = slugify(businessName);
    let candidate = base;
    let suffix = 1;
    while (
      RESERVED_SLUGS.has(candidate) ||
      (await this.platformRepo.findBySlug(candidate))
    ) {
      candidate = `${base}-${++suffix}`;
    }
    return candidate;
  }
}
