import { Music } from "lucide-react";
import { NotFoundState } from "@/components/feedback/not-found-state";

export default function NotFound() {
  return (
    <NotFoundState
      icon={Music}
      title="Song not found"
      description="This track isn't in our library anymore, or the link is incorrect."
      actions={[
        { href: "/dashboard/discover", label: "Discover music" },
        { href: "/search", label: "Search songs" },
      ]}
    />
  );
}
