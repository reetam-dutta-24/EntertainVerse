/**
 * Helpers for auth page query params (`callbackUrl`, `error`).
 * Shared by the login/signup pages and the NextAuth config.
 */

export const DEFAULT_POST_AUTH_PATH = "/dashboard";

/** Custom error code used when an OAuth provider reports an unverified email. */
export const OAUTH_EMAIL_NOT_VERIFIED = "OAuthEmailNotVerified";

/** Custom error code used when the provider succeeded but saving the user failed. */
export const OAUTH_ACCOUNT_SAVE_FAILED = "OAuthAccountSaveFailed";

/** Only allow same-origin relative paths so `callbackUrl` can't open-redirect. */
export function safeCallbackUrl(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return undefined;
  }
  if (raw.startsWith("/login") || raw.startsWith("/signup") || raw.startsWith("/api/auth")) {
    return undefined;
  }
  return raw;
}

/** Map NextAuth sign-in / error page codes to copy shown on the auth card. */
export function authErrorMessage(code: string | string[] | undefined): string | null {
  const error = Array.isArray(code) ? code[0] : code;
  if (!error) return null;

  switch (error) {
    case OAUTH_EMAIL_NOT_VERIFIED:
      return "Your Google account email isn't verified. Verify it with Google and try again.";
    case OAUTH_ACCOUNT_SAVE_FAILED:
      return "Google sign-in worked, but we couldn't load your account. Please try again shortly.";
    case "OAuthAccountNotLinked":
      return "This email is already linked to a different sign-in method.";
    case "AccessDenied":
      return "Sign-in was cancelled or denied. Please try again.";
    case "OAuthSignin":
    case "OAuthCallback":
    case "OAuthCallbackError":
    case "OAuthCreateAccount":
    case "Callback":
      return "We couldn't complete sign-in with that provider. Please try again.";
    case "Configuration":
      return "Social sign-in is misconfigured on the server. Please use email for now.";
    case "SessionRequired":
      return "Please sign in to continue.";
    case "CredentialsSignin":
      return "Invalid email/username or password.";
    default:
      return "Something went wrong while signing you in. Please try again.";
  }
}
