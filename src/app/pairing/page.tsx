"use client";

import { useCallback, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorNotice } from "@/components/shared/error-notice";
import { TextField } from "@/components/shared/text-field";
import { DishRecommendationList } from "@/components/wine/dish-recommendation-list";
import { RecentDishes } from "@/components/wine/recent-dishes";
import { MINIMUM_DISH_TEXT_LENGTH } from "@/domain/constants";
import { apiClient } from "@/lib/api-client";
import { runUserAction } from "@/lib/run-user-action";
import { useApiResource } from "@/lib/use-api-resource";
import type { DishRecommendationResponse } from "@/shared/api-contract";

export default function PairingPage() {
  const [dish, setDish] = useState("");
  const [result, setResult] = useState<DishRecommendationResponse | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const recentDishes = useApiResource(useCallback(() => apiClient.listRecentDishes(), []));

  async function askForRecommendation(requestedDish: string, shouldForceRefresh: boolean) {
    if (requestedDish.trim().length < MINIMUM_DISH_TEXT_LENGTH) {
      setErrorCode("invalidInput");
      return;
    }
    await runUserAction(
      async () => {
        setResult(await apiClient.recommendForDish(requestedDish, shouldForceRefresh));
      },
      {
        onStart: () => {
          setIsAsking(true);
          setErrorCode(null);
        },
        onSuccess: () => {
          setIsAsking(false);
          recentDishes.reload();
        },
        onError: (code) => {
          setIsAsking(false);
          setErrorCode(code);
        },
      },
    );
  }

  function submitDish(event: FormEvent) {
    event.preventDefault();
    void askForRecommendation(dish, false);
  }

  function selectRecentDish(recentDish: string) {
    setDish(recentDish);
    void askForRecommendation(recentDish, false);
  }

  return (
    <>
      <PageHeader eyebrow="Essen & Wein" title="Was gibt es heute?" />
      <form onSubmit={submitDish} className="grid gap-3">
        <TextField
          label="Was gibt es zu essen?"
          value={dish}
          onChange={setDish}
          placeholder="z. B. Rindsfilet mit Morcheln"
        />
        <button type="submit" className="button-primary" disabled={isAsking}>
          {isAsking ? "Sommelier überlegt …" : "Wein empfehlen"}
        </button>
      </form>
      {errorCode && (
        <div className="mt-4">
          <ErrorNotice errorCode={errorCode} />
        </div>
      )}
      {result && <DishRecommendationList result={result} />}
      {result?.isFromCache && (
        <button
          type="button"
          className="button-ghost mt-3"
          onClick={() => void askForRecommendation(result.dish, true)}
        >
          Neu fragen (kostet einen KI-Aufruf)
        </button>
      )}
      <RecentDishes dishes={recentDishes.data?.recentDishes ?? []} onSelect={selectRecentDish} />
    </>
  );
}
