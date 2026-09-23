"use client";

import { useState } from "react";
import { ErrorNotice } from "@/components/shared/error-notice";
import { apiClient } from "@/lib/api-client";
import { toErrorCode } from "@/lib/use-api-resource";

/** Two-step delete without a browser dialog: the first tap arms, the second deletes. */
export function DeleteLocationButton({
  locationId,
  onDeleted,
}: {
  locationId: number;
  onDeleted: () => void;
}) {
  const [isArmed, setIsArmed] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  function deleteLocation() {
    setErrorCode(null);
    apiClient
      .deleteStorageLocation(locationId)
      .then(onDeleted)
      .catch((error: unknown) => setErrorCode(toErrorCode(error)));
  }

  if (!isArmed) {
    return (
      <button type="button" className="button-ghost" onClick={() => setIsArmed(true)}>
        Löschen
      </button>
    );
  }
  return (
    <span className="grid gap-2">
      <span className="flex flex-wrap gap-2">
        <button type="button" className="button-primary bg-alert" onClick={deleteLocation}>
          Endgültig löschen
        </button>
        <button type="button" className="button-ghost" onClick={() => setIsArmed(false)}>
          Abbrechen
        </button>
      </span>
      {errorCode && <ErrorNotice errorCode={errorCode} />}
    </span>
  );
}
