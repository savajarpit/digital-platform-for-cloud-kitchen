"use client";

import { useEffect, useState } from "react";
import { MapPin, Plus, Trash2 } from "lucide-react";
import {
  ApiError,
  createDeliverySlot,
  createServiceablePincode,
  deleteDeliverySlot,
  deleteServiceablePincode,
  getBusinessProfile,
  listAllDeliverySlots,
  listServiceablePincodes,
  updateDeliveryZones,
  updateDeliverySlot,
  updateServiceablePincode,
  type BusinessProfile,
  type DeliverySlot,
  type ServiceablePincode,
  type UpdateDeliveryZonesInput,
} from "@/lib/api/admin-settings";
import { usePermission } from "@/context/PermissionsContext";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Toggle } from "@/components/ui/Toggle";
import { Skeleton } from "@/components/ui/Skeleton";
import { ViewOnlyNotice } from "@/components/admin/ViewOnlyNotice";
import { LocationPickerMap } from "@/components/maps/LocationPickerMap";

const paiseToRupees = (paise: number | null | undefined) =>
  paise === null || paise === undefined ? "" : String(paise / 100);
const rupeesToPaise = (rupees: string): number | undefined =>
  rupees === "" ? undefined : Math.round(Number(rupees) * 100);

export default function DeliveryZonesPage() {
  const canEdit = usePermission(PERMISSIONS.DELIVERY_ZONES_EDIT);

  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [pincodes, setPincodes] = useState<ServiceablePincode[] | null>(null);
  const [slots, setSlots] = useState<DeliverySlot[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getBusinessProfile(), listServiceablePincodes(), listAllDeliverySlots()])
      .then(([p, pc, sl]) => {
        setProfile(p);
        setPincodes(pc);
        setSlots(sl.sort((a, b) => a.sortOrder - b.sortOrder));
      })
      .catch(() => setLoadError("Couldn't load delivery zone settings."));
  }, []);

  if (!profile || !pincodes || !slots) {
    return (
      <div className="card p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-40 w-full" />
        {loadError && <p className="mt-4 text-sm text-red-600">{loadError}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-primary-600">
        <MapPin className="h-5 w-5" />
        <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Delivery Zones
        </h2>
      </div>
      {!canEdit && <ViewOnlyNotice />}

      <GeoZoneForm profile={profile} canEdit={canEdit} onSaved={setProfile} />
      <PincodesCard pincodes={pincodes} canEdit={canEdit} onChange={setPincodes} />
      <SlotsCard slots={slots} canEdit={canEdit} onChange={setSlots} />
    </div>
  );
}

function GeoZoneForm({
  profile,
  canEdit,
  onSaved,
}: {
  profile: BusinessProfile;
  canEdit: boolean;
  onSaved: (p: BusinessProfile) => void;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    kitchenLat: profile.kitchenLat !== null ? String(profile.kitchenLat) : "",
    kitchenLng: profile.kitchenLng !== null ? String(profile.kitchenLng) : "",
    deliveryRadiusMeters: profile.deliveryRadiusMeters !== null ? String(profile.deliveryRadiusMeters) : "",
    deliveryFee: paiseToRupees(profile.deliveryFee),
    minOrderAmount: paiseToRupees(profile.minOrderAmount),
    freeDeliveryAboveAmount: paiseToRupees(profile.freeDeliveryAboveAmount),
    maxAdvanceOrderDays: String(profile.maxAdvanceOrderDays),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const input: UpdateDeliveryZonesInput = {
        kitchenLat: form.kitchenLat === "" ? undefined : Number(form.kitchenLat),
        kitchenLng: form.kitchenLng === "" ? undefined : Number(form.kitchenLng),
        deliveryRadiusMeters:
          form.deliveryRadiusMeters === "" ? undefined : Number(form.deliveryRadiusMeters),
        deliveryFee: rupeesToPaise(form.deliveryFee),
        minOrderAmount: rupeesToPaise(form.minOrderAmount),
        freeDeliveryAboveAmount: rupeesToPaise(form.freeDeliveryAboveAmount),
        maxAdvanceOrderDays: Number(form.maxAdvanceOrderDays),
      };
      const updated = await updateDeliveryZones(input);
      onSaved(updated);
      showToast("Delivery zone saved", "success");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-4 p-6">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Kitchen location & geo-radius delivery
      </h3>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        When kitchen coordinates and a delivery radius are set, serviceability is checked by
        real distance from your kitchen instead of the pincode list below.
      </p>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}
      <fieldset disabled={!canEdit} className="flex flex-col gap-4 disabled:opacity-70">
        <LocationPickerMap
          lat={form.kitchenLat === "" ? null : Number(form.kitchenLat)}
          lng={form.kitchenLng === "" ? null : Number(form.kitchenLng)}
          radiusMeters={form.deliveryRadiusMeters === "" ? undefined : Number(form.deliveryRadiusMeters)}
          onChange={(lat, lng) =>
            setForm((f) => ({ ...f, kitchenLat: String(lat), kitchenLng: String(lng) }))
          }
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Kitchen latitude
            </label>
            <input
              type="number"
              step="any"
              value={form.kitchenLat}
              onChange={(e) => setForm((f) => ({ ...f, kitchenLat: e.target.value }))}
              className="input w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Kitchen longitude
            </label>
            <input
              type="number"
              step="any"
              value={form.kitchenLng}
              onChange={(e) => setForm((f) => ({ ...f, kitchenLng: e.target.value }))}
              className="input w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Delivery radius (meters)
            </label>
            <input
              type="number"
              min={0}
              value={form.deliveryRadiusMeters}
              onChange={(e) => setForm((f) => ({ ...f, deliveryRadiusMeters: e.target.value }))}
              className="input w-full"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Delivery fee (₹)
            </label>
            <input
              type="number"
              min={0}
              value={form.deliveryFee}
              onChange={(e) => setForm((f) => ({ ...f, deliveryFee: e.target.value }))}
              className="input w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Min order amount (₹)
            </label>
            <input
              type="number"
              min={0}
              value={form.minOrderAmount}
              onChange={(e) => setForm((f) => ({ ...f, minOrderAmount: e.target.value }))}
              className="input w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Free delivery above (₹)
            </label>
            <input
              type="number"
              min={0}
              value={form.freeDeliveryAboveAmount}
              onChange={(e) => setForm((f) => ({ ...f, freeDeliveryAboveAmount: e.target.value }))}
              className="input w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Max advance order days
            </label>
            <input
              type="number"
              min={0}
              value={form.maxAdvanceOrderDays}
              onChange={(e) => setForm((f) => ({ ...f, maxAdvanceOrderDays: e.target.value }))}
              className="input w-full"
            />
          </div>
        </div>
        <button type="submit" disabled={saving} className="btn-primary w-fit">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </fieldset>
    </form>
  );
}

function PincodesCard({
  pincodes,
  canEdit,
  onChange,
}: {
  pincodes: ServiceablePincode[];
  canEdit: boolean;
  onChange: (p: ServiceablePincode[]) => void;
}) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [newPincode, setNewPincode] = useState("");
  const [newFee, setNewFee] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!newPincode) return;
    setAdding(true);
    try {
      const created = await createServiceablePincode({
        pincode: newPincode,
        deliveryFee: rupeesToPaise(newFee) ?? 0,
      });
      onChange([...pincodes, created]);
      setNewPincode("");
      setNewFee("");
      showToast("Pincode added", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't add pincode.", "error");
    } finally {
      setAdding(false);
    }
  }

  async function handleToggleActive(pc: ServiceablePincode) {
    try {
      const updated = await updateServiceablePincode(pc.id, { isActive: !pc.isActive });
      onChange(pincodes.map((p) => (p.id === pc.id ? updated : p)));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update pincode.", "error");
    }
  }

  function handleDelete(id: string) {
    confirm({
      message: "Remove this pincode?",
      confirmLabel: "Remove",
      processingLabel: "Removing…",
      variant: "danger",
      onConfirm: async () => {
        try {
          await deleteServiceablePincode(id);
          onChange(pincodes.filter((p) => p.id !== id));
        } catch (err) {
          showToast(err instanceof ApiError ? err.message : "Couldn't remove pincode.", "error");
        }
      },
    });
  }

  return (
    <div className="card flex flex-col gap-4 p-6">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Serviceable pincodes
      </h3>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Used as a fallback when kitchen geo-radius above isn&apos;t configured.
      </p>

      <div className="flex flex-col gap-2">
        {pincodes.map((pc) => (
          <div
            key={pc.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3.5 py-2.5 dark:border-zinc-800"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-zinc-900 dark:text-zinc-100">{pc.pincode}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Fee ₹{pc.deliveryFee / 100} · Min ₹{pc.minOrderAmount / 100}
                {pc.freeDeliveryAboveAmount != null && ` · Free above ₹${pc.freeDeliveryAboveAmount / 100}`}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Toggle checked={pc.isActive} onChange={() => handleToggleActive(pc)} disabled={!canEdit} />
              <button
                type="button"
                onClick={() => handleDelete(pc.id)}
                disabled={!canEdit}
                className="text-zinc-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={`Remove ${pc.pincode}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {pincodes.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No pincodes added yet.</p>
        )}
      </div>

      {canEdit && (
        <div className="flex flex-wrap items-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Pincode
            </label>
            <input
              type="text"
              value={newPincode}
              onChange={(e) => setNewPincode(e.target.value)}
              className="input w-32"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Delivery fee (₹)
            </label>
            <input
              type="number"
              min={0}
              value={newFee}
              onChange={(e) => setNewFee(e.target.value)}
              className="input w-32"
            />
          </div>
          <button type="button" onClick={handleAdd} disabled={adding || !newPincode} className="btn-outline btn-sm">
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      )}
    </div>
  );
}

function SlotsCard({
  slots,
  canEdit,
  onChange,
}: {
  slots: DeliverySlot[];
  canEdit: boolean;
  onChange: (s: DeliverySlot[]) => void;
}) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [newSlot, setNewSlot] = useState({ name: "", startTime: "", endTime: "" });
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!newSlot.name || !newSlot.startTime || !newSlot.endTime) return;
    setAdding(true);
    try {
      const created = await createDeliverySlot(newSlot);
      onChange([...slots, created].sort((a, b) => a.sortOrder - b.sortOrder));
      setNewSlot({ name: "", startTime: "", endTime: "" });
      showToast("Delivery slot added", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't add slot.", "error");
    } finally {
      setAdding(false);
    }
  }

  async function handleToggleActive(slot: DeliverySlot) {
    try {
      const updated = await updateDeliverySlot(slot.id, { isActive: !slot.isActive });
      onChange(slots.map((s) => (s.id === slot.id ? updated : s)));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update slot.", "error");
    }
  }

  function handleDelete(id: string) {
    confirm({
      message: "Remove this delivery slot?",
      confirmLabel: "Remove",
      processingLabel: "Removing…",
      variant: "danger",
      onConfirm: async () => {
        try {
          await deleteDeliverySlot(id);
          onChange(slots.filter((s) => s.id !== id));
        } catch (err) {
          showToast(err instanceof ApiError ? err.message : "Couldn't remove slot.", "error");
        }
      },
    });
  }

  return (
    <div className="card flex flex-col gap-4 p-6">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Delivery slots</h3>

      <div className="flex flex-col gap-2">
        {slots.map((slot) => (
          <div
            key={slot.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3.5 py-2.5 dark:border-zinc-800"
          >
            <div>
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{slot.name}</span>
              <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                {slot.startTime}–{slot.endTime}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Toggle checked={slot.isActive} onChange={() => handleToggleActive(slot)} disabled={!canEdit} />
              <button
                type="button"
                onClick={() => handleDelete(slot.id)}
                disabled={!canEdit}
                className="text-zinc-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={`Remove ${slot.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {slots.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No delivery slots configured yet.</p>
        )}
      </div>

      {canEdit && (
        <div className="flex flex-wrap items-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Name
            </label>
            <input
              type="text"
              value={newSlot.name}
              onChange={(e) => setNewSlot((s) => ({ ...s, name: e.target.value }))}
              placeholder="Lunch"
              className="input w-32"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Start
            </label>
            <input
              type="time"
              value={newSlot.startTime}
              onChange={(e) => setNewSlot((s) => ({ ...s, startTime: e.target.value }))}
              className="input w-32"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              End
            </label>
            <input
              type="time"
              value={newSlot.endTime}
              onChange={(e) => setNewSlot((s) => ({ ...s, endTime: e.target.value }))}
              className="input w-32"
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || !newSlot.name || !newSlot.startTime || !newSlot.endTime}
            className="btn-outline btn-sm"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      )}
    </div>
  );
}
