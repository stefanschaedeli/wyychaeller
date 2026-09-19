import { describe, expect, it } from "vitest";
import { RecordedWineIntelligence } from "./recorded-wine-intelligence";
import { LabelReadingSchema, WineResearchSchema } from "./schemas";
import type { CellarWineSummary, WineIntelligence } from "./wine-intelligence";

const intelligence: WineIntelligence = new RecordedWineIntelligence();

describe("RecordedWineIntelligence", () => {
  it("returns schema-valid canned answers without any network access", async () => {
    const label = await intelligence.analyzeLabel({ base64Data: "", mediaType: "image/jpeg" });
    expect(LabelReadingSchema.parse(label.value).name).toBe("Tignanello");

    const research = await intelligence.researchWine({ ...label.value });
    expect(WineResearchSchema.parse(research.value).confidence).toBe("researched");
  });

  it("recommends wines from the given cellar only", async () => {
    const cellarWine = { wineId: 7, name: "Tignanello" } as CellarWineSummary;
    const result = await intelligence.recommendWinesForDish("Rindsfilet", [cellarWine]);
    expect(result.value.map((entry) => entry.wineId)).toEqual([7]);
  });
});
