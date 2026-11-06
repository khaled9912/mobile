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
import { isLessonCall } from "@/lib/lesson-call-notifications";

Notifications.setNotificationHandler({
  handleNotification: async (notification) => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    // Only a call earns a badge; reminders and routine notices stay uncounted.
    shouldSetBadge: isLessonCall(notification),
  }),
});

const lessonIdFrom = (response: Notifications.NotificationResponse | null) => {
  const lessonId = response?.notification.request.content.data?.lessonId;
  return typeof lessonId === "string" && lessonId ? lessonId : null;
};

/** Server-side pushes carry the screen to open; local reminders carry a lesson id. */
const linkFrom = (response: Notifications.NotificationResponse | null) => {
  const link = response?.notification.request.content.data?.link;
  return typeof link === "string" && link.startsWith("/") && !link.startsWith("//")
    ? link
    : null;
};

const openLesson = (lessonId: string) => {
  router.push({ pathname: "/lesson/[id]", params: { id: lessonId } });
};

/**
 * Keeps two local notifications per upcoming lesson on this device: five
 * minutes before the start and again at the start. Students, teachers, and
 * admins each see the lessons the API returns for their own account.
 */
export const LessonReminderProvider = ({ children }: { children: ReactNode }) => {
  const { user, status } = useAuth();
  const authenticated = status === "authenticated" && Boolean(user);
  const role = user?.role ?? "student";
  // Support reviewers have no lessons of their own; the lessons endpoint would
  // return every lesson in the academy for them.
  const remindersEnabled = authenticated && role !== "support";
  const handled = useRef(new Set<string>());

  const lessonsQuery = useQuery({
    queryKey: ["lessons"],
    queryFn: getLessons,
    enabled: remindersEnabled,
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  useEffect(() => {
    if (!remindersEnabled) {
      void cancelLessonReminders();
      return;
    }
    // Wait for a real fetch: an offline launch must keep last launch's reminders.
    if (!lessonsQuery.data) return;
    const now = Date.now();
    const reminders = buildLessonReminders(lessonsQuery.data, role, now);
    const activeLessonIds = new Set(
      lessonsQuery.data
        .filter(
          (lesson) =>
            lesson.status === "scheduled" &&
            new Date(lesson.endsAt).getTime() > now
        )
        .map((lesson) => lesson.id)
    );
    void syncLessonReminders(reminders, activeLessonIds);
  }, [remindersEnabled, lessonsQuery.data, role]);

  useEffect(() => {
    if (!authenticated) return;

    const handle = (response: Notifications.NotificationResponse | null) => {
      const identifier = response?.notification.request.identifier;
      if (!identifier || handled.current.has(identifier)) return;
      handled.current.add(identifier);
      const link = linkFrom(response);
      if (link) {
        router.push(link);
        return;
      }
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
