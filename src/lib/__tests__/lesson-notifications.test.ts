import { beforeEach, describe, expect, it, vi } from "vitest";
import * as Notifications from "expo-notifications";
import { syncLessonReminders } from "../lesson-notifications";
import type { LessonReminder } from "../lesson-reminders";

type PendingRequest = {
  identifier: string;
  content: { data?: Record<string, unknown> };
  trigger: { type: string; value?: number };
};

type ScheduledInput = {
  identifier: string;
  content: { data: Record<string, unknown> };
  trigger: { date: Date };
};

const { pending } = vi.hoisted(() => ({
  pending: [] as PendingRequest[],
}));

vi.mock("expo-notifications", () => ({
  AndroidImportance: { HIGH: 4 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
  SchedulableTriggerInputTypes: { DATE: "date" },
  setNotificationChannelAsync: vi.fn(async () => {}),
  getAllScheduledNotificationsAsync: vi.fn(async () => pending),
  cancelScheduledNotificationAsync: vi.fn(async (identifier: string) => {
    const index = pending.findIndex((item) => item.identifier === identifier);
    if (index >= 0) pending.splice(index, 1);
  }),
  scheduleNotificationAsync: vi.fn(async (request: ScheduledInput) => {
    const stored: PendingRequest = {
      identifier: request.identifier,
      content: request.content,
      trigger: { type: "date", value: request.trigger.date.getTime() },
    };
    const index = pending.findIndex(
      (item) => item.identifier === request.identifier
    );
    if (index >= 0) pending[index] = stored;
    else pending.push(stored);
    return request.identifier;
  }),
  getPermissionsAsync: vi.fn(async () => ({
    granted: true,
    canAskAgain: true,
  })),
  requestPermissionsAsync: vi.fn(async () => ({ granted: true })),
  getExactAlarmPermissionsAsync: vi.fn(async () => ({
    granted: true,
    canAskAgain: true,
  })),
  requestExactAlarmPermissionsAsync: vi.fn(async () => ({ granted: true })),
}));

vi.mock("react-native", () => ({
  Alert: { alert: vi.fn() },
  Platform: { OS: "android" },
}));

vi.mock("@/lib/storage", () => ({
  readExactAlarmPromptSeen: vi.fn(async () => true),
  writeExactAlarmPromptSeen: vi.fn(async () => {}),
}));

const START = Date.now() + 60 * 60 * 1000;
const LEAD = START - 5 * 60 * 1000;

const reminder = (
  lessonId: string,
  kind: LessonReminder["kind"],
  triggerAt: number
): LessonReminder => ({
  lessonId,
  kind,
  triggerAt: new Date(triggerAt),
  title: kind === "lead" ? "Lesson in 5 minutes" : "Lesson starting now",
  body: "Lesson body",
});

const identifier = (lessonId: string, kind: LessonReminder["kind"]) =>
  `lesson-reminder:${lessonId}:${kind}`;

const seedPending = (
  lessonId: string,
  kind: LessonReminder["kind"],
  triggerAt: number
) => {
  pending.push({
    identifier: identifier(lessonId, kind),
    content: { data: { lessonId, triggerAt } },
    trigger: { type: "date", value: triggerAt },
  });
};

const scheduled = () =>
  vi.mocked(Notifications.scheduleNotificationAsync).mock.calls.length;
const cancelled = () =>
  vi.mocked(Notifications.cancelScheduledNotificationAsync).mock.calls.length;

beforeEach(() => {
  pending.length = 0;
  vi.clearAllMocks();
});

describe("syncLessonReminders", () => {
  it("schedules each reminder once", async () => {
    await syncLessonReminders(
      [reminder("lesson-1", "lead", LEAD), reminder("lesson-1", "start", START)],
      new Set(["lesson-1"])
    );

    expect(pending.map((item) => item.identifier)).toEqual([
      identifier("lesson-1", "lead"),
      identifier("lesson-1", "start"),
    ]);
  });

  it("leaves matching pending alarms untouched", async () => {
    seedPending("lesson-1", "lead", LEAD);
    seedPending("lesson-1", "start", START);

    await syncLessonReminders(
      [reminder("lesson-1", "lead", LEAD), reminder("lesson-1", "start", START)],
      new Set(["lesson-1"])
    );

    expect(scheduled()).toBe(0);
    expect(cancelled()).toBe(0);
  });

  it("replaces matching alarms when forced after an exact-alarm grant", async () => {
    seedPending("lesson-1", "lead", LEAD);

    await syncLessonReminders(
      [reminder("lesson-1", "lead", LEAD)],
      new Set(["lesson-1"]),
      true
    );

    expect(cancelled()).toBe(1);
    expect(scheduled()).toBe(1);
  });

  it("reschedules a reminder when its lesson moves", async () => {
    seedPending("lesson-1", "start", START);
    const moved = START + 30 * 60 * 1000;

    await syncLessonReminders(
      [reminder("lesson-1", "start", moved)],
      new Set(["lesson-1"])
    );

    expect(cancelled()).toBe(1);
    expect(scheduled()).toBe(1);
    expect(pending[0].content.data?.triggerAt).toBe(moved);
  });

  it("keeps a due alarm that is still waiting on a delayed delivery", async () => {
    const due = Date.now() - 60 * 1000;
    seedPending("lesson-1", "lead", due);

    await syncLessonReminders(
      [reminder("lesson-1", "start", START)],
      new Set(["lesson-1"])
    );

    expect(
      vi
        .mocked(Notifications.cancelScheduledNotificationAsync)
        .mock.calls.some(([id]) => id === identifier("lesson-1", "lead"))
    ).toBe(false);
  });

  it("removes reminders for lessons that are no longer scheduled", async () => {
    seedPending("lesson-1", "lead", LEAD);

    await syncLessonReminders([], new Set());

    expect(cancelled()).toBe(1);
    expect(pending).toHaveLength(0);
  });
});
