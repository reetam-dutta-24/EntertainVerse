import { DashboardGridSkeleton } from "@/components/skeletons/page-skeletons";

export default function Loading() {
  return <DashboardGridSkeleton stats={false} filters={false} posterGrid />;
}
