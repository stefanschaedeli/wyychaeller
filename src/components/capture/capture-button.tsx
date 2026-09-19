"use client";

import { useId } from "react";

export interface CaptureButtonProps {
  variant: "navigation" | "large";
  onPhotoSelected?: (photo: File) => void;
}

const VARIANT_CLASSES: Record<CaptureButtonProps["variant"], string> = {
  navigation:
    "flex h-14 w-14 items-center justify-center rounded-full bg-bordeaux text-paper text-3xl leading-none cursor-pointer -mt-6 md:mt-0 shadow-md",
  large: "button-primary w-full cursor-pointer",
};

export function CaptureButton({ variant, onPhotoSelected }: CaptureButtonProps) {
  const inputId = useId();

  return (
    <label htmlFor={inputId} className={VARIANT_CLASSES[variant]}>
      <span className={variant === "navigation" ? "sr-only" : undefined}>
        Etikett fotografieren
      </span>
      {variant === "navigation" && <span aria-hidden="true">+</span>}
      <input
        id={inputId}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(event) => {
          const photo = event.target.files?.[0];
          if (photo) onPhotoSelected?.(photo);
          event.target.value = "";
        }}
      />
    </label>
  );
}
