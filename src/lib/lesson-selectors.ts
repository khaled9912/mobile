import type { Lesson } from "@/api/types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** The schedule shows one rolling week in each direction. */
export const LESSON_WINDOW_DAYS = 7;

/** Completed history is revealed four at a time. */
export const COMPLETED_PAGE_SIZE = 4;

const startsAtMs = (lesson: Lesson) => new Date(lesson.startsAt).getTime();
const endsAtMs = (lesson: Lesson) => new Date(lesson.endsAt).getTime();

export const upcomingLessons = (lessons: Lesson[], now = Date.now()) =>
  lessons
    .filter(
      (lesson) =>
        // Keep started and early-completed lessons until their scheduled end
        // so both sides can rejoin after a dropped call.
        lesson.status !== "cancelled" && endsAtMs(lesson) > now
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

/** Upcoming lessons that start on the viewer's local calendar day. */
export const todayLessons = (lessons: Lesson[], now = Date.now()) => {
  const today = new Date(now);
  return upcomingLessons(lessons, now).filter((lesson) => {
    const start = new Date(startsAtMs(lesson));
    return (
      start.getFullYear() === today.getFullYear() &&
      start.getMonth() === today.getMonth() &&
      start.getDate() === today.getDate()
    );
  });
};

export type LessonDay = {
  /** Local midnight at the start of the day. */
  dayStart: number;
  lessons: Lesson[];
};

/** Upcoming lessons grouped by the viewer's local calendar day. */
export const upcomingLessonDays = (
  lessons: Lesson[],
  now = Date.now()
): LessonDay[] => {
  const byDay = new Map<number, Lesson[]>();
  for (const lesson of upcomingLessons(lessons, now)) {
    const day = new Date(startsAtMs(lesson));
    day.setHours(0, 0, 0, 0);
    const key = day.getTime();
    const existing = byDay.get(key);
    if (existing) existing.push(lesson);
    else byDay.set(key, [lesson]);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([dayStart, dayLessons]) => ({ dayStart, lessons: dayLessons }));
};

export type UpcomingDayPage = {
  lessons: Lesson[];
  hasMore: boolean;
  /** Local midnight of the next hidden lesson day. */
  nextDay: number | null;
};

/** Reveals the upcoming lesson days one at a time. */
export const upcomingDayPage = (
  lessons: Lesson[],
  days = 1,
  now = Date.now()
): UpcomingDayPage => {
  const groups = upcomingLessonDays(lessons, now);
  const shown = groups.slice(0, Math.max(1, Math.floor(days)));
  return {
    lessons: shown.flatMap((group) => group.lessons),
    hasMore: groups.length > shown.length,
    nextDay: groups[shown.length]?.dayStart ?? null,
  };
};

export type PastLessonOptions = {
  now?: number;
  /** Non-completed lessons older than this are hidden. Omit for no limit. */
  windowDays?: number;
  /** Completed lessons are capped; omit for no cap. */
  completedLimit?: number;
};

/**
 * Past lessons: ended non-completed lessons inside the window, plus completed
 * lessons sorted newest first. Completed entries are included regardless of
 * age so "Load more" can walk back through the history.
 */
export const pastLessons = (
  lessons: Lesson[],
  { now = Date.now(), windowDays, completedLimit }: PastLessonOptions = {}
) => {
  const floor = windowDays === undefined ? -Infinity : now - windowDays * DAY_MS;

  const ended = lessons.filter((lesson) => {
    if (lesson.status === "completed" || lesson.status === "cancelled") {
      return false;
    }
    const endedAt = endsAtMs(lesson);
    return endedAt < now && endedAt >= floor;
  });

  const completed = lessons
    .filter((lesson) => lesson.status === "completed")
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));

  return [
    ...ended,
    ...(completedLimit === undefined
      ? completed
      : completed.slice(0, Math.max(0, completedLimit))),
  ].sort((a, b) => b.startsAt.localeCompare(a.startsAt));
};

/** Cancelled lessons scheduled within one week either side of now. */
export const cancelledLessons = (
  lessons: Lesson[],
  now = Date.now(),
  days = LESSON_WINDOW_DAYS
) => {
  const floor = now - days * DAY_MS;
  const horizon = now + days * DAY_MS;
  return lessons
    .filter((lesson) => {
      if (lesson.status !== "cancelled") return false;
      const starts = startsAtMs(lesson);
      return starts >= floor && starts <= horizon;
    })
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
};

export const countCompletedLessons = (lessons: Lesson[]) =>
  lessons.filter((lesson) => lesson.status === "completed").length;

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;
