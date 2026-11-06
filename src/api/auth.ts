import { ApiError, apiFetch } from "./client";
import { normalizeUser, type UserDto, type UserProfile } from "./types";

interface UserEnvelope {
  user: UserDto;
}

export async function login(
  email: string,
  password: string
): Promise<UserProfile> {
  const response = await apiFetch<UserEnvelope>("/api/auth/login", {
    method: "POST",
    json: { email, password },
  });
  return normalizeUser(response.user);
}

/** Public registration creates student accounts only, exactly like the web app. */
export async function register(
  fullName: string,
  email: string,
  password: string,
  country?: string
): Promise<UserProfile> {
  const response = await apiFetch<UserEnvelope>("/api/auth/register", {
    method: "POST",
    json: { fullName, email, password, ...(country ? { country } : {}) },
  });
  return normalizeUser(response.user);
}

let currentUserRequest: Promise<UserProfile | null> | null = null;

/**
 * Restores the session from the HttpOnly cookie. Concurrent callers share one
 * request, so the auth provider and screen guards never duplicate `/auth/me`.
 */
export function getCurrentUser(): Promise<UserProfile | null> {
  if (currentUserRequest) return currentUserRequest;
  currentUserRequest = (async () => {
    try {
      const result = await apiFetch<UserDto | UserEnvelope>("/api/auth/me");
      if (!result) return null;
      const raw =
        "user" in result && result.user ? result.user : (result as UserDto);
      return normalizeUser(raw);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    } finally {
      currentUserRequest = null;
    }
  })();
  return currentUserRequest;
}

export async function logout(): Promise<void> {
  await apiFetch<null>("/api/auth/logout", { method: "POST" });
}

export interface PasswordResetRequestResponse {
  message: string;
  devCode?: string | null;
}

export const requestPasswordReset = (email: string) =>
  apiFetch<PasswordResetRequestResponse>("/api/auth/password/request", {
    method: "POST",
    json: { email },
  });

export const resetPassword = (email: string, code: string, newPassword: string) =>
  apiFetch<null>("/api/auth/password/reset", {
    method: "POST",
    json: { email, code, newPassword },
  });

export interface OtpRequestResponse {
  message: string;
  devMode?: boolean;
  devCode?: string | null;
}

export interface OtpVerifyResponse {
  requiresProfile?: boolean;
  user?: UserProfile;
}

export const requestOtp = (phone: string) =>
  apiFetch<OtpRequestResponse>("/api/auth/otp/request", {
    method: "POST",
    json: { phone },
  });

export async function verifyOtp(
  phone: string,
  code: string,
  fullName?: string,
  country?: string
): Promise<OtpVerifyResponse> {
  const response = await apiFetch<{
    requiresProfile?: boolean;
    user?: UserDto;
  }>("/api/auth/otp/verify", {
    method: "POST",
    json: {
      phone,
      code,
      ...(fullName ? { fullName } : {}),
      ...(country ? { country } : {}),
    },
  });
  return {
    requiresProfile: response.requiresProfile,
    user: response.user ? normalizeUser(response.user) : undefined,
  };
}

export const changePassword = (currentPassword: string, newPassword: string) =>
  apiFetch<null>("/api/auth/change-password", {
    method: "POST",
    json: { currentPassword, newPassword },
  });
