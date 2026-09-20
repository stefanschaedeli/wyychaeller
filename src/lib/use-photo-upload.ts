"use client";

import { useCallback, useState } from "react";
import type { WineResponse } from "@/shared/api-contract";
import { apiClient } from "./api-client";
import { toErrorCode } from "./use-api-resource";

export interface PhotoUpload {
  uploadPhoto: (photo: File) => void;
  isUploading: boolean;
  errorCode: string | null;
}

export function usePhotoUpload(onUploaded: (wine: WineResponse) => void): PhotoUpload {
  const [isUploading, setIsUploading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const uploadPhoto = useCallback(
    (photo: File) => {
      setIsUploading(true);
      setErrorCode(null);
      apiClient
        .uploadLabelPhoto(photo)
        .then(({ wine }) => onUploaded(wine))
        .catch((error: unknown) => setErrorCode(toErrorCode(error)))
        .finally(() => setIsUploading(false));
    },
    [onUploaded],
  );

  return { uploadPhoto, isUploading, errorCode };
}
