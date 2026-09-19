"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiClientError } from "./api-client";

// Pages poll with this interval while an analysis the user started is running.
export const ANALYSIS_POLL_INTERVAL_MILLISECONDS = 3000;

export interface ApiResourceOptions<Data> {
  pollIntervalMilliseconds?: number;
  /** Polling continues only while this returns true. Defaults to always. */
  shouldPoll?: (data: Data) => boolean;
}

export interface ApiResource<Data> {
  data: Data | null;
  errorCode: string | null;
  isLoading: boolean;
  reload: () => void;
}

export function toErrorCode(error: unknown): string {
  return error instanceof ApiClientError ? error.code : "unexpected";
}

/**
 * Loads data, keeps the previous data visible while reloading, and optionally polls.
 * `load` must be stable (wrap it in useCallback), otherwise it reloads on every render.
 */
export function useApiResource<Data>(
  load: () => Promise<Data>,
  options: ApiResourceOptions<Data> = {},
): ApiResource<Data> {
  const { pollIntervalMilliseconds, shouldPoll } = options;
  const [data, setData] = useState<Data | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadCounter, setReloadCounter] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    load()
      .then((loadedData) => {
        if (isCancelled) return;
        setData(loadedData);
        setErrorCode(null);
      })
      .catch((error: unknown) => {
        if (!isCancelled) setErrorCode(toErrorCode(error));
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });
    return () => {
      isCancelled = true;
    };
  }, [load, reloadCounter]);

  const isPollingWanted =
    pollIntervalMilliseconds !== undefined && data !== null && (shouldPoll?.(data) ?? true);
  useEffect(() => {
    if (!isPollingWanted) return;
    const timer = setInterval(
      () => setReloadCounter((counter) => counter + 1),
      pollIntervalMilliseconds,
    );
    return () => clearInterval(timer);
  }, [isPollingWanted, pollIntervalMilliseconds]);

  const reload = useCallback(() => setReloadCounter((counter) => counter + 1), []);
  return { data, errorCode, isLoading, reload };
}
