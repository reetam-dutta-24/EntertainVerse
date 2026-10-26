"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useAppRouter } from "@/hooks/use-app-router";
import { signOut } from "next-auth/react";
import {
  Globe,
  Lock,
  LogOut,
  Mail,
  AtSign,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { AuthInput } from "@/components/auth/auth-input";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsToggle } from "@/components/settings/settings-toggle";
import { GradientButton } from "@/components/ui/gradient-button";
import {
  languageOptions,
  type AppPreferences,
  type NotificationPreferences,
  type PrivacyPreferences,
  type SettingsData,
} from "@/lib/settings-options";
import { ONBOARDING_RETAKE_PATH } from "@/lib/onboarding-routes";
import { cn } from "@/lib/utils";
import { useConfirm, useToast } from "@/components/feedback/feedback-provider";

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wide text-muted">
      {children}
    </label>
  );
}

function Divider() {
  return <div className="border-t border-white/8" />;
}

export interface SettingsViewProps {
  data: SettingsData;
}

/** App settings — notifications, privacy, preferences, account danger zone. */
export function SettingsView({ data: initialData }: SettingsViewProps) {
  const router = useAppRouter();
  const [data, setData] = useState(initialData);
  const [notifications, setNotifications] = useState(initialData.notifications);
  const [privacy, setPrivacy] = useState(initialData.privacy);
  const [preferences, setPreferences] = useState(initialData.preferences);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [status, setStatus] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const confirmAction = useConfirm();
  const toast = useToast();

  const persistSettings = useCallback(
    async (patch: {
      notifications?: Partial<NotificationPreferences>;
      privacy?: Partial<PrivacyPreferences>;
      preferences?: Partial<AppPreferences>;
    }) => {
      const response = await fetch("/api/users/me/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof body.error === "string" ? body.error : "Could not save settings.",
        );
      }
      if (body.settings) setData(body.settings);
      return body.settings as SettingsData;
    },
    [],
  );

  async function patchSetting(
    section: "notifications" | "privacy" | "preferences",
    key: string,
    value: boolean | string,
  ) {
    setError(undefined);
    try {
      await persistSettings({ [section]: { [key]: value } });
      setStatus("Saved");
      toast("Settings saved");
      window.setTimeout(() => setStatus(undefined), 1500);
    } catch (patchError) {
      setError(
        patchError instanceof Error ? patchError.message : "Could not save.",
      );
    }
  }

  async function handlePasswordSave() {
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch("/api/users/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(passwordForm),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof body.error === "string" ? body.error : "Could not update password.",
        );
      }
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setStatus("Password updated");
      window.setTimeout(() => setStatus(undefined), 2000);
    } catch (passwordError) {
      setError(
        passwordError instanceof Error
          ? passwordError.message
          : "Could not update password.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleClearHistory() {
    const confirmed = await confirmAction({
      title: "Clear watch and listen history?",
      description: "Your history, continue-watching rows and listening stats reset. This can't be undone.",
      confirmLabel: "Clear history",
      destructive: true,
    });
    if (!confirmed) return;
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch("/api/users/me/settings?action=watch-history", {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Could not clear history.");
      setStatus("Watch history cleared");
      toast("Watch history cleared");
      window.setTimeout(() => setStatus(undefined), 2000);
    } catch (historyError) {
      setError(
        historyError instanceof Error
          ? historyError.message
          : "Could not clear history.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteAccount() {
    const confirmed = await confirmAction({
      title: "Delete your account?",
      description: "All your collections, posts, reviews and data are removed permanently. This can't be undone.",
      confirmLabel: "Delete account",
      destructive: true,
    });
    if (!confirmed) return;
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch("/api/users/me/delete", {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Could not delete account.");
      await signOut({ callbackUrl: "/" });
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete account.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5 sm:gap-6">
      <SettingsSection
        title="👤 Public profile"
        subtitle="Bio, portrait, and accent color are edited on your profile page"
      >
        <p className="text-sm text-white/75">
          Profile details (name, bio, location, accent theme, portrait) live on
          your public profile — not here in settings.
        </p>
        <Link
          href={data.profilePath}
          className="inline-flex text-sm font-semibold text-brand-pink transition-colors hover:text-brand-magenta"
        >
          Edit profile on your public page →
        </Link>
      </SettingsSection>

      <SettingsSection
        title="🔑 Account"
        subtitle={`Member since ${data.memberSince}`}
      >
        <div className="flex flex-col gap-1.5">
          <FieldLabel>Email</FieldLabel>
          <AuthInput icon={Mail} type="email" value={data.email} readOnly disabled aria-label="Email" />
        </div>
        <div className="flex flex-col gap-1.5">
          <FieldLabel>Username</FieldLabel>
          <AuthInput icon={AtSign} value={data.handle} readOnly disabled aria-label="Username" />
        </div>
        <Divider />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Current password</FieldLabel>
            <AuthInput
              aria-label="Current password"
              icon={Lock}
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm((c) => ({
                  ...c,
                  currentPassword: e.target.value,
                }))
              }
              disabled={busy}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel>New password</FieldLabel>
            <AuthInput
              aria-label="New password"
              icon={Lock}
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm((c) => ({ ...c, newPassword: e.target.value }))
              }
              disabled={busy}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5 sm:max-w-[50%]">
          <FieldLabel>Confirm password</FieldLabel>
          <AuthInput
              aria-label="Confirm password"
            icon={Lock}
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e) =>
              setPasswordForm((c) => ({
                ...c,
                confirmPassword: e.target.value,
              }))
            }
            disabled={busy}
          />
        </div>
        <GradientButton
          size="sm"
          className="w-fit rounded-full px-5"
          disabled={busy}
          onClick={() => void handlePasswordSave()}
        >
          Update password
        </GradientButton>
      </SettingsSection>

      <SettingsSection title="🧠 Taste & AI" subtitle="Your personalized match engine — see, edit or wipe what it knows">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-brand">
              <Sparkles className="size-5 text-white" />
            </span>
            <p className="text-sm text-white/70">
              Your taste map, what was learned from activity, and your AI-mode answers — all editable.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Link
              href="/dashboard/settings/ai"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:w-auto"
            >
              <Sparkles className="size-4" />
              What the AI knows
            </Link>
            <button
              type="button"
              onClick={() => router.push(ONBOARDING_RETAKE_PATH)}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-brand-magenta px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-magenta/15 sm:w-auto"
            >
              <RefreshCw className="size-4" />
              Retake Taste Test
            </button>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="🔔 Notifications" subtitle="Saved automatically">
        <div className="flex flex-col gap-4">
          {(Object.keys(notifications) as Array<keyof NotificationPreferences>).map(
            (key) => (
              <SettingsToggle
                key={key}
                label={key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                checked={notifications[key]}
                onChange={(v) => {
                  setNotifications((c) => ({ ...c, [key]: v }));
                  void patchSetting("notifications", key, v);
                }}
              />
            ),
          )}
        </div>
      </SettingsSection>

      <SettingsSection title="🔒 Privacy" subtitle="Saved automatically">
        <div className="flex flex-col gap-4">
          <SettingsToggle
            label="Public Profile"
            description="Anyone can view your profile page"
            checked={privacy.publicProfile}
            onChange={(v) => {
              setPrivacy((c) => ({ ...c, publicProfile: v }));
              void patchSetting("privacy", "publicProfile", v);
            }}
          />
          <SettingsToggle
            label="Show activity"
            description="Display what you're watching or listening to"
            checked={privacy.showActivity}
            onChange={(v) => {
              setPrivacy((c) => ({ ...c, showActivity: v }));
              void patchSetting("privacy", "showActivity", v);
            }}
          />
          <SettingsToggle
            label="Show watch history"
            description="Let others see your completed titles"
            checked={privacy.showWatchHistory}
            onChange={(v) => {
              setPrivacy((c) => ({ ...c, showWatchHistory: v }));
              void patchSetting("privacy", "showWatchHistory", v);
            }}
          />
          <SettingsToggle
            label="Allow Messages"
            description="Community members can send you DMs"
            checked={privacy.allowMessages}
            onChange={(v) => {
              setPrivacy((c) => ({ ...c, allowMessages: v }));
              void patchSetting("privacy", "allowMessages", v);
            }}
          />
        </div>
      </SettingsSection>

      <SettingsSection title="⚙️ Preferences" subtitle="Saved automatically">
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="settings-language">Language</FieldLabel>
          <div className="relative">
            <Globe className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted/80" />
            <select
              id="settings-language"
              value={preferences.language}
              onChange={(e) => {
                const value = e.target.value;
                setPreferences((c) => ({ ...c, language: value }));
                void patchSetting("preferences", "language", value);
              }}
              className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-white/20 bg-white/5 pl-10 pr-4 text-sm text-white focus:border-brand-magenta focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink"
            >
              {languageOptions.map((lang) => (
                <option key={lang} value={lang} className="bg-background">
                  {lang}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          {(Object.keys(preferences) as Array<keyof AppPreferences>)
            .filter((key) => key !== "language")
            .map((key) => (
              <SettingsToggle
                key={key}
                label={key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                checked={preferences[key] as boolean}
                onChange={(v) => {
                  setPreferences((c) => ({ ...c, [key]: v }));
                  void patchSetting("preferences", key, v);
                }}
              />
            ))}
        </div>
      </SettingsSection>

      {status ? (
        <p className="text-center text-sm font-medium text-emerald-400">{status}</p>
      ) : null}
      {error ? (
        <p className="text-center text-sm font-medium text-red-400">{error}</p>
      ) : null}

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex cursor-pointer items-center justify-center gap-2 rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
        >
          <LogOut className="size-4" />
          Sign Out
        </button>
      </div>

      <SettingsSection
        title="⚠️ Danger zone"
        subtitle="Irreversible account actions"
        className="border border-red-500/20"
      >
        <div className="flex flex-col gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleClearHistory()}
            className={cn(
              "flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-orange-500/50 px-5 py-2.5 text-sm font-semibold text-orange-300 transition-colors hover:bg-orange-500/10 sm:w-auto",
            )}
          >
            <Trash2 className="size-4" />
            Clear watch & listen history
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleDeleteAccount()}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-red-500/50 px-5 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10 sm:w-auto"
          >
            <Trash2 className="size-4" />
            Delete account permanently
          </button>
        </div>
      </SettingsSection>
    </div>
  );
}
