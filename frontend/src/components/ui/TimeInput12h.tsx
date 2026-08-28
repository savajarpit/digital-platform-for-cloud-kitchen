"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

type Period = "AM" | "PM";

function parse24h(value: string): { hour12: string; minute: string; period: Period } | null {
  if (!value) return null;
  const [hStr, mStr] = value.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const period: Period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return { hour12: String(hour12), minute: String(m).padStart(2, "0"), period };
}

function to24h(hour12: string, minute: string, period: Period): string {
  let h = Number(hour12) % 12;
  if (period === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${minute}`;
}

/** A guaranteed-12h-with-AM/PM time picker — a drop-in replacement for a
 * native `<input type="time">`, whose displayed format is controlled by the
 * visitor's OS/browser locale, not this site. Same `value`/`onChange`
 * contract as the native input (`"HH:mm"`, 24h, on the wire) so every call
 * site swaps in with no other logic changes. */
export function TimeInput12h({
  value,
  onChange,
  className = "",
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const parsed = parse24h(value);
  const hour12 = parsed?.hour12 ?? "";
  const minute = parsed?.minute ?? "";
  const period = parsed?.period ?? "AM";

  function update(patch: Partial<{ hour12: string; minute: string; period: Period }>) {
    onChange(
      to24h(patch.hour12 ?? (hour12 || "12"), patch.minute ?? (minute || "00"), patch.period ?? period),
    );
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Select value={hour12} onValueChange={(v) => update({ hour12: v })} disabled={disabled}>
        <SelectTrigger className="w-[4.5rem] px-2">
          <SelectValue placeholder="--" />
        </SelectTrigger>
        <SelectContent>
          {HOURS_12.map((h) => (
            <SelectItem key={h} value={String(h)}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-zinc-400">:</span>
      <Select value={minute} onValueChange={(v) => update({ minute: v })} disabled={disabled}>
        <SelectTrigger className="w-[4.5rem] px-2">
          <SelectValue placeholder="--" />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={period} onValueChange={(v) => update({ period: v as Period })} disabled={disabled}>
        <SelectTrigger className="w-[4.5rem] px-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
