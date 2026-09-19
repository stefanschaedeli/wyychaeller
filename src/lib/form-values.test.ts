import { describe, expect, it } from "vitest";
import {
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
});
