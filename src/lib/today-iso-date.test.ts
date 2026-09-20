import { describe, expect, it } from "vitest";
import { getTodayAsIsoDate } from "./today-iso-date";

describe("getTodayAsIsoDate", () => {
  it("formats a given date as an ISO date", () => {
    expect(getTodayAsIsoDate(new Date("2026-03-01T08:00:00"))).toBe("2026-03-01");
  });

  it("uses the local calendar day even close to midnight", () => {
    // 23:30 local time on 2026-09-19 must still be 2026-09-19, not the next UTC day.
    expect(getTodayAsIsoDate(new Date(2026, 8, 19, 23, 30))).toBe("2026-09-19");
  });
});
