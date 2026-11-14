import { apiFetch } from "./client";
import type {
  ChangeRequestStatus,
  LessonChangeRequest,
  LessonSeries,
  OpenStudentOffer,
  UserDto,
  WeeklyAvailability,
  WeeklyRule,
} from "./types";
import { normalizeUser } from "./types";

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

// Open student offers claimed by the first accepting teacher.
export const getTeacherOpenOffers = () =>
  apiFetch<OpenStudentOffer[]>("/api/teacher/open-offers");

export const acceptOpenOffer = (offerId: string) =>
  apiFetch<{ lessonId: string; offer: OpenStudentOffer }>(
    `/api/teacher/open-offers/${encodeURIComponent(offerId)}/accept`,
    { method: "POST" }
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

/** Ends every student's repeating series on this time so it can be removed. */
export const releaseTeacherAvailabilityAsAdmin = (
  teacherId: string,
  ruleId: string
) =>
  apiFetch<{ released: number; lessonsCancelled: number }>(
    `/api/admin/teachers/${encodeURIComponent(
      teacherId
    )}/availability-rules/${encodeURIComponent(ruleId)}/release`,
    { method: "POST" }
  );

// Read-only history of weekly times students moved themselves.
export const getAdminChangeRequests = (status?: ChangeRequestStatus) =>
  apiFetch<LessonChangeRequest[]>(
    `/api/admin/change-requests${status ? `?status=${status}` : ""}`
  );
