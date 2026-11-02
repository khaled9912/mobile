import { describe, expect, it } from "vitest";
import {
  getViewerTimeZone,
  timeZoneLabel,
  toViewerWeeklyTime,
  viewerWeekdays,
} from "../weekly-time";

const rule = (overrides: Partial<Parameters<typeof toViewerWeeklyTime>[0]>) => ({
  dayOfWeek: 1,
  startsAtTime: "19:00",
  endsAtTime: "20:00",
  timeZoneId: "Europe/London",
  ...overrides,
});

describe("weekly time conversion", () => {
  const now = new Date("2026-01-05T12:00:00.000Z"); // Monday in London

  it("keeps the same clock when teacher and student share a zone", () => {
    const local = toViewerWeeklyTime(rule({}), "Europe/London", now);
    expect(local.sameZone).toBe(true);
    expect(local.dayOfWeek).toBe(1);
    expect(local.startsAtTime).toBe("19:00");
    expect(local.endsAtTime).toBe("20:00");
  });

  it("converts a London slot to New York time", () => {
    const local = toViewerWeeklyTime(rule({}), "America/New_York", now);
    expect(local.dayOfWeek).toBe(1);
    expect(local.startsAtTime).toBe("14:00");
    expect(local.endsAtTime).toBe("15:00");
    expect(local.shiftedDay).toBe(false);
  });

  it("moves the weekday when the conversion crosses midnight", () => {
    const local = toViewerWeeklyTime(
      rule({ startsAtTime: "00:30", endsAtTime: "01:30" }),
      "America/New_York",
      now
    );
    expect(local.dayOfWeek).toBe(0);
    expect(local.startsAtTime).toBe("19:30");
    expect(local.endsAtTime).toBe("20:30");
    expect(local.shiftedDay).toBe(true);
  });

  it("keeps overnight ranges intact", () => {
    const local = toViewerWeeklyTime(
      rule({ dayOfWeek: 6, startsAtTime: "23:00", endsAtTime: "00:30" }),
      "America/New_York",
      now
    );
    expect(local.dayOfWeek).toBe(6);
    expect(local.startsAtTime).toBe("18:00");
    expect(local.endsAtTime).toBe("19:30");
  });

  it("uses the next occurrence across differing DST dates", () => {
    // US DST starts 8 March 2026; UK DST starts 29 March 2026.
    const beforeUkDst = toViewerWeeklyTime(
      rule({}),
      "America/New_York",
      new Date("2026-03-10T12:00:00.000Z")
    );
    expect(beforeUkDst.startsAtTime).toBe("15:00");

    const afterUkDst = toViewerWeeklyTime(
      rule({}),
      "America/New_York",
      new Date("2026-04-01T12:00:00.000Z")
    );
    expect(afterUkDst.startsAtTime).toBe("14:00");
  });

  it("falls back to the teacher clock for an invalid zone", () => {
    const local = toViewerWeeklyTime(
      rule({ timeZoneId: "Not/AZone" }),
      "America/New_York",
      now
    );
    expect(local.sameZone).toBe(true);
    expect(local.startsAtTime).toBe("19:00");
  });

  it("labels zones and dedupes viewer weekdays", () => {
    expect(timeZoneLabel("America/New_York")).toBe("New York");
    expect(timeZoneLabel("UTC")).toBe("UTC");
    expect(getViewerTimeZone()).toBeTruthy();
    expect(
      viewerWeekdays(
        [
          rule({}),
          rule({ dayOfWeek: 2, startsAtTime: "00:30", endsAtTime: "01:30" }),
          rule({ dayOfWeek: 3, startsAtTime: "00:30", endsAtTime: "01:30" }),
        ],
        "America/New_York",
        now
      )
    ).toEqual([1, 2]);
  });
});
