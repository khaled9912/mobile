import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import {
  HubConnection,
  HubConnectionBuilder,
  HttpTransportType,
  LogLevel,
} from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/providers/auth-provider";

/**
 * Change events carry no data: each scope invalidates the query-key prefixes
 * it can affect, and the REST layer refreshes them. A slow refetchInterval
 * stays in place as a safety net if the socket is unavailable.
 */
const SCOPE_QUERY_KEYS: Record<string, string[][]> = {
  lessons: [
    ["lessons"],
    ["series"],
    ["change-requests"],
    ["lesson-ops"],
    ["profile", "reports"],
  ],
  admin: [
    ["admin"],
    ["lessons"],
    ["change-requests"],
  ],
  directory: [
    ["teacher-directory"],
    ["assigned-teacher"],
    ["admin", "students"],
    ["admin", "teachers"],
    ["admin", "assignments"],
    ["admin", "support-users"],
    ["teacher-profile"],
    ["series"],
  ],
  offers: [["open-offers"], ["assigned-teacher"], ["teacher-directory"]],
  billing: [
    ["billing"],
    ["admin", "salary"],
    ["admin", "hours"],
    ["admin", "penalties"],
    ["admin", "reliability"],
  ],
  policy: [["lesson-policy"]],
  notifications: [["notifications"]],
  calls: [["lesson-calls"], ["lesson-ops"]],
  support: [["reviews"]],
};

const TICKET_REFRESH_MARGIN_MS = 30_000;
const INVALIDATE_DEBOUNCE_MS = 250;

type RealtimeTicket = { token: string; expiresAt: string; hub: string };
type ChangedEvent = { scope?: string };

interface RealtimeConnectionValue {
  /** Null while the socket is down; consumers can safely wait for it. */
  connection: HubConnection | null;
  /** Bumped on every successful (re)connect so consumers can re-subscribe. */
  revision: number;
}

const RealtimeConnectionContext = createContext<RealtimeConnectionValue>({
  connection: null,
  revision: 0,
});

/**
 * Escape hatch for features that need the live socket itself (lesson pens).
 * Query invalidation stays in the provider; UI code should not join groups
 * without a concrete reason.
 */
export const useRealtimeConnection = () =>
  useContext(RealtimeConnectionContext);

const resolveHubUrl = (ticket: RealtimeTicket) => {
  const override = (process.env.EXPO_PUBLIC_REALTIME_URL ?? "")
    .trim()
    .replace(/\/+$/, "");
  if (!override) return ticket.hub;
  return override.endsWith("/api/realtime/hub")
    ? override
    : `${override}/api/realtime/hub`;
};

export const RealtimeProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const isAuthenticated = Boolean(user);
  const queryClient = useQueryClient();
  const ticketRef = useRef<RealtimeTicket | null>(null);
  const [liveConnection, setLiveConnection] = useState<HubConnection | null>(
    null
  );
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;

    // A cached ticket belongs to the session that requested it.
    ticketRef.current = null;
    let stopped = false;
    let paused = AppState.currentState !== "active";
    let connection: HubConnection | null = null;
    let starting = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let retryAttempts = 0;
    let pendingScopes = new Set<string>();
    let flushTimer: ReturnType<typeof setTimeout> | undefined;

    const fetchTicket = async (): Promise<RealtimeTicket> => {
      const cached = ticketRef.current;
      if (
        cached &&
        Date.parse(cached.expiresAt) - Date.now() > TICKET_REFRESH_MARGIN_MS
      ) {
        return cached;
      }
      const next = await apiFetch<RealtimeTicket>("/api/realtime/ticket");
      ticketRef.current = next;
      return next;
    };

    const invalidateScope = (scope: string) => {
      const keys = SCOPE_QUERY_KEYS[scope];
      if (!keys) {
        void queryClient.invalidateQueries();
        return;
      }
      for (const key of keys) void queryClient.invalidateQueries({ queryKey: key });
    };

    const flushScopes = () => {
      flushTimer = undefined;
      const scopes = pendingScopes;
      pendingScopes = new Set();
      for (const scope of scopes) invalidateScope(scope);
    };

    const onChanged = (change: ChangedEvent) => {
      if (paused) return;
      const scope = (change?.scope ?? "").trim();
      if (!scope || scope === "self") return;
      pendingScopes.add(scope);
      if (flushTimer === undefined) {
        flushTimer = setTimeout(flushScopes, INVALIDATE_DEBOUNCE_MS);
      }
    };

    const scheduleRetry = () => {
      if (stopped || paused || retryTimer !== undefined) return;
      retryAttempts += 1;
      const delay = Math.min(60_000, 1_000 * 2 ** Math.min(retryAttempts, 6));
      retryTimer = setTimeout(() => {
        retryTimer = undefined;
        void start();
      }, delay);
    };

    const start = async () => {
      if (stopped || paused || connection || starting) return;
      starting = true;
      try {
        const ticket = await fetchTicket();
        if (stopped || paused) return;
        const next = new HubConnectionBuilder()
          .withUrl(resolveHubUrl(ticket), {
            accessTokenFactory: async () => (await fetchTicket()).token,
            skipNegotiation: true,
            transport: HttpTransportType.WebSockets,
          })
          .withAutomaticReconnect([0, 2_000, 5_000, 10_000, 20_000])
          .configureLogging(
            __DEV__ ? LogLevel.Warning : LogLevel.Error
          )
          .build();
        next.on("Changed", onChanged);
        next.onreconnected(() => {
          retryAttempts = 0;
          void queryClient.invalidateQueries();
          setRevision((value) => value + 1);
        });
        next.onclose(() => {
          connection = null;
          setLiveConnection(null);
          scheduleRetry();
        });
        await next.start();
        if (stopped || paused) {
          await next.stop();
          return;
        }
        connection = next;
        retryAttempts = 0;
        setLiveConnection(next);
        setRevision((value) => value + 1);
      } catch {
        scheduleRetry();
      } finally {
        starting = false;
      }
    };

    const stop = async () => {
      if (retryTimer !== undefined) {
        clearTimeout(retryTimer);
        retryTimer = undefined;
      }
      const current = connection;
      connection = null;
      setLiveConnection(null);
      if (current) {
        try {
          await current.stop();
        } catch {
          // The socket may already be gone after the OS suspends the app.
        }
      }
    };

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        if (!paused) return;
        paused = false;
        void start();
        // Changes published while the app was asleep were never delivered.
        void queryClient.invalidateQueries();
        return;
      }
      paused = true;
      void stop();
    });

    const netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      if (!(state.isConnected && state.isInternetReachable !== false)) return;
      if (connection) void queryClient.invalidateQueries();
      else if (!paused) void start();
    });

    void start();

    return () => {
      stopped = true;
      appStateSubscription.remove();
      netInfoUnsubscribe();
      if (flushTimer !== undefined) clearTimeout(flushTimer);
      void stop();
    };
  }, [isAuthenticated, queryClient]);

  const connectionValue = useMemo(
    () => ({ connection: liveConnection, revision }),
    [liveConnection, revision]
  );

  return (
    <RealtimeConnectionContext.Provider value={connectionValue}>
      {children}
    </RealtimeConnectionContext.Provider>
  );
};
