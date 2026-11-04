import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getCurrentUser,
  logout as logoutRequest,
} from "@/api/auth";
import { ApiError, onUnauthorized } from "@/api/client";
import type { UserProfile, UserRole } from "@/api/types";
import { clearApiDebugEntries } from "@/lib/api-debug";
import {
  clearCachedSession,
  readCachedSession,
  writeCachedSession,
} from "@/lib/storage";

type AuthStatus = "restoring" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  user: UserProfile | null;
  role: UserRole | null;
  status: AuthStatus;
  /** True once the encrypted identity cache has been read (splash can hide). */
  hydrated: boolean;
  /** True while the cached identity is being revalidated with /auth/me. */
  revalidating: boolean;
  /** True when the cached identity is shown because the API is unreachable. */
  offlineSession: boolean;
  restoreError: string | null;
  applySession: (user: UserProfile) => void;
  updateUser: (user: UserProfile) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>("restoring");
  const [hydrated, setHydrated] = useState(false);
  const [revalidating, setRevalidating] = useState(false);
  const [offlineSession, setOfflineSession] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const mounted = useRef(true);
  const confirmingSession = useRef<Promise<UserProfile | null> | null>(null);

  const clearLocalSession = useCallback(() => {
    setUser(null);
    setStatus("unauthenticated");
    setOfflineSession(false);
    void clearCachedSession();
    clearApiDebugEntries();
    queryClient.clear();
  }, [queryClient]);

  const applySession = useCallback((next: UserProfile) => {
    setUser(next);
    setStatus("authenticated");
    setOfflineSession(false);
    setRestoreError(null);
    void writeCachedSession(next);
  }, []);

  const updateUser = useCallback((next: UserProfile) => {
    setUser(next);
    void writeCachedSession(next);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // The local session is cleared even when the API is unreachable.
    }
    clearLocalSession();
  }, [clearLocalSession]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // A single 401 is not proof that the cookie is gone: Android stores cookies
  // through the WebView cookie manager, which is created lazily on the first
  // request after a cold start and can lose that race. Confirm with /auth/me
  // before ending the session, and never end it when the API is unreachable.
  const confirmSession = useCallback(() => {
    if (!confirmingSession.current) {
      confirmingSession.current = getCurrentUser().finally(() => {
        confirmingSession.current = null;
      });
    }
    return confirmingSession.current;
  }, []);

  useEffect(
    () =>
      onUnauthorized(() => {
        void (async () => {
          try {
            const fresh = await confirmSession();
            if (fresh) applySession(fresh);
            else clearLocalSession();
          } catch {
            // Confirmation needs the network; keep the cached session and let
            // the next request decide.
          }
        })();
      }),
    [applySession, clearLocalSession, confirmSession]
  );

  useEffect(() => {
    let active = true;

    const restore = async () => {
      const cached = await readCachedSession();
      if (!active) return;
      if (cached) {
        setUser(cached.user);
        setStatus("authenticated");
      }
      setHydrated(true);

      setRevalidating(true);
      try {
        let fresh = await getCurrentUser();
        if (!active) return;
        if (!fresh && cached) {
          // The Android cookie store initialises in the background, so the
          // very first request of a cold start can be sent without cookies.
          // Retry once before treating the cached session as expired.
          await new Promise((resolve) => setTimeout(resolve, 900));
          if (!active) return;
          fresh = await getCurrentUser();
        }
        if (!fresh) {
          // No cookie (or it expired): the cached preview must not persist.
          setUser(null);
          setStatus("unauthenticated");
          setOfflineSession(false);
          void clearCachedSession();
          queryClient.clear();
          return;
        }
        applySession(fresh);
      } catch (error) {
        if (!active) return;
        if (error instanceof ApiError && error.isNetworkError && cached) {
          setOfflineSession(true);
          setStatus("authenticated");
          return;
        }
        if (!cached) {
          setUser(null);
          setStatus("unauthenticated");
          setRestoreError(
            error instanceof ApiError
              ? error.message
              : "Unable to restore your session."
          );
        }
      } finally {
        if (active) setRevalidating(false);
      }
    };

    void restore();
    return () => {
      active = false;
    };
    // Runs once per app launch; clearLocalSession/applySession are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      status,
      hydrated,
      revalidating,
      offlineSession,
      restoreError,
      applySession,
      updateUser,
      signOut,
    }),
    [
      user,
      status,
      hydrated,
      revalidating,
      offlineSession,
      restoreError,
      applySession,
      updateUser,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
};

export const isAdminRole = (role: UserRole | null) =>
  role === "admin" || role === "super_admin";

export const canReviewLessons = (role: UserRole | null) =>
  role === "support" || isAdminRole(role);
