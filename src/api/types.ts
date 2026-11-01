export type UserRole = "student" | "teacher" | "admin" | "super_admin";

export const USER_ROLES: readonly UserRole[] = [
  "student",
  "teacher",
  "admin",
  "super_admin",
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

export type AvailabilitySlotStatus =
  | "available"
  | "requested"
  | "booked"
  | "unavailable";

export interface AvailabilitySlot {
  id: string;
  teacherId: string;
  startsAt: string;
  endsAt: string;
  status: AvailabilitySlotStatus;
}

export type LessonRequestStatus =
  | "pending_teacher"
  | "pending_student"
  | "pending_admin"
  | "approved"
  | "rejected"
  | "cancelled"
  | "expired";

export interface LessonRequest {
  id: string;
  teacherId: string;
  teacherName: string;
  studentId: string;
  studentName: string;
  availabilitySlotId: string | null;
  studentAvailabilityId: string | null;
  initiatedBy: string;
  startsAt: string;
  endsAt: string;
  status: LessonRequestStatus;
  createdAt: string;
  rejectionReason: string | null;
}

export interface TeacherAvailability {
  teacher: UserProfile;
  slots: AvailabilitySlot[];
  averageRating: number | null;
  reviewCount: number;
  reviews: TeacherReview[] | null;
}

export interface PublicTeacher {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  averageRating: number | null;
  reviewCount: number;
  reviews: TeacherReview[];
}

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

export interface StudentAvailabilitySlot {
  id: string;
  studentId: string;
  studentName: string;
  startsAt: string;
  endsAt: string;
  status: string;
}

export interface AdminManagedUser extends UserDto {
  id: string;
}
