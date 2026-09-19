import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export type WineCellarDatabase = BetterSQLite3Database<typeof schema>;

export const IN_MEMORY_DATABASE = ":memory:";
const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

export function openDatabase(databaseFilePath: string): WineCellarDatabase {
  const sqliteClient = new Database(databaseFilePath);
  sqliteClient.pragma("journal_mode = WAL");
  sqliteClient.pragma("foreign_keys = ON");

  const database = drizzle({ client: sqliteClient, schema });
  migrate(database, { migrationsFolder: MIGRATIONS_FOLDER });
  return database;
}
