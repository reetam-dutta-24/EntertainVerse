/**
 * Settings shapes and options — client-safe (the settings loader in lib/data/settings
 * reads the database, so the settings screen imports these from here).
 */

export interface NotificationPreferences {
  newEpisodes: boolean;
  watchParties: boolean;
  musicDrops: boolean;
  communityPosts: boolean;
  weeklyRecap: boolean;
  emailDigest: boolean;
}

export interface PrivacyPreferences {
  publicProfile: boolean;
  showActivity: boolean;
  showWatchHistory: boolean;
  allowMessages: boolean;
}

export interface AppPreferences {
  language: string;
  autoplayPreviews: boolean;
  spoilerWarnings: boolean;
  matureContent: boolean;
  reducedMotion: boolean;
}

export interface SettingsData {
  email: string;
  handle: string;
  profilePath: string;
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
  preferences: AppPreferences;
  tasteScore: number;
  memberSince: string;
}

export const languageOptions = ["English", "Japanese", "Korean", "Hindi"] as const;
