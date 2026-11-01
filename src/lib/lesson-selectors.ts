import type { Lesson } from "@/api/types";

export const upcomingLessons = (lessons: Lesson[]) =>
  lessons
    .filter(
      (lesson) =>
        lesson.status !== "cancelled" &&
        lesson.status !== "completed" &&
        new Date(lesson.endsAt).getTime() >= Date.now()
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

export const pastLessons = (lessons: Lesson[]) =>
  lessons
    .filter(
      (lesson) =>
        lesson.status === "completed" ||
        (lesson.status !== "cancelled" &&
          new Date(lesson.endsAt).getTime() < Date.now())
    )
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;
