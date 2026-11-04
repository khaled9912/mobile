export type UserRole =
  | "student"
  | "teacher"
  | "admin"
  | "super_admin"
  | "support";

export const USER_ROLES: readonly UserRole[] = [
  "student",
  "teacher",
  "admin",
  "super_admin",
  "support",
];

export const isUserRole = (value: unknown): value is UserRole =>
  typeof value === "string" && (USER_ROLES as readonly string[]).includes(value);

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  phoneNumber: string | null;
  avatarUrl: string | null;
}

/** The API emits both camelCase and snake_case aliases; accept both. */
export interface UserDto {
  id: string;
  fullName?: string;
  full_name?: string;
  name?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  is_active?: boolean;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
}

export const normalizeUser = (user: UserDto): UserProfile => ({
  id: user.id,
  fullName: user.fullName ?? user.full_name ?? user.name ?? user.email ?? "",
  email: user.email ?? "",
  role: isUserRole(user.role) ? user.role : "student",
  isActive: user.isActive ?? user.is_active ?? true,
  phoneNumber: user.phoneNumber ?? null,
  avatarUrl: user.avatarUrl ?? null,
});

export type LessonStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export type LessonProgress = "excellent" | "good" | "needs_attention";
export interface LessonReport {
  id: string;
  lessonId: string;
  startsAt: string;
  endsAt: string;
  teacherId: string;
  teacherName: string;
  studentId: string;
  studentName: string;
  classSummary: string;
  studentFeedback: string;
  progress: LessonProgress;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherReview {
  id: string;
  lessonId: string;
  startsAt: string;
  teacherId: string;
  teacherName: string;
  studentId: string;
  studentName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Lesson {
  id: string;
  teacherId: string;
  teacherName: string;
  studentId: string;
  studentName: string;
  startsAt: string;
  endsAt: string;
  status: LessonStatus;
  actualStartedAt: string | null;
  actualEndedAt: string | null;
  report: LessonReport | null;
  review: TeacherReview | null;
  seriesId: string | null;
  isTrial: boolean;
}

export interface ReportPage {
  items: LessonReport[];
  hasMore: boolean;
}

export interface Assignment {
  id: string;
  teacherId: string;
  teacherName: string;
  studentId: string;
  studentName: string;
  createdAt: string;
  isActive: boolean;
  status: string;
}

export type WeeklyRuleStatus = "available" | "booked" | "yours";

/** A weekly slot announced by a teacher. Times are "HH:mm" in its time zone. */
export interface WeeklyRule {
  id: string;
  teacherId: string;
  dayOfWeek: number;
  startsAtTime: string;
  endsAtTime: string;
  timeZoneId: string;
  status: WeeklyRuleStatus;
}

/** A teacher in the student-facing directory, with their weekly times. */
export interface WeeklyTeacher {
  teacher: UserProfile;
  slots: WeeklyRule[];
  averageRating: number | null;
  reviewCount: number;
}

/** A student's permanent weekly booking. */
export interface LessonSeries {
  id: string;
  teacherId: string;
  teacherName: string;
  studentId: string;
  studentName: string;
  dayOfWeek: number;
  startsAtTime: string;
  endsAtTime: string;
  timeZoneId: string;
  isActive: boolean;
  createdAt: string;
}

export type ChangeRequestStatus = "pending" | "approved" | "rejected";

export interface LessonChangeRequest {
  id: string;
  seriesId: string;
  teacherId: string;
  teacherName: string;
  studentId: string;
  studentName: string;
  currentDayOfWeek: number;
  currentStartsAtTime: string;
  currentEndsAtTime: string;
  requestedDayOfWeek: number;
  requestedStartsAtTime: string;
  requestedEndsAtTime: string;
  timeZoneId: string;
  status: ChangeRequestStatus;
  studentNote: string | null;
  adminNote: string | null;
  createdAt: string;
  adminRespondedAt: string | null;
}

export interface WeeklyAvailability {
  teacher: UserProfile | null;
  slots: WeeklyRule[];
  series: LessonSeries[];
  averageRating: number | null;
  reviewCount: number;
  reviews: TeacherReview[] | null;
  hasLessons: boolean;
}

export type NotificationKind =
  | "booking"
  | "lesson"
  | "request"
  | "report"
  | "payment"
  | "system";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  kind: NotificationKind;
  link: string | null;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationsFeed {
  items: AppNotification[];
  unread: number;
}
