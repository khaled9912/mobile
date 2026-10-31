import { apiFetch } from "./client";
import type {
  Lesson,
  LessonPresence,
  LessonProgress,
  LessonReport,
  TeacherReview,
} from "./types";

export const getLessons = () => apiFetch<Lesson[]>("/api/lessons");

export const getLessonById = (id: string) =>
  apiFetch<Lesson>(`/api/lessons/${encodeURIComponent(id)}`);

export const getLessonPresence = (id: string) =>
  apiFetch<LessonPresence>(
    `/api/lessons/${encodeURIComponent(id)}/presence`
  );

export const markTeacherPresent = (id: string) =>
  apiFetch<null>(`/api/lessons/${encodeURIComponent(id)}/presence`, {
    method: "POST",
  });

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
