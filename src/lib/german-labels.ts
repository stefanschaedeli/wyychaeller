import type { AnalysisStatus, DrinkingMaturity, WineType } from "@/domain/wine-types";

export const WINE_TYPE_LABELS: Record<WineType, string> = {
  red: "Rot",
  white: "Weiss",
  rose: "Rosé",
  sparkling: "Schaumwein",
  sweet: "Süsswein",
};

export const MATURITY_LABELS: Record<DrinkingMaturity, string> = {
  tooYoung: "zu jung",
  ready: "trinkreif",
  drinkSoon: "bald trinken",
  overdue: "überfällig",
  unknown: "Reife unbekannt",
};

export const ANALYSIS_STATUS_LABELS: Record<AnalysisStatus, string> = {
  pending: "wartet auf Analyse",
  analyzing: "wird analysiert …",
  awaitingConfirmation: "bitte bestätigen",
  complete: "im Keller",
  failed: "Analyse fehlgeschlagen",
};

const FALLBACK_ERROR_MESSAGE = "Etwas ist schiefgelaufen. Bitte versuche es erneut.";

const ERROR_MESSAGES: Record<string, string> = {
  offline: "Keine Verbindung zum Weinkeller-Server.",
  labelUnreadable: "Auf dem Foto wurde kein Weinetikett erkannt.",
  invalidResponse: "Die KI hat keine brauchbare Antwort geliefert.",
  unavailable: "Der KI-Dienst ist gerade nicht erreichbar. Das Foto ist gespeichert.",
  missingApiKey: "Es ist kein API-Schlüssel hinterlegt. Trage ANTHROPIC_API_KEY im Container ein.",
  invalidApiKey: "Der API-Schlüssel wurde abgelehnt. Prüfe ANTHROPIC_API_KEY im Container.",
  budgetExceeded: "Die monatliche Obergrenze für KI-Aufrufe ist erreicht (siehe Einstellungen).",
  rateLimited: "Zu viele KI-Anfragen in kurzer Zeit. Bitte warte eine Minute.",
  invalidPhoto: "Diese Datei ist kein unterstütztes Bild (JPEG, PNG oder WebP).",
  photoTooLarge: "Das Foto ist zu gross (maximal 15 MB).",
  invalidInput: "Bitte prüfe die Eingaben.",
  identityMissing: "Bitte gib mindestens Weingut oder Weinname ein.",
  analysisRunning: "Die Analyse läuft bereits.",
  notFound: "Dieser Eintrag existiert nicht mehr.",
  isDuplicate: "Dieser Wein ist schon im Keller. Erhöhe stattdessen den Bestand.",
  notAwaitingConfirmation:
    "Dieser Wein wartet nicht mehr auf eine Bestätigung. Lade die Seite neu.",
  notADuplicate: "Dieser Wein ist kein Duplikat und kann nicht zusammengeführt werden.",
};

export function describeError(errorCode: string): string {
  return ERROR_MESSAGES[errorCode] ?? FALLBACK_ERROR_MESSAGE;
}

export function formatWineTitle(wine: {
  producer: string | null;
  name: string | null;
  vintage: number | null;
}): string {
  const baseTitle = wine.name ?? wine.producer ?? "Unbekannter Wein";
  return wine.vintage === null ? baseTitle : `${baseTitle} ${wine.vintage}`;
}

export function formatWineOrigin(wine: { region: string | null; country: string | null }): string {
  return [wine.region, wine.country].filter((part) => part !== null).join(" · ");
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatBottleCount(bottleCount: number): string {
  return bottleCount === 1 ? "1 Flasche" : `${bottleCount} Flaschen`;
}
