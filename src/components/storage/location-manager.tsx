"use client";

import { useCallback, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorNotice } from "@/components/shared/error-notice";
import { apiClient } from "@/lib/api-client";
import { formatBottleCount } from "@/lib/german-labels";
import { useApiResource } from "@/lib/use-api-resource";
import { LocationForm } from "./location-form";
import { LocationRow } from "./location-row";
import { useLocationMutations } from "./use-location-mutations";

/** Which form is open: no form, the "new location" form, or the row with this location id. */
type OpenForm = { mode: "none" } | { mode: "new" } | { mode: "edit"; locationId: number };

const NO_FORM: OpenForm = { mode: "none" };

const EMPTY_HINT = "Lege einen Lagerort an, um Flaschen einem Regal oder Fach zuzuordnen.";

export function LocationManager() {
  const locations = useApiResource(useCallback(() => apiClient.listStorageLocations(), []));
  const [openForm, setOpenForm] = useState<OpenForm>(NO_FORM);
  const { reload } = locations;

  const closeFormAndReload = useCallback(() => {
    setOpenForm(NO_FORM);
    reload();
  }, [reload]);
  const mutations = useLocationMutations(closeFormAndReload);
  const { forgetStatus } = mutations;

  const handleDeleted = useCallback(() => {
    forgetStatus();
    reload();
  }, [forgetStatus, reload]);

  const entries = locations.data?.locations ?? [];
  const hasNoLocations = !locations.isLoading && entries.length === 0 && !locations.errorCode;

  return (
    <>
      {locations.errorCode && (
        <ErrorNotice errorCode={locations.errorCode} onRetry={locations.reload} />
      )}
      {mutations.errorCode && <ErrorNotice errorCode={mutations.errorCode} />}
      {mutations.convertedPlacementCount > 0 && (
        <p role="status">
          {formatBottleCount(mutations.convertedPlacementCount)} als Text übernommen
        </p>
      )}
      {hasNoLocations && <EmptyState title="Noch keine Lagerorte" hint={EMPTY_HINT} />}
      <ul>
        {entries.map((location) => (
          <LocationRow
            key={location.id}
            location={location}
            isEditing={openForm.mode === "edit" && openForm.locationId === location.id}
            onEdit={() => setOpenForm({ mode: "edit", locationId: location.id })}
            onCancelEdit={() => setOpenForm(NO_FORM)}
            onSubmit={(request) => mutations.updateLocation(location.id, request)}
            onDeleted={handleDeleted}
          />
        ))}
      </ul>
      {openForm.mode === "new" ? (
        <LocationForm
          location={null}
          onSubmit={mutations.createLocation}
          onCancel={() => setOpenForm(NO_FORM)}
        />
      ) : (
        <button
          type="button"
          className="button-primary mt-4"
          onClick={() => setOpenForm({ mode: "new" })}
        >
          Neuer Lagerort
        </button>
      )}
    </>
  );
}
