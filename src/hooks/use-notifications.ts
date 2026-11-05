import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/api/notifications";
import { useAuth } from "@/providers/auth-provider";
import { LIVE_SYNC_INTERVAL } from "@/lib/query-client";

export const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;

/** Shared feed for the bell badge and the notification sheet. */
export const useNotifications = () => {
  const { status } = useAuth();
  const queryClient = useQueryClient();
  const enabled = status === "authenticated";

  const query = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: getNotifications,
    enabled,
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });

  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => void refresh(),
  });
  const markAllRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => void refresh(),
  });

  return {
    enabled,
    items: query.data?.items ?? [],
    unread: query.data?.unread ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    markRead: markRead.mutate,
    markAllRead: markAllRead.mutate,
    markingAll: markAllRead.isPending,
  };
};
