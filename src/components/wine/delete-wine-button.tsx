"use client";

import { useState } from "react";
import { ErrorNotice } from "@/components/shared/error-notice";
import { apiClient } from "@/lib/api-client";
import { toErrorCode } from "@/lib/use-api-resource";

/** Two-step delete without a browser dialog: the first tap arms, the second deletes. */
export function DeleteWineButton({ wineId, onDeleted }: { wineId: number; onDeleted: () => void }) {
  const [isArmed, setIsArmed] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  function deleteWine() {
    setErrorCode(null);
    apiClient
      .deleteWine(wineId)
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
        <button type="button" className="button-primary bg-alert" onClick={deleteWine}>
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
