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
import { PhoneInput } from "@/components/ui/PhoneInput";
import { AddressLocationPicker, type PickedAddress } from "@/components/maps/AddressLocationPicker";

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
  const [lat, setLat] = useState<number | null>(address?.lat ?? null);
  const [lng, setLng] = useState<number | null>(address?.lng ?? null);
  const [line1, setLine1] = useState(address?.line1 ?? "");
  const [city, setCity] = useState(address?.city ?? "");
  const [state, setState] = useState(address?.state ?? "");
  const [pincode, setPincode] = useState(address?.pincode ?? "");
  const isEditing = Boolean(address);

  function handleLocationPicked(picked: PickedAddress) {
    setLat(picked.lat);
    setLng(picked.lng);
    if (picked.line1) setLine1(picked.line1);
    if (picked.city) setCity(picked.city);
    if (picked.state) setState(picked.state);
    if (picked.pincode) setPincode(picked.pincode);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lat == null || lng == null) {
      showToast(t("pickOnMapRequired"), "error");
      return;
    }
    const form = new FormData(event.currentTarget);
    const input: AddressInput = {
      label: label.trim() || undefined,
      contactPhone: String(form.get("contactPhone") ?? "").trim(),
      line1: line1.trim(),
      line2: String(form.get("line2") ?? "").trim() || undefined,
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      landmark: String(form.get("landmark") ?? "").trim() || undefined,
      lat: lat ?? undefined,
      lng: lng ?? undefined,
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
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("pickOnMap")} <span className="text-red-500">*</span>
        </label>
        <AddressLocationPicker lat={lat} lng={lng} onPicked={handleLocationPicked} />
        {lat == null && <p className="text-xs text-zinc-400">{t("pickOnMapHint")}</p>}
      </div>

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

      <div className="flex flex-col gap-1">
        <label htmlFor="contactPhone" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("contactPhone")}
        </label>
        <PhoneInput
          id="contactPhone"
          name="contactPhone"
          required
          defaultValue={address?.contactPhone}
        />
      </div>
      <Field
        id="pincode"
        label={t("pincode")}
        required
        inputMode="numeric"
        value={pincode}
        onChange={setPincode}
      />
      <Field id="line1" label={t("line1")} required value={line1} onChange={setLine1} />
      <Field id="line2" name="line2" label={t("line2")} defaultValue={address?.line2 ?? undefined} />
      <div className="grid grid-cols-2 gap-4">
        <Field id="city" label={t("city")} required value={city} onChange={setCity} />
        <Field id="state" label={t("state")} required value={state} onChange={setState} />
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

/** Controlled (`value`+`onChange`, used by the fields the map picker fills
 * in) or uncontrolled (`name`+`defaultValue`, read from FormData on submit
 * — used by the fields the picker never touches). */
function Field({
  id,
  name,
  label,
  required,
  placeholder,
  inputMode,
  defaultValue,
  value,
  onChange,
}: {
  id: string;
  name?: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  inputMode?: "numeric" | "text";
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
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
        {...(onChange
          ? { value: value ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value) }
          : { defaultValue })}
        className="input"
      />
    </div>
  );
}
