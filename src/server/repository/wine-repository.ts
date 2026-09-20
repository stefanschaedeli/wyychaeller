import { desc, eq } from "drizzle-orm";
import { buildWineIdentityKey, type WineIdentityFields } from "@/domain/wine-identity";
import type { WineCellarDatabase } from "../database/connection";
import { wines, type NewWineRecord, type WineRecord } from "../database/schema";
import { RecordNotFoundError } from "./errors";

export type WineChanges = Partial<Omit<NewWineRecord, "id" | "createdAt" | "updatedAt">>;

export class WineRepository {
  constructor(private readonly database: WineCellarDatabase) {}

  createPendingWine(photoFileName: string): WineRecord {
    return this.database.insert(wines).values({ photoFileName }).returning().get();
  }

  findWineById(wineId: number): WineRecord | null {
    return this.database.select().from(wines).where(eq(wines.id, wineId)).get() ?? null;
  }

  listWines(): WineRecord[] {
    return this.database.select().from(wines).orderBy(desc(wines.createdAt)).all();
  }

  updateWine(wineId: number, changes: WineChanges): WineRecord {
    const updatedWine = this.database
      .update(wines)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(wines.id, wineId))
      .returning()
      .get();
    if (!updatedWine) throw new RecordNotFoundError(`Wine ${wineId}`);
    return updatedWine;
  }

  deleteWine(wineId: number): void {
    this.database.delete(wines).where(eq(wines.id, wineId)).run();
  }

  /** The cellar holds a few hundred wines, so comparing keys in memory is fine. */
  findCompleteWineByIdentity(
    identity: WineIdentityFields,
    excludedWineId: number,
  ): WineRecord | null {
    const searchedKey = buildWineIdentityKey(identity);
    if (searchedKey === null) return null;

    const matchingWine = this.listWines().find(
      (wine) =>
        wine.id !== excludedWineId &&
        wine.analysisStatus === "complete" &&
        buildWineIdentityKey(wine) === searchedKey,
    );
    return matchingWine ?? null;
  }

  resetInterruptedAnalyses(): number {
    const resetResult = this.database
      .update(wines)
      .set({ analysisStatus: "pending", updatedAt: new Date() })
      .where(eq(wines.analysisStatus, "analyzing"))
      .run();
    return resetResult.changes;
  }
}
