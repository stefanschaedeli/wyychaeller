"use client";

import { useCallback, type ReactNode } from "react";
import { CaptureButton } from "@/components/capture/capture-button";
import {
  PlacementOverlayProvider,
  usePlacementOverlay,
} from "@/components/storage/placement-overlay-provider";
import { usePhotoUpload } from "@/lib/use-photo-upload";
import { notifyWineUploaded } from "@/lib/wine-upload-events";
import type { WineResponse } from "@/shared/api-contract";
import { Navigation } from "./navigation";

function Shell({ children }: { children: ReactNode }) {
  const { openPlacementPicker } = usePlacementOverlay();
  // The picker comes first: the wine needs bottles before it can be confirmed.
  const openPickerForWine = useCallback(
    (wine: WineResponse) => {
      notifyWineUploaded();
      openPlacementPicker({ wineId: wine.id, onSaved: notifyWineUploaded });
    },
    [openPlacementPicker],
  );
  const photoUpload = usePhotoUpload(openPickerForWine);

  return (
    <div className="min-h-dvh md:flex">
      <Navigation
        captureControl={
          <CaptureButton variant="navigation" onPhotoSelected={photoUpload.uploadPhoto} />
        }
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 md:px-10 md:pb-10">
        {photoUpload.errorCode && (
          <p role="alert" className="card mb-4 border-alert text-alert">
            Foto konnte nicht hochgeladen werden. Öffne «Erfassen» und versuche es erneut.
          </p>
        )}
        {children}
      </main>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <PlacementOverlayProvider>
      <Shell>{children}</Shell>
    </PlacementOverlayProvider>
  );
}
