import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { describe, expect, it } from "vitest";
import { MIGRATIONS_FOLDER } from "./connection";
import { bottlePlacements } from "./schema";

const JOURNAL_PATH = path.join(MIGRATIONS_FOLDER, "meta", "_journal.json");

function readZeroMigrationTimestamp(): number {
  const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, "utf-8")) as {
    entries: { idx: number; when: number }[];
  };
  const zeroEntry = journal.entries.find((entry) => entry.idx === 0);
  if (zeroEntry === undefined) throw new Error("Migration journal is missing entry 0");
  return zeroEntry.when;
}

function applyZeroMigration(rawDatabase: Database.Database): void {
  const sql = fs.readFileSync(path.join(MIGRATIONS_FOLDER, "0000_broken_wolfpack.sql"), "utf-8");
  for (const statement of sql.split("--> statement-breakpoint")) {
    const trimmed = statement.trim();
    if (trimmed.length > 0) rawDatabase.exec(trimmed);
  }
}

function markZeroMigrationAsApplied(rawDatabase: Database.Database): void {
  rawDatabase.exec(
    `CREATE TABLE __drizzle_migrations (
      id integer primary key autoincrement,
      hash text not null,
      created_at numeric
    )`,
  );
  rawDatabase
    .prepare("INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)")
    .run("0000_broken_wolfpack", readZeroMigrationTimestamp());
}

function insertWineWithStorageLocation(
  rawDatabase: Database.Database,
  bottleCount: number,
  storageLocation: string,
  photoFileName: string,
): void {
  rawDatabase
    .prepare(
      `INSERT INTO wines (grape_varieties, bottle_count, storage_location, photo_file_name, critic_scores, food_pairings, analysis_status, created_at, updated_at)
       VALUES ('[]', ?, ?, ?, '[]', '[]', 'pending', 0, 0)`,
    )
    .run(bottleCount, storageLocation, photoFileName);
}

function migrateFromZeroMigration(): Database.Database {
  const rawDatabase = new Database(":memory:");
  applyZeroMigration(rawDatabase);
  markZeroMigrationAsApplied(rawDatabase);

  insertWineWithStorageLocation(rawDatabase, 6, "Regal 2", "a.jpg");
  insertWineWithStorageLocation(rawDatabase, 0, "Kiste", "b.jpg");

  migrate(drizzle(rawDatabase), { migrationsFolder: MIGRATIONS_FOLDER });
  return rawDatabase;
}

describe("migrations 0001 and 0002", () => {
  it("copies existing storage locations into bottle placements as free text", () => {
    const rawDatabase = migrateFromZeroMigration();

    const placements = drizzle(rawDatabase).select().from(bottlePlacements).all();

    expect(placements).toHaveLength(1);
    expect(placements[0]).toMatchObject({
      freeText: "Regal 2",
      bottleCount: 6,
      locationId: null,
    });
  });

  it("drops the free-text storage_location column from wines but keeps the wines", () => {
    const rawDatabase = migrateFromZeroMigration();

    const columnNames = rawDatabase
      .prepare("PRAGMA table_info(wines)")
      .all()
      .map((column) => (column as { name: string }).name);
    const wineRows = rawDatabase.prepare("SELECT photo_file_name, bottle_count FROM wines").all();

    expect(columnNames).not.toContain("storage_location");
    expect(columnNames).toContain("bottle_count");
    expect(wineRows).toEqual([
      { photo_file_name: "a.jpg", bottle_count: 6 },
      { photo_file_name: "b.jpg", bottle_count: 0 },
    ]);
  });
});
