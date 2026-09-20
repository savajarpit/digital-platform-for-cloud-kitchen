import { PageHeaderSkeleton } from "@/components/account/PageHeaderSkeleton";
import { ProfileSkeleton } from "@/components/account/ProfileSkeleton";

export default function ProfileLoading() {
  return (
    <main className="container-app flex-1 py-10" aria-busy="true">
      <PageHeaderSkeleton />
      <ProfileSkeleton />
    </main>
  );
}
