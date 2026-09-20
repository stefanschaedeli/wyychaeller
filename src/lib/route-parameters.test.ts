import { describe, expect, it } from "vitest";
import { parseWineIdParameter } from "./route-parameters";

describe("parseWineIdParameter", () => {
  it("parses a positive integer route parameter", () => {
    expect(parseWineIdParameter("12")).toBe(12);
  });

  it("rejects non-numeric, fractional, zero, negative and missing values", () => {
    expect(parseWineIdParameter("abc")).toBeNull();
    expect(parseWineIdParameter("1.5")).toBeNull();
    expect(parseWineIdParameter("0")).toBeNull();
    expect(parseWineIdParameter("-3")).toBeNull();
    expect(parseWineIdParameter(undefined)).toBeNull();
  });
});
