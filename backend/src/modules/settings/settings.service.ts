import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SettingsRepository } from './settings.repository';
import { FeaturesService } from '../features/features.service';
import { PlatformSettingsService } from '../../shared-modules/platform-settings/platform-settings.service';
import {
  ClosedDateEntry,
  normalizeClosedDates,
} from '../../common/utils/closed-dates.util';
import { orderDayAvailability } from '../../common/utils/order-day-availability.util';
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
import type { HeroFeature } from '../../common/constants/hero-feature-icons.constant';
import {
  defaultHomePageContent,
  defaultHeroFeatures,
} from '../../common/constants/tenant-default-content';
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

/** OrderAcceptanceSettings with closedDates always in the current object
 * shape, regardless of whether the stored JSON is still the legacy string[]. */
export type OrderAcceptanceView = Omit<
  OrderAcceptanceSettings,
  'closedDates'
> & {
  closedDates: ClosedDateEntry[];
};

function toOrderAcceptanceView(
  settings: OrderAcceptanceSettings,
): OrderAcceptanceView {
  return {
    ...settings,
    closedDates: normalizeClosedDates(settings.closedDates),
  };
}

const PLAN_CALENDAR_FEATURE_KEY = 'plan-calendar-view';

@Injectable()
export class SettingsService {
  constructor(
    private readonly settingsRepo: SettingsRepository,
    private readonly config: ConfigService,
    private readonly platformSettings: PlatformSettingsService,
    private readonly featuresService: FeaturesService,
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
      headerDisplayMode: profile.headerDisplayMode,
      footerDisplayMode: profile.footerDisplayMode,
      headerLogoHeightPx: profile.headerLogoHeightPx,
      headerLogoWidthPx: profile.headerLogoWidthPx ?? undefined,
      footerLogoHeightPx: profile.footerLogoHeightPx,
      footerLogoWidthPx: profile.footerLogoWidthPx ?? undefined,
      headerNameColor: profile.headerNameColor ?? undefined,
      footerNameColor: profile.footerNameColor ?? undefined,
      ogImageUrl: profile.ogImageUrl ?? undefined,
      ogImageAlt: profile.ogImageAlt ?? undefined,
      ogImageWidth: profile.ogImageWidth ?? undefined,
      ogImageHeight: profile.ogImageHeight ?? undefined,
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
      // Only a missing/malformed value falls back to the defaults — an empty
      // array is a deliberate "hide the row" choice by the tenant.
      heroFeatures: Array.isArray(homePageContent?.heroFeatures)
        ? (homePageContent.heroFeatures as unknown as HeroFeature[])
        : defaultHeroFeatures(),
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
    /** Each orderable day and whether a scheduled order can be placed for it. */
    days: { date: string; open: boolean; reason: string | null }[];
    /** Set when the store is temporarily closed — nothing can be ordered at all. */
    storeClosedReason: string | null;
  }> {
    const [profile, slots, acceptance] = await Promise.all([
      this.settingsRepo.findBusinessProfile(tenantId),
      this.settingsRepo.findActiveDeliverySlots(tenantId),
      this.settingsRepo.findOrderAcceptanceSettings(tenantId),
    ]);
    // The checkout day-picker must anchor to "today" in the tenant's
    // timezone — the exact same value orders.service validates against.
    // A browser building the list from its own clock (or worse, from
    // toISOString(), which is UTC) offers the wrong day near midnight and
    // the order is rejected with "Delivery date must be between …".
    const now = DateUtil.getTenantNow(profile?.timezone ?? 'Asia/Kolkata');
    const { dateStr: todayStr, minutesSinceMidnight: nowMinutes } = now;
    const maxAdvanceOrderDays = profile?.maxAdvanceOrderDays ?? 2;
    // Same rule orders.service enforces (orderDayAvailability), so checkout
    // shows a closed day as closed instead of letting the order bounce.
    const days = Array.from({ length: maxAdvanceOrderDays + 1 }, (_, i) => {
      const date = DateUtil.addDaysToDateStr(todayStr, i);
      const availability = orderDayAvailability(acceptance, date, now);
      return {
        date,
        open: availability.open,
        reason: availability.open ? null : availability.reason,
      };
    });
    return {
      maxAdvanceOrderDays,
      slots,
      todayStr,
      nowMinutes,
      days,
      storeClosedReason: acceptance?.isTemporarilyClosed
        ? acceptance.closureReason || 'Temporarily closed'
        : null,
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
    // 0 is the form's "clear back to auto width" sentinel (there's no other
    // way to distinguish "leave unchanged" from "explicitly unset" in a
    // PATCH body) — translate it to a real null before it hits Prisma.
    const headerLogoWidthPx =
      rest.headerLogoWidthPx === 0 ? null : rest.headerLogoWidthPx;
    const footerLogoWidthPx =
      rest.footerLogoWidthPx === 0 ? null : rest.footerLogoWidthPx;

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
      ...(headerLogoWidthPx !== undefined ? { headerLogoWidthPx } : {}),
      ...(footerLogoWidthPx !== undefined ? { footerLogoWidthPx } : {}),
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
    const { heroFeatures, ...rest } = dto;
    return this.settingsRepo.upsertHomePageContent(tenantId, {
      ...rest,
      ...(heroFeatures
        ? {
            heroFeatures: heroFeatures.map(({ icon, label }) => ({
              icon,
              label,
            })) as Prisma.InputJsonValue,
          }
        : {}),
    });
  }

  // ── Order acceptance ──────────────────────────────────────

  async getOrderAcceptanceSettings(
    tenantId: string,
  ): Promise<OrderAcceptanceView | null> {
    const settings =
      await this.settingsRepo.findOrderAcceptanceSettings(tenantId);
    return settings ? toOrderAcceptanceView(settings) : null;
  }

  async updateOrderAcceptance(
    tenantId: string,
    dto: UpdateOrderAcceptanceDto,
  ): Promise<OrderAcceptanceView> {
    const { operatingHours, closedDates, ...rest } = dto;

    let closedDatesJson: Prisma.InputJsonValue | undefined;
    if (closedDates) {
      // Subscription-affecting closures ride on the calendar feature —
      // without it, closed dates keep their original orders-only meaning.
      const touchesSubscriptions = closedDates.some(
        (d) => d.appliesTo === 'SUBSCRIPTIONS' || d.appliesTo === 'BOTH',
      );
      if (
        touchesSubscriptions &&
        !(await this.featuresService.hasFeature(
          tenantId,
          PLAN_CALENDAR_FEATURE_KEY,
        ))
      ) {
        throw new ForbiddenException(
          'Closing subscription deliveries needs the calendar plan view feature, which is not enabled for your account.',
        );
      }
      const byDate = new Map<string, ClosedDateEntry>();
      for (const d of closedDates) {
        byDate.set(d.date, {
          date: d.date,
          name: d.name?.trim() || null,
          note: d.note?.trim() || null,
          appliesTo: d.appliesTo ?? 'ORDERS',
        });
      }
      closedDatesJson = [...byDate.values()].sort((a, b) =>
        a.date.localeCompare(b.date),
      ) as unknown as Prisma.InputJsonValue;
    }

    const saved = await this.settingsRepo.upsertOrderAcceptanceSettings(
      tenantId,
      {
        ...rest,
        ...(closedDatesJson ? { closedDates: closedDatesJson } : {}),
        ...(operatingHours
          ? {
              operatingHours:
                operatingHours as unknown as Prisma.InputJsonValue,
            }
          : {}),
      },
    );
    return toOrderAcceptanceView(saved);
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
    if (typeof record.footerBgColor === 'string') {
      config.footerBgColor = record.footerBgColor;
    }
    if (typeof record.footerTextColor === 'string') {
      config.footerTextColor = record.footerTextColor;
    }
    return config;
  }
}
