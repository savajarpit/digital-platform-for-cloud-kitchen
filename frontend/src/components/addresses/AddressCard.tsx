import { useTranslations } from "next-intl";
import { MapPin, Pencil, Star, Trash2 } from "lucide-react";
import type { Address } from "@/lib/api/addresses";

/** One saved address on the Addresses page. Layout is mirrored by
 * AddressCardSkeleton — change them together. */
export function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  address: Address;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  const t = useTranslations("address");

  return (
    <div className="card flex flex-col gap-2 p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-primary-600" />
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            {address.label || t("line1")}
          </span>
          {address.isDefault && (
            <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-400">
              {t("default")}
            </span>
          )}
          {!address.serviceable && (
            <span className="badge bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400">
              {t("notDeliverable")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="cursor-pointer rounded p-1 text-zinc-400 hover:text-primary-600"
            aria-label={t("edit")}
            title={t("edit")}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="cursor-pointer rounded p-1 text-zinc-400 hover:text-red-600"
            aria-label={t("deleteConfirm")}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {address.line1}
        {address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.state} —{" "}
        {address.pincode}
      </p>
      {!address.isDefault && (
        <button
          type="button"
          onClick={onSetDefault}
          className="mt-1 inline-flex w-fit cursor-pointer items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
        >
          <Star className="h-3 w-3" />
          {t("setDefault")}
        </button>
      )}
    </div>
  );
}
