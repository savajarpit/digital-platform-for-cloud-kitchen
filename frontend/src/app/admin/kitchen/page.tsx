"use client";

import { Suspense } from "react";
import { ChefHat } from "lucide-react";
import { useFeatures } from "@/context/FeaturesContext";
import { usePermissions } from "@/context/PermissionsContext";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { KitchenScreen } from "@/components/kitchen/KitchenScreen";
import { KitchenBoardSkeleton } from "@/components/kitchen/KitchenBoardSkeleton";

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-primary-600">
        <ChefHat className="h-5 w-5" />
        <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Kitchen
        </h2>
      </div>
      <div className="card p-6 text-sm text-zinc-600 dark:text-zinc-400">
        {children}
      </div>
    </div>
  );
}

export default function AdminKitchenPage() {
  const { has, loading: featuresLoading } = useFeatures();
  const { can, loading: permissionsLoading } = usePermissions();

  // The sidebar already hides the link; this covers an old bookmark.
  if (!featuresLoading && !has("kitchen-display")) {
    return (
      <Notice>
        The Kitchen screen isn&apos;t enabled for your account. Contact your
        platform admin if you&apos;d like it turned on.
      </Notice>
    );
  }
  if (!permissionsLoading && !can(PERMISSIONS.KITCHEN_VIEW)) {
    return (
      <Notice>
        You don&apos;t have access to the Kitchen screen. Ask the business owner
        to give it to you.
      </Notice>
    );
  }
  if (featuresLoading || permissionsLoading) return <KitchenBoardSkeleton />;

  return (
    <Suspense fallback={<KitchenBoardSkeleton />}>
      <KitchenScreen />
    </Suspense>
  );
}
