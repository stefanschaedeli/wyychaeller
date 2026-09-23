"use client";

import { buildPlacementKey } from "@/domain/storage-location";
import { formatBottleCount } from "@/lib/german-labels";
import { groupUnplacedByDescription } from "@/lib/storage-overview-groups";
import type { PlacedBottleResponse, StorageOverviewResponse } from "@/shared/api-contract";
import { LocationOverviewCard } from "./location-overview-card";
import { PlacementWineList } from "./placement-wine-list";
import type { SlotOccupancy } from "./slot-grid";

const FREE_TEXT_CARD_TITLE = "Freitext und offen";

/** Placements of grid locations by slot key, so every cell can show its own bottle count. */
function buildOccupancy(placements: PlacedBottleResponse[]): Map<string, SlotOccupancy> {
  const occupancy = new Map<string, SlotOccupancy>();
  for (const placement of placements) {
    if (placement.locationId === null) continue;
    const key = buildPlacementKey(placement);
    const slot = occupancy.get(key);
    if (slot === undefined) {
      occupancy.set(key, { bottleCount: placement.bottleCount, placements: [placement] });
    } else {
      slot.bottleCount += placement.bottleCount;
      slot.placements.push(placement);
    }
  }
  return occupancy;
}

function FreeTextCard({ placements }: { placements: PlacedBottleResponse[] }) {
  const groups = groupUnplacedByDescription(placements);
  if (groups.length === 0) return null;
  return (
    <section className="card">
      <h2>{FREE_TEXT_CARD_TITLE}</h2>
      <div className="mt-3 grid gap-4">
        {groups.map((group) => (
          <div key={group.description}>
            <p className="eyebrow">
              {group.description} · {formatBottleCount(group.bottleCount)}
            </p>
            <PlacementWineList placements={group.placements} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function LocationOverview({ overview }: { overview: StorageOverviewResponse }) {
  const occupancy = buildOccupancy(overview.placements);

  return (
    <div className="grid gap-4">
      {overview.locations.map((location) => (
        <LocationOverviewCard
          key={location.id}
          location={location}
          placements={overview.placements.filter(
            (placement) => placement.locationId === location.id,
          )}
          occupancy={occupancy}
        />
      ))}
      <FreeTextCard placements={overview.placements} />
    </div>
  );
}
