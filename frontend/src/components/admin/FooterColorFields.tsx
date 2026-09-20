"use client";

type Key = "footerBgColor" | "footerTextColor";

// Match today's footer (zinc-900 bg, zinc-300 text) so an unset field's
// picker shows what's actually rendered rather than black.
const FIELDS: { key: Key; label: string; defaultColor: string }[] = [
  { key: "footerBgColor", label: "Footer background", defaultColor: "#18181b" },
  { key: "footerTextColor", label: "Footer text", defaultColor: "#d4d4d8" },
];

export function FooterColorFields({
  values,
  onChange,
}: {
  values: Partial<Record<Key, string | null>>;
  onChange: (key: Key, value: string | null) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 border-t border-zinc-100 pt-4 sm:grid-cols-3 dark:border-zinc-800">
      {FIELDS.map(({ key, label, defaultColor }) => {
        const value = values[key] ?? null;
        return (
          <div key={key}>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {label}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={value ?? defaultColor}
                onChange={(e) => onChange(key, e.target.value)}
                className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-zinc-200 dark:border-zinc-700"
              />
              <input
                type="text"
                value={value ?? ""}
                onChange={(e) => onChange(key, e.target.value === "" ? null : e.target.value)}
                placeholder="Default"
                maxLength={7}
                className="input w-full"
              />
              {value && (
                <button
                  type="button"
                  onClick={() => onChange(key, null)}
                  className="btn-ghost btn-sm shrink-0 cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        );
      })}
      <p className="text-xs text-zinc-400 sm:col-span-3">
        Leave blank to keep the default dark footer.
      </p>
    </div>
  );
}
