import Constants from "expo-constants";

type Extra = {
  apiUrl?: unknown;
  jitsiDomain?: unknown;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

const readApiUrl = () => {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  const fromConfig = typeof extra.apiUrl === "string" ? extra.apiUrl.trim() : "";
  return (fromEnv || fromConfig).replace(/\/+$/, "");
};

const readJitsiDomain = () => {
  const fromEnv = process.env.EXPO_PUBLIC_JITSI_DOMAIN?.trim();
  const fromConfig =
    typeof extra.jitsiDomain === "string" ? extra.jitsiDomain.trim() : "";
  return (fromEnv || fromConfig || "meet.jit.si")
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
};

export const API_BASE_URL = readApiUrl();
export const JITSI_DOMAIN = readJitsiDomain();
