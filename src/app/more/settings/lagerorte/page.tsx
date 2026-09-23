"use client";

import { PageHeader } from "@/components/layout/page-header";
import { LocationManager } from "@/components/storage/location-manager";

export default function StorageLocationSettingsPage() {
  return (
    <>
      <PageHeader eyebrow="Einstellungen" title="Lagerorte" />
      <LocationManager />
    </>
  );
}
