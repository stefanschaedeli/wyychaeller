import { describe, expect, it } from "vitest";
import { isWebLink } from "./web-links";

describe("isWebLink", () => {
  it("accepts https and http URLs", () => {
    expect(isWebLink("https://example.com/tignanello")).toBe(true);
    expect(isWebLink("http://example.com")).toBe(true);
  });

  it("rejects non-web schemes and empty values", () => {
    expect(isWebLink("javascript:alert(1)")).toBe(false);
    expect(isWebLink(null)).toBe(false);
    expect(isWebLink("")).toBe(false);
  });
});
