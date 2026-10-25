import type { Metadata } from "next";
import { NotificationsView } from "@/components/notifications";
import { getNotificationsForUser } from "@/lib/data/notifications";
import { getCurrentUser } from "@/lib/data/user";

export const metadata: Metadata = {
  title: "Notifications — EntertainVerse",
  description:
    "All your EntertainVerse notifications — new episodes, watch parties, community activity, and AI matches.",
};

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  const notifications = await getNotificationsForUser(user.id);

  return <NotificationsView initialNotifications={notifications} />;
}
