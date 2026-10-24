import { Mic } from "lucide-react";
import { NotFoundState } from "@/components/feedback/not-found-state";

export default function NotFound() {
  return (
    <NotFoundState
      icon={Mic}
      title="Artist not found"
      description="We couldn't find this artist. They may have been removed from the catalog."
      actions={[
        { href: "/dashboard/for-you", label: "Artists for you" },
        { href: "/search", label: "Search artists" },
      ]}
    />
  );
}
