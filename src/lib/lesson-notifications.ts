import * as Notifications from "expo-notifications";
import {
  AndroidImportance,
  AndroidNotificationVisibility,
} from "expo-notifications";
import { Alert, Platform } from "react-native";
import type { LessonReminder } from "@/lib/lesson-reminders";
import {
  readExactAlarmPromptSeen,
  writeExactAlarmPromptSeen,
} from "@/lib/storage";

export const LESSON_CHANNEL_ID = "lesson-reminders";

const IDENTIFIER_PREFIX = "lesson-reminder:";

/** A couple of milliseconds of drift is expected when a request is read back. */
const TRIGGER_TOLERANCE_MS = 5_000;

const identifierFor = (reminder: LessonReminder) =>
  `${IDENTIFIER_PREFIX}${reminder.lessonId}:${reminder.kind}`;

const lessonIdFor = (identifier: string) => {
  const rest = identifier.slice(IDENTIFIER_PREFIX.length);
  const separator = rest.lastIndexOf(":");
  return separator > 0 ? rest.slice(0, separator) : null;
};

type StoredTrigger = {
  type?: string;
  value?: unknown;
};

/**
 * iOS turns a date trigger into a one-shot `timeInterval` whose seconds never
 * tick down, so the absolute time cannot be recovered from the trigger alone.
 * The scheduled content carries `triggerAt`; Android's serialized date trigger
 * is the fallback for requests created before that field existed.
 */
const scheduledTriggerTime = (
  request: Notifications.NotificationRequest
): number | null => {
  const stored = request.content.data?.triggerAt;
  if (typeof stored === "number" && Number.isFinite(stored)) return stored;

  const trigger = request.trigger as StoredTrigger;
  if (trigger.type === "date" && typeof trigger.value === "number") {
    return trigger.value;
  }
  return null;
};

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

const pendingLessonReminders = async () => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.filter((request) =>
    request.identifier.startsWith(IDENTIFIER_PREFIX)
  );
};

const cancelScheduled = async (identifier: string) => {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // Already delivered or removed by the system.
  }
};

let lastSync: {
  reminders: LessonReminder[];
  activeLessonIds: Set<string>;
} | null = null;

/** Cancels only reminders owned by the lesson scheduler. */
export const cancelLessonReminders = async () => {
  lastSync = null;
  try {
    await Promise.all(
      (await pendingLessonReminders()).map((request) =>
        cancelScheduled(request.identifier)
      )
    );
  } catch {
    // Reminders are best-effort; never block the app on them.
  }
};

/**
 * Android 14+ denies `SCHEDULE_EXACT_ALARM` to fresh installs, which makes the
 * system defer lesson reminders by minutes. Ask once, then leave the choice to
 * the user; scheduling still works without it.
 */
const maybeAskForExactAlarms = async (hasReminders: boolean) => {
  if (Platform.OS !== "android" || !hasReminders) return;
  try {
    if (await readExactAlarmPromptSeen()) return;
    const permission = await Notifications.getExactAlarmPermissionsAsync();
    if (permission.granted) {
      await writeExactAlarmPromptSeen();
      return;
    }
    if (!permission.canAskAgain) return;

    await writeExactAlarmPromptSeen();
    Alert.alert(
      "Keep lesson reminders on time",
      "Android can hold reminders until the phone wakes up unless Ana Quran is allowed to set exact alarms. Turn on “Alarms & reminders” so the five-minute reminder arrives on time.",
      [
        { text: "Not now", style: "cancel" },
        {
          text: "Open settings",
          onPress: () => {
            Notifications.requestExactAlarmPermissionsAsync()
              .then((response) => {
                // Alarms scheduled before the grant were inexact, so replace
                // them now that Android will honour exact delivery.
                if (response.granted && lastSync) {
                  void syncLessonReminders(
                    lastSync.reminders,
                    lastSync.activeLessonIds,
                    true
                  );
                }
              })
              .catch(() => {
                // Some devices do not expose the exact-alarm settings screen.
              });
          },
        },
      ]
    );
  } catch {
    // Older Android versions grant exact alarms automatically.
  }
};

/**
 * Reconciles the pending lesson reminders with the supplied list. Pending
 * alarms that are still correct are left untouched: Android may deliver an
 * inexact alarm late, and cancelling it here would silently drop the
 * notification because the rebuilt list no longer contains a past trigger.
 */
let permissionRequested = false;
let pendingSync: Promise<void> = Promise.resolve();

const runSync = async (
  reminders: LessonReminder[],
  activeLessonIds: Set<string>,
  force: boolean
) => {
  lastSync = { reminders, activeLessonIds };

  try {
    await ensureChannel();

    let permission = await Notifications.getPermissionsAsync();
    if (!permission.granted && permission.canAskAgain && !permissionRequested) {
      permissionRequested = true;
      permission = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
    }
    if (!permission.granted) return;

    await maybeAskForExactAlarms(reminders.length > 0);

    const desired = new Map(
      reminders.map((reminder) => [identifierFor(reminder), reminder])
    );
    const now = Date.now();
    const keep = new Set<string>();

    for (const request of await pendingLessonReminders()) {
      const wanted = desired.get(request.identifier);
      const triggerAt = scheduledTriggerTime(request);

      if (wanted) {
        if (
          !force &&
          triggerAt !== null &&
          Math.abs(triggerAt - wanted.triggerAt.getTime()) <
            TRIGGER_TOLERANCE_MS
        ) {
          keep.add(request.identifier);
          continue;
        }
        await cancelScheduled(request.identifier);
        continue;
      }

      // A due reminder can still be waiting on a delayed alarm. Keep it while
      // its lesson is running instead of replacing it with nothing.
      const lessonId = lessonIdFor(request.identifier);
      if (
        triggerAt !== null &&
        triggerAt <= now &&
        lessonId !== null &&
        activeLessonIds.has(lessonId)
      ) {
        continue;
      }
      await cancelScheduled(request.identifier);
    }

    for (const reminder of reminders) {
      const identifier = identifierFor(reminder);
      if (keep.has(identifier)) continue;
      try {
        await Notifications.scheduleNotificationAsync({
          identifier,
          content: {
            title: reminder.title,
            body: reminder.body,
            sound: "default",
            data: {
              lessonId: reminder.lessonId,
              triggerAt: reminder.triggerAt.getTime(),
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminder.triggerAt,
            delivery: "bestEffort",
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

export const syncLessonReminders = (
  reminders: LessonReminder[],
  activeLessonIds: Set<string>,
  force = false
) => {
  pendingSync = pendingSync
    .then(() => runSync(reminders, activeLessonIds, force))
    .catch(() => {});
  return pendingSync;
};
