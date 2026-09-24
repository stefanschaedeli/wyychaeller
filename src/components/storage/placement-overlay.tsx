"use client";

import { useCallback, useEffect, useRef } from "react";
import { ErrorNotice } from "@/components/shared/error-notice";
import { apiClient } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api-resource";
import { PickerHeader, PLACEMENT_PICKER_TITLE, PLACEMENT_PICKER_TITLE_ID } from "./picker-header";
import { PlacementPicker } from "./placement-picker";

const ESCAPE_KEY = "Escape";
const BODY_SCROLL_LOCK_CLASS = "overflow-hidden";

export interface PlacementOverlayProps {
  wineId: number;
  onSaved?: () => void;
  onClose: () => void;
}

/** Loads the wine and the cellar's locations; until both are here the header alone shows. */
function PlacementLoader({ wineId, onSaved, onClose }: PlacementOverlayProps) {
  const details = useApiResource(useCallback(() => apiClient.getWine(wineId), [wineId]));
  const overview = useApiResource(useCallback(() => apiClient.getStorageOverview(), []));
  const errorCode = details.errorCode ?? overview.errorCode;
  const saveAndClose = useCallback(() => {
    onSaved?.();
    onClose();
  }, [onSaved, onClose]);

  if (errorCode === null && details.data !== null && overview.data !== null) {
    return (
      <PlacementPicker
        wine={details.data.wine}
        overview={overview.data}
        onSaved={saveAndClose}
        onClose={onClose}
      />
    );
  }
  return (
    <>
      <PickerHeader title={PLACEMENT_PICKER_TITLE} onClose={onClose} />
      <div className="px-5 py-4">
        {errorCode !== null ? (
          <ErrorNotice
            errorCode={errorCode}
            onRetry={() => {
              details.reload();
              overview.reload();
            }}
          />
        ) : (
          <p className="text-ink-muted">Wird geladen …</p>
        )}
      </div>
    </>
  );
}

/** Restores the focus and the page's scrolling once the overlay goes away. */
function useModalBehaviour(panelRef: React.RefObject<HTMLDivElement | null>, onClose: () => void) {
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    panelRef.current?.focus();
    document.body.classList.add(BODY_SCROLL_LOCK_CLASS);
    return () => {
      document.body.classList.remove(BODY_SCROLL_LOCK_CLASS);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [panelRef]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === ESCAPE_KEY) onClose();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
}

/**
 * The placement picker as a sheet over the current page: full height on a phone, a centred
 * panel from the md breakpoint. Tapping the backdrop, the cross or Escape discards the draft.
 */
export function PlacementOverlay(props: PlacementOverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useModalBehaviour(panelRef, props.onClose);

  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center bg-ink/60 md:items-center md:p-6"
      onClick={props.onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={PLACEMENT_PICKER_TITLE_ID}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="overlay-panel relative flex h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-t-lg bg-paper shadow-2xl outline-none md:h-auto md:max-h-[90dvh] md:min-h-[24rem] md:max-w-xl md:rounded-xs"
      >
        <PlacementLoader {...props} />
      </div>
    </div>
  );
}
