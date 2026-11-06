import Constants from "expo-constants";

type Extra = {
  apiUrl?: unknown;
  jitsiDomain?: unknown;
  appEnv?: unknown;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const PRODUCTION_API_URL = "https://anaquran.runasp.net";

const readApiUrl = () => {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  const fromConfig = typeof extra.apiUrl === "string" ? extra.apiUrl.trim() : "";
  return (fromEnv || fromConfig).replace(/\/+$/, "");
};

const readJitsiDomain = () => {
  const fromEnv = process.env.EXPO_PUBLIC_JITSI_DOMAIN?.trim();
  const fromConfig =
    typeof extra.jitsiDomain === "string" ? extra.jitsiDomain.trim() : "";
  return (fromEnv || fromConfig || "meet.143-47-237-128.sslip.io")
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
};

export const API_BASE_URL = readApiUrl();
export const JITSI_DOMAIN = readJitsiDomain();

/**
 * Baked in at build time, but re-derived from the API origin when it is
 * missing so a build that only set EXPO_PUBLIC_API_URL is still labelled by
 * what it actually talks to.
 */
export const APP_ENV: "development" | "production" =
  process.env.EXPO_PUBLIC_APP_ENV?.trim() ||
  (typeof extra.appEnv === "string" && extra.appEnv.trim()
    ? extra.appEnv.trim()
    : API_BASE_URL.replace(/\/+$/, "") === PRODUCTION_API_URL
      ? "production"
      : "development");

export const IS_DEVELOPMENT = APP_ENV !== "production";
