import type { Lesson, LessonProgress, LessonStatus } from "@/api/types";

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export const lessonStatusLabel: Record<LessonStatus, string> = {
  scheduled: "Scheduled",
  in_progress: "Live now",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const lessonStatusTone: Record<LessonStatus, Tone> = {
  scheduled: "info",
  in_progress: "success",
  completed: "neutral",
  cancelled: "danger",
};

export const progressLabel: Record<LessonProgress, string> = {
  excellent: "Excellent",
  good: "Good progress",
  needs_attention: "Needs attention",
};

export const progressTone: Record<LessonProgress, Tone> = {
  excellent: "success",
  good: "info",
  needs_attention: "warning",
};

export const isLessonEnded = (lesson: Lesson) =>
  lesson.status === "completed" || new Date(lesson.endsAt).getTime() <= Date.now();

export const isReportDue = (lesson: Lesson) =>
  lesson.status !== "cancelled" && isLessonEnded(lesson) && !lesson.report;

export const isCancelled = (lesson: Lesson) => lesson.status === "cancelled";
