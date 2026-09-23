"use client";

import { formatBottleCount } from "@/lib/german-labels";
import { buildOccupancy } from "@/lib/slot-occupancy";
import { groupUnplacedByDescription } from "@/lib/storage-overview-groups";
import type { PlacedBottleResponse, StorageOverviewResponse } from "@/shared/api-contract";
import { LocationOverviewCard } from "./location-overview-card";
import { PlacementWineList } from "./placement-wine-list";

const FREE_TEXT_CARD_TITLE = "Freitext und offen";

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
