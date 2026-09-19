import { z } from "zod";
import {
  MAXIMUM_BOTTLE_COUNT,
  MAXIMUM_LONG_TEXT_LENGTH,
  MAXIMUM_SHORT_TEXT_LENGTH,
} from "@/domain/constants";
import { DRINKING_MATURITIES, WINE_TYPES } from "@/domain/wine-types";

const shortText = z.string().trim().max(MAXIMUM_SHORT_TEXT_LENGTH);
const optionalShortText = shortText
  .nullable()
  .transform((text) => (text === null || text === "" ? null : text));
const optionalLongText = z
  .string()
  .trim()
  .max(MAXIMUM_LONG_TEXT_LENGTH)
  .nullable()
  .transform((text) => (text === null || text === "" ? null : text));

const identityFields = {
  producer: optionalShortText,
  name: optionalShortText,
  vintage: z.number().int().min(1800).max(2100).nullable(),
  country: optionalShortText,
  region: optionalShortText,
  appellation: optionalShortText,
  grapeVarieties: z.array(shortText.min(1)).max(10),
  wineType: z.enum(WINE_TYPES).nullable(),
};

const cellarFields = {
  storageLocation: optionalShortText,
  purchasePricePerBottle: z.number().min(0).max(1_000_000).nullable(),
};

export const WineConfirmationSchema = z
  .object({
    ...identityFields,
    ...cellarFields,
    bottleCount: z.number().int().min(1).max(MAXIMUM_BOTTLE_COUNT),
  })
  .strict();

export const WineEditSchema = z
  .object({
    ...identityFields,
    ...cellarFields,
    bottleCount: z.number().int().min(0).max(MAXIMUM_BOTTLE_COUNT),
    drinkFromYear: z.number().int().min(1800).max(2200).nullable(),
    drinkUntilYear: z.number().int().min(1800).max(2200).nullable(),
  })
  .partial()
  .strict();

export const AnalysisRequestSchema = z.object({ mode: z.enum(["full", "researchOnly"]) }).strict();

export const MergeRequestSchema = z
  .object({ bottleCount: z.number().int().min(1).max(MAXIMUM_BOTTLE_COUNT) })
  .strict();

export const TastingSchema = z
  .object({
    tastedOn: z.iso.date(),
    starRating: z.number().int().min(1).max(5).nullable(),
    tastingNote: optionalLongText,
    occasionOrDish: optionalShortText,
  })
  .strict();

export const WineListQuerySchema = z.object({
  search: shortText.optional(),
  wineType: z.enum(WINE_TYPES).optional(),
  maturity: z.enum(DRINKING_MATURITIES).optional(),
  includeEmpty: z.enum(["true", "false"]).optional(),
  sort: z.enum(["newest", "urgency"]).optional(),
});

export const DishRequestSchema = z
  .object({
    dish: z.string().trim().min(2).max(MAXIMUM_SHORT_TEXT_LENGTH),
    shouldForceRefresh: z.boolean().default(false),
  })
  .strict();

export const SettingsSchema = z
  .object({
    currency: z.string().regex(/^[A-Z]{3}$/),
    monthlyAiCallLimit: z.number().int().min(1).max(10_000),
  })
  .strict();

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
