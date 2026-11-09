import { useEffect, useRef, type ReactNode } from "react";
import * as Notifications from "expo-notifications";
import { useQuery } from "@tanstack/react-query";
import { getNotifications } from "@/api/notifications";
import { NOTIFICATIONS_QUERY_KEY } from "@/hooks/use-notifications";
import { useAuth } from "@/providers/auth-provider";
import { LIVE_SYNC_INTERVAL } from "@/lib/query-client";
import {
  DEFAULT_NOTIFICATION_CHANNEL_ID,
  ensureNotificationChannel,
} from "@/lib/notification-channels";

/**
 * Anything older than this arrived while the app was asleep, so it belongs to
 * the list rather than a burst of banners and sounds the moment it wakes.
 */
const FRESH_WINDOW_MS = 5 * 60_000;

/**
 * Puts new feed entries in the notification tray, the way a chat app does.
 * Server push covers a closed app; this covers the app running in the
 * foreground or background on an install that has no push token yet.
 */
export const NotificationTrayProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { status } = useAuth();
  const enabled = status === "authenticated";
  const seen = useRef<Set<string> | null>(null);

  const query = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: getNotifications,
    enabled,
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  useEffect(() => {
    if (!enabled) {
      seen.current = null;
      return;
    }
    const items = query.data?.items;
    if (!items) return;
    // A feed loaded on arrival is history, not news.
    if (!seen.current) {
      seen.current = new Set(items.map((item) => item.id));
      return;
    }
    const known = seen.current;
    const arrivals = items.filter((item) => !known.has(item.id));
    if (!arrivals.length) return;
    for (const item of arrivals) known.add(item.id);

    const now = Date.now();
    void (async () => {
      await ensureNotificationChannel();
      for (const item of arrivals) {
        if (now - new Date(item.createdAt).getTime() > FRESH_WINDOW_MS) {
          continue;
        }
        try {
          // The identifier means a re-render of the same arrival cannot stack
          // a second banner on top of the first.
          await Notifications.scheduleNotificationAsync({
            identifier: `feed:${item.id}`,
            content: {
              title: item.title,
              body: item.body,
              sound: "default",
              data: { link: item.link ?? "", notificationId: item.id },
            },
            trigger: { channelId: DEFAULT_NOTIFICATION_CHANNEL_ID },
          });
        } catch {
          // A denied permission leaves the in-app feed as the only copy.
        }
      }
    })().catch(() => {});
  }, [enabled, query.data]);

  return <>{children}</>;
};
