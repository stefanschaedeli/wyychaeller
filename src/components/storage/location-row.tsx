"use client";

import { describeLocationShape, formatBottleCount } from "@/lib/german-labels";
import type { StorageLocationRequest, StorageLocationResponse } from "@/shared/api-contract";
import { DeleteLocationButton } from "./delete-location-button";
import { LocationForm } from "./location-form";

export interface LocationRowProps {
  location: StorageLocationResponse;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSubmit: (request: StorageLocationRequest) => Promise<void>;
  onDeleted: () => void;
}

export function LocationRow(props: LocationRowProps) {
  const { location } = props;
  return (
    <li className="border-b border-line py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{location.name}</p>
          <p className="text-sm text-ink-muted">
            {describeLocationShape(location)} · {formatBottleCount(location.bottleCount)}
          </p>
        </div>
        <span className="flex flex-wrap items-start gap-2">
          <button type="button" className="button-ghost" onClick={props.onEdit}>
            Bearbeiten
          </button>
          <DeleteLocationButton locationId={location.id} onDeleted={props.onDeleted} />
        </span>
      </div>
      {props.isEditing && (
        <LocationForm location={location} onSubmit={props.onSubmit} onCancel={props.onCancelEdit} />
      )}
    </li>
  );
}
