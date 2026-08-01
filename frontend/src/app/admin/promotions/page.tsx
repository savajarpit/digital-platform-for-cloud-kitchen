"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import {
  ApiError,
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  listPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  type Coupon,
  type CouponInput,
  type Promotion,
  type PromotionInput,
  type PromotionType,
} from "@/lib/api/admin-promotions";
import { listCategories, listMeals, type Category, type Meal } from "@/lib/api/admin-menu";
import { usePermission } from "@/context/PermissionsContext";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Toggle } from "@/components/ui/Toggle";
import { Skeleton } from "@/components/ui/Skeleton";
import { ViewOnlyNotice } from "@/components/admin/ViewOnlyNotice";
import { formatPriceFromPaise } from "@/lib/format/currency";

const paiseToRupees = (paise: number | null | undefined) =>
  paise === null || paise === undefined ? "" : String(paise / 100);
const rupeesToPaise = (rupees: string): number | undefined =>
  rupees === "" ? undefined : Math.round(Number(rupees) * 100);

export default function PromotionsPage() {
  const canEdit = usePermission(PERMISSIONS.PROMOTIONS_MANAGE);
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [promotions, setPromotions] = useState<Promotion[] | null>(null);
  const [meals, setMeals] = useState<Meal[] | null>(null);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // limit: 100 — this picker needs every meal (including unavailable ones,
    // so a promo can still be configured for a temporarily-off item), not a
    // browsable page; the admin Meals list is the one that paginates for real.
    Promise.all([listCoupons(), listPromotions(), listMeals({ limit: 100 }), listCategories()])
      .then(([c, p, m, cats]) => {
        setCoupons(c);
        setPromotions(p);
        setMeals(m.data);
        setCategories(cats);
      })
      .catch(() => setError("Couldn't load promotions."));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-primary-600">
        <Tag className="h-5 w-5" />
        <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Promotions
        </h2>
      </div>
      {!canEdit && <ViewOnlyNotice />}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      {!coupons || !promotions || !meals || !categories ? (
        <div className="card p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-4 h-40 w-full" />
        </div>
      ) : (
        <>
          <CouponsCard coupons={coupons} canEdit={canEdit} onChange={setCoupons} />
          <PromotionsCard
            promotions={promotions}
            meals={meals}
            categories={categories}
            canEdit={canEdit}
            onChange={setPromotions}
          />
        </>
      )}
    </div>
  );
}

const emptyCouponForm: CouponInput = {
  code: "",
  discountType: "PERCENTAGE",
  discountValue: 10,
  isActive: true,
};

function CouponsCard({
  coupons,
  canEdit,
  onChange,
}: {
  coupons: Coupon[];
  canEdit: boolean;
  onChange: (c: Coupon[]) => void;
}) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  function handleDelete(id: string) {
    confirm({
      message: "Delete this coupon? Past orders that used it keep their record.",
      confirmLabel: "Delete",
      processingLabel: "Deleting…",
      variant: "danger",
      onConfirm: async () => {
        try {
          await deleteCoupon(id);
          onChange(coupons.filter((c) => c.id !== id));
        } catch (err) {
          showToast(err instanceof ApiError ? err.message : "Couldn't delete coupon.", "error");
        }
      },
    });
  }

  async function handleToggleActive(coupon: Coupon) {
    try {
      const updated = await updateCoupon(coupon.id, { isActive: !coupon.isActive });
      onChange(coupons.map((c) => (c.id === coupon.id ? updated : c)));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update coupon.", "error");
    }
  }

  function describeDiscount(c: Coupon) {
    return c.discountType === "PERCENTAGE"
      ? `${c.discountValue}% off`
      : `${formatPriceFromPaise(c.discountValue)} off`;
  }

  function describeUsage(c: Coupon) {
    const parts: string[] = [];
    if (c.minOrderAmountInPaise > 0) parts.push(`min ${formatPriceFromPaise(c.minOrderAmountInPaise)}`);
    if (c.maxUsesTotal) parts.push(`max ${c.maxUsesTotal} total`);
    if (c.maxUsesPerUser) parts.push(`max ${c.maxUsesPerUser}/customer`);
    return parts.join(" · ") || "No limits";
  }

  return (
    <div className="card flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Coupons</h3>
        {canEdit && editingId === null && (
          <button type="button" onClick={() => setEditingId("new")} className="btn-outline btn-sm">
            <Plus className="h-4 w-4" />
            Add Coupon
          </button>
        )}
      </div>

      {editingId === "new" && (
        <CouponForm
          initial={emptyCouponForm}
          onCancel={() => setEditingId(null)}
          onSave={async (input) => {
            const created = await createCoupon(input);
            onChange([created, ...coupons]);
            setEditingId(null);
          }}
        />
      )}

      {coupons.length === 0 && editingId !== "new" && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No coupons yet.</p>
      )}

      <div className="flex flex-col gap-2">
        {coupons.map((coupon) =>
          editingId === coupon.id ? (
            <CouponForm
              key={coupon.id}
              initial={{
                code: coupon.code,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                minOrderAmountInPaise: coupon.minOrderAmountInPaise,
                maxUsesTotal: coupon.maxUsesTotal ?? undefined,
                maxUsesPerUser: coupon.maxUsesPerUser ?? undefined,
                validFrom: coupon.validFrom ?? undefined,
                validUntil: coupon.validUntil ?? undefined,
                isActive: coupon.isActive,
              }}
              onCancel={() => setEditingId(null)}
              onSave={async (input) => {
                const updated = await updateCoupon(coupon.id, input);
                onChange(coupons.map((c) => (c.id === coupon.id ? updated : c)));
                setEditingId(null);
              }}
            />
          ) : (
            <div
              key={coupon.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3.5 py-2.5 dark:border-zinc-800"
            >
              <div>
                <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {coupon.code}
                </span>
                <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {describeDiscount(coupon)} · {describeUsage(coupon)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Toggle
                  checked={coupon.isActive}
                  onChange={() => handleToggleActive(coupon)}
                  disabled={!canEdit}
                />
                <button
                  type="button"
                  onClick={() => setEditingId(coupon.id)}
                  disabled={!canEdit}
                  className="text-zinc-400 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Edit ${coupon.code}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(coupon.id)}
                  disabled={!canEdit}
                  className="text-zinc-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Delete ${coupon.code}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function CouponForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: CouponInput;
  onCancel: () => void;
  onSave: (input: CouponInput) => Promise<void>;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      showToast("Coupon saved", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't save coupon.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-primary-200 bg-primary-50/50 p-4 dark:border-primary-900 dark:bg-primary-950/30"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <LabeledInput
          label="Code"
          value={form.code}
          onChange={(v) => setForm({ ...form, code: v.toUpperCase() })}
          placeholder="WELCOME10"
          required
        />
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Type</label>
            <select
              value={form.discountType}
              onChange={(e) =>
                setForm({ ...form, discountType: e.target.value as CouponInput["discountType"] })
              }
              className="input"
            >
              <option value="PERCENTAGE">Percentage</option>
              <option value="FLAT">Flat (₹)</option>
            </select>
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {form.discountType === "PERCENTAGE" ? "Percent off" : "₹ off"}
            </label>
            <input
              type="number"
              min={1}
              value={form.discountValue}
              onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
              className="input"
              required
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <LabeledInput
          label="Min order (₹, optional)"
          type="number"
          value={paiseToRupees(form.minOrderAmountInPaise)}
          onChange={(v) => setForm({ ...form, minOrderAmountInPaise: rupeesToPaise(v) })}
        />
        <LabeledInput
          label="Max total uses (optional)"
          type="number"
          value={form.maxUsesTotal ?? ""}
          onChange={(v) => setForm({ ...form, maxUsesTotal: v === "" ? undefined : Number(v) })}
        />
        <LabeledInput
          label="Max uses / customer (optional)"
          type="number"
          value={form.maxUsesPerUser ?? ""}
          onChange={(v) => setForm({ ...form, maxUsesPerUser: v === "" ? undefined : Number(v) })}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <LabeledInput
          label="Valid from (optional)"
          type="datetime-local"
          value={form.validFrom?.slice(0, 16) ?? ""}
          onChange={(v) => setForm({ ...form, validFrom: v || undefined })}
        />
        <LabeledInput
          label="Valid until (optional)"
          type="datetime-local"
          value={form.validUntil?.slice(0, 16) ?? ""}
          onChange={(v) => setForm({ ...form, validUntil: v || undefined })}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={form.isActive ?? true}
          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          className="h-4 w-4 accent-primary-600"
        />
        Active
      </label>
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

const emptyPromotionForm: PromotionInput = {
  type: "SCHEDULED_DISCOUNT",
  name: "",
  isActive: true,
  storewide: true,
};

function PromotionsCard({
  promotions,
  meals,
  categories,
  canEdit,
  onChange,
}: {
  promotions: Promotion[];
  meals: Meal[];
  categories: Category[];
  canEdit: boolean;
  onChange: (p: Promotion[]) => void;
}) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  function handleDelete(id: string) {
    confirm({
      message: "Delete this promotion?",
      confirmLabel: "Delete",
      processingLabel: "Deleting…",
      variant: "danger",
      onConfirm: async () => {
        try {
          await deletePromotion(id);
          onChange(promotions.filter((p) => p.id !== id));
        } catch (err) {
          showToast(err instanceof ApiError ? err.message : "Couldn't delete promotion.", "error");
        }
      },
    });
  }

  async function handleToggleActive(promo: Promotion) {
    try {
      const updated = await updatePromotion(promo.id, { isActive: !promo.isActive });
      onChange(promotions.map((p) => (p.id === promo.id ? updated : p)));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update promotion.", "error");
    }
  }

  function mealName(id: string | null) {
    return meals.find((m) => m.id === id)?.name ?? "—";
  }

  function describe(promo: Promotion) {
    if (promo.type === "BOGO") {
      return `Buy ${promo.buyQuantity} ${mealName(promo.buyMealId)} → get ${promo.getQuantity} ${mealName(promo.getMealId ?? promo.buyMealId)} free`;
    }
    if (promo.type === "FREE_ITEM_ON_MINIMUM") {
      return `Free ${mealName(promo.freeMealId)} on orders ≥ ${formatPriceFromPaise(promo.minOrderAmountInPaise ?? 0)}`;
    }
    const scope = promo.storewide
      ? "storewide"
      : `${promo.mealIds.length} meal(s)/${promo.categoryIds.length} categor(y/ies)`;
    return `${promo.discountPercentage}% off, ${scope}, ${promo.startTime}–${promo.endTime}`;
  }

  return (
    <div className="card flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Promotions</h3>
        {canEdit && editingId === null && (
          <button type="button" onClick={() => setEditingId("new")} className="btn-outline btn-sm">
            <Plus className="h-4 w-4" />
            Add Promotion
          </button>
        )}
      </div>

      {editingId === "new" && (
        <PromotionForm
          meals={meals}
          categories={categories}
          initial={emptyPromotionForm}
          onCancel={() => setEditingId(null)}
          onSave={async (input) => {
            const created = await createPromotion(input);
            onChange([created, ...promotions]);
            setEditingId(null);
          }}
        />
      )}

      {promotions.length === 0 && editingId !== "new" && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No promotions yet.</p>
      )}

      <div className="flex flex-col gap-2">
        {promotions.map((promo) =>
          editingId === promo.id ? (
            <PromotionForm
              key={promo.id}
              meals={meals}
              categories={categories}
              initial={{
                type: promo.type,
                name: promo.name,
                isActive: promo.isActive,
                buyMealId: promo.buyMealId ?? undefined,
                buyQuantity: promo.buyQuantity ?? undefined,
                getMealId: promo.getMealId ?? undefined,
                getQuantity: promo.getQuantity ?? undefined,
                minOrderAmountInPaise: promo.minOrderAmountInPaise ?? undefined,
                freeMealId: promo.freeMealId ?? undefined,
                discountPercentage: promo.discountPercentage ?? undefined,
                daysOfWeek: promo.daysOfWeek,
                startTime: promo.startTime ?? undefined,
                endTime: promo.endTime ?? undefined,
                mealIds: promo.mealIds,
                categoryIds: promo.categoryIds,
                storewide: promo.storewide,
              }}
              onCancel={() => setEditingId(null)}
              onSave={async (input) => {
                const updated = await updatePromotion(promo.id, input);
                onChange(promotions.map((p) => (p.id === promo.id ? updated : p)));
                setEditingId(null);
              }}
            />
          ) : (
            <div
              key={promo.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3.5 py-2.5 dark:border-zinc-800"
            >
              <div>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {promo.name}
                </span>
                <span className="badge ml-2 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400">
                  {promo.type.replace(/_/g, " ")}
                </span>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{describe(promo)}</p>
              </div>
              <div className="flex items-center gap-3">
                <Toggle
                  checked={promo.isActive}
                  onChange={() => handleToggleActive(promo)}
                  disabled={!canEdit}
                />
                <button
                  type="button"
                  onClick={() => setEditingId(promo.id)}
                  disabled={!canEdit}
                  className="text-zinc-400 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Edit ${promo.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(promo.id)}
                  disabled={!canEdit}
                  className="text-zinc-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Delete ${promo.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function PromotionForm({
  meals,
  categories,
  initial,
  onCancel,
  onSave,
}: {
  meals: Meal[];
  categories: Category[];
  initial: PromotionInput;
  onCancel: () => void;
  onSave: (input: PromotionInput) => Promise<void>;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      showToast("Promotion saved", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't save promotion.", "error");
    } finally {
      setSaving(false);
    }
  }

  function toggleInArray(field: "mealIds" | "categoryIds", id: string) {
    const current = form[field] ?? [];
    setForm({
      ...form,
      [field]: current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    });
  }

  function toggleDay(day: number) {
    const current = form.daysOfWeek ?? [];
    setForm({
      ...form,
      daysOfWeek: current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort(),
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-primary-200 bg-primary-50/50 p-4 dark:border-primary-900 dark:bg-primary-950/30"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as PromotionType })}
            className="input"
          >
            <option value="SCHEDULED_DISCOUNT">Scheduled discount</option>
            <option value="BOGO">Buy X get Y free</option>
            <option value="FREE_ITEM_ON_MINIMUM">Free item on minimum order</option>
          </select>
        </div>
        <LabeledInput
          label="Name"
          value={form.name}
          onChange={(v) => setForm({ ...form, name: v })}
          placeholder="Happy Hour"
          required
        />
      </div>

      {form.type === "BOGO" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <MealSelect
            label="Buy meal"
            meals={meals}
            value={form.buyMealId}
            onChange={(v) => setForm({ ...form, buyMealId: v })}
          />
          <LabeledInput
            label="Buy quantity"
            type="number"
            value={form.buyQuantity ?? 2}
            onChange={(v) => setForm({ ...form, buyQuantity: Number(v) })}
          />
          <MealSelect
            label="Free meal (optional, same item if blank)"
            meals={meals}
            value={form.getMealId}
            onChange={(v) => setForm({ ...form, getMealId: v })}
            allowNone
          />
          <LabeledInput
            label="Free quantity"
            type="number"
            value={form.getQuantity ?? 1}
            onChange={(v) => setForm({ ...form, getQuantity: Number(v) })}
          />
        </div>
      )}

      {form.type === "FREE_ITEM_ON_MINIMUM" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <LabeledInput
            label="Minimum order (₹)"
            type="number"
            value={paiseToRupees(form.minOrderAmountInPaise)}
            onChange={(v) => setForm({ ...form, minOrderAmountInPaise: rupeesToPaise(v) })}
          />
          <MealSelect
            label="Free meal"
            meals={meals}
            value={form.freeMealId}
            onChange={(v) => setForm({ ...form, freeMealId: v })}
          />
        </div>
      )}

      {form.type === "SCHEDULED_DISCOUNT" && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <LabeledInput
              label="Discount %"
              type="number"
              value={form.discountPercentage ?? 10}
              onChange={(v) => setForm({ ...form, discountPercentage: Number(v) })}
            />
            <LabeledInput
              label="Start time"
              type="time"
              value={form.startTime ?? ""}
              onChange={(v) => setForm({ ...form, startTime: v })}
            />
            <LabeledInput
              label="End time"
              type="time"
              value={form.endTime ?? ""}
              onChange={(v) => setForm({ ...form, endTime: v })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Days (none selected = every day)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label, day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`badge cursor-pointer border transition-colors ${
                    (form.daysOfWeek ?? []).includes(day)
                      ? "border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400"
                      : "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={form.storewide ?? false}
              onChange={(e) => setForm({ ...form, storewide: e.target.checked })}
              className="h-4 w-4 accent-primary-600"
            />
            Apply storewide (all meals)
          </label>
          {!form.storewide && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Meals
                </label>
                <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg border border-zinc-200 p-2 dark:border-zinc-700">
                  {meals.map((meal) => (
                    <label key={meal.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={(form.mealIds ?? []).includes(meal.id)}
                        onChange={() => toggleInArray("mealIds", meal.id)}
                        className="h-3.5 w-3.5 accent-primary-600"
                      />
                      {meal.name}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Categories
                </label>
                <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg border border-zinc-200 p-2 dark:border-zinc-700">
                  {categories.map((cat) => (
                    <label key={cat.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={(form.categoryIds ?? []).includes(cat.id)}
                        onChange={() => toggleInArray("categoryIds", cat.id)}
                        className="h-3.5 w-3.5 accent-primary-600"
                      />
                      {cat.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={form.isActive ?? true}
          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          className="h-4 w-4 accent-primary-600"
        />
        Active
      </label>
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

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="input"
      />
    </div>
  );
}

function MealSelect({
  label,
  meals,
  value,
  onChange,
  allowNone,
}: {
  label: string;
  meals: Meal[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  allowNone?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="input"
        required={!allowNone}
      >
        {allowNone && <option value="">— same as buy meal —</option>}
        {!allowNone && <option value="" disabled>Select a meal</option>}
        {meals.map((meal) => (
          <option key={meal.id} value={meal.id}>
            {meal.name}
          </option>
        ))}
      </select>
    </div>
  );
}
