export function parseOptionalNumber(text: string): number | null {
  const normalizedText = text.trim().replace(",", ".");
  if (normalizedText === "") return null;
  const parsedNumber = Number(normalizedText);
  return Number.isFinite(parsedNumber) ? parsedNumber : null;
}

export function parseOptionalInteger(text: string): number | null {
  const parsedNumber = parseOptionalNumber(text);
  return parsedNumber !== null && Number.isInteger(parsedNumber) ? parsedNumber : null;
}

export function parseCommaSeparatedList(text: string): string[] {
  return text
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
}

export function toInputText(value: string | number | null): string {
  return value === null ? "" : String(value);
}

/** Trims text for optional-text form fields; an empty result becomes null instead of "". */
export function toNullableText(text: string): string | null {
  const trimmedText = text.trim();
  return trimmedText === "" ? null : trimmedText;
}

/** Parses a required bottle count; returns null when it is not an integer or below `minimum`. */
export function parseBottleCount(text: string, minimum: number): number | null {
  const parsedCount = parseOptionalInteger(text);
  return parsedCount !== null && parsedCount >= minimum ? parsedCount : null;
}
