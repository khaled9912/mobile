import { useSyncExternalStore } from "react";
import * as SecureStore from "expo-secure-store";

const ENABLED_KEY = "anaquran.api-debug.v1";
const MAX_ENTRIES = 100;

export type ApiDebugEntry = {
  id: string;
  method: string;
  path: string;
  startedAt: number;
  durationMs: number | null;
  /** HTTP status, or null while the request is in flight or failed to connect. */
  status: number | null;
  request: unknown;
  response: unknown;
  error: string | null;
};

let entries: ApiDebugEntry[] = [];
let enabled = false;
let sequence = 0;

const entryListeners = new Set<() => void>();
const enabledListeners = new Set<() => void>();

const emitEntries = () => {
  for (const listener of entryListeners) listener();
};
const emitEnabled = () => {
  for (const listener of enabledListeners) listener();
};

export const subscribeApiDebug = (listener: () => void) => {
  entryListeners.add(listener);
  return () => {
    entryListeners.delete(listener);
  };
};

export const getApiDebugEntries = () => entries;

export const subscribeApiDebugEnabled = (listener: () => void) => {
  enabledListeners.add(listener);
  return () => {
    enabledListeners.delete(listener);
  };
};

export const isApiDebugEnabled = () => enabled;

export const useApiDebugEntries = () =>
  useSyncExternalStore(subscribeApiDebug, getApiDebugEntries, getApiDebugEntries);

export const useApiDebugEnabled = () =>
  useSyncExternalStore(
    subscribeApiDebugEnabled,
    isApiDebugEnabled,
    isApiDebugEnabled
  );

export const clearApiDebugEntries = () => {
  entries = [];
  emitEntries();
};

/** Reads the persisted flag once at startup. */
export const hydrateApiDebug = async () => {
  try {
    enabled = (await SecureStore.getItemAsync(ENABLED_KEY)) === "1";
  } catch {
    enabled = false;
  }
  emitEnabled();
};

export const setApiDebugEnabled = async (next: boolean) => {
  enabled = next;
  emitEnabled();
  if (!next) clearApiDebugEntries();
  try {
    await SecureStore.setItemAsync(ENABLED_KEY, next ? "1" : "0");
  } catch {
    // The in-memory switch still works for this session.
  }
};

const SECRET_FIELD = /password|token|secret|otp|authorization|cookie/i;
const SECRET_EXACT = new Set(["code", "pin"]);

const sanitize = (value: unknown, depth = 0): unknown => {
  if (depth > 8) return "[nested]";
  if (Array.isArray(value)) return value.map((item) => sanitize(item, depth + 1));
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] =
        SECRET_FIELD.test(key) || SECRET_EXACT.has(key.toLowerCase())
          ? "[redacted]"
          : sanitize(item, depth + 1);
    }
    return result;
  }
  if (typeof value === "string" && value.length > 4000) {
    return `${value.slice(0, 4000)}…`;
  }
  return value;
};

export type ApiDebugHandle = {
  succeed: (status: number, response: unknown) => void;
  fail: (message: string) => void;
};

export const beginApiDebug = (input: {
  method: string;
  path: string;
  request?: unknown;
}): ApiDebugHandle | null => {
  if (!enabled) return null;

  const id = `${Date.now()}-${sequence++}`;
  const startedAt = Date.now();
  const entry: ApiDebugEntry = {
    id,
    method: input.method,
    path: input.path,
    startedAt,
    durationMs: null,
    status: null,
    request: input.request === undefined ? null : sanitize(input.request),
    response: null,
    error: null,
  };
  entries = [entry, ...entries].slice(0, MAX_ENTRIES);
  emitEntries();

  const update = (patch: Partial<ApiDebugEntry>) => {
    const index = entries.findIndex((item) => item.id === id);
    if (index === -1) return;
    const next = [...entries];
    next[index] = { ...next[index], ...patch };
    entries = next;
    emitEntries();
  };

  return {
    succeed: (status, response) =>
      update({
        status,
        durationMs: Date.now() - startedAt,
        response: response === undefined ? null : sanitize(response),
      }),
    fail: (message) =>
      update({
        status: null,
        durationMs: Date.now() - startedAt,
        error: message,
      }),
  };
};
