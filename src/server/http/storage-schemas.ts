import { z } from "zod";
import { isConsistentPosition } from "@/domain/bottle-placement";
import {
  MAXIMUM_BOTTLE_COUNT,
  MAXIMUM_GRID_ROWS,
  MAXIMUM_LOCATION_NAME_LENGTH,
  MAXIMUM_PLACEMENTS_PER_WINE,
  MAXIMUM_SLOTS_PER_ROW,
} from "@/domain/constants";
import {
  requiredSlotsPerRow,
  SLOT_LABEL_STYLES,
  type StorageLocationShape,
} from "@/domain/storage-location";
import { optionalShortText } from "./request-schemas";

const locationName = z.string().trim().min(1).max(MAXIMUM_LOCATION_NAME_LENGTH);

const SimpleLocationSchema = z.object({ kind: z.literal("simple"), name: locationName }).strict();

const GridLocationSchema = z
  .object({
    kind: z.literal("grid"),
    name: locationName,
    rowCount: z.number().int().min(1).max(MAXIMUM_GRID_ROWS),
    slotsPerRow: z.number().int().min(1).max(MAXIMUM_SLOTS_PER_ROW),
    slotLabelStyle: z.enum(SLOT_LABEL_STYLES),
  })
  .strict()
  .refine(
    (location) => {
      const required = requiredSlotsPerRow(location.slotLabelStyle);
      return required === null || location.slotsPerRow === required;
    },
    { message: "slotsPerRow does not match the slot label style", path: ["slotsPerRow"] },
  );

export const StorageLocationSchema = z.discriminatedUnion("kind", [
  SimpleLocationSchema,
  GridLocationSchema,
]);

export const BottlePlacementSchema = z
  .object({
    locationId: z.number().int().positive().nullable(),
    rowIndex: z.number().int().positive().nullable(),
    slotIndex: z.number().int().positive().nullable(),
    freeText: optionalShortText,
    bottleCount: z.number().int().min(1).max(MAXIMUM_BOTTLE_COUNT),
  })
  .strict()
  .refine(isConsistentPosition, { message: "Placement position is inconsistent" });

export const PlacementsSchema = z
  .object({ placements: z.array(BottlePlacementSchema).max(MAXIMUM_PLACEMENTS_PER_WINE) })
  .strict();

export type StorageLocationRequestBody = z.infer<typeof StorageLocationSchema>;

/** Widens a validated request into the full shape the repository stores. */
export function toLocationShape(request: StorageLocationRequestBody): StorageLocationShape {
  if (request.kind === "simple") {
    return {
      name: request.name,
      kind: "simple",
      rowCount: null,
      slotsPerRow: null,
      slotLabelStyle: null,
    };
  }
  return {
    name: request.name,
    kind: "grid",
    rowCount: request.rowCount,
    slotsPerRow: request.slotsPerRow,
    slotLabelStyle: request.slotLabelStyle,
  };
}
