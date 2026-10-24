import { Compass } from "lucide-react";
import { NotFoundState } from "@/components/feedback/not-found-state";

export default function NotFound() {
  return (
    <NotFoundState
      variant="page"
      icon={Compass}
      title="Lost in the multiverse"
      description="This page doesn't exist or may have been moved. Let's get you back to familiar worlds."
      actions={[
        { href: "/dashboard", label: "Back to dashboard" },
        { href: "/search", label: "Search AniVerse" },
        { href: "/", label: "Home" },
      ]}
    />
  );
}
