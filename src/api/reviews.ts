import { apiFetch } from "./client";

export type ReviewFilter =
  | "unreviewed"
  | "draft"
  | "submitted"
  | "flagged"
  | "all";

export type ReviewStatus = "draft" | "submitted";

export type ReviewFlag = "phone" | "email" | "platform" | "offplatform";

export interface ReviewQueueItem {
  lessonId: string;
  startsAt: string;
  lessonStatus: string;
  teacherId: string;
  teacherName: string;
  studentId: string;
  studentName: string;
  segments: number;
  flaggedSegments: number;
  flagReasons: ReviewFlag[];
  reviewStatus: ReviewStatus | null;
  reviewAverage: number | null;
  reviewerName: string | null;
  reviewUpdatedAt: string | null;
}

export interface ReviewSegment {
  id: string;
  speaker: string;
  text: string;
  atSeconds: number | null;
  createdAt: string;
  flags: ReviewFlag[];
}

export interface ReviewMetrics {
  segments: number;
  teacherSegments: number;
  studentSegments: number;
  unknownSegments: number;
  teacherTalkPercent: number | null;
  studentTalkPercent: number | null;
  recordedSeconds: number | null;
  flaggedSegments: number;
  flagReasons: ReviewFlag[];
}

export interface LessonQualityReview {
  id: string;
  lessonId: string;
  reviewerId: string;
  reviewerName: string;
  teachingClarity: number | null;
  studentPractice: number | null;
  correctionQuality: number | null;
  engagement: number | null;
  strengths: string | null;
  gaps: string | null;
  teacherAction: string | null;
  studentAction: string | null;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewWorkspace {
  lesson: {
    id: string;
    teacherId: string;
    studentId: string;
    startsAt: string;
    endsAt: string;
    status: string;
    teacherName: string;
    studentName: string;
  };
  metrics: ReviewMetrics;
  review: LessonQualityReview | null;
  segments: ReviewSegment[];
}

export interface ReviewInput {
  teachingClarity: number | null;
  studentPractice: number | null;
  correctionQuality: number | null;
  engagement: number | null;
  strengths: string | null;
  gaps: string | null;
  teacherAction: string | null;
  studentAction: string | null;
  status: ReviewStatus;
}

export const getReviewQueue = (status: ReviewFilter = "unreviewed") =>
  apiFetch<ReviewQueueItem[]>(
    `/api/admin/review-queue?status=${encodeURIComponent(status)}`
  );

export const getReviewWorkspace = (lessonId: string) =>
  apiFetch<ReviewWorkspace>(
    `/api/admin/lessons/${encodeURIComponent(lessonId)}/review`
  );

export const saveQualityReview = (lessonId: string, input: ReviewInput) =>
  apiFetch<{
    id: string;
    lessonId: string;
    status: ReviewStatus;
    updatedAt: string;
  }>(`/api/admin/lessons/${encodeURIComponent(lessonId)}/review`, {
    method: "PUT",
    json: input,
  });
