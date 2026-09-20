/**
 * Defence in depth: the server already sanitizes AI/web data, but the UI checks again
 * before rendering an external link, so an unexpected scheme (e.g. `javascript:`) is
 * never turned into a clickable link.
 */
export function isWebLink(url: string | null): boolean {
  return url !== null && (url.startsWith("https://") || url.startsWith("http://"));
}
