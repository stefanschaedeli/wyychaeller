"use client";

import { useRouter } from "next/navigation";
import { useCallback, type ReactNode } from "react";
import { CaptureButton } from "@/components/capture/capture-button";
import { usePhotoUpload } from "@/lib/use-photo-upload";
import { notifyWineUploaded } from "@/lib/wine-upload-events";
import { Navigation } from "./navigation";

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const goToCapturePageWithNewWine = useCallback(() => {
    notifyWineUploaded();
    router.push("/capture");
  }, [router]);
  const photoUpload = usePhotoUpload(goToCapturePageWithNewWine);

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
