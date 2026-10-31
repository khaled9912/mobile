import { apiFetch } from "./client";
import {
  normalizeUser,
  type ReportPage,
  type UserDto,
  type UserProfile,
} from "./types";

interface ProfileEnvelope {
  user: UserDto;
}

export interface UpdateProfileInput {
  fullName?: string;
  email?: string;
  phoneNumber?: string;
}

export async function updateProfile(
  input: UpdateProfileInput
): Promise<UserProfile> {
  const response = await apiFetch<ProfileEnvelope>("/api/profile", {
    method: "PATCH",
    json: input,
  });
  return normalizeUser(response.user);
}

export type AvatarUpload = {
  uri: string;
  name: string;
  type: string;
};

export async function uploadAvatar(file: AvatarUpload): Promise<string> {
  const form = new FormData();
  // React Native accepts a file descriptor here and streams it as multipart.
  form.append("file", file as unknown as Blob);
  const response = await apiFetch<{ avatarUrl: string }>("/api/profile/avatar", {
    method: "POST",
    formData: form,
    timeoutMs: 60_000,
  });
  return response.avatarUrl;
}

export const deleteAvatar = () =>
  apiFetch<null>("/api/profile/avatar", { method: "DELETE" });

export const getMyReports = (skip = 0, take = 10) =>
  apiFetch<ReportPage>(`/api/profile/reports?skip=${skip}&take=${take}`);
