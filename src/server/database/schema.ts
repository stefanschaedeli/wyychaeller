import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type {
  AnalysisErrorCode,
  AnalysisStatus,
  CriticScore,
  ResearchConfidence,
  WineType,
} from "@/domain/wine-types";
import type { SlotLabelStyle, StorageLocationKind } from "@/domain/storage-location";

export interface StoredDishRecommendation {
  wineId: number;
  reasoning: string;
  servingTip: string | null;
}

const timestamp = (columnName: string) => integer(columnName, { mode: "timestamp_ms" });

export const wines = sqliteTable("wines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  producer: text("producer"),
  name: text("name"),
  vintage: integer("vintage"),
  country: text("country"),
  region: text("region"),
  appellation: text("appellation"),
  grapeVarieties: text("grape_varieties", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .$defaultFn(() => []),
  wineType: text("wine_type").$type<WineType>(),
  alcoholPercent: real("alcohol_percent"),

  bottleCount: integer("bottle_count").notNull().default(0),
  storageLocation: text("storage_location"),
  purchasePricePerBottle: real("purchase_price_per_bottle"),
  photoFileName: text("photo_file_name").notNull(),

  styleClassification: text("style_classification"),
  description: text("description"),
  criticScores: text("critic_scores", { mode: "json" })
    .$type<CriticScore[]>()
    .notNull()
    .$defaultFn(() => []),
  aggregateScore: integer("aggregate_score"),
  drinkFromYear: integer("drink_from_year"),
  drinkUntilYear: integer("drink_until_year"),
  foodPairings: text("food_pairings", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .$defaultFn(() => []),
  estimatedMarketValue: real("estimated_market_value"),
  confidence: text("confidence").$type<ResearchConfidence>(),
  analyzedAt: timestamp("analyzed_at"),

  analysisStatus: text("analysis_status").$type<AnalysisStatus>().notNull().default("pending"),
  analysisError: text("analysis_error").$type<AnalysisErrorCode>(),
  duplicateOfWineId: integer("duplicate_of_wine_id"),

  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const storageLocations = sqliteTable("storage_locations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  kind: text("kind").$type<StorageLocationKind>().notNull(),
  rowCount: integer("row_count"),
  slotsPerRow: integer("slots_per_row"),
  slotLabelStyle: text("slot_label_style").$type<SlotLabelStyle>(),
  sortOrder: integer("sort_order").notNull(),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const bottlePlacements = sqliteTable(
  "bottle_placements",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    wineId: integer("wine_id")
      .notNull()
      .references(() => wines.id, { onDelete: "cascade" }),
    locationId: integer("location_id").references(() => storageLocations.id, {
      onDelete: "set null",
    }),
    rowIndex: integer("row_index"),
    slotIndex: integer("slot_index"),
    freeText: text("free_text"),
    bottleCount: integer("bottle_count").notNull(),
  },
  (table) => [
    index("bottle_placements_wine_id_idx").on(table.wineId),
    index("bottle_placements_location_id_idx").on(table.locationId),
  ],
);

export const tastings = sqliteTable("tastings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  wineId: integer("wine_id")
    .notNull()
    .references(() => wines.id, { onDelete: "cascade" }),
  tastedOn: text("tasted_on").notNull(),
  starRating: integer("star_rating"),
  tastingNote: text("tasting_note"),
  occasionOrDish: text("occasion_or_dish"),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const dishRecommendations = sqliteTable("dish_recommendations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dish: text("dish").notNull(),
  normalizedDish: text("normalized_dish").notNull(),
  recommendations: text("recommendations", { mode: "json" })
    .$type<StoredDishRecommendation[]>()
    .notNull(),
  cellarFingerprint: text("cellar_fingerprint").notNull(),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const aiUsage = sqliteTable("ai_usage", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  operation: text("operation").notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type WineRecord = typeof wines.$inferSelect;
export type NewWineRecord = typeof wines.$inferInsert;
export type TastingRecord = typeof tastings.$inferSelect;
export type DishRecommendationRecord = typeof dishRecommendations.$inferSelect;
export type StorageLocationRecord = typeof storageLocations.$inferSelect;
export type NewStorageLocationRecord = typeof storageLocations.$inferInsert;
export type BottlePlacementRecord = typeof bottlePlacements.$inferSelect;
export type NewBottlePlacementRecord = typeof bottlePlacements.$inferInsert;
