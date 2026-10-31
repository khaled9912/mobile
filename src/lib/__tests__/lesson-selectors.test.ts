import { describe, expect, it } from "vitest";
import type { Lesson, LessonRequest } from "@/api/types";
import {
  firstName,
  openRequests,
  pastLessons,
  pendingForApproval,
  upcomingLessons,
} from "../lesson-selectors";

const request = (overrides: Partial<LessonRequest>): LessonRequest => ({
  id: "request-1",
  teacherId: "teacher-1",
  teacherName: "Ustadh Ahmad",
  studentId: "student-1",
  studentName: "Mariam",
  availabilitySlotId: null,
  studentAvailabilityId: null,
  initiatedBy: "student",
  startsAt: "2026-01-05T10:00:00.000Z",
  endsAt: "2026-01-05T11:00:00.000Z",
  status: "pending_teacher",
  createdAt: "2026-01-01T08:00:00.000Z",
  rejectionReason: null,
  ...overrides,
});

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
  ...overrides,
});

describe("request selectors", () => {
  it("keeps only open statuses and sorts by start time", () => {
    const later = request({
      id: "later",
      status: "pending_admin",
      startsAt: "2026-02-01T10:00:00.000Z",
    });
    const sooner = request({
      id: "sooner",
      status: "pending_student",
      startsAt: "2026-01-20T10:00:00.000Z",
    });
    const approved = request({ id: "approved", status: "approved" });
    const rejected = request({ id: "rejected", status: "rejected" });

    expect(openRequests([later, approved, sooner, rejected]).map((r) => r.id))
      .toEqual(["sooner", "later"]);
  });

  it("finds requests waiting for the academy", () => {
    expect(
      pendingForApproval([
        request({ id: "a", status: "pending_teacher" }),
        request({ id: "b", status: "pending_admin" }),
      ]).map((r) => r.id)
    ).toEqual(["b"]);
  });
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
