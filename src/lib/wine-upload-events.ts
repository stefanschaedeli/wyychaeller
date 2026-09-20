"use client";

// Uploading a label photo from the navigation button (available on every page) does not
// remount the capture page when the user is already there, so it cannot call that page's
// own `reload()` directly. This tiny event lets it notify the capture page instead.
const wineUploadedEventTarget = new EventTarget();
const WINE_UPLOADED_EVENT_NAME = "wine-uploaded";

export function notifyWineUploaded(): void {
  wineUploadedEventTarget.dispatchEvent(new Event(WINE_UPLOADED_EVENT_NAME));
}

export function subscribeToWineUploaded(onUploaded: () => void): () => void {
  wineUploadedEventTarget.addEventListener(WINE_UPLOADED_EVENT_NAME, onUploaded);
  return () => wineUploadedEventTarget.removeEventListener(WINE_UPLOADED_EVENT_NAME, onUploaded);
}
