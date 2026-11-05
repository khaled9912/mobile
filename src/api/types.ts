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

export type CancellationOutcome =
  | "free_cancellation"
  | "grace_cancellation"
  | "late_cancellation"
  | "cancelled_by_teacher"
  | "late_cancelled_by_teacher"
  | "admin_cancelled"
  | "student_no_show"
  | "teacher_no_show"
  | "both_absent";

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
  cancellationOutcome?: CancellationOutcome | string | null;
  cancelReason?: string | null;
  cancelledAt?: string | null;
  cancelledById?: string | null;
  isMakeup?: boolean;
  originalLessonId?: string | null;
}

export interface AcademyPolicy {
  studentFreeCancelHours: number;
  teacherFreeCancelHours: number;
  noShowGraceMinutes: number;
  rescheduleResponseHours: number;
  studentGraceCancellationsPerMonth: number;
  studentWarningStrikeThreshold: number;
  studentAdminReviewStrikeThreshold: number;
  teacherAdminReviewStrikeThreshold: number;
  trialNoShowThreshold: number;
  payScheduledDurationWhenAttended: boolean;
  updatedAt: string;
}

export type CreditEffect = "none" | "deduct" | "restore";

export interface CancellationPreview {
  allowed: boolean;
  blockedReason?: string | null;
  actorRole: string;
  outcome: string;
  isLate: boolean;
  usedGrace: boolean;
  graceUsedThisMonth: number;
  graceLimit: number;
  hoursBefore: number;
  scheduledMinutes: number;
  teacherPayableMinutes: number;
  creditChange: number;
  creditEffect: CreditEffect;
  reliabilityEvent?: string | null;
  requiresAdminReview: boolean;
  explanation: string;
  existingOutcome?: string | null;
  policy: AcademyPolicy;
}

export interface LessonCancellation {
  id: string;
  lessonId: string;
  actorRole: string;
  outcome: string;
  isLate: boolean;
  usedGrace: boolean;
  hoursBefore: number;
  teacherPayableMinutes: number;
  reason?: string | null;
  createdAt: string;
}

export type RescheduleStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "expired"
  | "cancelled";

export interface RescheduleRequest {
  id: string;
  lessonId: string;
  requestedById: string;
  requestedByName: string;
  requestedByRole: string;
  proposedStartsAt: string;
  proposedEndsAt: string;
  note?: string | null;
  status: RescheduleStatus;
  expiresAt: string;
  respondedById?: string | null;
  respondedAt?: string | null;
  responseNote?: string | null;
  createdAt: string;
  minutesRemaining: number;
}

export interface AttendanceParticipant {
  userId: string;
  name: string;
  role: string;
  status: string;
  firstJoinedAt?: string | null;
  lastLeftAt?: string | null;
  totalSeconds: number;
  reconnectionCount: number;
  joinedLate: boolean;
  leftEarly: boolean;
}

export interface AttendanceInterval {
  id: string;
  deviceId: string;
  joinedAt: string;
  leftAt?: string | null;
  seconds: number;
}

export interface AttendanceSummary {
  lessonId: string;
  lessonStatus: string;
  startsAt: string;
  endsAt: string;
  serverNow: string;
  participants: AttendanceParticipant[];
}

export interface AttendanceBeatResult {
  accepted: boolean;
  participantStatus: string;
  totalSeconds: number;
  serverAt: string;
  summary: AttendanceSummary;
}

export interface ExcuseRequest {
  id: string;
  lessonId: string;
  studentId: string;
  studentName: string;
  startsAt: string;
  category: string;
  explanation: string;
  status: string;
  adminNote?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
}

export interface LessonIncident {
  id: string;
  lessonId: string;
  startsAt: string;
  teacherId: string;
  teacherName: string;
  studentId: string;
  studentName: string;
  type: string;
  status: string;
  detail: string;
  createdAt: string;
  resolvedAt?: string | null;
  resolutionNote?: string | null;
}

export interface TeacherHours {
  id: string;
  lessonId: string;
  teacherId: string;
  teacherName: string;
  studentId: string;
  studentName: string;
  startsAt: string;
  endsAt: string;
  lessonStatus: string;
  scheduledMinutes: number;
  actualAttendanceMinutes: number;
  proposedPayableMinutes: number;
  approvedPayableMinutes?: number | null;
  approvalStatus: string;
  adjustmentReason?: string | null;
  approvedAt?: string | null;
}

export interface LessonOperations {
  lessonId: string;
  cancellation: CancellationPreview;
  cancellationRecord?: LessonCancellation | null;
  pendingReschedule?: RescheduleRequest | null;
  rescheduleHistory: RescheduleRequest[];
  attendance: AttendanceSummary;
  hours?: TeacherHours | null;
  excuse?: ExcuseRequest | null;
  incident?: LessonIncident | null;
  replacementLesson?: Lesson | null;
  originalLesson?: Lesson | null;
}

export interface ReliabilityEvent {
  id: string;
  userId: string;
  userName: string;
  role: string;
  lessonId?: string | null;
  type: string;
  notes?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  resolutionNote?: string | null;
  resolutionAction?: string | null;
}

export interface LessonCreditTransaction {
  id: string;
  studentId: string;
  lessonId?: string | null;
  type: string;
  amount: number;
  reason: string;
  createdByRole: string;
  createdAt: string;
}

export interface StudentCredit {
  studentId: string;
  balance: number;
  transactions: LessonCreditTransaction[];
}

export interface TeacherPenalty {
  id: string;
  teacherId: string;
  teacherName: string;
  lessonId?: string | null;
  eventType: string;
  amountEgp: number;
  reason: string;
  status: string;
  adminNote?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
}

export interface SalaryPeriod {
  id: string;
  teacherId: string;
  teacherName: string;
  month: string;
  status: string;
  totalScheduledMinutes: number;
  totalActualMinutes: number;
  totalProposedMinutes: number;
  totalApprovedMinutes: number;
  approvedPenaltyEgp: number;
  pendingPenaltyEgp: number;
  completedLessons: number;
  studentLateCancellations: number;
  teacherCancellations: number;
  teacherNoShows: number;
  studentNoShows: number;
  manualAdjustmentEgp: number;
  finalAmountEgp?: number | null;
  notes?: string | null;
  reviewedAt?: string | null;
  paidAt?: string | null;
}

export interface LessonOpsSummary {
  lessons: number;
  liveNow: number;
  upcoming: number;
  pendingReports: number;
  missingAttendance: number;
  pendingReschedules: number;
  pendingExcuses: number;
  noShowIncidents: number;
  pendingHours: number;
}

export interface AdminLessonOpsRow {
  lesson: Lesson;
  attendance: AttendanceSummary;
  cancellationOutcome?: string | null;
  pendingReschedule?: RescheduleRequest | null;
  hours?: TeacherHours | null;
  incidents: LessonIncident[];
  reportDue: boolean;
}

export interface AdminLessonOps {
  date: string;
  summary: LessonOpsSummary;
  lessons: AdminLessonOpsRow[];
}

export interface LessonScheduleChange {
  id: string;
  fromStartsAt: string;
  fromEndsAt: string;
  toStartsAt: string;
  toEndsAt: string;
  changedById?: string | null;
  reason?: string | null;
  createdAt: string;
}

export interface AdminLessonOpsDetail {
  lesson: Lesson;
  attendance: AttendanceSummary;
  intervals: AttendanceInterval[];
  cancellation?: LessonCancellation | null;
  rescheduleRequests: RescheduleRequest[];
  hours?: TeacherHours | null;
  incidents: LessonIncident[];
  excuse?: ExcuseRequest | null;
  credits: LessonCreditTransaction[];
  scheduleChanges: LessonScheduleChange[];
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
