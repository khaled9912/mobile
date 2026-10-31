import { API_BASE_URL } from "@/config/env";

export type ValidationErrors = Record<string, string[]>;

const REQUEST_TIMEOUT_MS = 30_000;

export class ApiError extends Error {
  status: number;
  details: unknown;
  validationErrors?: ValidationErrors;

  constructor(
    message: string,
    status: number,
    details?: unknown,
    validationErrors?: ValidationErrors
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    this.validationErrors = validationErrors;
  }

  /** status 0 means the request never reached the API. */
  get isNetworkError() {
    return this.status === 0;
  }

  get isAuthError() {
    return this.status === 401;
  }
}

export class ApiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiConfigError";
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const statusMessage = (status: number): string => {
  switch (status) {
    case 401:
      return "Your session has expired. Please sign in again.";
    case 403:
      return "You do not have permission to do that.";
    case 404:
      return "The requested item could not be found.";
    case 408:
      return "The server took too long to respond. Please try again.";
    case 409:
      return "That change conflicts with an existing record.";
    case 429:
      return "Too many attempts. Please wait a moment and try again.";
    case 500:
      return "The server reported an error. Please try again.";
    case 502:
    case 503:
    case 504:
      return "The academy service is temporarily unavailable. Please try again in a moment.";
    default:
      return `The request failed (${status}).`;
  }
};

function readValidationErrors(payload: unknown): ValidationErrors | undefined {
  if (!isObject(payload) || !isObject(payload.errors)) return undefined;
  const entries = Object.entries(payload.errors).flatMap(([field, value]) => {
    const messages = (Array.isArray(value) ? value : [value])
      .filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0
      )
      .map((item) => item.trim());
    return messages.length ? [[field, messages] as const] : [];
  });
  return entries.length ? Object.fromEntries(entries) : undefined;
}

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export const onUnauthorized = (listener: UnauthorizedListener) => {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
};

const notifyUnauthorized = () => {
  for (const listener of unauthorizedListeners) listener();
};

// Endpoints where a 401 is an expected answer rather than an expired session.
const SILENT_401_PREFIXES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/password",
  "/api/auth/otp",
  "/api/auth/me",
  "/api/auth/logout",
];

export type ApiRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  json?: unknown;
  formData?: FormData;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
};

/**
 * All network access goes through here. Cookies are handled by the native OS
 * cookie jar (Expo's fetch), so `credentials: "include"` is required and no
 * token ever touches JavaScript.
 */
export async function apiFetch<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  if (!path.startsWith("/")) {
    throw new Error("API paths must start with '/'.");
  }
  if (!API_BASE_URL) {
    throw new ApiConfigError(
      "The API address is not configured. Set EXPO_PUBLIC_API_URL or rebuild the app."
    );
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...options.headers,
  };
  let body: BodyInit | undefined;
  if (options.formData) {
    // React Native sets the multipart boundary itself.
    body = options.formData;
  } else if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.json);
  }

  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? REQUEST_TIMEOUT_MS);
  const relayAbort = () => controller.abort();
  options.signal?.addEventListener("abort", relayAbort);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body,
      credentials: "include",
      signal: controller.signal,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    if (timedOut) {
      throw new ApiError(
        "The server took too long to respond. Please try again.",
        408
      );
    }
    throw new ApiError(
      "Can't reach the academy server. Check your connection and try again.",
      0,
      error
    );
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", relayAbort);
  }

  if (response.status === 204) return null as T;

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("json")
    ? await response.json().catch(() => null)
    : null;

  if (!response.ok) {
    if (
      response.status === 401 &&
      !SILENT_401_PREFIXES.some((prefix) => path.startsWith(prefix))
    ) {
      notifyUnauthorized();
    }
    const validationErrors = readValidationErrors(payload);
    const serverMessage = isObject(payload)
      ? (payload.message ?? payload.detail ?? payload.title ?? payload.error)
      : undefined;
    const message = validationErrors
      ? Object.values(validationErrors).flat().join(" ")
      : typeof serverMessage === "string" && serverMessage.trim()
        ? serverMessage
        : statusMessage(response.status);
    throw new ApiError(message, response.status, payload, validationErrors);
  }

  return payload as T;
}

/** Resolves API-relative asset paths such as `/api/users/{id}/avatar`. */
export const assetUrl = (path?: string | null) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
};
