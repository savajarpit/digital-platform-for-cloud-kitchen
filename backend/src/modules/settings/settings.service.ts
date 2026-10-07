import {
  BadRequestException,
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
  type DayHoursInput,
  operatingHoursError,
} from '../../common/utils/operating-hours.util';
import {
  BusinessProfile,
  DeliverySlot,
  DeliverySlotUsage,
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
import { kitchenZoneInUseMessage } from './kitchen-zone-rules';
import {
  deliverySlotInUseMessage,
  type SlotFlow,
  slotOffersFor,
  subscriptionSlotInUseMessage,
  deliverySlotTimesError,
} from './delivery-slot-rules';
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

/** A zone's admin-facing name, trimmed — blank isn't a name. */
function requireZoneName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new BadRequestException('Give the kitchen zone a name.');
  return trimmed;
}

/** Trimmed pickup address; blank becomes null (cleared), absent stays
 * undefined (unchanged). */
function normalizePickupAddress(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined;
  return value?.trim() || null;
}

/** A zone offering pickup must say where — customers are shown this
 * address as the pickup point. */
function assertPickupHasAddress(
  pickupEnabled: boolean,
  pickupAddress: string | null | undefined,
): void {
  if (pickupEnabled && !pickupAddress) {
    throw new BadRequestException(
      'Add the pickup address customers will see before turning on pickup for this outlet.',
    );
  }
}

const PLAN_CALENDAR_FEATURE_KEY = 'plan-calendar-view';
const SUBSCRIPTIONS_FEATURE_KEY = 'subscriptions';

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

  async getDeliverySlots(
    tenantId: string,
    flow: SlotFlow = 'ORDERS',
  ): Promise<{
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
      this.settingsRepo.findActiveDeliverySlots(tenantId, flow),
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
    // A zone without a pickup address is never offered — order creation
    // refuses it too, and a blank pickup point helps no customer.
    const eligibleZones = zones.filter(
      (z) => z.isActive && z.pickupEnabled && z.pickupAddress?.trim(),
    );
    const available =
      Boolean(profile?.pickupEnabled) && eligibleZones.length > 0;
    return {
      available,
      zones: available
        ? eligibleZones.map((z) => ({
            id: z.id,
            pickupAddress: z.pickupAddress!.trim(),
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
    const { operatingHours, closedDates, closureReason, ...rest } = dto;

    if (operatingHours) {
      const hoursError = operatingHoursError(
        operatingHours as Record<string, DayHoursInput | undefined>,
      );
      if (hoursError) throw new BadRequestException(hoursError);
    }

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
      const impossible = closedDates.find(
        (d) => !DateUtil.isValidDateStr(d.date),
      );
      if (impossible) {
        throw new BadRequestException(
          `${impossible.date} isn't a real date — please pick it from the calendar.`,
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
        // Blank clears it (null), so customers see the default
        // "Temporarily closed" rather than an empty reason.
        ...(closureReason !== undefined
          ? { closureReason: closureReason?.trim() || null }
          : {}),
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
    // A PATCH may carry only one end of the range — compare against the
    // saved other end so "min ≤ max" holds for the stored pair.
    const current = this.toInstantDeliveryView(
      await this.settingsRepo.findInstantDeliverySettings(tenantId),
    );
    const etaMin = dto.etaMinMinutes ?? current.etaMinMinutes;
    const etaMax = dto.etaMaxMinutes ?? current.etaMaxMinutes;
    if (etaMin > etaMax) {
      throw new BadRequestException(
        `The earliest ready-in time (${etaMin} min) can't be later than the latest (${etaMax} min).`,
      );
    }
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

  async createKitchenZone(
    tenantId: string,
    dto: CreateKitchenZoneDto,
  ): Promise<KitchenZone> {
    const pickupAddress = normalizePickupAddress(dto.pickupAddress);
    assertPickupHasAddress(dto.pickupEnabled ?? false, pickupAddress);
    return this.settingsRepo.createKitchenZone(tenantId, {
      ...dto,
      name: requireZoneName(dto.name),
      ...(pickupAddress !== undefined ? { pickupAddress } : {}),
    });
  }

  async updateKitchenZone(
    tenantId: string,
    id: string,
    dto: UpdateKitchenZoneDto,
  ): Promise<KitchenZone> {
    const existing = await this.settingsRepo.findKitchenZoneById(tenantId, id);
    if (!existing) throw new NotFoundException('Kitchen zone not found');
    const pickupAddress = normalizePickupAddress(dto.pickupAddress);
    // Checked on the zone as it will be saved — either field may change.
    assertPickupHasAddress(
      dto.pickupEnabled ?? existing.pickupEnabled,
      pickupAddress !== undefined ? pickupAddress : existing.pickupAddress,
    );
    return this.settingsRepo.updateKitchenZone(id, {
      ...dto,
      ...(dto.name !== undefined ? { name: requireZoneName(dto.name) } : {}),
      ...(pickupAddress !== undefined ? { pickupAddress } : {}),
    });
  }

  async deleteKitchenZone(tenantId: string, id: string): Promise<void> {
    const existing = await this.settingsRepo.findKitchenZoneById(tenantId, id);
    if (!existing) throw new NotFoundException('Kitchen zone not found');
    // Tables/waitlist entries would make the delete fail outright (FK
    // RESTRICT), and past pickup/dine-in orders would lose their outlet.
    const inUse = kitchenZoneInUseMessage(
      await this.settingsRepo.countKitchenZoneUsage(tenantId, id),
    );
    if (inUse) throw new ConflictException(inUse);
    await this.settingsRepo.deleteKitchenZone(id);
  }

  getAllDeliverySlots(tenantId: string): Promise<DeliverySlot[]> {
    return this.settingsRepo.findAllDeliverySlots(tenantId);
  }

  async createDeliverySlot(
    tenantId: string,
    dto: CreateDeliverySlotDto,
  ): Promise<DeliverySlot> {
    const name = await this.assertDeliverySlotValid(tenantId, {
      name: dto.name,
      startTime: dto.startTime,
      endTime: dto.endTime,
    });
    await this.assertSlotUsageAllowed(tenantId, dto.usage);
    // A new slot goes to the end of the list unless placed explicitly.
    const sortOrder =
      dto.sortOrder ??
      Math.max(
        0,
        ...(await this.settingsRepo.findAllDeliverySlots(tenantId)).map(
          (s) => s.sortOrder,
        ),
      ) + 1;
    return this.settingsRepo.createDeliverySlot(tenantId, {
      ...dto,
      name,
      sortOrder,
    });
  }

  async updateDeliverySlot(
    tenantId: string,
    id: string,
    dto: UpdateDeliverySlotDto,
  ): Promise<DeliverySlot> {
    const existing = await this.settingsRepo.findDeliverySlotById(tenantId, id);
    if (!existing) throw new NotFoundException('Delivery slot not found');
    // Validate the slot as it will be saved — a PATCH may change one field.
    const name = await this.assertDeliverySlotValid(
      tenantId,
      {
        name: dto.name ?? existing.name,
        startTime: dto.startTime ?? existing.startTime,
        endTime: dto.endTime ?? existing.endTime,
      },
      id,
    );
    if (dto.usage !== undefined && dto.usage !== existing.usage) {
      await this.assertSlotUsageAllowed(tenantId, dto.usage);
      // Taking a slot away from subscriptions would strand its subscribers.
      if (
        slotOffersFor(existing.usage, 'SUBSCRIPTIONS') &&
        !slotOffersFor(dto.usage, 'SUBSCRIPTIONS')
      ) {
        const inUse = subscriptionSlotInUseMessage(
          await this.settingsRepo.countDeliverySlotUsage(
            tenantId,
            id,
            await this.getTenantTodayStr(tenantId),
          ),
        );
        if (inUse) throw new ConflictException(inUse);
      }
    }
    return this.settingsRepo.updateDeliverySlot(id, {
      ...dto,
      ...(dto.name !== undefined ? { name } : {}),
    });
  }

  /** Orders-only / subscriptions-only slots are a subscriptions-feature
   * setting; without the feature every slot stays BOTH. */
  private async assertSlotUsageAllowed(
    tenantId: string,
    usage: DeliverySlotUsage | undefined,
  ): Promise<void> {
    if (usage === undefined || usage === DeliverySlotUsage.BOTH) return;
    const hasSubscriptions = await this.featuresService.hasFeature(
      tenantId,
      SUBSCRIPTIONS_FEATURE_KEY,
    );
    if (!hasSubscriptions) {
      throw new ForbiddenException(
        'Splitting slots between orders and subscriptions needs the subscriptions feature, which is not enabled for your account.',
      );
    }
  }

  private async getTenantTodayStr(tenantId: string): Promise<string> {
    const profile = await this.settingsRepo.findBusinessProfile(tenantId);
    return DateUtil.getTenantNow(profile?.timezone ?? 'Asia/Kolkata').dateStr;
  }

  async deleteDeliverySlot(tenantId: string, id: string): Promise<void> {
    const existing = await this.settingsRepo.findDeliverySlotById(tenantId, id);
    if (!existing) throw new NotFoundException('Delivery slot not found');
    const inUse = deliverySlotInUseMessage(
      await this.settingsRepo.countDeliverySlotUsage(
        tenantId,
        id,
        await this.getTenantTodayStr(tenantId),
      ),
    );
    if (inUse) throw new ConflictException(inUse);
    await this.settingsRepo.deleteDeliverySlot(id);
  }

  /** Trimmed non-blank name, unique per tenant (ignoring case), and a
   * window that ends after it starts. Returns the trimmed name. */
  private async assertDeliverySlotValid(
    tenantId: string,
    slot: { name: string; startTime: string; endTime: string },
    excludeId?: string,
  ): Promise<string> {
    const name = slot.name.trim();
    if (!name) throw new BadRequestException('Give the slot a name.');
    const timesError = deliverySlotTimesError(slot.startTime, slot.endTime);
    if (timesError) throw new BadRequestException(timesError);
    const duplicate = await this.settingsRepo.findDeliverySlotByName(
      tenantId,
      name,
      excludeId,
    );
    if (duplicate) {
      throw new ConflictException(`There's already a slot named "${name}".`);
    }
    return name;
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
