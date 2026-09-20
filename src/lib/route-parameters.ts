/**
 * Parses a route parameter that must be a positive integer record id.
 * Returns null for anything else (missing, non-numeric, fractional, zero or negative),
 * so callers never pass NaN or an invalid id on to the API.
 */
export function parseWineIdParameter(rawValue: string | undefined): number | null {
  if (rawValue === undefined) return null;
  const parsedValue = Number(rawValue);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}
