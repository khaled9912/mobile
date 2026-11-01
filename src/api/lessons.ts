import { apiFetch } from "./client";
import type {
  Lesson,
  LessonProgress,
  LessonReport,
  TeacherReview,
} from "./types";

export const getLessons = () => apiFetch<Lesson[]>("/api/lessons");

export const getLessonById = (id: string) =>
  apiFetch<Lesson>(`/api/lessons/${encodeURIComponent(id)}`);

export const saveLessonReport = (
  id: string,
  input: {
    classSummary: string;
    studentFeedback: string;
    progress: LessonProgress;
  }
) =>
  apiFetch<LessonReport>(`/api/lessons/${encodeURIComponent(id)}/report`, {
    method: "POST",
    json: input,
  });

export const saveLessonReview = (
  id: string,
  input: { rating: number; comment?: string }
) =>
  apiFetch<TeacherReview>(`/api/lessons/${encodeURIComponent(id)}/review`, {
    method: "POST",
    json: input,
  });
