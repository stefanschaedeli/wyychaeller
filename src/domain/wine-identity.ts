import { stripDiacritics } from "./text-normalization";

export interface WineIdentityFields {
  producer: string | null;
  name: string | null;
  vintage: number | null;
}

const NON_ALPHANUMERIC = /[^a-z0-9]/g;

function normalizeText(text: string | null): string {
  return stripDiacritics(text ?? "")
    .toLowerCase()
    .replace(NON_ALPHANUMERIC, "");
}

/** Two wines with the same key are treated as the same cellar entry. */
export function buildWineIdentityKey(identity: WineIdentityFields): string | null {
  const producer = normalizeText(identity.producer);
  const name = normalizeText(identity.name);
  if (producer === "" && name === "") return null;

  return `${producer}|${name}|${identity.vintage ?? "nv"}`;
}
