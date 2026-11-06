export const REGISTRATION_COUNTRIES = [
  "US",
  "GB",
  "CA",
  "AU",
  "NZ",
  "IE",
] as const;

export const REGISTRATION_COUNTRY_LABEL =
  "United States, United Kingdom, Canada, Australia, New Zealand, and Ireland";

export const REGISTRATION_BLOCKED_MESSAGE = `Registration is currently available only to students in ${REGISTRATION_COUNTRY_LABEL}.`;

export function normalizeRegistrationCountry(
  value: string | null | undefined
): string | null {
  const code = value?.trim().toUpperCase() ?? "";
  return /^[A-Z]{2}$/.test(code) && code !== "XX" ? code : null;
}

/** Unknown region fails open; the API still checks the value it receives. */
export function isRegistrationAllowed(
  value: string | null | undefined
): boolean {
  const code = normalizeRegistrationCountry(value);
  return (
    code === null ||
    (REGISTRATION_COUNTRIES as readonly string[]).includes(code)
  );
}

/**
 * Best-effort country hint from the device locale, e.g. "en-US" -> "US".
 * The app has no IP geolocation, so this is a UX gate rather than proof of
 * the learner's location.
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
