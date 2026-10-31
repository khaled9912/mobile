import { apiFetch } from "./client";
import {
  normalizeUser,
  type Assignment,
  type UserDto,
  type UserProfile,
} from "./types";

// Admin-only people list. /api/students is also readable by teachers, but the
// mobile UI uses it only in the admin tab.
export const getStudents = async (includeInactive = false) => {
  const list = await apiFetch<UserDto[]>(
    `/api/students${includeInactive ? "?includeInactive=true" : ""}`
  );
  return list.map(normalizeUser);
};

export const getTeachers = async (includeInactive = false) => {
  const list = await apiFetch<UserDto[]>(
    `/api/teachers${includeInactive ? "?includeInactive=true" : ""}`
  );
  return list.map(normalizeUser);
};

export const getAssignments = () =>
  apiFetch<Assignment[]>("/api/admin/assignments");

export const createAssignment = (teacherId: string, studentId: string) =>
  apiFetch<Assignment>("/api/teacher-student-assignments", {
    method: "POST",
    json: { teacherId, studentId },
  });

export const deleteAssignment = (assignmentId: string) =>
  apiFetch<null>(
    `/api/teacher-student-assignments/${encodeURIComponent(assignmentId)}`,
    { method: "DELETE" }
  );

export interface CreateUserInput {
  fullName: string;
  email: string;
  password: string;
  role: "teacher" | "admin";
}

export interface CreateStudentInput {
  fullName: string;
  email: string;
  password: string;
  grade?: string;
}

export async function createManagedUser(
  input: CreateUserInput
): Promise<UserProfile> {
  const response = await apiFetch<{ user: UserDto }>("/api/admin/users", {
    method: "POST",
    json: input,
  });
  return normalizeUser(response.user);
}

export async function createStudent(
  input: CreateStudentInput
): Promise<UserProfile> {
  return normalizeUser(
    await apiFetch<UserDto>("/api/students", {
      method: "POST",
      json: input,
    })
  );
}

// Deactivation mirrors the web app: DELETE applies the full server-side
// guardrails (upcoming lessons, pending requests, future slots, assignments).
// PATCH is only used to reactivate an existing account.
export const setUserActive = (
  id: string,
  isActive: boolean
): Promise<UserDto | null> =>
  isActive
    ? apiFetch<UserDto>(`/api/admin/users/${encodeURIComponent(id)}`, {
        method: "PATCH",
        json: { isActive: true },
      })
    : apiFetch<null>(`/api/admin/users/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
