"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  Users,
} from "lucide-react";
import {
  ApiError,
  createPlan,
  deletePlan,
  getPlanAdmin,
  getSubscriptionSettings,
  getTodaysDeliveries,
  listPlansAdmin,
  listSubscriptionsAdmin,
  publishPlan,
  replacePlanDays,
  updatePlan,
  updateSubscriptionSettings,
  type AdminSubscription,
  type MealSlotType,
  type Plan,
  type PlanAccentColor,
  type PlanDayInput,
  type PlanInput,
  type SubscriptionSettings,
  type TodaysDeliveries,
} from "@/lib/api/admin-subscriptions";
import { listMeals, type Meal } from "@/lib/api/admin-menu";
import type { PaginationMeta } from "@/lib/api/response";
import { usePermission } from "@/context/PermissionsContext";
import { useFeature } from "@/context/FeaturesContext";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Toggle } from "@/components/ui/Toggle";
import { Skeleton } from "@/components/ui/Skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { ViewOnlyNotice } from "@/components/admin/ViewOnlyNotice";
import { PrepPlannerView } from "@/components/admin/PrepPlannerView";
import { MealCombobox } from "@/components/admin/MealCombobox";
import { PlansPageSettingsCard } from "@/components/subscriptions-admin/PlansPageSettingsCard";
import { PlanFeaturesManager } from "@/components/admin/PlanFeaturesManager";
import { PlanFaqManager } from "@/components/admin/PlanFaqManager";
import { formatPriceFromPaise } from "@/lib/format/currency";
import { formatTime12h } from "@/lib/format/time";

type Tab = "plans" | "subscribers" | "today" | "settings";
const TABS: { key: Tab; label: string; icon: typeof CalendarClock }[] = [
  { key: "plans", label: "Plans", icon: CalendarClock },
  { key: "subscribers", label: "Subscribers", icon: Users },
  { key: "today", label: "Today's Deliveries", icon: ClipboardList },
  { key: "settings", label: "Settings", icon: Settings },
];

const SLOT_TYPES: MealSlotType[] = ["BREAKFAST", "LUNCH", "DINNER"];
const SLOT_LABELS: Record<MealSlotType, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
};

const paiseToRupees = (paise: number) => String(paise / 100);
const rupeesToPaise = (rupees: string): number => Math.round(Number(rupees) * 100);

export default function AdminSubscriptionsPage() {
  const canEdit = usePermission(PERMISSIONS.SUBSCRIPTIONS_MANAGE);
  const hasCustomization = useFeature("home-plans-customization");
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>("plans");
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [planSearch, setPlanSearch] = useState("");
  const [meals, setMeals] = useState<Meal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  useEffect(() => {
    listMeals({ limit: 100 })
      .then(({ data }) => setMeals(data))
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : "Couldn't load meals."),
      );
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      listPlansAdmin({ page, search: planSearch || undefined })
        .then(({ data, meta }) => {
          setPlans(data);
          setMeta(meta ?? null);
        })
        .catch((err: unknown) =>
          setError(err instanceof ApiError ? err.message : "Couldn't load plans."),
        );
    }, 250);
    return () => clearTimeout(handle);
  }, [page, planSearch]);

  function refetch() {
    listPlansAdmin({ page, search: planSearch || undefined })
      .then(({ data, meta }) => {
        setPlans(data);
        setMeta(meta ?? null);
      })
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : "Couldn't load plans."),
      );
  }

  function handleDelete(plan: Plan) {
    confirm({
      message: `Delete "${plan.name}"? This cannot be undone.`,
      confirmLabel: "Delete",
      processingLabel: "Deleting…",
      variant: "danger",
      onConfirm: async () => {
        try {
          await deletePlan(plan.id);
          refetch();
          showToast("Plan deleted", "success");
        } catch (err) {
          showToast(err instanceof ApiError ? err.message : "Couldn't delete plan.", "error");
        }
      },
    });
  }

  async function handleTogglePublish(plan: Plan) {
    try {
      await publishPlan(plan.id, !plan.isPublished);
      refetch();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update plan.", "error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-primary-600">
          <CalendarClock className="h-5 w-5" />
          <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Subscription Plans
          </h2>
        </div>
        {tab === "plans" && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={planSearch}
                onChange={(e) => {
                  setPlanSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search plans…"
                className="input w-48 pl-8"
              />
            </div>
            {canEdit && !creating && editingPlanId === null && (
              <button type="button" onClick={() => setCreating(true)} className="btn-primary btn-sm">
                <Plus className="h-4 w-4" />
                New Plan
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {!canEdit && <ViewOnlyNotice />}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      {tab === "subscribers" && <SubscribersTab />}
      {tab === "today" && <TodaysDeliveriesTab />}
      {tab === "settings" && (
        <div className="flex flex-col gap-6">
          <SettingsTab canEdit={canEdit} />
          {hasCustomization && (
            <>
              <PlansPageSettingsCard canEdit={canEdit} />
              <PlanFeaturesManager canEdit={canEdit} />
              <PlanFaqManager canEdit={canEdit} />
            </>
          )}
        </div>
      )}

      {tab === "plans" && creating && (
        <PlanMetaForm
          initial={{
            name: "",
            durationDays: 7,
            priceInPaise: 0,
            features: [],
            isPopular: false,
            accentColor: "PRIMARY",
          }}
          onCancel={() => setCreating(false)}
          onSave={async (input) => {
            const created = await createPlan(input);
            setCreating(false);
            refetch();
            setEditingPlanId(created.id);
          }}
        />
      )}

      {tab === "plans" && (!plans || !meals ? (
        <div className="card p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-4 h-32 w-full" />
        </div>
      ) : plans.length === 0 && !creating ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {planSearch ? "No plans match your search." : "No curated plans yet."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {plans.map((plan) =>
            editingPlanId === plan.id ? (
              <PlanEditor
                key={plan.id}
                planId={plan.id}
                meals={meals}
                canEdit={canEdit}
                onClose={() => {
                  setEditingPlanId(null);
                  refetch();
                }}
              />
            ) : (
              <div key={plan.id} className="card flex items-center justify-between gap-3 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/subscriptions/plans/${plan.id}`}
                      className="font-medium text-zinc-900 hover:text-primary-600 hover:underline dark:text-zinc-100"
                    >
                      {plan.name}
                    </Link>
                    <span
                      className={`badge ${
                        plan.isPublished
                          ? "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {plan.isPublished ? "Published" : "Draft"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {plan.durationDays} days · {formatPriceFromPaise(plan.priceInPaise)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Toggle
                    checked={plan.isPublished}
                    onChange={() => handleTogglePublish(plan)}
                    disabled={!canEdit}
                  />
                  <button
                    type="button"
                    onClick={() => setEditingPlanId(plan.id)}
                    disabled={!canEdit}
                    className="text-zinc-400 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`Edit ${plan.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(plan)}
                    disabled={!canEdit}
                    className="text-zinc-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`Delete ${plan.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      ))}

      {tab === "plans" && meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
          <span>
            Page {meta.page} of {meta.totalPages} · {meta.total} plans
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => p - 1)}
              disabled={!meta.hasPrev}
              className="btn-outline btn-sm"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!meta.hasNext}
              className="btn-outline btn-sm"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanMetaForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: PlanInput;
  onCancel: () => void;
  onSave: (input: PlanInput) => Promise<void>;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't save plan.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card flex flex-col gap-3 border-primary-200 bg-primary-50/50 p-4 dark:border-primary-900 dark:bg-primary-950/30"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="7-Day Weight Loss Plan"
            className="input"
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Description (optional)
          </label>
          <input
            value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Duration (days)</label>
          <input
            type="number"
            min={1}
            value={form.durationDays}
            onChange={(e) => setForm({ ...form, durationDays: Number(e.target.value) })}
            className="input"
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Full price (₹)</label>
          <input
            type="number"
            min={1}
            value={paiseToRupees(form.priceInPaise)}
            onChange={(e) => setForm({ ...form, priceInPaise: rupeesToPaise(e.target.value) })}
            className="input"
            required
          />
        </div>
      </div>

      <div className="border-t border-primary-200 pt-3 dark:border-primary-900">
        <p className="mb-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          Storefront card
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Badge text (optional)
            </label>
            <input
              value={form.badgeText ?? ""}
              onChange={(e) => setForm({ ...form, badgeText: e.target.value })}
              placeholder="Most Popular"
              className="input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Accent color
            </label>
            <Select
              value={form.accentColor ?? "PRIMARY"}
              onValueChange={(v) => setForm({ ...form, accentColor: v as PlanAccentColor })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRIMARY">Primary</SelectItem>
                <SelectItem value="SECONDARY">Secondary</SelectItem>
                <SelectItem value="ACCENT">Accent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={form.isPopular ?? false}
              onChange={(e) => setForm({ ...form, isPopular: e.target.checked })}
              className="h-4 w-4 accent-primary-600"
            />
            Highlight as popular
          </label>
        </div>

        <div className="mt-3 flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Feature bullets (shown on the plan card)
          </label>
          <FeatureListEditor
            features={form.features ?? []}
            onChange={(features) => setForm({ ...form, features })}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary btn-sm">
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost btn-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}

function FeatureListEditor({
  features,
  onChange,
}: {
  features: string[];
  onChange: (features: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function addFeature() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...features, trimmed]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-2">
      {features.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {features.map((feature, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-700"
            >
              <span className="min-w-0 flex-1 wrap-break-word text-zinc-700 dark:text-zinc-300">{feature}</span>
              <button
                type="button"
                onClick={() => onChange(features.filter((_, idx) => idx !== i))}
                className="shrink-0 text-xs font-medium text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addFeature();
            }
          }}
          placeholder="Free delivery"
          className="input"
        />
        <button type="button" onClick={addFeature} className="btn-outline btn-sm shrink-0">
          Add
        </button>
      </div>
    </div>
  );
}

type SlotState = { included: boolean; mealId: string };
type DayState = Record<MealSlotType, SlotState>;

function emptyDayState(): DayState {
  return {
    BREAKFAST: { included: false, mealId: "" },
    LUNCH: { included: false, mealId: "" },
    DINNER: { included: false, mealId: "" },
  };
}

function PlanEditor({
  planId,
  meals,
  canEdit,
  onClose,
}: {
  planId: string;
  meals: Meal[];
  canEdit: boolean;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [days, setDays] = useState<DayState[] | null>(null);
  const [savingDays, setSavingDays] = useState(false);

  useEffect(() => {
    getPlanAdmin(planId)
      .then((p) => {
        setPlan(p);
        const initial: DayState[] = Array.from({ length: p.durationDays }, () => emptyDayState());
        for (const day of p.days ?? []) {
          if (day.dayNumber < 1 || day.dayNumber > p.durationDays) continue;
          const dayState = initial[day.dayNumber - 1];
          for (const slot of day.slots) {
            dayState[slot.slotType] = { included: true, mealId: slot.mealId ?? "" };
          }
        }
        setDays(initial);
      })
      .catch(() => showToast("Couldn't load plan.", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  async function handleSaveMeta(input: PlanInput) {
    const updated = await updatePlan(planId, input);
    setPlan(updated);
    showToast("Plan details saved", "success");
  }

  async function handleSaveDays() {
    if (!plan || !days) return;
    setSavingDays(true);
    try {
      const payload: PlanDayInput[] = days.map((day, i) => ({
        dayNumber: i + 1,
        slots: SLOT_TYPES.filter((slotType) => day[slotType].included).map((slotType) => ({
          slotType,
          mealId: day[slotType].mealId || undefined,
        })),
      }));
      await replacePlanDays(planId, payload);
      showToast("Meal plan saved", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't save meal plan.", "error");
    } finally {
      setSavingDays(false);
    }
  }

  function updateSlot(dayIndex: number, slotType: MealSlotType, patch: Partial<SlotState>) {
    setDays((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[dayIndex] = { ...next[dayIndex], [slotType]: { ...next[dayIndex][slotType], ...patch } };
      return next;
    });
  }

  if (!plan || !days) {
    return (
      <div className="card p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Editing: {plan.name}
        </h3>
        <button type="button" onClick={onClose} className="btn-ghost btn-sm">
          Close
        </button>
      </div>

      <PlanMetaForm
        initial={{
          name: plan.name,
          description: plan.description ?? undefined,
          durationDays: plan.durationDays,
          priceInPaise: plan.priceInPaise,
          features: plan.features,
          badgeText: plan.badgeText ?? undefined,
          isPopular: plan.isPopular,
          accentColor: plan.accentColor,
        }}
        onCancel={onClose}
        onSave={handleSaveMeta}
      />

      <div className="flex flex-col gap-3">
        <div>
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Meal plan</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Tick a meal slot to give it a day; leave the meal as &ldquo;Meal to be announced&rdquo; if it&apos;s
            not decided yet — customers will see that instead of a blank slot.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {days.map((day, i) => (
            <div
              key={i}
              className="grid grid-cols-1 gap-2 rounded-lg border border-zinc-100 p-3 sm:grid-cols-[3rem_repeat(3,1fr)] sm:items-center dark:border-zinc-800"
            >
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Day {i + 1}</span>
              {SLOT_TYPES.map((slotType) => (
                <div key={slotType} className="flex min-w-0 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={day[slotType].included}
                    onChange={(e) => updateSlot(i, slotType, { included: e.target.checked })}
                    disabled={!canEdit}
                    className="h-3.5 w-3.5 accent-primary-600"
                  />
                  <MealCombobox
                    value={day[slotType].mealId}
                    onChange={(mealId) => updateSlot(i, slotType, { mealId })}
                    knownMeals={meals}
                    noneLabel={`${SLOT_LABELS[slotType]} — to be announced`}
                    disabled={!canEdit || !day[slotType].included}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={handleSaveDays}
            disabled={savingDays}
            className="btn-primary btn-sm self-start"
          >
            {savingDays ? "Saving…" : "Save meal plan"}
          </button>
        )}
      </div>
    </div>
  );
}

const SUBSCRIPTION_STATUS_STYLES: Record<AdminSubscription["status"], string> = {
  PENDING_PAYMENT: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  ACTIVE: "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400",
  EXPIRED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
  CANCELLED: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
};

function SubscribersTab() {
  const [subs, setSubs] = useState<AdminSubscription[] | null>(null);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [planId, setPlanId] = useState("");
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    listPlansAdmin({ limit: 100 })
      .then(({ data }) => setPlans(data))
      .catch(() => setPlans([]));
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      listSubscriptionsAdmin({ page, search: search || undefined, planId: planId || undefined })
        .then(({ data, meta }) => {
          setSubs(data);
          setMeta(meta ?? null);
        })
        .catch(() => setSubs([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [page, search, planId]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search subscribers…"
            className="input w-full pl-8"
          />
        </div>
        <Select
          value={planId}
          onValueChange={(v) => {
            setPlanId(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All plans</SelectItem>
            {plans.map((plan) => (
              <SelectItem key={plan.id} value={plan.id}>
                {plan.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!subs ? (
        <div className="card p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-4 h-32 w-full" />
        </div>
      ) : subs.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {search || planId ? "No subscribers match." : "No customer subscriptions yet."}
        </p>
      ) : (
        <>
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs font-semibold text-zinc-500 uppercase dark:border-zinc-800 dark:text-zinc-400">
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Coupon / Bonus</th>
                  <th className="px-4 py-3">Cycle</th>
                  <th className="px-4 py-3">Price</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((sub) => (
                  <tr key={sub.id} className="border-b border-zinc-50 last:border-none dark:border-zinc-900">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/subscriptions/${sub.id}`}
                        className="text-zinc-900 hover:text-primary-600 hover:underline dark:text-zinc-100"
                      >
                        {sub.user.firstName} {sub.user.lastName ?? ""}
                      </Link>
                      <div className="text-xs text-zinc-400">{sub.user.email}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{sub.planNameSnapshot}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${SUBSCRIPTION_STATUS_STYLES[sub.status]}`}>
                        {sub.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                      {sub.couponCode ? <span className="font-mono">{sub.couponCode}</span> : "—"}
                      {sub.bonusDaysGranted > 0 && (
                        <span className="ml-1.5 badge bg-secondary-50 text-secondary-700 dark:bg-secondary-950 dark:text-secondary-400">
                          +{sub.bonusDaysGranted}d
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                      {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : "—"}
                      {" – "}
                      {sub.cycleEnd ? new Date(sub.cycleEnd).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                      {formatPriceFromPaise(sub.priceInPaiseSnapshot)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
              <span>
                Page {meta.page} of {meta.totalPages} · {meta.total} subscribers
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={!meta.hasPrev}
                  className="btn-outline btn-sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!meta.hasNext}
                  className="btn-outline btn-sm"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TodaysDeliveriesTab() {
  const [data, setData] = useState<TodaysDeliveries | null>(null);
  const [view, setView] = useState<"prep" | "dispatch" | "planner">("prep");

  useEffect(() => {
    getTodaysDeliveries()
      .then(setData)
      .catch(() => setData({ date: "", prepSheet: [], dispatch: [] }));
  }, []);

  if (!data) {
    return (
      <div className="card p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-32 w-full" />
      </div>
    );
  }

  const isEmpty = data.prepSheet.length === 0 && data.dispatch.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {data.date && new Date(data.date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
          <button
            type="button"
            onClick={() => setView("prep")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              view === "prep"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            Kitchen Prep Sheet
          </button>
          <button
            type="button"
            onClick={() => setView("dispatch")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              view === "dispatch"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            Dispatch List
          </button>
          <button
            type="button"
            onClick={() => setView("planner")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              view === "planner"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            Prep Planner
          </button>
        </div>
      </div>

      {view === "planner" ? (
        <PrepPlannerView />
      ) : isEmpty ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No subscription deliveries scheduled for today.
        </p>
      ) : view === "prep" ? (
        <div className="card flex flex-col gap-2 p-6">
          {data.prepSheet.map((item) => (
            <div
              key={item.mealName}
              className="flex items-center justify-between border-b border-zinc-50 py-2 last:border-none dark:border-zinc-900"
            >
              <span className="text-sm text-zinc-700 dark:text-zinc-300">{item.mealName}</span>
              <span className="font-display text-lg font-bold text-primary-600">×{item.quantity}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {data.dispatch.map((d) => (
            <div key={d.orderId} className="card flex flex-col gap-1 p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{d.customerName}</span>
                <span className="badge bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400">
                  {d.deliverySlotName} ({formatTime12h(d.deliveryWindowStart)}–{formatTime12h(d.deliveryWindowEnd)})
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{d.planName} · {d.address}</p>
              <p className="text-xs text-zinc-400">{d.meals.join(", ")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsTab({ canEdit }: { canEdit: boolean }) {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<SubscriptionSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSubscriptionSettings().then(setSettings).catch(() => setSettings(null));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await updateSubscriptionSettings(settings);
      setSettings(updated);
      showToast("Settings saved", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't save settings.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <div className="card p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-24 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="card flex max-w-lg flex-col gap-4 p-6">
      <label className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Accepting new subscriptions
        </span>
        <Toggle
          checked={settings.isAcceptingNewSubscriptions}
          onChange={(checked) => setSettings({ ...settings, isAcceptingNewSubscriptions: checked })}
          disabled={!canEdit}
        />
      </label>
      <label className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Show plans on home page
          <span className="block text-xs font-normal text-zinc-400">
            Only appears if at least one plan is also published.
          </span>
        </span>
        <Toggle
          checked={settings.showOnHomepage}
          onChange={(checked) => setSettings({ ...settings, showOnHomepage: checked })}
          disabled={!canEdit}
        />
      </label>
      {!settings.isAcceptingNewSubscriptions && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Message shown to customers (optional)
          </label>
          <input
            value={settings.closureReason ?? ""}
            onChange={(e) => setSettings({ ...settings, closureReason: e.target.value })}
            placeholder="Kitchen at capacity — back Monday"
            disabled={!canEdit}
            className="input"
          />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Minimum notice for changes (hours)
        </label>
        <input
          type="number"
          min={0}
          max={240}
          value={settings.noticeHoursBeforeDelivery}
          onChange={(e) =>
            setSettings({ ...settings, noticeHoursBeforeDelivery: Number(e.target.value) })
          }
          disabled={!canEdit}
          className="input w-32"
        />
        <p className="text-xs text-zinc-400">
          How far ahead a customer must skip/pause/change delivery for a day, and how far out a new
          signup&apos;s first delivery is scheduled.
        </p>
      </div>
      {canEdit && (
        <button type="submit" disabled={saving} className="btn-primary btn-sm self-start">
          {saving ? "Saving…" : "Save settings"}
        </button>
      )}
    </form>
  );
}
