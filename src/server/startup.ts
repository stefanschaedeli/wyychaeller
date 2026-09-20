import { mkdir } from "node:fs/promises";
import path from "node:path";
import { findOrphanedPhotoFileNames } from "./photo-storage/photo-cleanup";
import { readEnvironment } from "./config/environment";
import { getServiceContainer, PHOTO_FOLDER_NAME } from "./service-container";

export async function initializeServer(): Promise<void> {
  const { dataDirectory } = readEnvironment();
  await mkdir(path.join(dataDirectory, PHOTO_FOLDER_NAME), { recursive: true });

  const resetCount = getServiceContainer().wineRepository.resetInterruptedAnalyses();
  if (resetCount > 0) console.warn(`Reset ${resetCount} analyses interrupted by a restart`);

  await sweepOrphanedPhotos();
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
      console.warn(`Removed ${orphanedFileNames.length} orphaned label photo(s)`);
    }
  } catch (error) {
    console.error("Orphaned photo sweep failed", error);
  }
}
