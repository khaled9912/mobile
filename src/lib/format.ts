const dateTimeFormatter = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", options);

const shortDateTimeOptions: Intl.DateTimeFormatOptions = {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
};

const longDateOptions: Intl.DateTimeFormatOptions = {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
};

const timeOptions: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
};

export const parseDate = (value: string) => new Date(value);

/** Formats an academy month key ("2026-11") for labels. */
export const formatMonthKey = (value: string) => {
  const [year, month] = value.split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return value;
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
};

export const formatDateTime = (value: string) => {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateTimeFormatter(shortDateTimeOptions).format(date);
};

export const formatLongDate = (value: string) => {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateTimeFormatter(longDateOptions).format(date);
};

export const formatTime = (value: string) => {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateTimeFormatter(timeOptions).format(date);
};

export const formatTimeRange = (startsAt: string, endsAt: string) =>
  `${formatTime(startsAt)} – ${formatTime(endsAt)}`;

export const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const WEEKDAY_SHORT = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

export const weekdayLabel = (dayOfWeek: number) =>
  WEEKDAY_LABELS[dayOfWeek] ?? "";

/** Formats a weekly "HH:mm" value without inventing a date. */
export const formatTimeOfDay = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return "—";
  return dateTimeFormatter(timeOptions).format(
    new Date(2000, 0, 1, hours, minutes)
  );
};

export const formatWeeklyTimeRange = (
  startsAtTime: string,
  endsAtTime: string
) => `${formatTimeOfDay(startsAtTime)} – ${formatTimeOfDay(endsAtTime)}`;

export const formatWeeklySlot = (
  dayOfWeek: number,
  startsAtTime: string,
  endsAtTime: string
) =>
  `${weekdayLabel(dayOfWeek)} · ${formatWeeklyTimeRange(
    startsAtTime,
    endsAtTime
  )}`;

/** A Date carrying only the time of day, for native time pickers. */
export const dateFromTimeOfDay = (value: string, fallback = "17:00") => {
  const [hours, minutes] = (value || fallback).split(":").map(Number);
  const date = new Date();
  date.setHours(
    Number.isFinite(hours) ? hours : 17,
    Number.isFinite(minutes) ? minutes : 0,
    0,
    0
  );
  return date;
};

export const timeOfDayFromDate = (date: Date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;

export const formatDayLabel = (value: string) => {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateTimeFormatter({ weekday: "short", day: "numeric", month: "short" }).format(
    date
  );
};

/** "Today", "Tomorrow", or a short date — used to group schedules. */
export const relativeDay = (value: string) => {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round(
    (startOfDay(date) - startOfDay(now)) / (24 * 60 * 60 * 1000)
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return formatDayLabel(value);
};

export const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

export const minutesUntil = (value: string) =>
  Math.round((parseDate(value).getTime() - Date.now()) / 60000);

/**
 * Countdown for a lesson later today: "Starts in 2h 15m". Returns null for
 * past lessons and for anything not happening on the same local day, where
 * the relative day label already says what is needed.
 */
export const startsInLabel = (value: string, now = Date.now()) => {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = date.getTime() - now;
  if (diffMs <= 0) return null;
  const today = new Date(now);
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  if (!sameDay) return null;

  const totalMinutes = Math.ceil(diffMs / 60_000);
  if (totalMinutes < 60) return `Starts in ${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `Starts in ${hours}h ${minutes}m` : `Starts in ${hours}h`;
};

/** Compact age for notification rows: "Just now", "12m ago", "3h ago". */
export const timeAgo = (value: string) => {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "Just now";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDayLabel(value);
};
