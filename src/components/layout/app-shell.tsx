"use client";

import { useRouter } from "next/navigation";
import { useCallback, type ReactNode } from "react";
import { CaptureButton } from "@/components/capture/capture-button";
import { usePhotoUpload } from "@/lib/use-photo-upload";
import { notifyWineUploaded } from "@/lib/wine-upload-events";
import type { WineResponse } from "@/shared/api-contract";
import { Navigation } from "./navigation";

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  // The picker comes first: the wine needs bottles before it can be confirmed.
  const goToPlacementPicker = useCallback(
    (wine: WineResponse) => {
      notifyWineUploaded();
      router.push(`/wines/${wine.id}/lagerort`);
    },
    [router],
  );
  const photoUpload = usePhotoUpload(goToPlacementPicker);

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
