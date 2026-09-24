import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("web app manifest", () => {
  it("describes an installable standalone app in German", () => {
    const webManifest = manifest();

    expect(webManifest.name).toBe("WEINKELLER");
    expect(webManifest.lang).toBe("de-CH");
    expect(webManifest.display).toBe("standalone");
    expect(webManifest.start_url).toBe("/");
  });

  it("references icon files that exist", () => {
    const iconPaths = (manifest().icons ?? []).map((icon) => icon.src);

    expect(iconPaths).toEqual(["/icons/icon-192.png", "/icons/icon-512.png"]);
    for (const iconPath of iconPaths) {
      expect(existsSync(`public${iconPath}`)).toBe(true);
    }
  });
});
