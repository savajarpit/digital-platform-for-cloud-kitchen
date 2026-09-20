"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listAddresses, type Address } from "@/lib/api/addresses";
import { qk, STALE } from "@/lib/query/keys";

/** The customer's saved addresses. Changes only through the customer's own
 * edits (which update this cache directly), so it stays fresh for a long time. */
export function useAddresses() {
  return useQuery({
    queryKey: qk.addresses.list,
    queryFn: listAddresses,
    staleTime: STALE.long,
  });
}

/** Keeps the address cache in step with create / update / delete calls made
 * elsewhere (the address form, the delete button). The cache is patched
 * first so the UI updates instantly, then the whole domain is invalidated so
 * server truth (default flag, serviceability) replaces the local guess. */
export function useAddressCacheSync() {
  const queryClient = useQueryClient();

  function afterSave(saved: Address) {
    // Only one address can be the default.
    const clearDefault = (a: Address) =>
      saved.isDefault && a.id !== saved.id ? { ...a, isDefault: false } : a;
    queryClient.setQueryData<Address[]>(qk.addresses.list, (prev) => {
      if (!prev) return prev;
      // Edits keep their position; new addresses go first.
      return prev.some((a) => a.id === saved.id)
        ? prev.map((a) => (a.id === saved.id ? saved : clearDefault(a)))
        : [saved, ...prev.map(clearDefault)];
    });
    void queryClient.invalidateQueries({ queryKey: qk.addresses.all });
  }

  function afterDelete(id: string) {
    queryClient.setQueryData<Address[]>(qk.addresses.list, (prev) =>
      prev?.filter((a) => a.id !== id),
    );
    void queryClient.invalidateQueries({ queryKey: qk.addresses.all });
  }

  return { afterSave, afterDelete };
}
