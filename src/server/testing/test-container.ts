import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { IN_MEMORY_DATABASE, openDatabase } from "../database/connection";
import {
  buildServiceContainer,
  setServiceContainerForTesting,
  type ServiceContainer,
} from "../service-container";
import { RecordedWineIntelligence } from "../wine-intelligence/recorded-wine-intelligence";

export interface TestContainer {
  container: ServiceContainer;
  cleanUp: () => Promise<void>;
}

/** In-memory database, temporary photo folder, recorded AI. Installed as the global container. */
export async function createTestContainer(): Promise<TestContainer> {
  const photoDirectory = await mkdtemp(path.join(tmpdir(), "weinkeller-test-"));
  const container = buildServiceContainer({
    database: openDatabase(IN_MEMORY_DATABASE),
    photoDirectory,
    wineIntelligence: new RecordedWineIntelligence(),
    isAiConfigured: true,
  });
  setServiceContainerForTesting(container);

  return {
    container,
    cleanUp: async () => {
      await container.backgroundTasks.waitUntilIdle();
      setServiceContainerForTesting(null);
      await rm(photoDirectory, { recursive: true, force: true });
    },
  };
}
