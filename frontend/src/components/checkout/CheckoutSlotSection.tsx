"use client";

import { useTranslations } from "next-intl";
import { Clock, Zap } from "lucide-react";
import type { DeliverySlot, InstantDeliveryStatus } from "@/lib/api/delivery-slots";
import { formatTime12h } from "@/lib/format/time";
import { Skeleton } from "@/components/ui/Skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";

/** The delivery / pickup time card on the checkout page: instant vs
 * scheduled choice, then day + slot pickers (skeleton while `slots` is null). */
export function CheckoutSlotSection({
  isPickup,
  instantStatus,
  isInstant,
  onInstantChange,
  slots,
  visibleSlots,
  dayOptions,
  selectedDay,
  onDayChange,
  effectiveSlotId,
  onSlotChange,
}: {
  isPickup: boolean;
  instantStatus: InstantDeliveryStatus | null;
  isInstant: boolean;
  onInstantChange: (instant: boolean) => void;
  /** null while the slot config is still loading. */
  slots: DeliverySlot[] | null;
  visibleSlots: DeliverySlot[];
  dayOptions: { value: string; label: string; closedName?: string }[];
  selectedDay: string;
  onDayChange: (day: string) => void;
  effectiveSlotId: string;
  onSlotChange: (slotId: string) => void;
}) {
  const t = useTranslations("checkout");

  return (
    <section className="card p-6">
      <h2 className="mb-3 flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
        <Clock className="h-4 w-4 text-primary-600" />
        {isPickup ? "Pickup time" : t("deliverySlot")}
      </h2>

      {!isPickup && instantStatus?.available && (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label
            className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 transition-colors ${
              isInstant
                ? "border-primary-600 bg-primary-50 dark:bg-primary-950"
                : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700"
            }`}
          >
            <input
              type="radio"
              name="deliveryMode"
              checked={isInstant}
              onChange={() => onInstantChange(true)}
              className="h-4 w-4 accent-primary-600"
            />
            <Zap className="h-4 w-4 text-primary-600" />
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {t("instantDelivery")}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {t("instantDeliveryEta", {
                  min: instantStatus.etaMinMinutes,
                  max: instantStatus.etaMaxMinutes,
                })}
              </p>
            </div>
          </label>
          <label
            className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 transition-colors ${
              !isInstant
                ? "border-primary-600 bg-primary-50 dark:bg-primary-950"
                : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700"
            }`}
          >
            <input
              type="radio"
              name="deliveryMode"
              checked={!isInstant}
              onChange={() => onInstantChange(false)}
              className="h-4 w-4 accent-primary-600"
            />
            <Clock className="h-4 w-4 text-zinc-500" />
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {t("scheduleForLater")}
            </p>
          </label>
        </div>
      )}

      {isInstant ? null : slots === null ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-[42px] w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : slots.length === 0 ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">{t("noSlots")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="deliveryDay" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t("deliveryDay")}
            </label>
            <Select value={selectedDay} onValueChange={onDayChange}>
              <SelectTrigger id="deliveryDay">
                <SelectValue placeholder={t("selectDay")} />
              </SelectTrigger>
              <SelectContent>
                {dayOptions.length === 0 && <SelectItem value="">{t("selectDay")}</SelectItem>}
                {dayOptions.map((day) => (
                  <SelectItem key={day.value} value={day.value} disabled={day.closedName !== undefined}>
                    {day.closedName === undefined
                      ? day.label
                      : day.closedName
                        ? t("dayClosedNamed", { day: day.label, name: day.closedName })
                        : t("dayClosed", { day: day.label })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="deliverySlot" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t("deliverySlot")}
            </label>
            <Select value={effectiveSlotId} onValueChange={onSlotChange}>
              <SelectTrigger id="deliverySlot">
                <SelectValue placeholder={t("selectSlot")} />
              </SelectTrigger>
              <SelectContent>
                {!effectiveSlotId && <SelectItem value="">{t("selectSlot")}</SelectItem>}
                {visibleSlots.map((slot) => (
                  <SelectItem key={slot.id} value={slot.id}>
                    {slot.name} ({formatTime12h(slot.startTime)}–{formatTime12h(slot.endTime)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {visibleSlots.length === 0 && (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{t("noSlotsToday")}</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
