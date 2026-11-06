import { apiFetch } from "./client";
import type {
  AcademyPolicy,
  AdminLessonOps,
  AdminLessonOpsDetail,
  AttendanceBeatResult,
  AttendanceSummary,
  CancellationPreview,
  ExcuseRequest,
  Lesson,
  LessonCreditTransaction,
  LessonIncident,
  LessonOperations,
  LessonCall,
  ReliabilityEvent,
  RescheduleRequest,
  SalaryPeriod,
  StudentCredit,
  TeacherHours,
  TeacherPenalty,
} from "./types";

const lessonPath = (id: string) => `/api/lessons/${encodeURIComponent(id)}`;

const adminQuery = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : "";
};

export const cancelLesson = (id: string, reason?: string) =>
  apiFetch<{ preview: CancellationPreview; lesson: Lesson }>(
    `${lessonPath(id)}/cancel`,
    { method: "POST", json: { reason: reason ?? "" } }
  );

export const getLessonPolicy = () => apiFetch<AcademyPolicy>("/api/lesson-policy");
export const updateLessonPolicy = (input: Partial<AcademyPolicy>) =>
  apiFetch<AcademyPolicy>("/api/lesson-policy", {
    method: "PUT",
    json: input,
  });

export const getLessonOperations = (id: string) =>
  apiFetch<LessonOperations>(`${lessonPath(id)}/operations`);
export const getCancellationPreview = (id: string) =>
  apiFetch<CancellationPreview>(`${lessonPath(id)}/cancellation-preview`);

export const callLesson = (id: string, targetRole?: string) =>
  apiFetch<LessonCall>(`${lessonPath(id)}/call`, {
    method: "POST",
    json: { targetRole: targetRole ?? "" },
  });

/** Rings addressed to the signed-in user that are still worth acting on. */
export const getRecentCalls = () => apiFetch<LessonCall[]>("/api/calls/recent");

export const getRescheduleRequests = (id: string) =>
  apiFetch<RescheduleRequest[]>(`${lessonPath(id)}/reschedule-requests`);
export const createRescheduleRequest = (
  id: string,
  input: { startsAt: string; endsAt: string; note?: string }
) =>
  apiFetch<RescheduleRequest>(`${lessonPath(id)}/reschedule-requests`, {
    method: "POST",
    json: input,
  });
export const respondToRescheduleRequest = (
  requestId: string,
  action: "accept" | "decline",
  note?: string
) =>
  apiFetch<RescheduleRequest>(
    `/api/reschedule-requests/${encodeURIComponent(requestId)}/${action}`,
    { method: "POST", json: { note: note ?? "" } }
  );
export const cancelRescheduleRequest = (requestId: string) =>
  apiFetch<null>(
    `/api/reschedule-requests/${encodeURIComponent(requestId)}/cancel`,
    { method: "POST" }
  );

export const createReplacementLesson = (
  id: string,
  input: { startsAt: string; endsAt: string; note?: string }
) =>
  apiFetch<Lesson>(`${lessonPath(id)}/replacement`, {
    method: "POST",
    json: input,
  });

export const getAttendance = (id: string) =>
  apiFetch<AttendanceSummary>(`${lessonPath(id)}/attendance`);
export const sendAttendanceEvent = (
  id: string,
  input: {
    action: "join" | "leave";
    deviceId: string;
    eventId: string;
    clientAt?: string;
  }
) =>
  apiFetch<AttendanceBeatResult>(`${lessonPath(id)}/attendance/events`, {
    method: "POST",
    json: input,
  });

export const getLessonExcuse = (id: string) =>
  apiFetch<ExcuseRequest>(`${lessonPath(id)}/excuse`);
export const requestExcuse = (
  id: string,
  input: { category: string; explanation: string }
) =>
  apiFetch<ExcuseRequest>(`${lessonPath(id)}/excuse`, {
    method: "POST",
    json: input,
  });

export const reportLessonIncident = (
  id: string,
  input: { type: string; detail: string }
) =>
  apiFetch<LessonIncident>(`${lessonPath(id)}/incident`, {
    method: "POST",
    json: input,
  });

export const getStudentCredits = () =>
  apiFetch<StudentCredit>("/api/student/credits");
export const getStudentReliability = () =>
  apiFetch<ReliabilityEvent[]>("/api/student/reliability");
export const getTeacherReliability = () =>
  apiFetch<ReliabilityEvent[]>("/api/teacher/reliability");
export const getTeacherHours = (query = "") =>
  apiFetch<TeacherHours[]>(`/api/teacher/hours${query}`);
export const getTeacherSalaryPeriods = () =>
  apiFetch<SalaryPeriod[]>("/api/teacher/salary-periods");

export const registerDeviceToken = (input: {
  token: string;
  platform: string;
}) =>
  apiFetch<null>("/api/devices/register", { method: "POST", json: input });
export const unregisterDeviceToken = (input: {
  token: string;
  platform?: string;
}) =>
  apiFetch<null>("/api/devices/unregister", { method: "POST", json: input });

export const getAdminLessonOps = (date?: string) =>
  apiFetch<AdminLessonOps>(`/api/admin/lesson-ops${adminQuery({ date })}`);
export const getAdminLessonOpsDetail = (lessonId: string) =>
  apiFetch<AdminLessonOpsDetail>(
    `/api/admin/lesson-ops/${encodeURIComponent(lessonId)}`
  );

export const getExcuseRequests = (status = "pending") =>
  apiFetch<ExcuseRequest[]>(
    `/api/admin/excuse-requests${adminQuery({ status })}`
  );
export const approveExcuseRequest = (id: string, note?: string) =>
  apiFetch<ExcuseRequest>(
    `/api/admin/excuse-requests/${encodeURIComponent(id)}/approve`,
    { method: "POST", json: { note: note ?? "" } }
  );
export const rejectExcuseRequest = (id: string, note?: string) =>
  apiFetch<ExcuseRequest>(
    `/api/admin/excuse-requests/${encodeURIComponent(id)}/reject`,
    { method: "POST", json: { note: note ?? "" } }
  );

export const getLessonIncidents = (status = "open") =>
  apiFetch<LessonIncident[]>(
    `/api/admin/lesson-incidents${adminQuery({ status })}`
  );
export const resolveLessonIncident = (
  id: string,
  input: {
    action: "student_no_show" | "teacher_no_show" | "both_absent" | "dismissed";
    note?: string;
    teacherPayableMinutes?: number;
  }
) =>
  apiFetch<LessonIncident>(
    `/api/admin/lesson-incidents/${encodeURIComponent(id)}/resolve`,
    { method: "POST", json: input }
  );

export const getAdminTeacherHours = (query = "") =>
  apiFetch<TeacherHours[]>(`/api/admin/teacher-hours${query}`);
export const approveTeacherHours = (
  id: string,
  input: { approvedMinutes?: number; note?: string }
) =>
  apiFetch<TeacherHours>(
    `/api/admin/teacher-hours/${encodeURIComponent(id)}/approve`,
    { method: "POST", json: input }
  );
export const rejectTeacherHours = (id: string, note?: string) =>
  apiFetch<TeacherHours>(
    `/api/admin/teacher-hours/${encodeURIComponent(id)}/reject`,
    { method: "POST", json: { note: note ?? "" } }
  );

export const getTeacherPenalties = (status?: string) =>
  apiFetch<TeacherPenalty[]>(
    `/api/admin/teacher-penalties${adminQuery({ status })}`
  );
export const createTeacherPenalty = (input: {
  teacherId: string;
  lessonId?: string;
  eventType?: string;
  amountEgp: number;
  reason: string;
}) =>
  apiFetch<TeacherPenalty>("/api/admin/teacher-penalties", {
    method: "POST",
    json: input,
  });
export const reviewTeacherPenalty = (
  id: string,
  input: { status: "approved" | "rejected" | "voided"; note?: string }
) =>
  apiFetch<TeacherPenalty>(
    `/api/admin/teacher-penalties/${encodeURIComponent(id)}/review`,
    { method: "POST", json: input }
  );

export const getReliabilityEvents = (query = "") =>
  apiFetch<ReliabilityEvent[]>(`/api/admin/reliability${query}`);
export const resolveReliabilityEvent = (
  id: string,
  input: { note?: string; action?: string }
) =>
  apiFetch<ReliabilityEvent>(
    `/api/admin/reliability/${encodeURIComponent(id)}/resolve`,
    { method: "POST", json: input }
  );

export const getStudentCreditsForAdmin = (studentId: string) =>
  apiFetch<StudentCredit>(
    `/api/admin/students/${encodeURIComponent(studentId)}/credits`
  );
export const adjustStudentCredits = (
  studentId: string,
  input: { amount: number; reason: string }
) =>
  apiFetch<LessonCreditTransaction>(
    `/api/admin/students/${encodeURIComponent(studentId)}/credits/adjust`,
    { method: "POST", json: input }
  );

export const getSalaryPeriods = (month?: string) =>
  apiFetch<SalaryPeriod[]>(`/api/admin/salary-periods${adminQuery({ month })}`);
export const generateSalaryPeriods = (month?: string) =>
  apiFetch<SalaryPeriod[]>("/api/admin/salary-periods/generate", {
    method: "POST",
    json: { month },
  });
export const updateSalaryPeriod = (
  id: string,
  input: {
    manualAdjustmentEgp?: number;
    finalAmountEgp?: number;
    notes?: string;
    status?: "open" | "reviewed" | "paid";
  }
) =>
  apiFetch<SalaryPeriod>(
    `/api/admin/salary-periods/${encodeURIComponent(id)}`,
    { method: "PATCH", json: input }
  );
