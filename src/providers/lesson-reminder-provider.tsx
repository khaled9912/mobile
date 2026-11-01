import { useEffect, useRef, type ReactNode } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getLessons } from "@/api/lessons";
import { useAuth } from "@/providers/auth-provider";
import { LIVE_SYNC_INTERVAL } from "@/lib/query-client";
import { buildLessonReminders } from "@/lib/lesson-reminders";
import {
  cancelLessonReminders,
  syncLessonReminders,
} from "@/lib/lesson-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const lessonIdFrom = (response: Notifications.NotificationResponse | null) => {
  const lessonId = response?.notification.request.content.data?.lessonId;
  return typeof lessonId === "string" && lessonId ? lessonId : null;
};

const openLesson = (lessonId: string) => {
  router.push({ pathname: "/lesson/[id]", params: { id: lessonId } });
};

/**
 * Keeps one local notification per upcoming lesson on this device, five
 * minutes before the start. Students, teachers, and admins each see the
 * lessons the API returns for their own account.
 */
export const LessonReminderProvider = ({ children }: { children: ReactNode }) => {
  const { user, status } = useAuth();
  const authenticated = status === "authenticated" && Boolean(user);
  const role = user?.role ?? "student";
  const handled = useRef(new Set<string>());

  const lessonsQuery = useQuery({
    queryKey: ["lessons"],
    queryFn: getLessons,
    enabled: authenticated,
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  useEffect(() => {
    if (!authenticated) {
      void cancelLessonReminders();
      return;
    }
    // Wait for a real fetch: an offline launch must keep last launch's reminders.
    if (!lessonsQuery.data) return;
    const reminders = buildLessonReminders(lessonsQuery.data, role, Date.now());
    void syncLessonReminders(reminders);
  }, [authenticated, lessonsQuery.data, role]);

  useEffect(() => {
    if (!authenticated) return;

    const handle = (response: Notifications.NotificationResponse | null) => {
      const identifier = response?.notification.request.identifier;
      if (!identifier || handled.current.has(identifier)) return;
      handled.current.add(identifier);
      const lessonId = lessonIdFrom(response);
      if (lessonId) openLesson(lessonId);
    };

    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        handle(response);
        void Notifications.clearLastNotificationResponseAsync();
      })
      .catch(() => {});

    const subscription =
      Notifications.addNotificationResponseReceivedListener(handle);
    return () => subscription.remove();
  }, [authenticated]);

  return <>{children}</>;
};
