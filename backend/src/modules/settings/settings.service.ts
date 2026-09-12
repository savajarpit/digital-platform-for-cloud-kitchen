import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SettingsRepository } from './settings.repository';
import { PlatformSettingsService } from '../../shared-modules/platform-settings/platform-settings.service';
import {
  BusinessProfile,
  DeliverySlot,
  HomePageContent,
  InstantDeliverySettings,
  KitchenZone,
  NotificationSettings,
  OrderAcceptanceSettings,
  PaymentSettings,
  Prisma,
  ServiceablePincode,
} from '../../generated/prisma';
import {
  PublicConfigResponseDto,
  ThemeConfigDto,
} from './dto/public-config-response.dto';
import { UpdateBusinessProfileDto } from './dto/update-business-profile.dto';
import { UpdateHomePageContentDto } from './dto/update-home-page-content.dto';
import { defaultHomePageContent } from '../../common/constants/tenant-default-content';
import { UpdateOrderAcceptanceDto } from './dto/update-order-acceptance.dto';
import { UpdateInstantDeliverySettingsDto } from './dto/update-instant-delivery-settings.dto';
import { UpdateDeliveryZonesDto } from './dto/update-delivery-zones.dto';
import { CreateServiceablePincodeDto } from './dto/create-serviceable-pincode.dto';
import { UpdateServiceablePincodeDto } from './dto/update-serviceable-pincode.dto';
import { CreateKitchenZoneDto } from './dto/create-kitchen-zone.dto';
import { UpdateKitchenZoneDto } from './dto/update-kitchen-zone.dto';
import { CreateDeliverySlotDto } from './dto/create-delivery-slot.dto';
import { UpdateDeliverySlotDto } from './dto/update-delivery-slot.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { UpdatePaymentSettingsDto } from './dto/update-payment-settings.dto';
import { CryptoUtil } from '../../common/utils/crypto.util';
import { DateUtil } from '../../common/utils/date.util';

/** Client-facing shape of the instant-delivery settings — the editable
 * fields only, matching UpdateInstantDeliverySettingsDto so the storefront
 * can round-trip it through the PATCH without tripping forbidNonWhitelisted. */
export interface InstantDeliveryView {
  isEnabled: boolean;
  etaMinMinutes: number;
  etaMaxMinutes: number;
}

@Injectable()
export class SettingsService {
  constructor(
    private readonly settingsRepo: SettingsRepository,
    private readonly config: ConfigService,
    private readonly platformSettings: PlatformSettingsService,
  ) {}

  async getPublicConfig(
    tenantId: string | undefined,
  ): Promise<PublicConfigResponseDto> {
    if (!tenantId) {
      // No tenant resolved for this request (e.g. hit from the platform
      // admin host, which isn't tied to any single tenant).
      throw new NotFoundException('No tenant context for this request');
    }

    const [profile, homePageContent, poweredByBrandingEnabled, mapsConfig] =
      await Promise.all([
        this.settingsRepo.findBusinessProfile(tenantId),
        this.settingsRepo.findHomePageContent(tenantId),
        this.settingsRepo.findPoweredByBrandingEnabled(tenantId),
        // Platform-wide, not per-tenant — SUPER_ADMIN's one map-provider
        // switch (see PlatformSettingsService) applies to every storefront.
        this.platformSettings.getMapsConfig(),
      ]);
    if (!profile) {
      throw new NotFoundException('Business profile not configured yet');
    }

    const heroDefaults = defaultHomePageContent();

    return new PublicConfigResponseDto({
      displayName: profile.displayName,
      description: profile.description ?? undefined,
      logoUrl: profile.logoUrl ?? undefined,
      faviconUrl: profile.faviconUrl ?? undefined,
      heroImageUrl: profile.heroImageUrl ?? undefined,
      themeConfig: this.parseThemeConfig(profile.themeConfig),
      defaultLocale: profile.defaultLocale,
      currency: profile.currency,
      supportEmail: profile.supportEmail ?? undefined,
      supportPhone: profile.supportPhone ?? undefined,
      addressLine1: profile.addressLine1 ?? undefined,
      addressLine2: profile.addressLine2 ?? undefined,
      city: profile.city ?? undefined,
      state: profile.state ?? undefined,
      country: profile.country ?? undefined,
      pincode: profile.pincode ?? undefined,
      whatsappBusinessNumber: profile.whatsappBusinessNumber ?? undefined,
      gstNumber: profile.gstNumber ?? undefined,
      // Gated on the switch, not just presence — adding a number doesn't
      // immediately publish it (see BusinessProfile.showFssaiLicense).
      fssaiLicenseNumber:
        profile.showFssaiLicense && profile.fssaiLicenseNumber
          ? profile.fssaiLicenseNumber
          : undefined,
      kitchenLat: profile.kitchenLat ?? undefined,
      kitchenLng: profile.kitchenLng ?? undefined,
      searchConsoleVerification: profile.searchConsoleVerification ?? undefined,
      maxAdvanceOrderDays: profile.maxAdvanceOrderDays,
      showReviewsOnHomepage: profile.showReviewsOnHomepage,
      poweredByBrandingEnabled,
      heroTagline: homePageContent?.heroTagline ?? heroDefaults.heroTagline,
      heroTitle: homePageContent?.heroTitle ?? undefined,
      heroSubtitle: homePageContent?.heroSubtitle ?? heroDefaults.heroSubtitle,
      heroImageUrls: homePageContent?.heroImageUrls ?? [],
      reviewsSectionTitle:
        homePageContent?.reviewsSectionTitle ??
        heroDefaults.reviewsSectionTitle,
      reviewsSectionDescription:
        homePageContent?.reviewsSectionDescription ??
        heroDefaults.reviewsSectionDescription,
      ctaEnabled: homePageContent?.ctaEnabled ?? heroDefaults.ctaEnabled,
      ctaTitle: homePageContent?.ctaTitle ?? heroDefaults.ctaTitle,
      ctaDescription:
        homePageContent?.ctaDescription ?? heroDefaults.ctaDescription,
      ctaPrimaryLabel:
        homePageContent?.ctaPrimaryLabel ?? heroDefaults.ctaPrimaryLabel,
      ctaPrimaryLink:
        homePageContent?.ctaPrimaryLink ?? heroDefaults.ctaPrimaryLink,
      ctaSecondaryLabel:
        homePageContent?.ctaSecondaryLabel ?? heroDefaults.ctaSecondaryLabel,
      ctaSecondaryLink:
        homePageContent?.ctaSecondaryLink ?? heroDefaults.ctaSecondaryLink,
      mapsProvider: mapsConfig.mapsProvider,
      googleMapsApiKey: mapsConfig.googleMapsApiKey,
    });
  }

  async getDeliverySlots(tenantId: string): Promise<{
    maxAdvanceOrderDays: number;
    slots: DeliverySlot[];
    todayStr: string;
    nowMinutes: number;
  }> {
    const [profile, slots] = await Promise.all([
      this.settingsRepo.findBusinessProfile(tenantId),
      this.settingsRepo.findActiveDeliverySlots(tenantId),
    ]);
    // The checkout day-picker must anchor to "today" in the tenant's
    // timezone — the exact same value orders.service validates against.
    // A browser building the list from its own clock (or worse, from
    // toISOString(), which is UTC) offers the wrong day near midnight and
    // the order is rejected with "Delivery date must be between …".
    const { dateStr: todayStr, minutesSinceMidnight: nowMinutes } =
      DateUtil.getTenantNow(profile?.timezone ?? 'Asia/Kolkata');
    return {
      maxAdvanceOrderDays: profile?.maxAdvanceOrderDays ?? 2,
      slots,
      todayStr,
      nowMinutes,
    };
  }

  /** Pickup is only actually offered when BOTH the tenant-wide master
   * switch is on AND at least one KitchenZone has its own pickupEnabled —
   * same two-condition gating shape as showFssaiLicense + a real license
   * number. Computed fresh here (not cached/trusted from the client) so
   * checkout and order creation always agree on the current state. */
  async getPickupInfo(tenantId: string): Promise<{
    available: boolean;
    zones: { id: string; pickupAddress: string; lat: number; lng: number }[];
  }> {
    const [profile, zones] = await Promise.all([
      this.settingsRepo.findBusinessProfile(tenantId),
      this.settingsRepo.findAllKitchenZones(tenantId),
    ]);
    const eligibleZones = zones.filter((z) => z.isActive && z.pickupEnabled);
    const available =
      Boolean(profile?.pickupEnabled) && eligibleZones.length > 0;
    return {
      available,
      zones: available
        ? eligibleZones.map((z) => ({
            id: z.id,
            pickupAddress: z.pickupAddress ?? '',
            lat: z.lat,
            lng: z.lng,
          }))
        : [],
    };
  }

  // ── Business profile / branding ──────────────────────────

  getBusinessProfile(tenantId: string): Promise<BusinessProfile | null> {
    return this.settingsRepo.findBusinessProfile(tenantId);
  }

  async updateBusinessProfile(
    tenantId: string,
    dto: UpdateBusinessProfileDto,
  ): Promise<BusinessProfile> {
    const { themeConfig, ...rest } = dto;
    let mergedTheme: Record<string, unknown> | undefined;
    if (themeConfig) {
      const current = await this.settingsRepo.findBusinessProfile(tenantId);
      const existingTheme =
        current?.themeConfig && typeof current.themeConfig === 'object'
          ? (current.themeConfig as Record<string, unknown>)
          : {};
      // themeConfig is a class-transformer instance — omitted fields exist
      // as own properties with value `undefined`, not absent keys. Spreading
      // it directly would overwrite existingTheme's real values with
      // `undefined` for every field this request didn't touch. Only merge
      // in the fields actually provided.
      const providedTheme = Object.fromEntries(
        Object.entries(themeConfig).filter(([, value]) => value !== undefined),
      );
      mergedTheme = { ...existingTheme, ...providedTheme };
    }

    return this.settingsRepo.updateBusinessProfile(tenantId, {
      ...rest,
      ...(mergedTheme
        ? { themeConfig: mergedTheme as unknown as Prisma.InputJsonValue }
        : {}),
    });
  }

  // ── Home page content (hero / CTA / reviews-section copy) ──

  getHomePageContent(tenantId: string): Promise<HomePageContent | null> {
    return this.settingsRepo.findHomePageContent(tenantId);
  }

  updateHomePageContent(
    tenantId: string,
    dto: UpdateHomePageContentDto,
  ): Promise<HomePageContent> {
    return this.settingsRepo.upsertHomePageContent(tenantId, dto);
  }

  // ── Order acceptance ──────────────────────────────────────

  getOrderAcceptanceSettings(
    tenantId: string,
  ): Promise<OrderAcceptanceSettings | null> {
    return this.settingsRepo.findOrderAcceptanceSettings(tenantId);
  }

  updateOrderAcceptance(
    tenantId: string,
    dto: UpdateOrderAcceptanceDto,
  ): Promise<OrderAcceptanceSettings> {
    const { operatingHours, ...rest } = dto;
    return this.settingsRepo.upsertOrderAcceptanceSettings(tenantId, {
      ...rest,
      ...(operatingHours
        ? { operatingHours: operatingHours as unknown as Prisma.InputJsonValue }
        : {}),
    });
  }

  // ── Instant delivery ──────────────────────────────────────

  async getInstantDeliverySettings(
    tenantId: string,
  ): Promise<InstantDeliveryView> {
    const settings =
      await this.settingsRepo.findInstantDeliverySettings(tenantId);
    return this.toInstantDeliveryView(settings);
  }

  async updateInstantDeliverySettings(
    tenantId: string,
    dto: UpdateInstantDeliverySettingsDto,
  ): Promise<InstantDeliveryView> {
    const saved = await this.settingsRepo.upsertInstantDeliverySettings(
      tenantId,
      dto,
    );
    return this.toInstantDeliveryView(saved);
  }

  /** Only the client-editable fields — never the raw row. The storefront
   * echoes this object straight back into the PATCH, and the global
   * ValidationPipe runs `forbidNonWhitelisted`, so leaking `id`/`tenantId`/
   * `createdAt`/`updatedAt` here makes the very next save 400 with
   * "property id should not exist". */
  private toInstantDeliveryView(
    settings: InstantDeliverySettings | null,
  ): InstantDeliveryView {
    return {
      isEnabled: settings?.isEnabled ?? false,
      etaMinMinutes: settings?.etaMinMinutes ?? 30,
      etaMaxMinutes: settings?.etaMaxMinutes ?? 45,
    };
  }

  // ── Delivery zones (kitchen geo, fees, advance-order window) ─

  updateDeliveryZones(
    tenantId: string,
    dto: UpdateDeliveryZonesDto,
  ): Promise<BusinessProfile> {
    return this.settingsRepo.updateBusinessProfile(tenantId, dto);
  }

  getServiceablePincodes(tenantId: string): Promise<ServiceablePincode[]> {
    return this.settingsRepo.findAllServiceablePincodes(tenantId);
  }

  async createServiceablePincode(
    tenantId: string,
    dto: CreateServiceablePincodeDto,
  ): Promise<ServiceablePincode> {
    const existing = await this.settingsRepo.findServiceablePincodeByPincode(
      tenantId,
      dto.pincode,
    );
    if (existing) {
      throw new ConflictException('This pincode is already serviceable');
    }
    return this.settingsRepo.createServiceablePincode(tenantId, dto);
  }

  async updateServiceablePincode(
    tenantId: string,
    id: string,
    dto: UpdateServiceablePincodeDto,
  ): Promise<ServiceablePincode> {
    const existing = await this.settingsRepo.findServiceablePincodeById(
      tenantId,
      id,
    );
    if (!existing) throw new NotFoundException('Serviceable pincode not found');
    if (dto.pincode && dto.pincode !== existing.pincode) {
      const duplicate = await this.settingsRepo.findServiceablePincodeByPincode(
        tenantId,
        dto.pincode,
      );
      if (duplicate) {
        throw new ConflictException('This pincode is already serviceable');
      }
    }
    return this.settingsRepo.updateServiceablePincode(id, dto);
  }

  async deleteServiceablePincode(tenantId: string, id: string): Promise<void> {
    const existing = await this.settingsRepo.findServiceablePincodeById(
      tenantId,
      id,
    );
    if (!existing) throw new NotFoundException('Serviceable pincode not found');
    await this.settingsRepo.deleteServiceablePincode(id);
  }

  getKitchenZones(tenantId: string): Promise<KitchenZone[]> {
    return this.settingsRepo.findAllKitchenZones(tenantId);
  }

  createKitchenZone(
    tenantId: string,
    dto: CreateKitchenZoneDto,
  ): Promise<KitchenZone> {
    return this.settingsRepo.createKitchenZone(tenantId, dto);
  }

  async updateKitchenZone(
    tenantId: string,
    id: string,
    dto: UpdateKitchenZoneDto,
  ): Promise<KitchenZone> {
    const existing = await this.settingsRepo.findKitchenZoneById(tenantId, id);
    if (!existing) throw new NotFoundException('Kitchen zone not found');
    return this.settingsRepo.updateKitchenZone(id, dto);
  }

  async deleteKitchenZone(tenantId: string, id: string): Promise<void> {
    const existing = await this.settingsRepo.findKitchenZoneById(tenantId, id);
    if (!existing) throw new NotFoundException('Kitchen zone not found');
    await this.settingsRepo.deleteKitchenZone(id);
  }

  getAllDeliverySlots(tenantId: string): Promise<DeliverySlot[]> {
    return this.settingsRepo.findAllDeliverySlots(tenantId);
  }

  createDeliverySlot(
    tenantId: string,
    dto: CreateDeliverySlotDto,
  ): Promise<DeliverySlot> {
    return this.settingsRepo.createDeliverySlot(tenantId, dto);
  }

  async updateDeliverySlot(
    tenantId: string,
    id: string,
    dto: UpdateDeliverySlotDto,
  ): Promise<DeliverySlot> {
    const existing = await this.settingsRepo.findDeliverySlotById(tenantId, id);
    if (!existing) throw new NotFoundException('Delivery slot not found');
    return this.settingsRepo.updateDeliverySlot(id, dto);
  }

  async deleteDeliverySlot(tenantId: string, id: string): Promise<void> {
    const existing = await this.settingsRepo.findDeliverySlotById(tenantId, id);
    if (!existing) throw new NotFoundException('Delivery slot not found');
    await this.settingsRepo.deleteDeliverySlot(id);
  }

  // ── Notifications ──────────────────────────────────────────

  getNotificationSettings(
    tenantId: string,
  ): Promise<NotificationSettings | null> {
    return this.settingsRepo.findNotificationSettings(tenantId);
  }

  updateNotificationSettings(
    tenantId: string,
    dto: UpdateNotificationSettingsDto,
  ): Promise<NotificationSettings> {
    const { whatsappApiKey, whatsappConfig, emailConfig, ...rest } = dto;
    const encryptionKey = this.requireEncryptionKey();

    return this.settingsRepo.upsertNotificationSettings(tenantId, {
      ...rest,
      ...(whatsappApiKey
        ? {
            whatsappApiKeyEncrypted: CryptoUtil.encrypt(
              whatsappApiKey,
              encryptionKey,
            ),
          }
        : {}),
      ...(whatsappConfig
        ? {
            whatsappConfigEncrypted: CryptoUtil.encrypt(
              JSON.stringify(whatsappConfig),
              encryptionKey,
            ),
          }
        : {}),
      ...(emailConfig
        ? {
            emailConfigEncrypted: CryptoUtil.encrypt(
              JSON.stringify(emailConfig),
              encryptionKey,
            ),
          }
        : {}),
    });
  }

  // ── Payments ───────────────────────────────────────────────

  getPaymentSettings(tenantId: string): Promise<PaymentSettings | null> {
    return this.settingsRepo.findPaymentSettings(tenantId);
  }

  updatePaymentSettings(
    tenantId: string,
    dto: UpdatePaymentSettingsDto,
  ): Promise<PaymentSettings> {
    const { razorpayKeySecret, razorpayWebhookSecret, ...rest } = dto;
    const encryptionKey = this.requireEncryptionKey();

    return this.settingsRepo.upsertPaymentSettings(tenantId, {
      ...rest,
      ...(razorpayKeySecret
        ? {
            razorpayKeySecretEncrypted: CryptoUtil.encrypt(
              razorpayKeySecret,
              encryptionKey,
            ),
          }
        : {}),
      ...(razorpayWebhookSecret
        ? {
            razorpayWebhookSecretEncrypted: CryptoUtil.encrypt(
              razorpayWebhookSecret,
              encryptionKey,
            ),
          }
        : {}),
    });
  }

  private requireEncryptionKey(): string {
    const key = this.config.get<string>('app.encryptionKey');
    if (!key) {
      throw new InternalServerErrorException('Encryption key not configured');
    }
    return key;
  }

  private parseThemeConfig(raw: unknown): ThemeConfigDto {
    const config = new ThemeConfigDto();
    if (!raw || typeof raw !== 'object') return config;

    const record = raw as Record<string, unknown>;
    if (typeof record.primaryColor === 'string') {
      config.primaryColor = record.primaryColor;
    }
    if (typeof record.secondaryColor === 'string') {
      config.secondaryColor = record.secondaryColor;
    }
    if (typeof record.accentColor === 'string') {
      config.accentColor = record.accentColor;
    }
    return config;
  }
}
