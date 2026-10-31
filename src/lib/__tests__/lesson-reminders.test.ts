import { describe, expect, it } from "vitest";
import type { Lesson } from "@/api/types";
import {
  buildLessonReminders,
  MAX_LESSON_REMINDERS,
  REMINDER_LEAD_MS,
} from "../lesson-reminders";

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

const now = Date.parse("2026-01-05T09:00:00.000Z");

describe("buildLessonReminders", () => {
  it("fires five minutes before the lesson starts", () => {
    const reminders = buildLessonReminders([lesson({})], "student", now);

    expect(reminders).toHaveLength(1);
    expect(reminders[0].lessonId).toBe("lesson-1");
    expect(reminders[0].title).toBe("Lesson in 5 minutes");
    expect(reminders[0].triggerAt.getTime()).toBe(
      Date.parse("2026-01-05T10:00:00.000Z") - REMINDER_LEAD_MS
    );
  });

  it("ignores cancelled lessons, finished lessons and lessons already inside the lead time", () => {
    const reminders = buildLessonReminders(
      [
        lesson({ id: "cancelled", status: "cancelled" }),
        lesson({ id: "completed", status: "completed" }),
        lesson({
          id: "too-soon",
          startsAt: "2026-01-05T09:04:00.000Z",
          endsAt: "2026-01-05T10:00:00.000Z",
        }),
        lesson({
          id: "bad-date",
          startsAt: "not-a-date",
          endsAt: "not-a-date",
        }),
        lesson({ id: "valid" }),
      ],
      "student",
      now
    );

    expect(reminders.map((r) => r.lessonId)).toEqual(["valid"]);
  });

  it("sorts by start time and caps the pending notifications", () => {
    const lessons = Array.from({ length: MAX_LESSON_REMINDERS + 5 }, (_, i) =>
      lesson({
        id: `lesson-${i}`,
        startsAt: new Date(now + (i + 1) * 60 * 60 * 1000).toISOString(),
        endsAt: new Date(now + (i + 2) * 60 * 60 * 1000).toISOString(),
      })
    ).reverse();

    const reminders = buildLessonReminders(lessons, "student", now);

    expect(reminders).toHaveLength(MAX_LESSON_REMINDERS);
    expect(reminders[0].lessonId).toBe("lesson-0");
    expect(reminders.at(-1)?.lessonId).toBe(`lesson-${MAX_LESSON_REMINDERS - 1}`);
  });

  it("names the other participant for each role", () => {
    const student = buildLessonReminders([lesson({})], "student", now)[0];
    const teacher = buildLessonReminders([lesson({})], "teacher", now)[0];
    const admin = buildLessonReminders([lesson({})], "admin", now)[0];

    expect(student.body).toContain("Ustadh Ahmad");
    expect(teacher.body).toContain("Mariam");
    expect(admin.body).toContain("Ustadh Ahmad");
    expect(admin.body).toContain("Mariam");
  });
});
