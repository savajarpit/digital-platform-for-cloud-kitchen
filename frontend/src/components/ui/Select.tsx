"use client";

import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

// Radix reserves an empty string as "no value selected" and refuses to
// render/select an <Item value="">, but several dropdowns in this app use
// value="" for a real "All ___" filter option. Translating it to/from this
// sentinel here keeps every call site free to keep using "" like a native
// <select> always could.
const EMPTY_VALUE = "__select_empty__";

export function Select({
  value,
  onValueChange,
  disabled,
  children,
}: {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <RadixSelect.Root
      value={value === "" ? EMPTY_VALUE : value}
      onValueChange={(v) => onValueChange(v === EMPTY_VALUE ? "" : v)}
      disabled={disabled}
    >
      {children}
    </RadixSelect.Root>
  );
}

export function SelectTrigger({
  className = "",
  variant = "default",
  id,
  children,
}: {
  className?: string;
  /** "unstyled" skips the base `.input` look entirely — for triggers styled
   * as something else already (e.g. a colored `badge`), so the two sets of
   * utility classes never fight over the same properties. */
  variant?: "default" | "unstyled";
  /** So a `<label htmlFor="...">` can still target the trigger, same as it
   * would a native `<select id="...">`. */
  id?: string;
  children: React.ReactNode;
}) {
  const base = variant === "unstyled" ? "" : "input";
  return (
    <RadixSelect.Trigger
      id={id}
      className={`${base} flex cursor-pointer items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <span className="truncate">{children}</span>
      <RadixSelect.Icon>
        <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />
      </RadixSelect.Icon>
    </RadixSelect.Trigger>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  return <RadixSelect.Value placeholder={placeholder} />;
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  return (
    <RadixSelect.Portal>
      <RadixSelect.Content
        position="popper"
        sideOffset={6}
        className="z-50 max-h-72 min-w-(--radix-select-trigger-width) overflow-hidden rounded-xl border border-zinc-100 bg-white shadow-soft dark:border-zinc-800 dark:bg-zinc-900"
      >
        <RadixSelect.Viewport className="p-1">{children}</RadixSelect.Viewport>
      </RadixSelect.Content>
    </RadixSelect.Portal>
  );
}

export function SelectItem({
  value,
  children,
  disabled,
}: {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <RadixSelect.Item
      value={value === "" ? EMPTY_VALUE : value}
      disabled={disabled}
      className="relative flex cursor-pointer items-center rounded-lg py-2 pr-8 pl-3 text-sm text-zinc-700 outline-none select-none data-disabled:cursor-not-allowed data-disabled:opacity-50 data-highlighted:bg-primary-50 data-highlighted:text-primary-700 dark:text-zinc-300 dark:data-highlighted:bg-primary-950 dark:data-highlighted:text-primary-400"
    >
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
      <RadixSelect.ItemIndicator className="absolute right-2 flex items-center">
        <Check className="h-3.5 w-3.5" />
      </RadixSelect.ItemIndicator>
    </RadixSelect.Item>
  );
}
