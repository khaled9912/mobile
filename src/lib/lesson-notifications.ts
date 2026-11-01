import * as Notifications from "expo-notifications";
import {
  AndroidImportance,
  AndroidNotificationVisibility,
} from "expo-notifications";
import { Platform } from "react-native";
import type { LessonReminder } from "@/lib/lesson-reminders";

export const LESSON_CHANNEL_ID = "lesson-reminders";

const IDENTIFIER_PREFIX = "lesson-reminder:";

const ensureChannel = async () => {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(LESSON_CHANNEL_ID, {
    name: "Lesson reminders",
    description: "Reminders five minutes before each lesson and at its start",
    importance: AndroidImportance.HIGH,
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
  });
};

/** Cancels only reminders owned by the lesson scheduler. */
export const cancelLessonReminders = async () => {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((request) => request.identifier.startsWith(IDENTIFIER_PREFIX))
        .map((request) =>
          Notifications.cancelScheduledNotificationAsync(request.identifier)
        )
    );
  } catch {
    // Reminders are best-effort; never block the app on them.
  }
};

/**
 * Replaces every pending lesson reminder with the supplied list. Also asks for
 * notification permission the first time it runs after sign-in.
 */
let permissionRequested = false;
let pendingSync: Promise<void> = Promise.resolve();

const runSync = async (reminders: LessonReminder[]) => {
  await cancelLessonReminders();

  try {
    await ensureChannel();

    let permission = await Notifications.getPermissionsAsync();
    if (
      !permission.granted &&
      permission.canAskAgain &&
      !permissionRequested
    ) {
      permissionRequested = true;
      permission = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: false, allowSound: true },
      });
    }
    if (!permission.granted) return;

    for (const reminder of reminders) {
      try {
        await Notifications.scheduleNotificationAsync({
          identifier: `${IDENTIFIER_PREFIX}${reminder.lessonId}:${reminder.kind}`,
          content: {
            title: reminder.title,
            body: reminder.body,
            sound: "default",
            data: { lessonId: reminder.lessonId },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminder.triggerAt,
            channelId: LESSON_CHANNEL_ID,
          },
        });
      } catch {
        // One failed reminder must not stop the rest.
      }
    }
  } catch {
    // Best-effort.
  }
};

export const syncLessonReminders = (reminders: LessonReminder[]) => {
  pendingSync = pendingSync
    .then(() => runSync(reminders))
    .catch(() => {});
  return pendingSync;
};
