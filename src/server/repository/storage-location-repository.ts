import { asc, eq, max } from "drizzle-orm";
import { isPositionWithinLocation, toFreeTextPlacement } from "@/domain/bottle-placement";
import type { StorageLocationShape } from "@/domain/storage-location";
import type { WineCellarDatabase, WineCellarTransaction } from "../database/connection";
import {
  bottlePlacements,
  storageLocations,
  type BottlePlacementRecord,
  type StorageLocationRecord,
} from "../database/schema";
import { RecordNotFoundError } from "./errors";
import { refreshCachedBottleCount } from "./placement-repository";

export type LocationWithBottleCount = StorageLocationRecord & { bottleCount: number };

export interface LocationUpdateResult {
  location: StorageLocationRecord;
  convertedPlacementCount: number;
}

function toLocationShape(location: StorageLocationRecord): StorageLocationShape {
  return {
    name: location.name,
    kind: location.kind,
    rowCount: location.rowCount,
    slotsPerRow: location.slotsPerRow,
    slotLabelStyle: location.slotLabelStyle,
  };
}

function requireLocation(
  transaction: WineCellarTransaction,
  locationId: number,
): StorageLocationRecord {
  const location = transaction
    .select()
    .from(storageLocations)
    .where(eq(storageLocations.id, locationId))
    .get();
  if (location === undefined) throw new RecordNotFoundError(`Storage location ${locationId}`);
  return location;
}

/** Converts placements that no longer fit into free text, in the given transaction. */
function convertOutOfShapePlacements(
  transaction: WineCellarTransaction,
  locationId: number,
  oldShape: StorageLocationShape,
  newShape: StorageLocationShape,
): number {
  const placements = transaction
    .select()
    .from(bottlePlacements)
    .where(eq(bottlePlacements.locationId, locationId))
    .all();
  const outOfShape: BottlePlacementRecord[] = placements.filter(
    (placement) => !isPositionWithinLocation(placement, newShape),
  );

  const affectedWineIds = new Set<number>();
  for (const placement of outOfShape) {
    const freeTextPlacement = toFreeTextPlacement(placement, oldShape);
    transaction
      .update(bottlePlacements)
      .set({
        locationId: null,
        rowIndex: null,
        slotIndex: null,
        freeText: freeTextPlacement.freeText,
      })
      .where(eq(bottlePlacements.id, placement.id))
      .run();
    affectedWineIds.add(placement.wineId);
  }
  for (const wineId of affectedWineIds) refreshCachedBottleCount(transaction, wineId);
  return outOfShape.length;
}

/** Converts every placement at a location to free text, in the given transaction. */
function convertAllPlacements(
  transaction: WineCellarTransaction,
  locationId: number,
  oldShape: StorageLocationShape,
): number {
  const placements = transaction
    .select()
    .from(bottlePlacements)
    .where(eq(bottlePlacements.locationId, locationId))
    .all();

  for (const placement of placements) {
    const freeTextPlacement = toFreeTextPlacement(placement, oldShape);
    transaction
      .update(bottlePlacements)
      .set({
        locationId: null,
        rowIndex: null,
        slotIndex: null,
        freeText: freeTextPlacement.freeText,
      })
      .where(eq(bottlePlacements.id, placement.id))
      .run();
    refreshCachedBottleCount(transaction, placement.wineId);
  }
  return placements.length;
}

export class StorageLocationRepository {
  constructor(private readonly database: WineCellarDatabase) {}

  /** The cellar holds a handful of locations, so summing placements in memory is fine. */
  listLocations(): LocationWithBottleCount[] {
    const locations = this.database
      .select()
      .from(storageLocations)
      .orderBy(asc(storageLocations.sortOrder), asc(storageLocations.id))
      .all();
    const placements = this.database.select().from(bottlePlacements).all();

    const bottleCountByLocationId = new Map<number, number>();
    for (const placement of placements) {
      if (placement.locationId === null) continue;
      const currentCount = bottleCountByLocationId.get(placement.locationId) ?? 0;
      bottleCountByLocationId.set(placement.locationId, currentCount + placement.bottleCount);
    }

    return locations.map((location) => ({
      ...location,
      bottleCount: bottleCountByLocationId.get(location.id) ?? 0,
    }));
  }

  findLocationById(locationId: number): StorageLocationRecord | null {
    return (
      this.database
        .select()
        .from(storageLocations)
        .where(eq(storageLocations.id, locationId))
        .get() ?? null
    );
  }

  countLocations(): number {
    return this.database.select().from(storageLocations).all().length;
  }

  createLocation(shape: StorageLocationShape): StorageLocationRecord {
    return this.database.transaction((transaction) => {
      const highestSortOrder = transaction
        .select({ highest: max(storageLocations.sortOrder) })
        .from(storageLocations)
        .get()?.highest;
      const sortOrder =
        highestSortOrder === null || highestSortOrder === undefined ? 0 : highestSortOrder + 1;
      return transaction
        .insert(storageLocations)
        .values({ ...shape, sortOrder })
        .returning()
        .get();
    });
  }

  updateLocation(locationId: number, shape: StorageLocationShape): LocationUpdateResult {
    return this.database.transaction((transaction) => {
      const existingLocation = requireLocation(transaction, locationId);
      const oldShape = toLocationShape(existingLocation);
      const convertedPlacementCount = convertOutOfShapePlacements(
        transaction,
        locationId,
        oldShape,
        shape,
      );
      const location = transaction
        .update(storageLocations)
        .set({ ...shape, updatedAt: new Date() })
        .where(eq(storageLocations.id, locationId))
        .returning()
        .get();
      return { location, convertedPlacementCount };
    });
  }

  /** Converts every placement at the location to free text, then deletes it. */
  deleteLocation(locationId: number): number {
    return this.database.transaction((transaction) => {
      const existingLocation = requireLocation(transaction, locationId);
      const oldShape = toLocationShape(existingLocation);
      const convertedPlacementCount = convertAllPlacements(transaction, locationId, oldShape);
      transaction.delete(storageLocations).where(eq(storageLocations.id, locationId)).run();
      return convertedPlacementCount;
    });
  }
}
