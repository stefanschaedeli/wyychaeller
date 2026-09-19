"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { CaptureButton } from "@/components/capture/capture-button";
import { Navigation } from "./navigation";

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  // Task 4 replaces this handler with the real upload.
  const openCapturePage = () => router.push("/capture");

  return (
    <div className="min-h-dvh md:flex">
      <Navigation
        captureControl={<CaptureButton variant="navigation" onPhotoSelected={openCapturePage} />}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 md:px-10 md:pb-10">
        {children}
      </main>
    </div>
  );
}
