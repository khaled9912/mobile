function normalizeRegistrationCountry(
  value: string | null | undefined
): string | null {
  const code = value?.trim().toUpperCase() ?? "";
  return /^[A-Z]{2}$/.test(code) && code !== "XX" ? code : null;
}

/**
 * Best-effort country hint from the device locale, e.g. "en-US" -> "US".
 * Registration is open worldwide, so this only labels the learner's region for
 * the academy; it never gates sign-up.
 */
export function getDeviceCountry(): string | null {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const match = locale.match(/[-_]([A-Za-z]{2})\b/);
    return normalizeRegistrationCountry(match?.[1]);
  } catch {
    return null;
  }
}
