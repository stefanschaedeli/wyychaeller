import { eq, sql } from "drizzle-orm";
import {
  isConsistentPosition,
  isPositionWithinLocation,
  mergePlacements,
} from "@/domain/bottle-placement";
import type { BottlePlacement, StorageLocationShape } from "@/domain/storage-location";
import type { WineCellarDatabase, WineCellarTransaction } from "../database/connection";
import {
  bottlePlacements,
  storageLocations,
  wines,
  type BottlePlacementRecord,
  type WineRecord,
} from "../database/schema";
import { InvalidPlacementError, RecordNotFoundError } from "./errors";

export type PlacementWithLocation = BottlePlacementRecord & {
  location: StorageLocationShape | null;
};

export type PlacedBottleRecord = PlacementWithLocation & {
  wineProducer: string | null;
  wineName: string | null;
  wineVintage: number | null;
};

/** Keeps `wines.bottle_count` equal to the sum of the wine's placements. */
export function refreshCachedBottleCount(transaction: WineCellarTransaction, wineId: number): void {
  transaction
    .update(wines)
    .set({
      bottleCount: sql`(select coalesce(sum(${bottlePlacements.bottleCount}), 0) from ${bottlePlacements} where ${bottlePlacements.wineId} = ${wineId})`,
      updatedAt: new Date(),
    })
    .where(eq(wines.id, wineId))
    .run();
}

function toLocationShape(location: typeof storageLocations.$inferSelect): StorageLocationShape {
  return {
    name: location.name,
    kind: location.kind,
    rowCount: location.rowCount,
    slotsPerRow: location.slotsPerRow,
    slotLabelStyle: location.slotLabelStyle,
  };
}

function selectPlacementWithLocation() {
  return {
    id: bottlePlacements.id,
    wineId: bottlePlacements.wineId,
    locationId: bottlePlacements.locationId,
    rowIndex: bottlePlacements.rowIndex,
    slotIndex: bottlePlacements.slotIndex,
    freeText: bottlePlacements.freeText,
    bottleCount: bottlePlacements.bottleCount,
    location: {
      name: storageLocations.name,
      kind: storageLocations.kind,
      rowCount: storageLocations.rowCount,
      slotsPerRow: storageLocations.slotsPerRow,
      slotLabelStyle: storageLocations.slotLabelStyle,
    },
  };
}

function validatePlacement(
  placement: BottlePlacement,
  locationsById: Map<number, typeof storageLocations.$inferSelect>,
): void {
  if (!isConsistentPosition(placement)) {
    throw new InvalidPlacementError("Placement position is inconsistent");
  }
  if (placement.locationId === null) return;

  const location = locationsById.get(placement.locationId);
  if (location === undefined) {
    throw new InvalidPlacementError(`Storage location ${placement.locationId} was not found`);
  }
  if (!isPositionWithinLocation(placement, toLocationShape(location))) {
    throw new InvalidPlacementError(
      `Placement is outside the bounds of storage location ${placement.locationId}`,
    );
  }
}

function insertPlacements(
  transaction: WineCellarTransaction,
  wineId: number,
  placements: BottlePlacement[],
): void {
  if (placements.length === 0) return;
  transaction
    .insert(bottlePlacements)
    .values(placements.map((placement) => ({ ...placement, wineId })))
    .run();
}

export class PlacementRepository {
  constructor(private readonly database: WineCellarDatabase) {}

  listPlacementsForWine(wineId: number): PlacementWithLocation[] {
    return this.database
      .select(selectPlacementWithLocation())
      .from(bottlePlacements)
      .leftJoin(storageLocations, eq(bottlePlacements.locationId, storageLocations.id))
      .where(eq(bottlePlacements.wineId, wineId))
      .all();
  }

  listPlacementsByWine(): Map<number, PlacementWithLocation[]> {
    const rows = this.database
      .select(selectPlacementWithLocation())
      .from(bottlePlacements)
      .leftJoin(storageLocations, eq(bottlePlacements.locationId, storageLocations.id))
      .all();

    const byWine = new Map<number, PlacementWithLocation[]>();
    for (const row of rows) {
      const existing = byWine.get(row.wineId);
      if (existing === undefined) byWine.set(row.wineId, [row]);
      else existing.push(row);
    }
    return byWine;
  }

  listAllPlacements(): PlacedBottleRecord[] {
    return this.database
      .select({
        ...selectPlacementWithLocation(),
        wineProducer: wines.producer,
        wineName: wines.name,
        wineVintage: wines.vintage,
      })
      .from(bottlePlacements)
      .leftJoin(storageLocations, eq(bottlePlacements.locationId, storageLocations.id))
      .innerJoin(wines, eq(bottlePlacements.wineId, wines.id))
      .all();
  }

  /** Replaces every placement for a wine in one transaction and refreshes its bottle count. */
  replacePlacements(wineId: number, placements: BottlePlacement[]): PlacementWithLocation[] {
    return this.database.transaction((transaction) => {
      const wine = transaction.select().from(wines).where(eq(wines.id, wineId)).get();
      if (wine === undefined) throw new RecordNotFoundError(`Wine ${wineId}`);

      const locationsById = new Map(
        transaction
          .select()
          .from(storageLocations)
          .all()
          .map((location) => [location.id, location]),
      );
      for (const placement of placements) validatePlacement(placement, locationsById);

      const merged = mergePlacements(placements);
      transaction.delete(bottlePlacements).where(eq(bottlePlacements.wineId, wineId)).run();
      insertPlacements(transaction, wineId, merged);
      refreshCachedBottleCount(transaction, wineId);

      return this.selectPlacementsInTransaction(transaction, wineId);
    });
  }

  /** Combines a duplicate wine's placements into the existing wine, then deletes the duplicate. */
  mergeDuplicateInto(duplicateWineId: number, existingWineId: number): WineRecord {
    return this.database.transaction((transaction) => {
      const existingPlacements = transaction
        .select()
        .from(bottlePlacements)
        .where(eq(bottlePlacements.wineId, existingWineId))
        .all();
      const duplicatePlacements = transaction
        .select()
        .from(bottlePlacements)
        .where(eq(bottlePlacements.wineId, duplicateWineId))
        .all();

      const combined = mergePlacements([...existingPlacements, ...duplicatePlacements]);
      transaction.delete(bottlePlacements).where(eq(bottlePlacements.wineId, existingWineId)).run();
      insertPlacements(transaction, existingWineId, combined);
      refreshCachedBottleCount(transaction, existingWineId);
      transaction.delete(wines).where(eq(wines.id, duplicateWineId)).run();

      const mergedWine = transaction.select().from(wines).where(eq(wines.id, existingWineId)).get();
      if (mergedWine === undefined) throw new RecordNotFoundError(`Wine ${existingWineId}`);
      return mergedWine;
    });
  }

  private selectPlacementsInTransaction(
    transaction: WineCellarTransaction,
    wineId: number,
  ): PlacementWithLocation[] {
    return transaction
      .select(selectPlacementWithLocation())
      .from(bottlePlacements)
      .leftJoin(storageLocations, eq(bottlePlacements.locationId, storageLocations.id))
      .where(eq(bottlePlacements.wineId, wineId))
      .all();
  }
}
