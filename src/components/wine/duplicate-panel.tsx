"use client";

import Link from "next/link";
import { useState } from "react";
import { ErrorNotice } from "@/components/shared/error-notice";
import { TextField } from "@/components/shared/text-field";
import { MINIMUM_NEW_BOTTLE_COUNT } from "@/domain/constants";
import { apiClient } from "@/lib/api-client";
import { parseBottleCount } from "@/lib/form-values";
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
  const [bottleCountText, setBottleCountText] = useState("1");
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function mergeIntoExistingWine() {
    const bottleCount = parseBottleCount(bottleCountText, MINIMUM_NEW_BOTTLE_COUNT);
    if (bottleCount === null) {
      setErrorCode("invalidInput");
      return;
    }
    try {
      const { wine: existingWine } = await apiClient.mergeWine(wine.id, bottleCount);
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
      <TextField
        label="Zusätzliche Flaschen"
        value={bottleCountText}
        onChange={setBottleCountText}
        inputMode="numeric"
      />
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
