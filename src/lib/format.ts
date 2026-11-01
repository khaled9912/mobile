const dateTimeFormatter = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", options);

const shortDateTimeOptions: Intl.DateTimeFormatOptions = {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
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
};

export const parseDate = (value: string) => new Date(value);

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
