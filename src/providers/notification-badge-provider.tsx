import { useEffect, type ReactNode } from "react";
import * as Notifications from "expo-notifications";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getNotifications } from "@/api/notifications";
import { NOTIFICATIONS_QUERY_KEY } from "@/hooks/use-notifications";
import { useAuth } from "@/providers/auth-provider";
import { LIVE_SYNC_INTERVAL } from "@/lib/query-client";

/**
 * Keeps the home-screen icon badge equal to the unread notification count,
 * the way a chat app's icon does. Pushes carry the same number so the badge
 * is right while the app is closed; this keeps it right while it runs, and
 * clears it on sign-out.
 */
export const NotificationBadgeProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { status } = useAuth();
  const queryClient = useQueryClient();
  const enabled = status === "authenticated";

  const query = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: getNotifications,
    enabled,
    refetchInterval: LIVE_SYNC_INTERVAL,
  });
  const unread = query.data?.unread ?? 0;

  useEffect(() => {
    if (!enabled) {
      void Notifications.setBadgeCountAsync(0).catch(() => {});
      return;
    }
    if (!query.data) return;
    void Notifications.setBadgeCountAsync(Math.max(0, unread)).catch(() => {});
  }, [enabled, query.data, unread]);

  useEffect(() => {
    if (!enabled) return;
    // A push is the fastest signal that the feed changed while the socket was
    // asleep; refetch so the badge lands on the same count as the tray.
    const subscription = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    });
    return () => subscription.remove();
  }, [enabled, queryClient]);

  return <>{children}</>;
};
