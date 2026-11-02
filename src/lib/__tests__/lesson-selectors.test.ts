import { describe, expect, it } from "vitest";
import type { Lesson } from "@/api/types";
import {
  cancelledLessons,
  COMPLETED_PAGE_SIZE,
  countCompletedLessons,
  firstName,
  pastLessons,
  upcomingDayPage,
  upcomingLessons,
} from "../lesson-selectors";

const hour = 60 * 60 * 1000;
const day = 24 * hour;

const lesson = (overrides: Partial<Lesson>): Lesson => ({
  id: "lesson-1",
  teacherId: "teacher-1",
  teacherName: "Ustadh Ahmad",
  studentId: "student-1",
  studentName: "Mariam",
  startsAt: "2026-01-05T10:00:00.000Z",
  endsAt: "2026-01-05T11:00:00.000Z",
  status: "scheduled",
  actualStartedAt: null,
  actualEndedAt: null,
  report: null,
  review: null,
  seriesId: null,
  isTrial: false,
  ...overrides,
});

describe("lesson selectors", () => {
  const now = Date.now();
  const at = (offsetMs: number) => new Date(now + offsetMs).toISOString();

  it("splits upcoming and past lessons around the end time", () => {
    const upcoming = lesson({
      id: "upcoming",
      startsAt: at(hour),
      endsAt: at(2 * hour),
    });
    const past = lesson({
      id: "past",
      status: "completed",
      startsAt: at(-2 * hour),
      endsAt: at(-hour),
    });
    const cancelled = lesson({
      id: "cancelled",
      status: "cancelled",
      endsAt: at(2 * hour),
    });

    expect(upcomingLessons([past, upcoming, cancelled], now).map((l) => l.id))
      .toEqual(["upcoming"]);
    expect(pastLessons([past, upcoming, cancelled], { now }).map((l) => l.id))
      .toEqual(["past"]);
  });

  it("keeps a started lesson on the schedule until its scheduled end", () => {
    const live = lesson({
      id: "live",
      status: "completed",
      startsAt: at(-hour),
      endsAt: at(hour),
    });

    expect(upcomingLessons([live], now).map((l) => l.id)).toEqual(["live"]);
  });

  it("reveals upcoming lessons one local day at a time", () => {
    const base = new Date(2026, 0, 5, 9, 0, 0);
    const fixedNow = base.getTime();
    const atLocal = (dayOffset: number, localHour: number) => {
      const date = new Date(base);
      date.setDate(date.getDate() + dayOffset);
      date.setHours(localHour, 0, 0, 0);
      return date.toISOString();
    };
    const lessons = [
      lesson({
        id: "today",
        startsAt: atLocal(0, 18),
        endsAt: atLocal(0, 19),
      }),
      lesson({
        id: "tomorrow",
        startsAt: atLocal(1, 10),
        endsAt: atLocal(1, 11),
      }),
      lesson({
        id: "day-after",
        startsAt: atLocal(2, 10),
        endsAt: atLocal(2, 11),
      }),
    ];

    const first = upcomingDayPage(lessons, 1, fixedNow);
    expect(first.lessons.map((l) => l.id)).toEqual(["today"]);
    expect(first.hasMore).toBe(true);
    expect(first.nextDay).toBe(new Date(2026, 0, 6).getTime());

    const second = upcomingDayPage(lessons, 2, fixedNow);
    expect(second.lessons.map((l) => l.id)).toEqual(["today", "tomorrow"]);
    expect(second.hasMore).toBe(true);
    expect(second.nextDay).toBe(new Date(2026, 0, 7).getTime());

    const all = upcomingDayPage(lessons, 3, fixedNow);
    expect(all.lessons.map((l) => l.id)).toEqual([
      "today",
      "tomorrow",
      "day-after",
    ]);
    expect(all.hasMore).toBe(false);
    expect(all.nextDay).toBeNull();
  });

  it("starts with the nearest lesson day when today has none", () => {
    const base = new Date(2026, 0, 5, 20, 0, 0);
    const tomorrowStart = new Date(2026, 0, 6, 10, 0, 0);
    const tomorrowEnd = new Date(2026, 0, 6, 11, 0, 0);

    const page = upcomingDayPage(
      [
        lesson({
          id: "tomorrow",
          startsAt: tomorrowStart.toISOString(),
          endsAt: tomorrowEnd.toISOString(),
        }),
      ],
      1,
      base.getTime()
    );

    expect(page.lessons.map((l) => l.id)).toEqual(["tomorrow"]);
    expect(page.hasMore).toBe(false);
  });

  it("keeps ended lessons from the last week but not older ones", () => {
    const recent = lesson({
      id: "recent",
      startsAt: at(-2 * day),
      endsAt: at(-2 * day + hour),
    });
    const old = lesson({
      id: "old",
      startsAt: at(-9 * day),
      endsAt: at(-9 * day + hour),
    });

    expect(
      pastLessons([recent, old], { now, windowDays: 7 }).map((l) => l.id)
    ).toEqual(["recent"]);
  });

  it("caps completed lessons and pages through older history", () => {
    const completed = Array.from({ length: 6 }, (_, index) =>
      lesson({
        id: `completed-${index + 1}`,
        status: "completed",
        startsAt: at(-(index + 1) * day),
        endsAt: at(-(index + 1) * day + hour),
      })
    );

    expect(countCompletedLessons(completed)).toBe(6);
    expect(
      pastLessons(completed, {
        now,
        windowDays: 7,
        completedLimit: COMPLETED_PAGE_SIZE,
      }).map((l) => l.id)
    ).toEqual(["completed-1", "completed-2", "completed-3", "completed-4"]);
    expect(
      pastLessons(completed, {
        now,
        windowDays: 7,
        completedLimit: COMPLETED_PAGE_SIZE * 2,
      }).map((l) => l.id)
    ).toEqual([
      "completed-1",
      "completed-2",
      "completed-3",
      "completed-4",
      "completed-5",
      "completed-6",
    ]);
  });

  it("shows cancelled lessons within one week either side of now", () => {
    const past = lesson({
      id: "cancelled-past",
      status: "cancelled",
      startsAt: at(-2 * day),
      endsAt: at(-2 * day + hour),
    });
    const future = lesson({
      id: "cancelled-future",
      status: "cancelled",
      startsAt: at(2 * day),
      endsAt: at(2 * day + hour),
    });
    const old = lesson({
      id: "cancelled-old",
      status: "cancelled",
      startsAt: at(-9 * day),
      endsAt: at(-9 * day + hour),
    });

    expect(
      cancelledLessons([past, future, old], now).map((l) => l.id)
    ).toEqual(["cancelled-future", "cancelled-past"]);
  });

  it("uses the first name for greetings", () => {
    expect(firstName("  Ustadh Ahmad  ")).toBe("Ustadh");
    expect(firstName("Mariam")).toBe("Mariam");
  });
});
