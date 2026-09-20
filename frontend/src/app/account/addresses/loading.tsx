import { PageHeaderSkeleton } from "@/components/account/PageHeaderSkeleton";
import { AddressCardSkeleton } from "@/components/addresses/AddressCardSkeleton";

export default function AddressesLoading() {
  return (
    <main className="container-app flex-1 py-10" aria-busy="true">
      <PageHeaderSkeleton />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <AddressCardSkeleton key={i} />
        ))}
      </div>
    </main>
  );
}
