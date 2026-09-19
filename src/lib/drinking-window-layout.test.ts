import { describe, expect, it } from "vitest";
import { calculateWindowBarLayout } from "./drinking-window-layout";

describe("calculateWindowBarLayout", () => {
  it("returns null without a complete window", () => {
    expect(
      calculateWindowBarLayout({ drinkFromYear: null, drinkUntilYear: 2030 }, 2026),
    ).toBeNull();
  });

  it("places window and today on a scale with one year of padding", () => {
    const layout = calculateWindowBarLayout({ drinkFromYear: 2024, drinkUntilYear: 2032 }, 2026);
    expect(layout).toEqual({
      firstYear: 2023,
      lastYear: 2033,
      windowStartPercent: 10,
      windowWidthPercent: 80,
      todayPercent: 30,
    });
  });

  it("extends the scale when today lies outside the window", () => {
    const layout = calculateWindowBarLayout({ drinkFromYear: 2030, drinkUntilYear: 2040 }, 2026);
    expect(layout?.firstYear).toBe(2025);
    expect(layout?.todayPercent).toBeCloseTo(6.25);
  });
});
