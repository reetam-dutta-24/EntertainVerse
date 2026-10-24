import { FileQuestionMark } from "lucide-react";
import { NotFoundState } from "@/components/feedback/not-found-state";

export default function NotFound() {
  return (
    <NotFoundState
      icon={FileQuestionMark}
      title="Record not found"
      description="This catalog record doesn't exist or was already deleted."
      actions={[
        { href: "/admin", label: "CMS overview" },
        { href: "/admin/content", label: "Content" },
        { href: "/admin/music", label: "Music" },
      ]}
    />
  );
}
