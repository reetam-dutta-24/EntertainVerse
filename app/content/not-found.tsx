import { Clapperboard } from "lucide-react";
import { NotFoundState } from "@/components/feedback/not-found-state";

export default function NotFound() {
  return (
    <NotFoundState
      icon={Clapperboard}
      title="Title not found"
      description="We couldn't find this anime, show, or movie in the catalog. It may have been removed or the link is off."
      actions={[
        { href: "/dashboard/discover", label: "Discover titles" },
        { href: "/search", label: "Search catalog" },
      ]}
    />
  );
}
