"use client";

import { LayoutGrid } from "lucide-react";
import { usePermission } from "@/context/PermissionsContext";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { HomeSectionsManager } from "@/components/admin/HomeSectionsManager";
import { ReviewsManager } from "@/components/admin/ReviewsManager";
import { HomePageContentEditor } from "@/components/admin/HomePageContentEditor";

export default function AdminHomePage() {
  const canEditSections = usePermission(PERMISSIONS.MENU_MANAGE);
  const canEditReviews = usePermission(PERMISSIONS.CONTENT_EDIT);
  const canEditContent = usePermission(PERMISSIONS.BRANDING_EDIT);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-primary-600">
        <LayoutGrid className="h-5 w-5" />
        <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">Home Page</h2>
      </div>

      <HomePageContentEditor canEdit={canEditContent} />
      <HomeSectionsManager canEdit={canEditSections} />
      <ReviewsManager canEdit={canEditReviews} />
    </div>
  );
}
