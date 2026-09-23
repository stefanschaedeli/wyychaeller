import { describe, expect, it } from "vitest";
import { MAXIMUM_BOTTLE_COUNT } from "@/domain/constants";
import { commitCountText, parseCountWhileTyping } from "./count-input";

describe("parseCountWhileTyping", () => {
  it("commits a valid number", () => {
    expect(parseCountWhileTyping("6")).toBe(6);
    expect(parseCountWhileTyping("12")).toBe(12);
  });

  it("treats an empty field as no bottles yet, without committing", () => {
    expect(parseCountWhileTyping("")).toBeNull();
    expect(parseCountWhileTyping("   ")).toBeNull();
  });

  it("commits nothing while the text is not a usable count", () => {
    expect(parseCountWhileTyping("abc")).toBeNull();
    expect(parseCountWhileTyping("-3")).toBeNull();
    expect(parseCountWhileTyping("1.5")).toBeNull();
  });

  it("accepts zero, which empties the position", () => {
    expect(parseCountWhileTyping("0")).toBe(0);
  });

  it("clamps a typed count above the maximum", () => {
    expect(parseCountWhileTyping(String(MAXIMUM_BOTTLE_COUNT + 1))).toBe(MAXIMUM_BOTTLE_COUNT);
  });
});

describe("commitCountText", () => {
  it("keeps a valid number", () => {
    expect(commitCountText("4", 9)).toBe(4);
  });

  it("turns an empty field into no bottles", () => {
    expect(commitCountText("", 9)).toBe(0);
    expect(commitCountText("  ", 9)).toBe(0);
  });

  it("falls back to the committed value when the text is unusable", () => {
    expect(commitCountText("abc", 9)).toBe(9);
    expect(commitCountText("-2", 9)).toBe(9);
  });

  it("clamps a committed count above the maximum", () => {
    expect(commitCountText(String(MAXIMUM_BOTTLE_COUNT + 1), 9)).toBe(MAXIMUM_BOTTLE_COUNT);
  });
});
