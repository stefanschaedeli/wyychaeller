/** Formats `now` as a local-calendar ISO date (`YYYY-MM-DD`), as the tasting API expects. */
export function getTodayAsIsoDate(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
