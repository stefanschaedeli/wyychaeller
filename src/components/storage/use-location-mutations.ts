"use client";

import { useCallback, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { runUserAction } from "@/lib/run-user-action";
import type { StorageLocationRequest } from "@/shared/api-contract";

export interface LocationMutations {
  errorCode: string | null;
  /** Bottles the last update moved out of the grid and kept as free text. */
  convertedPlacementCount: number;
  createLocation: (request: StorageLocationRequest) => Promise<void>;
  updateLocation: (locationId: number, request: StorageLocationRequest) => Promise<void>;
  forgetStatus: () => void;
}

interface MutationCallbacks {
  setErrorCode: (errorCode: string | null) => void;
  setConvertedPlacementCount: (count: number) => void;
  onMutated: () => void;
}

/** Runs one write, reporting how many placements it converted to free text. */
async function runMutation(
  action: () => Promise<number>,
  callbacks: MutationCallbacks,
): Promise<void> {
  let convertedCount = 0;
  await runUserAction(
    async () => {
      convertedCount = await action();
    },
    {
      onStart: () => {
        callbacks.setErrorCode(null);
        callbacks.setConvertedPlacementCount(0);
      },
      onSuccess: () => {
        callbacks.setConvertedPlacementCount(convertedCount);
        callbacks.onMutated();
      },
      onError: callbacks.setErrorCode,
    },
  );
}

/** Wraps the location write calls so the manager only renders state. */
export function useLocationMutations(onMutated: () => void): LocationMutations {
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [convertedPlacementCount, setConvertedPlacementCount] = useState(0);

  // The two setters are stable across renders, so `onMutated` is the only real dependency
  // below and both callbacks stay stable — safe to use from an effect later.
  const createLocation = useCallback(
    (request: StorageLocationRequest) =>
      runMutation(
        async () => {
          await apiClient.createStorageLocation(request);
          return 0;
        },
        { setErrorCode, setConvertedPlacementCount, onMutated },
      ),
    [onMutated],
  );

  const updateLocation = useCallback(
    (locationId: number, request: StorageLocationRequest) =>
      runMutation(
        async () => {
          const result = await apiClient.updateStorageLocation(locationId, request);
          return result.convertedPlacementCount;
        },
        { setErrorCode, setConvertedPlacementCount, onMutated },
      ),
    [onMutated],
  );

  const forgetStatus = useCallback(() => {
    setErrorCode(null);
    setConvertedPlacementCount(0);
  }, []);

  return { errorCode, convertedPlacementCount, createLocation, updateLocation, forgetStatus };
}
