const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (value: string) => EMAIL_RE.test(value.trim());

/** Mirrors ASP.NET Identity: at least 8 characters and one digit. */
export const passwordProblem = (value: string): string | null => {
  if (value.length < 8) return "Use at least 8 characters.";
  if (!/\d/.test(value)) return "Include at least one digit (0-9).";
  if (!/[a-z]/.test(value)) return "Include at least one lowercase letter.";
  return null;
};

export const normalizePhone = (value: string) =>
  value.replace(/[\s()-]/g, "").trim();

/** Accepts E.164 only, matching the backend's PhoneNumbers.Normalize. */
export const isValidPhone = (value: string) =>
  /^\+[1-9]\d{6,15}$/.test(normalizePhone(value));

export const clampText = (value: string, max: number) => value.slice(0, max);

export const isNumericCode = (value: string) => /^\d{4,8}$/.test(value);
