"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ApiError, createAddress, type Address, type AddressInput } from "@/lib/api/addresses";
import { useToast } from "@/context/ToastContext";

export function AddressForm({
  onSaved,
  onCancel,
}: {
  onSaved: (address: Address) => void;
  onCancel?: () => void;
}) {
  const t = useTranslations("address");
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input: AddressInput = {
      label: String(form.get("label") ?? "").trim() || undefined,
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
      const address = await createAddress(input);
      showToast(t("saved"), "success");
      onSaved(address);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Something went wrong.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Field id="label" name="label" label={t("label")} placeholder={t("labelHint")} />
        <Field id="pincode" name="pincode" label={t("pincode")} required inputMode="numeric" />
      </div>
      <Field id="line1" name="line1" label={t("line1")} required />
      <Field id="line2" name="line2" label={t("line2")} />
      <div className="grid grid-cols-2 gap-4">
        <Field id="city" name="city" label={t("city")} required />
        <Field id="state" name="state" label={t("state")} required />
      </div>
      <Field id="landmark" name="landmark" label={t("landmark")} />

      <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input type="checkbox" name="isDefault" className="h-4 w-4 accent-primary-600" />
        {t("setDefault")}
      </label>

      <div className="flex gap-3">
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? t("saving") : t("save")}
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
}: {
  id: string;
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  inputMode?: "numeric" | "text";
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
        className="input"
      />
    </div>
  );
}
