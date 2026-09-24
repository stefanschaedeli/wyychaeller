"use client";

import { useState } from "react";
import { ErrorNotice } from "@/components/shared/error-notice";
import { MaturityBadge } from "@/components/shared/maturity-badge";
import { ScoreBadge } from "@/components/shared/score-badge";
import { WinePhoto } from "@/components/shared/wine-photo";
import { apiClient } from "@/lib/api-client";
import {
  formatBottleCount,
  formatPlacementList,
  formatWineOrigin,
  formatWineTitle,
  WINE_TYPE_LABELS,
} from "@/lib/german-labels";
import { runUserAction } from "@/lib/run-user-action";
import type { TastingResponse, WineResponse } from "@/shared/api-contract";
import { CellarEditForm } from "./cellar-edit-form";
import { DeleteWineButton } from "./delete-wine-button";
import { DrinkingWindowBar } from "./drinking-window-bar";
import { TastingForm } from "./tasting-form";
import { TastingList } from "./tasting-list";
import { WineAssessment } from "./wine-assessment";

export interface WineDetailProps {
  wine: WineResponse;
  tastings: TastingResponse[];
  currency: string;
  onChanged: () => void;
  onDeleted: () => void;
}

type OpenPanel = "none" | "tasting" | "edit";

function WineFacts({ wine }: { wine: WineResponse }) {
  const facts = [
    formatWineOrigin(wine),
    wine.wineType ? WINE_TYPE_LABELS[wine.wineType] : null,
    formatBottleCount(wine.bottleCount),
    wine.placements.length > 0 ? formatPlacementList(wine.placements) : null,
  ].filter(Boolean);
  return <p className="eyebrow">{facts.join(" · ")}</p>;
}

export function WineDetail({ wine, tastings, currency, onChanged, onDeleted }: WineDetailProps) {
  const [openPanel, setOpenPanel] = useState<OpenPanel>("none");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const visibleErrorCode = errorCode ?? wine.analysisError;

  const closePanelAndReload = () => {
    setOpenPanel("none");
    onChanged();
  };
  const startReassessment = () =>
    runUserAction(() => apiClient.startAnalysis(wine.id, "researchOnly"), {
      onStart: () => setErrorCode(null),
      onSuccess: onChanged,
      onError: setErrorCode,
    });

  return (
    <article className="grid gap-6">
      <WinePhoto photoUrl={wine.photoUrl} alt="Foto des Etiketts" size="hero" />
      <header>
        <WineFacts wine={wine} />
        <h1>{formatWineTitle(wine)}</h1>
        {wine.producer && <p className="text-ink-muted">{wine.producer}</p>}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <ScoreBadge score={wine.aggregateScore} confidence={wine.confidence} />
          <MaturityBadge maturity={wine.drinkingMaturity} />
        </div>
      </header>
      <DrinkingWindowBar wine={wine} />
      {visibleErrorCode && <ErrorNotice errorCode={visibleErrorCode} />}
      {openPanel === "none" && (
        <button type="button" className="button-primary" onClick={() => setOpenPanel("tasting")}>
          Flasche getrunken
        </button>
      )}
      {openPanel === "tasting" && (
        <TastingForm
          wineId={wine.id}
          placements={wine.placements}
          onRecorded={closePanelAndReload}
          onCancel={() => setOpenPanel("none")}
        />
      )}
      {openPanel === "edit" && (
        <CellarEditForm
          wine={wine}
          onSaved={closePanelAndReload}
          onCancel={() => setOpenPanel("none")}
          onPlacementsChanged={onChanged}
        />
      )}
      <WineAssessment wine={wine} currency={currency} />
      <TastingList tastings={tastings} />
      <footer className="flex flex-wrap gap-2 border-t border-line pt-4">
        <button type="button" className="button-ghost" onClick={() => setOpenPanel("edit")}>
          Bearbeiten
        </button>
        <button type="button" className="button-ghost" onClick={() => void startReassessment()}>
          Neu bewerten
        </button>
        <DeleteWineButton wineId={wine.id} onDeleted={onDeleted} />
      </footer>
    </article>
  );
}
