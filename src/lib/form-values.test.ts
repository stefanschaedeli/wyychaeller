import { describe, expect, it } from "vitest";
import {
  parseBottleCount,
  parseCommaSeparatedList,
  parseOptionalInteger,
  parseOptionalNumber,
  toInputText,
  toNullableText,
} from "./form-values";

describe("form values", () => {
  it("parses optional numbers, accepting a decimal comma", () => {
    expect(parseOptionalNumber(" 95,50 ")).toBe(95.5);
    expect(parseOptionalNumber("")).toBeNull();
    expect(parseOptionalNumber("abc")).toBeNull();
  });

  it("parses optional integers", () => {
    expect(parseOptionalInteger("2018")).toBe(2018);
    expect(parseOptionalInteger("20.5")).toBeNull();
  });

  it("splits comma separated lists and drops empty entries", () => {
    expect(parseCommaSeparatedList("Sangiovese, , Merlot ")).toEqual(["Sangiovese", "Merlot"]);
  });

  it("turns values into input text", () => {
    expect(toInputText(null)).toBe("");
    expect(toInputText(2018)).toBe("2018");
  });

  it("trims text and turns an empty result into null", () => {
    expect(toNullableText("  Regal 2 ")).toBe("Regal 2");
    expect(toNullableText("   ")).toBeNull();
    expect(toNullableText("")).toBeNull();
  });

  it("parses a bottle count that meets the minimum", () => {
    expect(parseBottleCount("6", 1)).toBe(6);
    expect(parseBottleCount("0", 1)).toBeNull();
    expect(parseBottleCount("0", 0)).toBe(0);
    expect(parseBottleCount("1.5", 1)).toBeNull();
    expect(parseBottleCount("", 1)).toBeNull();
  });
});
