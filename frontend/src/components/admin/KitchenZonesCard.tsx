"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  ApiError,
  createKitchenZone,
  deleteKitchenZone,
  updateKitchenZone,
  type KitchenZone,
  type KitchenZoneInput,
} from "@/lib/api/admin-settings";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Toggle } from "@/components/ui/Toggle";
import { MapLink } from "@/components/ui/MapLink";
import { LocationPickerMap } from "@/components/maps/LocationPickerMap";

const EMPTY_FORM: KitchenZoneInput = {
  name: "",
  lat: 0,
  lng: 0,
  radiusMeters: 3000,
};

export function KitchenZonesCard({
  zones,
  canEdit,
  onChange,
}: {
  zones: KitchenZone[];
  canEdit: boolean;
  onChange: (zones: KitchenZone[]) => void;
}) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  async function handleToggleActive(zone: KitchenZone) {
    try {
      const updated = await updateKitchenZone(zone.id, { isActive: !zone.isActive });
      onChange(zones.map((z) => (z.id === zone.id ? updated : z)));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update zone.", "error");
    }
  }

  function handleDelete(zone: KitchenZone) {
    confirm({
      message: `Remove "${zone.name}"?`,
      confirmLabel: "Remove",
      processingLabel: "Removing…",
      variant: "danger",
      onConfirm: async () => {
        try {
          await deleteKitchenZone(zone.id);
          onChange(zones.filter((z) => z.id !== zone.id));
        } catch (err) {
          showToast(err instanceof ApiError ? err.message : "Couldn't remove zone.", "error");
        }
      },
    });
  }

  return (
    <div className="card flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Kitchen zones
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            One or more outlet locations, each with its own delivery radius. A location is
            serviceable if it falls inside any zone below, or in the pincode list further down.
          </p>
        </div>
        {canEdit && editingId === null && (
          <button type="button" onClick={() => setEditingId("new")} className="btn-outline btn-sm">
            <Plus className="h-4 w-4" />
            Add kitchen zone
          </button>
        )}
      </div>

      {editingId === "new" && (
        <KitchenZoneForm
          initial={EMPTY_FORM}
          onCancel={() => setEditingId(null)}
          onSave={async (input) => {
            const created = await createKitchenZone(input);
            onChange([...zones, created]);
            setEditingId(null);
            showToast("Kitchen zone added", "success");
          }}
        />
      )}

      <div className="flex flex-col gap-2">
        {zones.map((zone) =>
          editingId === zone.id ? (
            <KitchenZoneForm
              key={zone.id}
              initial={{
                name: zone.name,
                lat: zone.lat,
                lng: zone.lng,
                radiusMeters: zone.radiusMeters,
                deliveryFee: zone.deliveryFee,
                minOrderAmount: zone.minOrderAmount,
                freeDeliveryAboveAmount: zone.freeDeliveryAboveAmount ?? undefined,
                pickupEnabled: zone.pickupEnabled,
                pickupAddress: zone.pickupAddress ?? undefined,
              }}
              onCancel={() => setEditingId(null)}
              onSave={async (input) => {
                const updated = await updateKitchenZone(zone.id, input);
                onChange(zones.map((z) => (z.id === zone.id ? updated : z)));
                setEditingId(null);
                showToast("Kitchen zone saved", "success");
              }}
            />
          ) : (
            <div
              key={zone.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3.5 py-2.5 dark:border-zinc-800"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {zone.name}
                  </span>
                  <MapLink lat={zone.lat} lng={zone.lng} className="text-xs" />
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {(zone.radiusMeters / 1000).toFixed(1)} km radius · Fee ₹{zone.deliveryFee / 100}
                  {" · Min ₹"}
                  {zone.minOrderAmount / 100}
                  {zone.freeDeliveryAboveAmount != null &&
                    ` · Free above ₹${zone.freeDeliveryAboveAmount / 100}`}
                  {zone.pickupEnabled && " · Pickup enabled"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Toggle checked={zone.isActive} onChange={() => handleToggleActive(zone)} disabled={!canEdit} />
                <button
                  type="button"
                  onClick={() => setEditingId(zone.id)}
                  disabled={!canEdit}
                  className="text-zinc-400 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Edit ${zone.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(zone)}
                  disabled={!canEdit}
                  className="text-zinc-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Remove ${zone.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ),
        )}
        {zones.length === 0 && editingId !== "new" && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No kitchen zones added yet.</p>
        )}
      </div>
    </div>
  );
}

function KitchenZoneForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: KitchenZoneInput;
  onCancel: () => void;
  onSave: (input: KitchenZoneInput) => Promise<void>;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState(initial.name);
  const [lat, setLat] = useState<number | null>(initial.lat || null);
  const [lng, setLng] = useState<number | null>(initial.lng || null);
  const [radiusMeters, setRadiusMeters] = useState(String(initial.radiusMeters));
  const [deliveryFee, setDeliveryFee] = useState(
    initial.deliveryFee !== undefined ? String(initial.deliveryFee / 100) : "",
  );
  const [minOrderAmount, setMinOrderAmount] = useState(
    initial.minOrderAmount !== undefined ? String(initial.minOrderAmount / 100) : "",
  );
  const [freeDeliveryAboveAmount, setFreeDeliveryAboveAmount] = useState(
    initial.freeDeliveryAboveAmount !== undefined
      ? String(initial.freeDeliveryAboveAmount / 100)
      : "",
  );
  const [pickupEnabled, setPickupEnabled] = useState(initial.pickupEnabled ?? false);
  const [pickupAddress, setPickupAddress] = useState(initial.pickupAddress ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lat == null || lng == null) {
      showToast("Pin the kitchen's location on the map first.", "error");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        lat,
        lng,
        radiusMeters: Math.round(Number(radiusMeters)),
        deliveryFee: deliveryFee ? Math.round(Number(deliveryFee) * 100) : 0,
        minOrderAmount: minOrderAmount ? Math.round(Number(minOrderAmount) * 100) : 0,
        freeDeliveryAboveAmount: freeDeliveryAboveAmount
          ? Math.round(Number(freeDeliveryAboveAmount) * 100)
          : undefined,
        pickupEnabled,
        pickupAddress: pickupEnabled ? pickupAddress.trim() || undefined : undefined,
      });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't save kitchen zone.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-primary-200 bg-primary-50/30 p-4 dark:border-primary-900 dark:bg-primary-950/20"
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Zone name, e.g. Nikol Branch"
        required
        className="input w-full"
      />
      <LocationPickerMap
        lat={lat}
        lng={lng}
        radiusMeters={radiusMeters === "" ? undefined : Number(radiusMeters)}
        onChange={(nextLat, nextLng) => {
          setLat(nextLat);
          setLng(nextLng);
        }}
        height={260}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Radius (meters)
          </label>
          <input
            type="number"
            min={0}
            value={radiusMeters}
            onChange={(e) => setRadiusMeters(e.target.value)}
            required
            className="input w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Delivery fee (₹)
          </label>
          <input
            type="number"
            min={0}
            value={deliveryFee}
            onChange={(e) => setDeliveryFee(e.target.value)}
            className="input w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Min order (₹)
          </label>
          <input
            type="number"
            min={0}
            value={minOrderAmount}
            onChange={(e) => setMinOrderAmount(e.target.value)}
            className="input w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Free delivery above (₹)
          </label>
          <input
            type="number"
            min={0}
            value={freeDeliveryAboveAmount}
            onChange={(e) => setFreeDeliveryAboveAmount(e.target.value)}
            className="input w-full"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-primary-200 pt-3 dark:border-primary-900">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Pickup from this zone</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Only takes effect once pickup is also enabled in Business Settings.
            </p>
          </div>
          <Toggle checked={pickupEnabled} onChange={setPickupEnabled} />
        </div>
        {pickupEnabled && (
          <input
            type="text"
            value={pickupAddress}
            onChange={(e) => setPickupAddress(e.target.value)}
            placeholder="Customer-facing pickup address"
            required
            className="input w-full"
          />
        )}
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
