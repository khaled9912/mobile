import { describe, expect, it } from "vitest";
import type { Lesson } from "@/api/types";
import {
  firstName,
  pastLessons,
  upcomingLessons,
} from "../lesson-selectors";

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
  const hour = 60 * 60 * 1000;
  const now = Date.now();

  it("splits upcoming and past lessons around the end time", () => {
    const upcoming = lesson({
      id: "upcoming",
      startsAt: new Date(now + hour).toISOString(),
      endsAt: new Date(now + 2 * hour).toISOString(),
    });
    const past = lesson({
      id: "past",
      status: "completed",
      startsAt: new Date(now - 2 * hour).toISOString(),
      endsAt: new Date(now - hour).toISOString(),
    });
    const cancelled = lesson({
      id: "cancelled",
      status: "cancelled",
      endsAt: new Date(now + 2 * hour).toISOString(),
    });

    expect(upcomingLessons([past, upcoming, cancelled]).map((l) => l.id))
      .toEqual(["upcoming"]);
    expect(pastLessons([past, upcoming, cancelled]).map((l) => l.id))
      .toEqual(["past"]);
  });

  it("uses the first name for greetings", () => {
    expect(firstName("  Ustadh Ahmad  ")).toBe("Ustadh");
    expect(firstName("Mariam")).toBe("Mariam");
  });
});
