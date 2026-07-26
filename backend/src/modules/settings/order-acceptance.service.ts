import { BadRequestException, Injectable } from '@nestjs/common';
import { SettingsRepository } from './settings.repository';
import { RedisService } from '../../shared-modules/cache/redis.service';

export interface OrderWindowStatus {
  isAcceptingOrders: boolean;
  reason?: string;
}

const STATUS_CACHE_TTL_SECONDS = 60;
const WEEKDAY_MAP: Record<string, string> = {
  Mon: 'mon',
  Tue: 'tue',
  Wed: 'wed',
  Thu: 'thu',
  Fri: 'fri',
  Sat: 'sat',
  Sun: 'sun',
};

interface DayHours {
  open?: string;
  close?: string;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

/**
 * Single source of truth for "is this tenant currently accepting orders" —
 * backs both the public order-window status endpoint (so the storefront can
 * disable checkout) and the actual order-creation guard. Never trust a
 * client-disabled checkout button alone.
 */
@Injectable()
export class OrderAcceptanceService {
  constructor(
    private readonly settingsRepo: SettingsRepository,
    private readonly redis: RedisService,
  ) {}

  async getStatus(tenantId: string): Promise<OrderWindowStatus> {
    const cacheKey = `order-window:${tenantId}`;
    const cached = await this.redis.get<OrderWindowStatus>(cacheKey);
    if (cached) return cached;

    const status = await this.computeStatus(tenantId);
    await this.redis.set(cacheKey, status, STATUS_CACHE_TTL_SECONDS);
    return status;
  }

  async assertAcceptingOrders(tenantId: string): Promise<void> {
    const status = await this.getStatus(tenantId);
    if (!status.isAcceptingOrders) {
      throw new BadRequestException(
        status.reason ?? 'Not currently accepting orders',
      );
    }
  }

  /** Called after an admin edits operating hours/timezone — the cached status would otherwise be stale for up to 60s. */
  async invalidateCache(tenantId: string): Promise<void> {
    await this.redis.del(`order-window:${tenantId}`);
  }

  private async computeStatus(tenantId: string): Promise<OrderWindowStatus> {
    const [settings, profile] = await Promise.all([
      this.settingsRepo.findOrderAcceptanceSettings(tenantId),
      this.settingsRepo.findBusinessProfile(tenantId),
    ]);

    // No settings configured yet — don't block a tenant mid-onboarding.
    if (!settings) return { isAcceptingOrders: true };
    if (settings.isTemporarilyClosed) {
      return {
        isAcceptingOrders: false,
        reason: settings.closureReason ?? 'Temporarily closed',
      };
    }

    const timezone = profile?.timezone ?? 'Asia/Kolkata';
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());

    const dateParts: Record<string, string> = {};
    for (const part of parts) dateParts[part.type] = part.value;

    const todayDate = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
    const closedDates = Array.isArray(settings.closedDates)
      ? (settings.closedDates as unknown[]).filter(
          (d): d is string => typeof d === 'string',
        )
      : [];
    if (closedDates.includes(todayDate)) {
      return { isAcceptingOrders: false, reason: 'Closed today' };
    }

    const weekdayKey = WEEKDAY_MAP[dateParts.weekday] ?? 'mon';
    const operatingHours = (settings.operatingHours ?? {}) as Record<
      string,
      DayHours | undefined
    >;
    const todayHours = operatingHours[weekdayKey];

    if (!todayHours?.open || !todayHours?.close) {
      return { isAcceptingOrders: false, reason: 'Closed today' };
    }

    const currentMinutes =
      parseInt(dateParts.hour, 10) * 60 + parseInt(dateParts.minute, 10);
    const openMinutes = toMinutes(todayHours.open);
    const closeMinutes = settings.dailyCutoffTime
      ? Math.min(
          toMinutes(settings.dailyCutoffTime),
          toMinutes(todayHours.close),
        )
      : toMinutes(todayHours.close);

    if (currentMinutes < openMinutes || currentMinutes >= closeMinutes) {
      return { isAcceptingOrders: false, reason: 'Outside operating hours' };
    }

    return { isAcceptingOrders: true };
  }
}
