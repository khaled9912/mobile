import { apiFetch } from "./client";
import type {
  ChangeRequestStatus,
  Lesson,
  LessonChangeRequest,
  LessonSeries,
  UserDto,
  WeeklyAvailability,
  WeeklyRule,
  WeeklyTeacher,
} from "./types";
import { normalizeUser } from "./types";

type WeeklyTeacherDto = Omit<WeeklyTeacher, "teacher"> & {
  teacher: UserDto;
};

type WeeklyAvailabilityDto = Omit<WeeklyAvailability, "teacher"> & {
  teacher: UserDto | null;
};

const normalizeWeekly = (dto: WeeklyAvailabilityDto): WeeklyAvailability => ({
  ...dto,
  teacher: dto.teacher ? normalizeUser(dto.teacher) : null,
  slots: dto.slots ?? [],
  series: dto.series ?? [],
  reviews: dto.reviews ?? null,
  hasLessons: dto.hasLessons ?? false,
});

export const getTeacherDirectory = async () => {
  const list = await apiFetch<WeeklyTeacherDto[]>(
    "/api/teachers/weekly-directory"
  );
  return list.map(
    (dto): WeeklyTeacher => ({
      ...dto,
      teacher: normalizeUser(dto.teacher),
      slots: dto.slots ?? [],
    })
  );
};

// Student-facing weekly availability.
export const getTeacherProfile = async (teacherId: string) =>
  normalizeWeekly(
    await apiFetch<WeeklyAvailabilityDto>(
      `/api/teachers/${encodeURIComponent(teacherId)}/weekly-availability`
    )
  );

export const getAssignedWeeklyAvailability = async () =>
  normalizeWeekly(
    await apiFetch<WeeklyAvailabilityDto>(
      "/api/student/teacher/weekly-availability"
    )
  );

export const getMySeries = () =>
  apiFetch<LessonSeries[]>("/api/student/series");

export const endWeeklySeries = (seriesId: string) =>
  apiFetch<null>(`/api/student/series/${encodeURIComponent(seriesId)}`, {
    method: "DELETE",
  });

export const bookWeeklySlots = (ruleIds: string[]) =>
  apiFetch<{ series: LessonSeries[]; lessons: Lesson[] }>(
    "/api/student/bookings",
    { method: "POST", json: { ruleIds } }
  );

export const getMyChangeRequests = () =>
  apiFetch<LessonChangeRequest[]>("/api/student/change-requests");

export const requestTimeChange = (
  seriesId: string,
  requestedRuleId: string,
  note?: string
) =>
  apiFetch<LessonChangeRequest>(
    `/api/student/series/${encodeURIComponent(seriesId)}/change-requests`,
    {
      method: "POST",
      json: note?.trim()
        ? { requestedRuleId, note: note.trim() }
        : { requestedRuleId },
    }
  );

// Teacher weekly availability.
export const getMyAvailabilityRules = () =>
  apiFetch<WeeklyRule[]>("/api/teacher/availability-rules");

export const publishWeeklyAvailability = (input: {
  daysOfWeek: number[];
  startsAtTime: string;
  endsAtTime: string;
  timeZoneId: string;
}) =>
  apiFetch<WeeklyRule[]>("/api/teacher/availability-rules", {
    method: "POST",
    json: input,
  });

export const deleteWeeklyAvailability = (ruleId: string) =>
  apiFetch<null>(
    `/api/teacher/availability-rules/${encodeURIComponent(ruleId)}`,
    { method: "DELETE" }
  );

// Admin publishing on a teacher's behalf.
export const getTeacherAvailabilityAsAdmin = (teacherId: string) =>
  apiFetch<WeeklyRule[]>(
    `/api/admin/teachers/${encodeURIComponent(teacherId)}/availability-rules`
  );

export const publishTeacherAvailabilityAsAdmin = (
  teacherId: string,
  input: {
    daysOfWeek: number[];
    startsAtTime: string;
    endsAtTime: string;
    timeZoneId: string;
  }
) =>
  apiFetch<WeeklyRule[]>(
    `/api/admin/teachers/${encodeURIComponent(teacherId)}/availability-rules`,
    { method: "POST", json: input }
  );

export const deleteTeacherAvailabilityAsAdmin = (
  teacherId: string,
  ruleId: string
) =>
  apiFetch<null>(
    `/api/admin/teachers/${encodeURIComponent(
      teacherId
    )}/availability-rules/${encodeURIComponent(ruleId)}`,
    { method: "DELETE" }
  );

// Admin queue for student time-change requests.
export const getAdminChangeRequests = (status?: ChangeRequestStatus) =>
  apiFetch<LessonChangeRequest[]>(
    `/api/admin/change-requests${status ? `?status=${status}` : ""}`
  );

export const approveChangeRequest = (requestId: string) =>
  apiFetch<LessonChangeRequest>(
    `/api/admin/change-requests/${encodeURIComponent(requestId)}/approve`,
    { method: "POST" }
  );

export const rejectChangeRequest = (requestId: string, note?: string) =>
  apiFetch<LessonChangeRequest>(
    `/api/admin/change-requests/${encodeURIComponent(requestId)}/reject`,
    { method: "POST", json: note ? { note } : {} }
  );
