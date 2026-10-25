import {
  BarChart3,
  Headphones,
  LayoutList,
  Megaphone,
  MessageCircle,
  Mic,
  Settings,
  Sparkles,
  Tv,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const COMMUNITY_DASHBOARD_NAV_ICONS: Record<string, LucideIcon> = {
  posts: LayoutList,
  chat: MessageCircle,
  "watch-channel": Tv,
  "voice-channel": Mic,
  "listen-party": Headphones,
  announcements: Megaphone,
  analytics: BarChart3,
  "anime-chat": Sparkles,
  members: UserPlus,
  settings: Settings,
};
