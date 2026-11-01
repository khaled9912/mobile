import NetInfo from "@react-native-community/netinfo";
import { QueryClient, focusManager, onlineManager } from "@tanstack/react-query";
import { AppState } from "react-native";
import { ApiError } from "@/api/client";

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(
      Boolean(state.isConnected && state.isInternetReachable !== false)
    );
  })
);

focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener("change", (status) => {
    handleFocus(status === "active");
  });
  return () => subscription.remove();
});

/**
 * Class and request screens re-fetch on this cadence while the app is active,
 * so an approval or status change made by another role appears without a manual
 * refresh. True push updates would need a server-side channel.
 */
export const LIVE_SYNC_INTERVAL = 60_000;

const shouldRetry = (failureCount: number, error: unknown) => {
  if (error instanceof ApiError) {
    if (error.status === 0) return failureCount < 2;
    if (error.status >= 400 && error.status < 500) return false;
  }
  return failureCount < 2;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      staleTime: 20_000,
      gcTime: 10 * 60_000,
      refetchOnReconnect: true,
    },
    mutations: { retry: 0 },
  },
});
