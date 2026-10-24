import { Hash } from "lucide-react";
import { NotFoundState } from "@/components/feedback/not-found-state";

export default function NotFound() {
  return (
    <NotFoundState
      icon={Hash}
      title="Channel not found"
      description="This section doesn't exist in the community dashboard."
      actions={[
        { href: "/dashboard/community", label: "Your communities" },
      ]}
    />
  );
}
