import { apiFetch } from "./client";
import type { NotificationsFeed } from "./types";

export const getNotifications = () =>
  apiFetch<NotificationsFeed>("/api/notifications");

export const markNotificationRead = (id: string) =>
  apiFetch<void>(`/api/notifications/${encodeURIComponent(id)}/read`, {
    method: "POST",
  });

export const markAllNotificationsRead = () =>
  apiFetch<void>("/api/notifications/read-all", { method: "POST" });
