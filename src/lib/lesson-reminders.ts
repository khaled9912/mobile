import type { Lesson, UserRole } from "@/api/types";
import { formatTime } from "./format";

export const REMINDER_LEAD_MS = 5 * 60 * 1000;

/** iOS keeps at most 64 pending notifications per app. */
export const MAX_LESSON_REMINDERS = 60;

export type LessonReminder = {
  lessonId: string;
  title: string;
  body: string;
  triggerAt: Date;
};

const reminderBody = (lesson: Lesson, role: UserRole) => {
  const time = formatTime(lesson.startsAt);
  if (role === "teacher") {
    return `Your lesson with ${lesson.studentName} starts at ${time}. Tap to open the room.`;
  }
  if (role === "admin" || role === "super_admin") {
    return `${lesson.teacherName} with ${lesson.studentName} starts at ${time}. Tap to open the room.`;
  }
  return `Your lesson with ${lesson.teacherName} starts at ${time}. Tap to open the room.`;
};

export const buildLessonReminders = (
  lessons: Lesson[],
  role: UserRole,
  now: number,
  limit = MAX_LESSON_REMINDERS
): LessonReminder[] => {
  return lessons
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
        startsAt - REMINDER_LEAD_MS > now
    )
    .sort((a, b) => a.startsAt - b.startsAt)
    .slice(0, Math.max(0, limit))
    .map(({ lesson, startsAt }) => ({
      lessonId: lesson.id,
      title: "Lesson in 5 minutes",
      body: reminderBody(lesson, role),
      triggerAt: new Date(startsAt - REMINDER_LEAD_MS),
    }));
};
