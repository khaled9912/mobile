import * as SecureStore from "expo-secure-store";
import type { UserProfile } from "@/api/types";

const SESSION_KEY = "anaquran.session.v1";
const THEME_KEY = "anaquran.theme.v1";
const EXACT_ALARM_KEY = "anaquran.exact-alarm.v1";

export type CachedSession = {
  user: UserProfile;
  savedAt: number;
};

// SecureStore keeps the cached identity encrypted at rest. The HttpOnly auth
// cookie itself lives in the OS cookie jar and is never readable here.
export async function readCachedSession(): Promise<CachedSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedSession;
    if (!parsed?.user?.id || !parsed.user.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeCachedSession(user: UserProfile): Promise<void> {
  try {
    await SecureStore.setItemAsync(
      SESSION_KEY,
      JSON.stringify({ user, savedAt: Date.now() } satisfies CachedSession),
      { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }
    );
  } catch {
    // A missing cache only costs an extra /auth/me call next launch.
  }
}

export async function clearCachedSession(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch {
    // Ignore: the in-memory session is already cleared.
  }
}

export type ThemePreference = "system" | "light" | "dark";

// Light is the launch default; system/dark remain opt-in from Profile.
export async function readThemePreference(): Promise<ThemePreference> {
  try {
    const value = await SecureStore.getItemAsync(THEME_KEY);
    return value === "light" || value === "dark" || value === "system"
      ? value
      : "light";
  } catch {
    return "light";
  }
}

export async function writeThemePreference(
  preference: ThemePreference
): Promise<void> {
  try {
    await SecureStore.setItemAsync(THEME_KEY, preference);
  } catch {
    // Preference persistence is best-effort.
  }
}

export async function readExactAlarmPromptSeen(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(EXACT_ALARM_KEY)) === "1";
  } catch {
    // If the flag cannot be read, do not ask again.
    return true;
  }
}

export async function writeExactAlarmPromptSeen(): Promise<void> {
  try {
    await SecureStore.setItemAsync(EXACT_ALARM_KEY, "1");
  } catch {
    // Best-effort; worst case the prompt appears once more.
  }
}
