import { API_BASE_URL, IS_DEVELOPMENT } from "@/config/env";
import { Badge } from "./badge";

const host = API_BASE_URL.replace(/^https?:\/\//, "").replace(/\/+$/, "");

/**
 * Production builds render nothing. A development build says so and names the
 * API it talks to, because the only difference between the two can be a single
 * environment variable at build time.
 */
export const EnvBadge = () =>
  IS_DEVELOPMENT ? <Badge label={`DEV · ${host}`} tone="warning" /> : null;
