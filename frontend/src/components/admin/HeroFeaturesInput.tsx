"use client";

import { ArrowDown, ArrowUp, Check, Plus, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import {
  HERO_FEATURE_ICONS,
  HERO_FEATURE_ICON_KEYS,
  HERO_FEATURE_LABEL_MAX,
  HERO_FEATURES_MAX,
  type HeroFeature,
  type HeroFeatureIconKey,
} from "@/lib/icons/hero-feature-icons";

function IconOption({ iconKey }: { iconKey: string }) {
  // Direct lookup in the module-level map (not a function returning a
  // component), so the icon is a stable component, not one built per render.
  const entry = iconKey in HERO_FEATURE_ICONS ? HERO_FEATURE_ICONS[iconKey as HeroFeatureIconKey] : null;
  return (
    <span className="flex items-center gap-2">
      {entry ? (
        <entry.Icon className="h-4 w-4 shrink-0 text-primary-600" />
      ) : (
        <Check className="h-4 w-4 shrink-0 text-primary-600" />
      )}
      {entry ? entry.label : iconKey}
    </span>
  );
}

export function HeroFeaturesInput({
  value,
  onChange,
}: {
  value: HeroFeature[];
  onChange: (features: HeroFeature[]) => void;
}) {
  function update(index: number, patch: Partial<HeroFeature>) {
    onChange(value.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Hero highlights (up to {HERO_FEATURES_MAX})
      </label>
      <p className="text-xs text-zinc-400">Shown under the hero buttons. Leave empty to hide.</p>

      {value.map((feature, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-44 shrink-0">
            <Select value={feature.icon} onValueChange={(icon) => update(i, { icon })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HERO_FEATURE_ICON_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    <IconOption iconKey={key} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <input
            value={feature.label}
            onChange={(e) => update(i, { label: e.target.value })}
            maxLength={HERO_FEATURE_LABEL_MAX}
            placeholder="Label (e.g. Free delivery)"
            aria-label={`Highlight ${i + 1} label`}
            className="input min-w-0 flex-1"
          />
          <button
            type="button"
            onClick={() => move(i, -1)}
            disabled={i === 0}
            aria-label="Move up"
            className="btn-ghost cursor-pointer p-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => move(i, 1)}
            disabled={i === value.length - 1}
            aria-label="Move down"
            className="btn-ghost cursor-pointer p-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            aria-label="Remove highlight"
            className="btn-ghost cursor-pointer p-2 text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...value, { icon: "star", label: "" }])}
        disabled={value.length >= HERO_FEATURES_MAX}
        className="btn-outline w-fit cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        Add highlight
      </button>
    </div>
  );
}
