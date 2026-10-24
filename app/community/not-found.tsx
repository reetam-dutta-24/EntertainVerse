import { Users } from "lucide-react";
import { NotFoundState } from "@/components/feedback/not-found-state";

export default function NotFound() {
  return (
    <NotFoundState
      icon={Users}
      title="Community not found"
      description="This community doesn't exist, was deleted, or is private. Private communities need an invite or room code."
      actions={[
        { href: "/dashboard/community", label: "Browse communities" },
        { href: "/search", label: "Search AniVerse" },
      ]}
    />
  );
}
