import { formatWeeklySlot, formatWeeklyTimeRange } from "./format";

export const WEEK_DAY_ORDER = [6, 0, 1, 2, 3, 4, 5] as const;

export interface WeeklyTimeSource {
  dayOfWeek: number;
  startsAtTime: string;
  endsAtTime: string;
  timeZoneId?: string | null;
}

export interface ViewerWeeklyTime {
  /** Weekday in the viewer's time zone. */
  dayOfWeek: number;
  /** "HH:mm" in the viewer's time zone. */
  startsAtTime: string;
  /** "HH:mm" in the viewer's time zone. */
  endsAtTime: string;
  /** The zone the returned times are expressed in. */
  timeZoneId: string;
  sourceDayOfWeek: number;
  sourceStartsAtTime: string;
  sourceEndsAtTime: string;
  sourceTimeZoneId: string;
  sameZone: boolean;
  shiftedDay: boolean;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

const partsFormatter = (timeZone: string) => {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
};

const partsInZone = (date: Date, timeZone: string) => {
  const values: Record<string, string> = {};
  for (const part of partsFormatter(timeZone).formatToParts(date)) {
    if (part.type !== "literal") values[part.type] = part.value;
  }
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour) % 24,
    minute: Number(values.minute),
    second: Number(values.second),
  };
};

const offsetMs = (date: Date, timeZone: string) => {
  const parts = partsInZone(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
};

/** Converts a wall-clock time in a zone to the matching instant. */
const wallClockToInstant = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
) => {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
  const firstOffset = offsetMs(new Date(utcGuess), timeZone);
  let instant = utcGuess - firstOffset;
  const secondOffset = offsetMs(new Date(instant), timeZone);
  if (secondOffset !== firstOffset) instant = utcGuess - secondOffset;
  return new Date(instant);
};

const parseTime = (value: string) => {
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
};

const formatHm = (parts: { hour: number; minute: number }) =>
  `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(
    2,
    "0"
  )}`;

const weekdayOfDate = (year: number, month: number, day: number) =>
  new Date(Date.UTC(year, month - 1, day)).getUTCDay();

export const getViewerTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

/** "America/New_York" -> "New York"; keeps UTC as-is. */
export const timeZoneLabel = (timeZone: string) => {
  if (!timeZone || timeZone === "UTC") return timeZone || "UTC";
  return (
    timeZone
      .split("/")
      .pop()
      ?.replaceAll("_", " ") ?? timeZone
  );
};

/**
 * Re-expresses a recurring weekly rule on the viewer's clock. The next
 * occurrence is used, so daylight-saving transitions are applied the same way
 * the API will materialize the lessons.
 */
export const toViewerWeeklyTime = (
  slot: WeeklyTimeSource,
  viewerTimeZone: string = getViewerTimeZone(),
  now: Date = new Date()
): ViewerWeeklyTime => {
  const fallback: ViewerWeeklyTime = {
    dayOfWeek: slot.dayOfWeek,
    startsAtTime: slot.startsAtTime,
    endsAtTime: slot.endsAtTime,
    timeZoneId: viewerTimeZone || slot.timeZoneId || "UTC",
    sourceDayOfWeek: slot.dayOfWeek,
    sourceStartsAtTime: slot.startsAtTime,
    sourceEndsAtTime: slot.endsAtTime,
    sourceTimeZoneId: slot.timeZoneId || viewerTimeZone || "UTC",
    sameZone: true,
    shiftedDay: false,
  };

  const sourceTimeZone = slot.timeZoneId?.trim();
  const start = parseTime(slot.startsAtTime);
  const end = parseTime(slot.endsAtTime);
  if (
    !sourceTimeZone ||
    !viewerTimeZone ||
    sourceTimeZone === viewerTimeZone ||
    !start ||
    !end ||
    !Number.isInteger(slot.dayOfWeek) ||
    slot.dayOfWeek < 0 ||
    slot.dayOfWeek > 6
  ) {
    return fallback;
  }

  try {
    const base = partsInZone(now, sourceTimeZone);
    if (
      !Number.isFinite(base.year) ||
      !Number.isFinite(base.month) ||
      !Number.isFinite(base.day)
    ) {
      return fallback;
    }

    const baseWeekday = weekdayOfDate(base.year, base.month, base.day);
    let dayOffset = (slot.dayOfWeek - baseWeekday + 7) % 7;
    let startInstant = wallClockToInstant(
      base.year,
      base.month,
      base.day + dayOffset,
      start.hours,
      start.minutes,
      sourceTimeZone
    );
    if (startInstant.getTime() <= now.getTime()) {
      dayOffset += 7;
      startInstant = wallClockToInstant(
        base.year,
        base.month,
        base.day + dayOffset,
        start.hours,
        start.minutes,
        sourceTimeZone
      );
    }

    const overnight =
      end.hours < start.hours ||
      (end.hours === start.hours && end.minutes <= start.minutes);
    const endInstant = wallClockToInstant(
      base.year,
      base.month,
      base.day + dayOffset + (overnight ? 1 : 0),
      end.hours,
      end.minutes,
      sourceTimeZone
    );

    const viewerStart = partsInZone(startInstant, viewerTimeZone);
    const viewerEnd = partsInZone(endInstant, viewerTimeZone);
    if (
      !Number.isFinite(viewerStart.year) ||
      !Number.isFinite(viewerEnd.year)
    ) {
      return fallback;
    }

    const viewerDay = weekdayOfDate(
      viewerStart.year,
      viewerStart.month,
      viewerStart.day
    );

    return {
      dayOfWeek: viewerDay,
      startsAtTime: formatHm(viewerStart),
      endsAtTime: formatHm(viewerEnd),
      timeZoneId: viewerTimeZone,
      sourceDayOfWeek: slot.dayOfWeek,
      sourceStartsAtTime: slot.startsAtTime,
      sourceEndsAtTime: slot.endsAtTime,
      sourceTimeZoneId: sourceTimeZone,
      sameZone: false,
      shiftedDay: viewerDay !== slot.dayOfWeek,
    };
  } catch {
    return fallback;
  }
};

export const toViewerWeeklySlotLabel = (
  slot: WeeklyTimeSource,
  viewerTimeZone: string = getViewerTimeZone(),
  now: Date = new Date()
) => {
  const local = toViewerWeeklyTime(slot, viewerTimeZone, now);
  return formatWeeklySlot(local.dayOfWeek, local.startsAtTime, local.endsAtTime);
};

export const toViewerWeeklyTimeRangeLabel = (
  slot: WeeklyTimeSource,
  viewerTimeZone: string = getViewerTimeZone(),
  now: Date = new Date()
) => {
  const local = toViewerWeeklyTime(slot, viewerTimeZone, now);
  return formatWeeklyTimeRange(local.startsAtTime, local.endsAtTime);
};

export const viewerWeekdays = (
  slots: WeeklyTimeSource[],
  viewerTimeZone: string = getViewerTimeZone(),
  now: Date = new Date()
) => {
  const days = new Set(
    slots.map((slot) => toViewerWeeklyTime(slot, viewerTimeZone, now).dayOfWeek)
  );
  return WEEK_DAY_ORDER.filter((day) => days.has(day));
};
