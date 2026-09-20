import { describe, expect, it } from "vitest";
import { findOrphanedPhotoFileNames } from "./photo-cleanup";

const REFERENCED = "11111111-1111-1111-1111-111111111111.jpg";
const ORPHANED = "22222222-2222-2222-2222-222222222222.jpg";

describe("findOrphanedPhotoFileNames", () => {
  it("keeps a stored file that is still referenced", () => {
    expect(findOrphanedPhotoFileNames([REFERENCED], [REFERENCED])).toEqual([]);
  });

  it("reports a stored file that no wine references", () => {
    expect(findOrphanedPhotoFileNames([REFERENCED, ORPHANED], [REFERENCED])).toEqual([ORPHANED]);
  });

  it("ignores file names that are not generated photo names", () => {
    expect(findOrphanedPhotoFileNames([".DS_Store", "readme.txt"], [])).toEqual([]);
  });
});
