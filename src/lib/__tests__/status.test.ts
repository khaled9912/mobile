import { describe, expect, it } from "vitest";
import type { Lesson } from "@/api/types";
import {
  isLessonEnded,
  isLessonJoinable,
  isLessonLive,
  isReportDue,
  lessonStatusLabel,
  progressLabel,
} from "../status";

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

const report = {
  id: "report-1",
  lessonId: "lesson-1",
  startsAt: "2026-01-05T10:00:00.000Z",
  endsAt: "2026-01-05T11:00:00.000Z",
  teacherId: "teacher-1",
  teacherName: "Ustadh Ahmad",
  studentId: "student-1",
  studentName: "Mariam",
  classSummary: "Reviewed surah Al-Mulk.",
  studentFeedback: "MashaAllah, steady improvement.",
  progress: "good" as const,
  createdAt: "2026-01-05T11:05:00.000Z",
  updatedAt: "2026-01-05T11:05:00.000Z",
};

describe("lesson status helpers", () => {
  it("treats completed or elapsed lessons as ended", () => {
    expect(isLessonEnded(lesson({ status: "completed" }))).toBe(true);
    expect(
      isLessonEnded(
        lesson({
          endsAt: new Date(Date.now() - 60_000).toISOString(),
        })
      )
    ).toBe(true);
    expect(
      isLessonEnded(
        lesson({
          endsAt: new Date(Date.now() + 60 * 60_000).toISOString(),
        })
      )
    ).toBe(false);
  });

  it("only asks for a report after the lesson ended", () => {
    const ended = lesson({
      endsAt: new Date(Date.now() - 60_000).toISOString(),
    });
    expect(isReportDue(ended)).toBe(true);
    expect(isReportDue({ ...ended, report })).toBe(false);
    expect(isReportDue({ ...ended, status: "cancelled" })).toBe(false);
    expect(
      isReportDue(
        lesson({
          endsAt: new Date(Date.now() + 60 * 60_000).toISOString(),
        })
      )
    ).toBe(false);
  });

  it("keeps the room joinable until the scheduled end, even if marked ended", () => {
    const now = Date.now();
    const live = lesson({
      status: "completed",
      startsAt: new Date(now - 30 * 60_000).toISOString(),
      endsAt: new Date(now + 30 * 60_000).toISOString(),
    });

    expect(isLessonJoinable(live, now)).toBe(true);
    expect(
      isLessonJoinable(
        { ...live, endsAt: new Date(now - 60_000).toISOString() },
        now
      )
    ).toBe(false);
    expect(isLessonJoinable({ ...live, status: "cancelled" }, now)).toBe(false);
  });

  it("marks the scheduled window as live regardless of stored status", () => {
    const now = Date.parse("2026-01-05T10:30:00.000Z");
    const duringWindow = lesson({ status: "scheduled" });

    expect(isLessonLive(duringWindow, now)).toBe(true);
    expect(
      isLessonLive(duringWindow, Date.parse("2026-01-05T09:59:00.000Z"))
    ).toBe(false);
    expect(
      isLessonLive(duringWindow, Date.parse("2026-01-05T11:00:00.000Z"))
    ).toBe(false);
    expect(isLessonLive({ ...duringWindow, status: "cancelled" }, now)).toBe(
      false
    );
  });
});

describe("status labels", () => {
  it("maps lesson statuses and progress", () => {
    expect(lessonStatusLabel.in_progress).toBe("Live now");
    expect(progressLabel.needs_attention).toBe("Needs attention");
  });
});
