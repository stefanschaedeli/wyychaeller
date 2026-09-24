"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { PlacementOverlay } from "./placement-overlay";

export interface PlacementOverlayRequest {
  wineId: number;
  /** Runs after the placements were saved, before the overlay closes; e.g. reload a list. */
  onSaved?: () => void;
}

export interface PlacementOverlayApi {
  openPlacementPicker: (request: PlacementOverlayRequest) => void;
}

const PlacementOverlayContext = createContext<PlacementOverlayApi | null>(null);

/** Mounts the picker overlay above whatever page is shown; one request at a time. */
export function PlacementOverlayProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<PlacementOverlayRequest | null>(null);
  const openPlacementPicker = useCallback(
    (nextRequest: PlacementOverlayRequest) => setRequest(nextRequest),
    [],
  );
  const close = useCallback(() => setRequest(null), []);
  const api = useMemo(() => ({ openPlacementPicker }), [openPlacementPicker]);

  return (
    <PlacementOverlayContext.Provider value={api}>
      {children}
      {request !== null && (
        <PlacementOverlay
          key={request.wineId}
          wineId={request.wineId}
          onSaved={request.onSaved}
          onClose={close}
        />
      )}
    </PlacementOverlayContext.Provider>
  );
}

export function usePlacementOverlay(): PlacementOverlayApi {
  const api = useContext(PlacementOverlayContext);
  if (api === null) throw new Error("usePlacementOverlay needs a PlacementOverlayProvider.");
  return api;
}
