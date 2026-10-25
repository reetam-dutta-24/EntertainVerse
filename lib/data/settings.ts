/**
 * Data layer for the Settings page — loads from PostgreSQL.
 */

import { getSettingsForUser } from "@/lib/services/user-settings.service";
import type { SettingsData } from "@/lib/settings-options";

export {
  languageOptions,
  type AppPreferences,
  type NotificationPreferences,
  type PrivacyPreferences,
  type SettingsData,
} from "@/lib/settings-options";

export async function getSettingsData(userId: string): Promise<SettingsData> {
  return getSettingsForUser(userId);
}
