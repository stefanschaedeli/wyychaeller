import { desc, eq } from "drizzle-orm";
import type { WineCellarDatabase, WineCellarTransaction } from "../database/connection";
import {
  bottlePlacements,
  tastings,
  wines,
  type BottlePlacementRecord,
  type TastingRecord,
} from "../database/schema";
import { PlacementChoiceRequiredError, RecordNotFoundError } from "./errors";
import { refreshCachedBottleCount } from "./placement-repository";

export interface NewTasting {
  wineId: number;
  tastedOn: string;
  starRating?: number | null;
  tastingNote?: string | null;
  occasionOrDish?: string | null;
  placementId?: number | null;
}

export interface TastingWithWine extends TastingRecord {
  wineProducer: string | null;
  wineName: string | null;
  wineVintage: number | null;
}

/** Picks which placement a tasting removes a bottle from, or null when none applies. */
function choosePlacement(
  wineId: number,
  placementId: number | null | undefined,
  placements: BottlePlacementRecord[],
): BottlePlacementRecord | null {
  if (placementId !== null && placementId !== undefined) {
    const chosenPlacement = placements.find((placement) => placement.id === placementId);
    if (chosenPlacement === undefined) {
      throw new RecordNotFoundError(`Placement ${placementId} for wine ${wineId}`);
    }
    return chosenPlacement;
  }
  if (placements.length === 0) return null;
  if (placements.length === 1) return placements[0];
  throw new PlacementChoiceRequiredError(
    `Wine ${wineId} has several placements; a placementId is required`,
  );
}

function decrementPlacement(
  transaction: WineCellarTransaction,
  placement: BottlePlacementRecord,
): void {
  if (placement.bottleCount <= 1) {
    transaction.delete(bottlePlacements).where(eq(bottlePlacements.id, placement.id)).run();
  } else {
    transaction
      .update(bottlePlacements)
      .set({ bottleCount: placement.bottleCount - 1 })
      .where(eq(bottlePlacements.id, placement.id))
      .run();
  }
}

export class TastingRepository {
  constructor(private readonly database: WineCellarDatabase) {}

  /** Storing the tasting and removing the bottle must succeed or fail together. */
  recordTasting(tasting: NewTasting): TastingRecord {
    return this.database.transaction((transaction) => {
      const wine = transaction.select().from(wines).where(eq(wines.id, tasting.wineId)).get();
      if (wine === undefined) throw new RecordNotFoundError(`Wine ${tasting.wineId}`);

      const placements = transaction
        .select()
        .from(bottlePlacements)
        .where(eq(bottlePlacements.wineId, tasting.wineId))
        .all();
      const chosenPlacement = choosePlacement(tasting.wineId, tasting.placementId, placements);

      if (chosenPlacement !== null) {
        decrementPlacement(transaction, chosenPlacement);
        refreshCachedBottleCount(transaction, tasting.wineId);
      }

      const { placementId: _placementId, ...tastingFields } = tasting;
      return transaction.insert(tastings).values(tastingFields).returning().get();
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
