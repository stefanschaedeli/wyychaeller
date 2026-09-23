import type { PlacedBottleResponse } from "@/shared/api-contract";

export interface DescriptionGroup {
  description: string;
  bottleCount: number;
  placements: PlacedBottleResponse[];
}

/**
 * Groups the placements that belong to no location (free text and still open) by the
 * description the API rendered for them, keeping the order of first appearance.
 */
export function groupUnplacedByDescription(placements: PlacedBottleResponse[]): DescriptionGroup[] {
  const groups: DescriptionGroup[] = [];
  const groupsByDescription = new Map<string, DescriptionGroup>();
  for (const placement of placements) {
    if (placement.locationId !== null) continue;
    const existing = groupsByDescription.get(placement.description);
    if (existing === undefined) {
      const group: DescriptionGroup = {
        description: placement.description,
        bottleCount: placement.bottleCount,
        placements: [placement],
      };
      groups.push(group);
      groupsByDescription.set(placement.description, group);
    } else {
      existing.bottleCount += placement.bottleCount;
      existing.placements.push(placement);
    }
  }
  return groups;
}
