"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MapPinPlus } from "lucide-react";
import { addCustomerAddress } from "@/lib/api/admin-customers";
import type { Address } from "@/lib/api/addresses";
import { qk } from "@/lib/query/keys";
import { usePermission } from "@/context/PermissionsContext";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { AddressForm } from "@/components/addresses/AddressForm";

/** Staff adding a delivery address to a customer's account (map search
 * included) — from the manual order/subscription forms or the customer
 * page. Hidden without `customers.manage`. Refreshes every cached view of
 * that customer, then hands the new address back so the caller can select
 * it. */
export function AddCustomerAddressButton({
  customerId,
  customerPhone,
  onAdded,
  label = "Add address",
}: {
  customerId: string;
  customerPhone?: string | null;
  onAdded?: (address: Address) => void;
  label?: string;
}) {
  const canManage = usePermission(PERMISSIONS.CUSTOMERS_MANAGE);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  if (!canManage) return null;

  async function handleSaved(address: Address) {
    setOpen(false);
    await queryClient.invalidateQueries({ queryKey: qk.admin("customers") });
    await queryClient.invalidateQueries({
      queryKey: qk.admin("subscriptions", "customer", customerId),
    });
    onAdded?.(address);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-ghost btn-sm w-fit cursor-pointer"
      >
        <MapPinPlus className="h-4 w-4" />
        {label}
      </button>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Add delivery address"
      >
        {open && (
          <AddressForm
            saveAddress={(input) => addCustomerAddress(customerId, input)}
            defaultContactPhone={customerPhone ?? undefined}
            allowOutOfArea
            onSaved={handleSaved}
            onCancel={() => setOpen(false)}
          />
        )}
      </BottomSheet>
    </>
  );
}
