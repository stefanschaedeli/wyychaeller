import path from "node:path";
import { AI_REQUESTS_PER_MINUTE } from "@/domain/constants";
import { readEnvironment } from "./config/environment";
import { openDatabase, type WineCellarDatabase } from "./database/connection";
import { RateLimiter } from "./http/rate-limiter";
import { PhotoStorage } from "./photo-storage/photo-storage";
import { AiUsageRepository } from "./repository/ai-usage-repository";
import { DishRecommendationRepository } from "./repository/dish-recommendation-repository";
import { SettingsRepository } from "./repository/settings-repository";
import { TastingRepository } from "./repository/tasting-repository";
import { WineRepository } from "./repository/wine-repository";
import { AiBudgetGuard } from "./services/ai-budget-guard";
import { BackgroundTasks } from "./services/background-tasks";
import { DishRecommendationService } from "./services/dish-recommendation-service";
import { WineAnalysisService } from "./services/wine-analysis-service";
import { createWineIntelligence } from "./wine-intelligence/create-wine-intelligence";
import type { WineIntelligence } from "./wine-intelligence/wine-intelligence";

export const DATABASE_FILE_NAME = "weinkeller.db";
export const PHOTO_FOLDER_NAME = "photos";
const ONE_MINUTE_IN_MILLISECONDS = 60_000;

export interface ServiceContainerOptions {
  database: WineCellarDatabase;
  photoDirectory: string;
  wineIntelligence: WineIntelligence;
  isAiConfigured: boolean;
}

export type ServiceContainer = ReturnType<typeof buildServiceContainer>;

export function buildServiceContainer(options: ServiceContainerOptions) {
  const { database, wineIntelligence, isAiConfigured } = options;
  const wineRepository = new WineRepository(database);
  const tastingRepository = new TastingRepository(database);
  const dishRecommendationRepository = new DishRecommendationRepository(database);
  const settingsRepository = new SettingsRepository(database);
  const photoStorage = new PhotoStorage(options.photoDirectory);
  const getNow = () => new Date();
  const aiBudgetGuard = new AiBudgetGuard(
    new AiUsageRepository(database),
    settingsRepository,
    getNow,
  );

  return {
    wineRepository,
    tastingRepository,
    dishRecommendationRepository,
    settingsRepository,
    photoStorage,
    aiBudgetGuard,
    isAiConfigured,
    backgroundTasks: new BackgroundTasks(),
    aiRateLimiter: new RateLimiter(AI_REQUESTS_PER_MINUTE, ONE_MINUTE_IN_MILLISECONDS),
    wineAnalysisService: new WineAnalysisService({
      wineRepository,
      photoStorage,
      wineIntelligence,
      aiBudgetGuard,
    }),
    dishRecommendationService: new DishRecommendationService({
      wineRepository,
      dishRecommendationRepository,
      wineIntelligence,
      aiBudgetGuard,
      getCurrentYear: () => getNow().getFullYear(),
    }),
  };
}

// Next.js may load this module more than once (instrumentation, routes, dev reloads).
// Keeping the instance on globalThis guarantees one database connection per process.
const globalStore = globalThis as typeof globalThis & {
  weinkellerServiceContainer?: ServiceContainer | null;
};

function createProductionContainer(): ServiceContainer {
  const environment = readEnvironment();
  const database = openDatabase(path.join(environment.dataDirectory, DATABASE_FILE_NAME));
  const currency = new SettingsRepository(database).getCurrency();
  const created = createWineIntelligence(environment, currency);
  return buildServiceContainer({
    database,
    photoDirectory: path.join(environment.dataDirectory, PHOTO_FOLDER_NAME),
    wineIntelligence: created.wineIntelligence,
    isAiConfigured: created.isConfigured,
  });
}

export function getServiceContainer(): ServiceContainer {
  globalStore.weinkellerServiceContainer ??= createProductionContainer();
  return globalStore.weinkellerServiceContainer;
}

export function setServiceContainerForTesting(container: ServiceContainer | null): void {
  globalStore.weinkellerServiceContainer = container;
}
