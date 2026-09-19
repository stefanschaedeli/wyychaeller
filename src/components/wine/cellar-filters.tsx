"use client";

import { useId } from "react";
import { SelectField } from "@/components/shared/select-field";
import {
  DRINKING_MATURITIES,
  WINE_TYPES,
  type DrinkingMaturity,
  type WineType,
} from "@/domain/wine-types";
import { MATURITY_LABELS, WINE_TYPE_LABELS } from "@/lib/german-labels";

export interface CellarFiltersProps {
  searchText: string;
  onSearchTextChange: (searchText: string) => void;
  wineType: WineType | "";
  onWineTypeChange: (wineType: WineType | "") => void;
  maturity: DrinkingMaturity | "";
  onMaturityChange: (maturity: DrinkingMaturity | "") => void;
}

const WINE_TYPE_OPTIONS = WINE_TYPES.map((wineType) => ({
  value: wineType,
  label: WINE_TYPE_LABELS[wineType],
}));

const MATURITY_OPTIONS = DRINKING_MATURITIES.map((maturity) => ({
  value: maturity,
  label: MATURITY_LABELS[maturity],
}));

export function CellarFilters(props: CellarFiltersProps) {
  const searchId = useId();
  return (
    <form
      role="search"
      className="grid grid-cols-2 gap-3"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="col-span-2">
        <label htmlFor={searchId} className="field-label">
          Suche
        </label>
        <input
          id={searchId}
          type="search"
          className="field-input"
          placeholder="Wein, Weingut, Region, Traube"
          value={props.searchText}
          onChange={(event) => props.onSearchTextChange(event.target.value)}
        />
      </div>
      <SelectField
        label="Weintyp"
        value={props.wineType}
        onChange={(value) => props.onWineTypeChange(value as WineType | "")}
        options={WINE_TYPE_OPTIONS}
        emptyOptionLabel="Alle"
      />
      <SelectField
        label="Trinkreife"
        value={props.maturity}
        onChange={(value) => props.onMaturityChange(value as DrinkingMaturity | "")}
        options={MATURITY_OPTIONS}
        emptyOptionLabel="Alle"
      />
    </form>
  );
}
