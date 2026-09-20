"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { MapPin, Plus } from "lucide-react";
import { ApiError, deleteAddress, updateAddress } from "@/lib/api/addresses";
import { useAddresses, useAddressCacheSync } from "@/lib/query/addresses";
import { AddressForm } from "@/components/addresses/AddressForm";
import { AddressCard } from "@/components/addresses/AddressCard";
import { AddressCardSkeleton } from "@/components/addresses/AddressCardSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { PageHeader } from "@/components/account/PageHeader";

export default function AddressesPage() {
  const t = useTranslations("address");
  const router = useRouter();
  const { showToast } = useToast();
  const confirm = useConfirm();

  // Cached: revisiting shows the saved list instantly. Every mutation below
  // patches/invalidates the address cache, so it never needs a timed refetch.
  const { data: addresses, isPending, error } = useAddresses();
  const { afterSave, afterDelete } = useAddressCacheSync();
  const unauthorized = error instanceof ApiError && error.status === 401;
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (unauthorized) router.push("/login?redirect=/account/addresses");
  }, [unauthorized, router]);

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
          afterDelete(id);
          showToast(t("deleted"), "success");
        } catch (err) {
          showToast(err instanceof ApiError ? err.message : "Something went wrong.", "error");
        }
      },
    });
  }

  async function handleSetDefault(id: string) {
    try {
      afterSave(await updateAddress(id, { isDefault: true }));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Something went wrong.", "error");
    }
  }

  function renderBody() {
    // A failed background refetch keeps showing the cached list; the error
    // state is only for "nothing to show at all".
    if (!addresses) {
      if (isPending || unauthorized) {
        return (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <AddressCardSkeleton key={i} />
            ))}
          </div>
        );
      }
      return (
        <EmptyState
          icon={MapPin}
          title="Couldn't load your addresses"
          description="Please try again in a moment."
        />
      );
    }
    if (addresses.length === 0 && !showForm) {
      return <EmptyState icon={MapPin} title={t("empty")} />;
    }
    return (
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {addresses.map((address) =>
          editingId === address.id ? (
            <div key={address.id} className="card p-6">
              <AddressForm
                address={address}
                onSaved={(updated) => {
                  afterSave(updated);
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            </div>
          ) : (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={() => setEditingId(address.id)}
              onDelete={() => handleDelete(address.id)}
              onSetDefault={() => handleSetDefault(address.id)}
            />
          ),
        )}
      </div>
    );
  }

  return (
    <main className="container-app flex-1 py-10">
      <PageHeader
        icon={MapPin}
        title={t("title")}
        action={
          !showForm && (
            <button type="button" onClick={() => setShowForm(true)} className="btn-primary btn-sm">
              <Plus className="h-4 w-4" />
              {t("save")}
            </button>
          )
        }
      />

      {showForm && (
        <div className="card mt-6 p-6">
          <AddressForm
            onSaved={(address) => {
              afterSave(address);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {renderBody()}
    </main>
  );
}
