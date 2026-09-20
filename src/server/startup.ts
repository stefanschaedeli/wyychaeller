import { mkdir } from "node:fs/promises";
import path from "node:path";
import packageJson from "../../package.json";
import { createLogger } from "./logging/logger";
import { findOrphanedPhotoFileNames } from "./photo-storage/photo-cleanup";
import { readEnvironment } from "./config/environment";
import { getServiceContainer, PHOTO_FOLDER_NAME } from "./service-container";

const logger = createLogger("startup");

export async function initializeServer(): Promise<void> {
  const environment = readEnvironment();
  const { dataDirectory } = environment;
  logger.info("Weinkeller starting", {
    version: packageJson.version,
    model: environment.claudeModel,
    intelligenceMode: environment.wineIntelligenceMode,
    hasApiKey: environment.anthropicApiKey !== null,
    dataDirectory,
    logLevel: environment.logLevel,
  });
  await mkdir(path.join(dataDirectory, PHOTO_FOLDER_NAME), { recursive: true });

  const resetCount = getServiceContainer().wineRepository.resetInterruptedAnalyses();
  if (resetCount > 0) logger.warn("Reset analyses interrupted by a restart", { resetCount });

  await sweepOrphanedPhotos();
  const wineCount = getServiceContainer().wineRepository.listWines().length;
  logger.info("Weinkeller ready", { wineCount });
}

/**
 * Removes label photos left over from a crash between deleting a wine and its file.
 * Never blocks start-up: any failure here is logged and swallowed.
 */
async function sweepOrphanedPhotos(): Promise<void> {
  try {
    const { wineRepository, photoStorage } = getServiceContainer();
    const storedFileNames = await photoStorage.listStoredPhotoFileNames();
    const referencedFileNames = wineRepository.listWines().map((wine) => wine.photoFileName);
    const orphanedFileNames = findOrphanedPhotoFileNames(storedFileNames, referencedFileNames);

    for (const fileName of orphanedFileNames) {
      await photoStorage.deleteLabelPhoto(fileName);
    }
    if (orphanedFileNames.length > 0) {
      logger.warn("Removed orphaned label photos", { photoCount: orphanedFileNames.length });
    }
  } catch (error) {
    logger.error("Orphaned photo sweep failed", { error });
  }
}
