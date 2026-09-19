import { desc, eq, sql } from "drizzle-orm";
import type { WineCellarDatabase } from "../database/connection";
import { tastings, wines, type TastingRecord } from "../database/schema";
import { RecordNotFoundError } from "./wine-repository";

export interface NewTasting {
  wineId: number;
  tastedOn: string;
  starRating?: number | null;
  tastingNote?: string | null;
  occasionOrDish?: string | null;
}

export interface TastingWithWine extends TastingRecord {
  wineProducer: string | null;
  wineName: string | null;
  wineVintage: number | null;
}

export class TastingRepository {
  constructor(private readonly database: WineCellarDatabase) {}

  /** Storing the tasting and removing the bottle must succeed or fail together. */
  recordTasting(tasting: NewTasting): TastingRecord {
    return this.database.transaction((transaction) => {
      const bottleUpdate = transaction
        .update(wines)
        .set({ bottleCount: sql`max(${wines.bottleCount} - 1, 0)`, updatedAt: new Date() })
        .where(eq(wines.id, tasting.wineId))
        .run();
      if (bottleUpdate.changes === 0) throw new RecordNotFoundError(`Wine ${tasting.wineId}`);

      return transaction.insert(tastings).values(tasting).returning().get();
    });
  }

  listTastingsForWine(wineId: number): TastingRecord[] {
    return this.database
      .select()
      .from(tastings)
      .where(eq(tastings.wineId, wineId))
      .orderBy(desc(tastings.tastedOn), desc(tastings.id))
      .all();
  }

  listAllTastings(): TastingWithWine[] {
    return this.database
      .select({
        id: tastings.id,
        wineId: tastings.wineId,
        tastedOn: tastings.tastedOn,
        starRating: tastings.starRating,
        tastingNote: tastings.tastingNote,
        occasionOrDish: tastings.occasionOrDish,
        createdAt: tastings.createdAt,
        wineProducer: wines.producer,
        wineName: wines.name,
        wineVintage: wines.vintage,
      })
      .from(tastings)
      .innerJoin(wines, eq(tastings.wineId, wines.id))
      .orderBy(desc(tastings.tastedOn), desc(tastings.id))
      .all();
  }
}
