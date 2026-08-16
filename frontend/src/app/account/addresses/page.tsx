"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import {
  ApiError,
  deleteAddress,
  listAddresses,
  updateAddress,
  type Address,
} from "@/lib/api/addresses";
import { AddressForm } from "@/components/addresses/AddressForm";
import { AddressCardSkeleton } from "@/components/addresses/AddressCardSkeleton";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";

export default function AddressesPage() {
  const t = useTranslations("address");
  const router = useRouter();
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    listAddresses()
      .then(setAddresses)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login?redirect=/account/addresses");
          return;
        }
        setAddresses([]);
      });
  }, [router]);

  function handleDelete(id: string) {
    confirm({
      message: t("deleteConfirm"),
      confirmLabel: t("delete"),
      processingLabel: t("deleting"),
      cancelLabel: t("cancel"),
      variant: "danger",
      onConfirm: async () => {
        try {
          await deleteAddress(id);
          setAddresses((prev) => prev?.filter((a) => a.id !== id) ?? null);
          showToast(t("deleted"), "success");
        } catch (err) {
          showToast(err instanceof ApiError ? err.message : "Something went wrong.", "error");
        }
      },
    });
  }

  async function handleSetDefault(id: string) {
    try {
      const updated = await updateAddress(id, { isDefault: true });
      setAddresses(
        (prev) => prev?.map((a) => ({ ...a, isDefault: a.id === updated.id })) ?? null,
      );
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Something went wrong.", "error");
    }
  }

  return (
    <main className="container-app flex-1 py-10">
      <div className="flex items-center justify-between gap-2">
        <h1 className="section-title text-zinc-900 dark:text-zinc-100">{t("title")}</h1>
        {!showForm && (
          <button type="button" onClick={() => setShowForm(true)} className="btn-primary btn-sm">
            <Plus className="h-4 w-4" />
            {t("save")}
          </button>
        )}
      </div>

      {showForm && (
        <div className="card mt-6 p-6">
          <AddressForm
            onSaved={(address) => {
              setAddresses((prev) => [address, ...(prev ?? [])]);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {addresses === null ? (
          Array.from({ length: 4 }).map((_, i) => <AddressCardSkeleton key={i} />)
        ) : addresses.length === 0 && !showForm ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("empty")}</p>
        ) : (
          addresses.map((address) =>
            editingId === address.id ? (
              <div key={address.id} className="card p-6">
                <AddressForm
                  address={address}
                  onSaved={(updated) => {
                    setAddresses(
                      (prev) => prev?.map((a) => (a.id === updated.id ? updated : a)) ?? null,
                    );
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <div key={address.id} className="card flex flex-col gap-2 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-primary-600" />
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {address.label || t("line1")}
                    </span>
                    {address.isDefault && (
                      <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-400">
                        {t("default")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingId(address.id)}
                      className="rounded p-1 text-zinc-400 hover:text-primary-600"
                      aria-label={t("edit")}
                      title={t("edit")}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(address.id)}
                      className="rounded p-1 text-zinc-400 hover:text-red-600"
                      aria-label={t("deleteConfirm")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.state} —{" "}
                  {address.pincode}
                </p>
                {!address.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(address.id)}
                    className="mt-1 inline-flex w-fit items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
                  >
                    <Star className="h-3 w-3" />
                    {t("setDefault")}
                  </button>
                )}
              </div>
            ),
          )
        )}
      </div>
    </main>
  );
}
