"use client";

import Link from "next/link";
import { useState } from "react";
import { ErrorNotice } from "@/components/shared/error-notice";
import { apiClient } from "@/lib/api-client";
import { formatWineTitle } from "@/lib/german-labels";
import { toErrorCode } from "@/lib/use-api-resource";
import type { WineResponse } from "@/shared/api-contract";
import { DeleteWineButton } from "./delete-wine-button";

export interface DuplicatePanelProps {
  wine: WineResponse;
  onMerged: (existingWineId: number) => void;
  onDeleted: () => void;
}

export function DuplicatePanel({ wine, onMerged, onDeleted }: DuplicatePanelProps) {
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function mergeIntoExistingWine() {
    try {
      const { wine: existingWine } = await apiClient.mergeWine(wine.id);
      onMerged(existingWine.id);
    } catch (error) {
      setErrorCode(toErrorCode(error));
    }
  }

  return (
    <section className="card grid gap-4">
      <h2>Schon im Keller</h2>
      <p>
        «{formatWineTitle(wine)}» ist bereits erfasst. Es wurde keine neue Recherche gestartet.{" "}
        <Link href={`/wines/${wine.duplicateOfWineId}`} className="text-bordeaux underline">
          Bestehenden Eintrag ansehen
        </Link>
      </p>
      {errorCode && <ErrorNotice errorCode={errorCode} />}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="button-primary"
          onClick={() => void mergeIntoExistingWine()}
        >
          Bestand erhöhen
        </button>
        <DeleteWineButton wineId={wine.id} onDeleted={onDeleted} />
      </div>
    </section>
  );
}
