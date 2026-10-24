import { UserX } from "lucide-react";
import { NotFoundState } from "@/components/feedback/not-found-state";

export default function NotFound() {
  return (
    <NotFoundState
      icon={UserX}
      title="Profile not found"
      description="This user doesn't exist or their profile isn't available."
      actions={[
        { href: "/dashboard/messages", label: "Find friends" },
        { href: "/search", label: "Search people" },
      ]}
    />
  );
}
