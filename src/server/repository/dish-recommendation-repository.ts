import { desc, eq } from "drizzle-orm";
import type { WineCellarDatabase } from "../database/connection";
import {
  dishRecommendations,
  type DishRecommendationRecord,
  type StoredDishRecommendation,
} from "../database/schema";

export interface NewDishRecommendation {
  dish: string;
  recommendations: StoredDishRecommendation[];
  cellarFingerprint: string;
}

export function normalizeDish(dish: string): string {
  return dish.trim().replace(/\s+/g, " ").toLowerCase();
}

export class DishRecommendationRepository {
  constructor(private readonly database: WineCellarDatabase) {}

  saveRecommendation(entry: NewDishRecommendation): DishRecommendationRecord {
    return this.database
      .insert(dishRecommendations)
      .values({ ...entry, dish: entry.dish.trim(), normalizedDish: normalizeDish(entry.dish) })
      .returning()
      .get();
  }

  findLatestForDish(dish: string): DishRecommendationRecord | null {
    const latestEntry = this.database
      .select()
      .from(dishRecommendations)
      .where(eq(dishRecommendations.normalizedDish, normalizeDish(dish)))
      .orderBy(desc(dishRecommendations.id))
      .limit(1)
      .get();
    return latestEntry ?? null;
  }

  listRecentDishes(limit: number): string[] {
    const allEntries = this.database
      .select({
        dish: dishRecommendations.dish,
        normalizedDish: dishRecommendations.normalizedDish,
      })
      .from(dishRecommendations)
      .orderBy(desc(dishRecommendations.id))
      .all();

    const seenDishes = new Set<string>();
    const recentDishes: string[] = [];
    for (const entry of allEntries) {
      if (seenDishes.has(entry.normalizedDish)) continue;
      seenDishes.add(entry.normalizedDish);
      recentDishes.push(entry.dish);
      if (recentDishes.length === limit) break;
    }
    return recentDishes;
  }
}
