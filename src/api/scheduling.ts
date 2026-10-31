import { apiFetch } from "./client";
import type {
  AvailabilitySlot,
  LessonRequest,
  StudentAvailabilitySlot,
  TeacherAvailability,
  UserDto,
} from "./types";
import { normalizeUser } from "./types";

type TeacherAvailabilityDto = Omit<TeacherAvailability, "teacher"> & {
  teacher: UserDto;
};

// The assigned-teacher endpoint answers with `teacher: null` (not 404) when a
// student has no active assignment, so it needs the nullable variant.
type MaybeTeacherAvailabilityDto = Omit<TeacherAvailability, "teacher"> & {
  teacher: UserDto | null;
};

const normalizeAvailability = (
  dto: TeacherAvailabilityDto
): TeacherAvailability => ({
  ...dto,
  teacher: normalizeUser(dto.teacher),
  reviews: dto.reviews ?? null,
});

// Student-facing teacher directory and booking.
export const getTeacherDirectory = async () => {
  const list = await apiFetch<TeacherAvailabilityDto[]>(
    "/api/teachers/directory"
  );
  return list.map(normalizeAvailability);
};

export const getTeacherProfile = async (teacherId: string) => {
  const dto = await apiFetch<TeacherAvailabilityDto>(
    `/api/teachers/${encodeURIComponent(teacherId)}/profile`
  );
  return normalizeAvailability(dto);
};

export const getAssignedTeacherAvailability = async () => {
  const dto = await apiFetch<MaybeTeacherAvailabilityDto | null>(
    "/api/student/teacher/availability"
  );
  if (!dto?.teacher) return null;
  return {
    ...dto,
    teacher: normalizeUser(dto.teacher),
    reviews: dto.reviews ?? null,
  } satisfies TeacherAvailability;
};

export const getMyLessonRequests = () =>
  apiFetch<LessonRequest[]>("/api/student/lesson-requests");

export const requestLessonSlot = (availabilitySlotId: string) =>
  apiFetch<LessonRequest>("/api/lesson-requests", {
    method: "POST",
    json: { availabilitySlotId },
  });

export const respondToRequestAsStudent = (
  requestId: string,
  decision: "confirm" | "reject"
) =>
  apiFetch<LessonRequest>(
    `/api/student/lesson-requests/${encodeURIComponent(requestId)}/${decision}`,
    { method: "POST" }
  );

export const getMyAvailability = () =>
  apiFetch<AvailabilitySlot[]>("/api/teacher/availability");

export const publishAvailability = (startsAt: string, endsAt: string) =>
  apiFetch<AvailabilitySlot>("/api/teacher/availability", {
    method: "POST",
    json: { startsAt, endsAt },
  });

export const deleteAvailability = (slotId: string) =>
  apiFetch<null>(
    `/api/teacher/availability/${encodeURIComponent(slotId)}`,
    { method: "DELETE" }
  );

export const getIncomingLessonRequests = () =>
  apiFetch<LessonRequest[]>("/api/teacher/lesson-requests");

export const respondToRequestAsTeacher = (
  requestId: string,
  decision: "confirm" | "reject"
) =>
  apiFetch<LessonRequest>(
    `/api/teacher/lesson-requests/${encodeURIComponent(requestId)}/${decision}`,
    { method: "POST" }
  );

export const getTeacherStudentAvailability = () =>
  apiFetch<StudentAvailabilitySlot[]>("/api/teacher/student-availability");

export const selectStudentAvailability = (slotId: string) =>
  apiFetch<LessonRequest>(
    `/api/teacher/student-availability/${encodeURIComponent(slotId)}/select`,
    { method: "POST" }
  );

// Admin moderation of lesson requests.
export const getAdminLessonRequests = (status?: LessonRequest["status"]) =>
  apiFetch<LessonRequest[]>(
    `/api/admin/lesson-requests${status ? `?status=${encodeURIComponent(status)}` : ""}`
  );

export const getAdminLessonApprovals = () =>
  getAdminLessonRequests("pending_admin");

export const approveLessonRequest = (requestId: string) =>
  apiFetch<LessonRequest>(
    `/api/admin/lesson-requests/${encodeURIComponent(requestId)}/approve`,
    { method: "POST" }
  );

export const rejectLessonRequest = (requestId: string, reason?: string) =>
  apiFetch<LessonRequest>(
    `/api/admin/lesson-requests/${encodeURIComponent(requestId)}/reject`,
    { method: "POST", json: reason ? { reason } : {} }
  );
