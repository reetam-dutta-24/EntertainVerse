import { Library } from "lucide-react";
import { NotFoundState } from "@/components/feedback/not-found-state";

export default function NotFound() {
  return (
    <NotFoundState
      icon={Library}
      title="Collection not found"
      description="This collection doesn't exist, was deleted, or is private to its owner."
      actions={[
        { href: "/dashboard/collections", label: "Browse collections" },
        { href: "/search", label: "Search AniVerse" },
      ]}
    />
  );
}
