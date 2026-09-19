import { describe, expect, it } from "vitest";
import { IN_MEMORY_DATABASE, openDatabase } from "./connection";
import { wines } from "./schema";

describe("openDatabase", () => {
  it("creates all tables through migrations", () => {
    const database = openDatabase(IN_MEMORY_DATABASE);

    const insertedWine = database
      .insert(wines)
      .values({ photoFileName: "label.jpg" })
      .returning()
      .get();

    expect(insertedWine.id).toBe(1);
    expect(insertedWine.analysisStatus).toBe("pending");
    expect(insertedWine.grapeVarieties).toEqual([]);
    expect(insertedWine.createdAt).toBeInstanceOf(Date);
  });
});
