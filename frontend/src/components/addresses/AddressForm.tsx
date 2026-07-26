"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ApiError,
  createAddress,
  updateAddress,
  type Address,
  type AddressInput,
} from "@/lib/api/addresses";
import { useToast } from "@/context/ToastContext";

const LABEL_PRESETS = ["Home", "Office"] as const;

export function AddressForm({
  address,
  onSaved,
  onCancel,
}: {
  /** When provided, the form edits this address instead of creating a new one. */
  address?: Address;
  onSaved: (address: Address) => void;
  onCancel?: () => void;
}) {
  const t = useTranslations("address");
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [label, setLabel] = useState(address?.label ?? "");
  const isEditing = Boolean(address);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input: AddressInput = {
      label: label.trim() || undefined,
      contactPhone: String(form.get("contactPhone") ?? "").trim(),
      line1: String(form.get("line1") ?? "").trim(),
      line2: String(form.get("line2") ?? "").trim() || undefined,
      city: String(form.get("city") ?? "").trim(),
      state: String(form.get("state") ?? "").trim(),
      pincode: String(form.get("pincode") ?? "").trim(),
      landmark: String(form.get("landmark") ?? "").trim() || undefined,
      isDefault: form.get("isDefault") === "on",
    };

    setIsSubmitting(true);
    try {
      const saved = address
        ? await updateAddress(address.id, input)
        : await createAddress(input);
      showToast(isEditing ? t("updated") : t("saved"), "success");
      onSaved(saved);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Something went wrong.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="label" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("label")}
        </label>
        <div className="flex flex-wrap gap-2">
          {LABEL_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setLabel(preset)}
              className={`badge cursor-pointer border transition-colors ${
                label === preset
                  ? "border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400"
                  : "border-zinc-200 text-zinc-600 hover:border-primary-300 dark:border-zinc-700 dark:text-zinc-400"
              }`}
            >
              {preset === "Home" ? t("labelHome") : t("labelOffice")}
            </button>
          ))}
        </div>
        <input
          id="label"
          name="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t("labelHint")}
          className="input mt-1"
        />
      </div>

      <Field
        id="contactPhone"
        name="contactPhone"
        label={t("contactPhone")}
        required
        placeholder="+919876543210"
        defaultValue={address?.contactPhone}
      />
      <Field
        id="pincode"
        name="pincode"
        label={t("pincode")}
        required
        inputMode="numeric"
        defaultValue={address?.pincode}
      />
      <Field id="line1" name="line1" label={t("line1")} required defaultValue={address?.line1} />
      <Field id="line2" name="line2" label={t("line2")} defaultValue={address?.line2 ?? undefined} />
      <div className="grid grid-cols-2 gap-4">
        <Field id="city" name="city" label={t("city")} required defaultValue={address?.city} />
        <Field id="state" name="state" label={t("state")} required defaultValue={address?.state} />
      </div>
      <Field
        id="landmark"
        name="landmark"
        label={t("landmark")}
        defaultValue={address?.landmark ?? undefined}
      />

      <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          name="isDefault"
          defaultChecked={address?.isDefault}
          className="h-4 w-4 accent-primary-600"
        />
        {t("setDefault")}
      </label>

      <div className="flex gap-3">
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? t("saving") : isEditing ? t("update") : t("save")}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-ghost">
            {t("cancel")}
          </button>
        )}
      </div>
    </form>
  );
}

function Field({
  id,
  name,
  label,
  required,
  placeholder,
  inputMode,
  defaultValue,
}: {
  id: string;
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  inputMode?: "numeric" | "text";
  defaultValue?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <input
        id={id}
        name={name}
        required={required}
        placeholder={placeholder}
        inputMode={inputMode}
        defaultValue={defaultValue}
        className="input"
      />
    </div>
  );
}
