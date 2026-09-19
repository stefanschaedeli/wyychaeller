import { mkdir } from "node:fs/promises";
import path from "node:path";
import { readEnvironment } from "./config/environment";
import { getServiceContainer, PHOTO_FOLDER_NAME } from "./service-container";

export async function initializeServer(): Promise<void> {
  const { dataDirectory } = readEnvironment();
  await mkdir(path.join(dataDirectory, PHOTO_FOLDER_NAME), { recursive: true });

  const resetCount = getServiceContainer().wineRepository.resetInterruptedAnalyses();
  if (resetCount > 0) console.warn(`Reset ${resetCount} analyses interrupted by a restart`);
}
