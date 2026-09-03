"use client";

import { useState } from "react";

const COUNTRY_CODE = "+91";

/**
 * Strips a leading "+91" and non-digits, keeping at most the 10 local
 * digits. The "+91" check is on the raw string, not a digit-count
 * heuristic — a length-based check (e.g. "only strip once there are >10
 * digits total") breaks for a partial, still-being-typed value: after
 * typing just "9", the controlled round-trip feeds this "+919" (country
 * code + the one digit so far), which only has 3 digits total, so a
 * length>10 gate never strips the "91" and it leaks into the local number,
 * showing "919" instead of "9". Checking the string itself for the "+91"
 * marker has no such gap. A bare local number with no "+" (e.g. an
 * uncontrolled `defaultValue` of "9123456789", which legitimately starts
 * with "91") is left untouched either way, since it never has the "+".
 */
function toLocalDigits(value?: string | null): string {
  if (!value) return "";
  const trimmed = value.trim();
  const digitsOnly = (
    trimmed.startsWith(COUNTRY_CODE) ? trimmed.slice(COUNTRY_CODE.length) : trimmed
  ).replace(/\D/g, "");
  return digitsOnly.slice(0, 10);
}

export interface PhoneInputProps {
  id?: string;
  name?: string;
  required?: boolean;
  className?: string;
  autoComplete?: string;
  placeholder?: string;
  /** Controlled mode — pass both `value` and `onChange`. `value`/`onChange` carry the full "+91XXXXXXXXXX" string. */
  value?: string;
  onChange?: (e164: string) => void;
  /** Uncontrolled mode (FormData-submitted forms) — pass `defaultValue`; a hidden input carries the
   * full "+91XXXXXXXXXX" value under `name` so `new FormData(form)` reads the real E.164 number. */
  defaultValue?: string;
}

/** India-only phone entry: a fixed "+91" prefix (no country picker — this
 * platform only serves Indian numbers) plus a 10-digit local input, matching
 * how Indian consumer apps take a mobile number. Used everywhere a phone
 * number is entered across the app for a consistent format/validation. */
export function PhoneInput({
  id,
  name,
  required,
  className = "",
  autoComplete,
  placeholder = "98765 43210",
  value,
  onChange,
  defaultValue,
}: PhoneInputProps) {
  const isControlled = value !== undefined;
  // Uncontrolled-mode digits live in local state; controlled mode derives
  // straight from `value` every render instead of syncing via an effect.
  const [uncontrolledLocal, setUncontrolledLocal] = useState(() => toLocalDigits(defaultValue));
  const local = isControlled ? toLocalDigits(value) : uncontrolledLocal;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
    if (!isControlled) setUncontrolledLocal(digits);
    onChange?.(digits ? `${COUNTRY_CODE}${digits}` : "");
  }

  return (
    <div className={`flex ${className}`}>
      {!isControlled && (
        <input type="hidden" name={name} value={local ? `${COUNTRY_CODE}${local}` : ""} />
      )}
      <span className="input flex w-14 shrink-0 items-center justify-center rounded-r-none border-r-0 px-0 text-sm text-zinc-500 dark:text-zinc-400">
        {COUNTRY_CODE}
      </span>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        pattern="[6-9]\d{9}"
        maxLength={10}
        value={local}
        onChange={handleChange}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="input w-full rounded-l-none"
      />
    </div>
  );
}
