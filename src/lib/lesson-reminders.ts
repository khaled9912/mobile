import type { Lesson, UserRole } from "@/api/types";
import { formatTime } from "./format";

export const REMINDER_LEAD_MS = 5 * 60 * 1000;

/** iOS keeps at most 64 pending notifications per app. */
export const MAX_LESSON_REMINDERS = 60;

export type LessonReminderKind = "lead" | "start";

export type LessonReminder = {
  lessonId: string;
  kind: LessonReminderKind;
  title: string;
  body: string;
  triggerAt: Date;
};

const reminderBody = (
  lesson: Lesson,
  role: UserRole,
  kind: LessonReminderKind
) => {
  const time = formatTime(lesson.startsAt);
  const when = kind === "lead" ? `starts at ${time}` : "is starting now";
  if (role === "teacher") {
    return `Your lesson with ${lesson.studentName} ${when}. Tap to open the room.`;
  }
  if (role === "admin" || role === "super_admin") {
    return `${lesson.teacherName} with ${lesson.studentName} ${when}. Tap to open the room.`;
  }
  return `Your lesson with ${lesson.teacherName} ${when}. Tap to open the room.`;
};

export const buildLessonReminders = (
  lessons: Lesson[],
  role: UserRole,
  now: number,
  limit = MAX_LESSON_REMINDERS
): LessonReminder[] => {
  const upcoming = lessons
    .filter((lesson) => lesson.status === "scheduled")
    .map((lesson) => ({
      lesson,
      startsAt: new Date(lesson.startsAt).getTime(),
      endsAt: new Date(lesson.endsAt).getTime(),
    }))
    .filter(
      ({ startsAt, endsAt }) =>
        Number.isFinite(startsAt) &&
        Number.isFinite(endsAt) &&
        endsAt > now &&
        startsAt > now
    )
    .sort((a, b) => a.startsAt - b.startsAt);

  const reminders: LessonReminder[] = [];
  for (const { lesson, startsAt } of upcoming) {
    if (startsAt - REMINDER_LEAD_MS > now) {
      reminders.push({
        lessonId: lesson.id,
        kind: "lead",
        title: "Lesson in 5 minutes",
        body: reminderBody(lesson, role, "lead"),
        triggerAt: new Date(startsAt - REMINDER_LEAD_MS),
      });
    }
    reminders.push({
      lessonId: lesson.id,
      kind: "start",
      title: "Lesson starting now",
      body: reminderBody(lesson, role, "start"),
      triggerAt: new Date(startsAt),
    });
  }

  return reminders
    .sort((a, b) => a.triggerAt.getTime() - b.triggerAt.getTime())
    .slice(0, Math.max(0, limit));
};
