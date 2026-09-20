"use client";

import { useTranslations } from "next-intl";
import { MapPin, Plus } from "lucide-react";
import type { Address, ServiceabilityResult } from "@/lib/api/addresses";
import { AddressForm } from "@/components/addresses/AddressForm";
import { Skeleton } from "@/components/ui/Skeleton";

/** The "select delivery address" card on the checkout page: saved-address
 * radios (skeleton rows while `addresses` is null), the add-address form and
 * the not-serviceable warning. */
export function CheckoutAddressSection({
  addresses,
  selectedAddressId,
  onSelect,
  showForm,
  onShowForm,
  onHideForm,
  onSaved,
  serviceability,
}: {
  /** null while the list is still loading. */
  addresses: Address[] | null;
  selectedAddressId: string | null;
  onSelect: (id: string) => void;
  showForm: boolean;
  onShowForm: () => void;
  onHideForm: () => void;
  onSaved: (address: Address) => void;
  serviceability: ServiceabilityResult | null;
}) {
  const t = useTranslations("checkout");

  return (
    <section className="card p-6">
      <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-100">{t("selectAddress")}</h2>

      {addresses === null ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700"
            >
              <Skeleton className="mt-1 h-4 w-4 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="mt-1 h-5 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : addresses.length === 0 && !showForm ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("noAddresses")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {addresses.map((address) => (
            <label
              key={address.id}
              className={`flex items-start gap-3 rounded-xl border p-4 transition-colors ${
                !address.serviceable
                  ? "cursor-not-allowed border-zinc-200 opacity-60 dark:border-zinc-700"
                  : selectedAddressId === address.id
                    ? "cursor-pointer border-primary-600 bg-primary-50 dark:bg-primary-950"
                    : "cursor-pointer border-zinc-200 hover:border-zinc-300 dark:border-zinc-700"
              }`}
            >
              <input
                type="radio"
                name="address"
                checked={selectedAddressId === address.id}
                disabled={!address.serviceable}
                onChange={() => onSelect(address.id)}
                className="mt-1 h-4 w-4 accent-primary-600 disabled:cursor-not-allowed"
              />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-primary-600" />
                  <span className="min-w-0 truncate font-medium text-zinc-900 dark:text-zinc-100">
                    {address.label || address.city}
                  </span>
                  {!address.serviceable && (
                    <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
                      {t("addressNotDeliverable")}
                    </span>
                  )}
                </div>
                <p className="mt-1 wrap-break-word text-sm text-zinc-600 dark:text-zinc-400">
                  {address.line1}, {address.city}, {address.state} — {address.pincode}
                </p>
              </div>
            </label>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <AddressForm
            onSaved={onSaved}
            onCancel={addresses && addresses.length > 0 ? onHideForm : undefined}
          />
        </div>
      ) : (
        <button type="button" onClick={onShowForm} className="btn-ghost mt-4 cursor-pointer text-sm">
          <Plus className="h-4 w-4" />
          {t("addAddress")}
        </button>
      )}

      {serviceability?.serviceable === false && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{t("notServiceable")}</p>
      )}
    </section>
  );
}
