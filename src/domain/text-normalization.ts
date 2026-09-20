const DIACRITIC_MARKS = /[\u0300-\u036f]/g;

/** Strips combining diacritical marks left over after Unicode NFD normalization. */
export function stripDiacritics(text: string): string {
  return text.normalize("NFD").replace(DIACRITIC_MARKS, "");
}
