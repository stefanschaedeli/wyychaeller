import { determineDrinkingMaturity } from "./drinking-maturity";
import type { DrinkingMaturity, DrinkingWindow, WineType } from "./wine-types";

export interface FilterableWine extends DrinkingWindow {
  producer: string | null;
  name: string | null;
  region: string | null;
  country: string | null;
  grapeVarieties: string[];
  wineType: WineType | null;
  bottleCount: number;
}

export interface WineFilter {
  searchText?: string;
  wineType?: WineType;
  maturity?: DrinkingMaturity;
  shouldIncludeEmpty?: boolean;
}

const DIACRITIC_MARKS = /[̀-ͯ]/g;

function normalizeForSearch(text: string): string {
  return text.normalize("NFD").replace(DIACRITIC_MARKS, "").toLowerCase().trim();
}

function matchesSearchText(wine: FilterableWine, searchText: string): boolean {
  const searchableText = [
    wine.producer,
    wine.name,
    wine.region,
    wine.country,
    ...wine.grapeVarieties,
  ]
    .filter((part): part is string => part !== null)
    .join(" ");
  return normalizeForSearch(searchableText).includes(normalizeForSearch(searchText));
}

export function filterWines<T extends FilterableWine>(
  wines: T[],
  filter: WineFilter,
  currentYear: number,
): T[] {
  return wines.filter((wine) => {
    if (!filter.shouldIncludeEmpty && wine.bottleCount === 0) return false;
    if (filter.wineType && wine.wineType !== filter.wineType) return false;
    if (filter.maturity && determineDrinkingMaturity(wine, currentYear) !== filter.maturity) {
      return false;
    }
    if (filter.searchText && !matchesSearchText(wine, filter.searchText)) return false;
    return true;
  });
}
