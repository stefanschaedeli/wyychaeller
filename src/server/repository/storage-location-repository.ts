import { asc, eq, max } from "drizzle-orm";
import { isPositionWithinLocation, toFreeTextPlacement } from "@/domain/bottle-placement";
import type { BottlePlacement, StorageLocationShape } from "@/domain/storage-location";
import type { WineCellarDatabase, WineCellarTransaction } from "../database/connection";
import {
  bottlePlacements,
  storageLocations,
  type BottlePlacementRecord,
  type StorageLocationRecord,
} from "../database/schema";
import { RecordNotFoundError } from "./errors";
import { writeMergedPlacements } from "./placement-repository";

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

/**
 * Converts the placements at a location that match `shouldConvert` into free text, then
 * re-merges every affected wine's placements so a conversion never creates a duplicate
 * key (e.g. a location named the same as an existing free-text placement).
 */
function convertPlacementsToFreeText(
  transaction: WineCellarTransaction,
  locationId: number,
  oldShape: StorageLocationShape,
  shouldConvert: (placement: BottlePlacementRecord) => boolean,
): number {
  const placementsAtLocation = transaction
    .select()
    .from(bottlePlacements)
    .where(eq(bottlePlacements.locationId, locationId))
    .all();
  const toConvert = placementsAtLocation.filter(shouldConvert);

  const affectedWineIds = new Set(toConvert.map((placement) => placement.wineId));
  for (const placement of toConvert) {
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
  }

  for (const wineId of affectedWineIds) {
    const winePlacements: BottlePlacement[] = transaction
      .select()
      .from(bottlePlacements)
      .where(eq(bottlePlacements.wineId, wineId))
      .all();
    writeMergedPlacements(transaction, wineId, winePlacements);
  }
  return toConvert.length;
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
      const convertedPlacementCount = convertPlacementsToFreeText(
        transaction,
        locationId,
        oldShape,
        (placement) => !isPositionWithinLocation(placement, shape),
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
      const convertedPlacementCount = convertPlacementsToFreeText(
        transaction,
        locationId,
        oldShape,
        () => true,
      );
      transaction.delete(storageLocations).where(eq(storageLocations.id, locationId)).run();
      return convertedPlacementCount;
    });
  }
}
