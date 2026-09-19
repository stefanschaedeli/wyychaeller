import { mkdir } from "node:fs/promises";
import path from "node:path";
import { readEnvironment } from "./config/environment";
import { openDatabase } from "./database/connection";

export const DATABASE_FILE_NAME = "weinkeller.db";
export const PHOTO_FOLDER_NAME = "photos";

export async function initializeServer(): Promise<void> {
  const { dataDirectory } = readEnvironment();
  await mkdir(path.join(dataDirectory, PHOTO_FOLDER_NAME), { recursive: true });
  openDatabase(path.join(dataDirectory, DATABASE_FILE_NAME));
}
