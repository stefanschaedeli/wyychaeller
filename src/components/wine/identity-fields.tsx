import { SelectField } from "@/components/shared/select-field";
import { TextField } from "@/components/shared/text-field";
import { WINE_TYPES, type WineType } from "@/domain/wine-types";
import {
  parseCommaSeparatedList,
  parseOptionalInteger,
  toInputText,
  toNullableText,
} from "@/lib/form-values";
import { WINE_TYPE_LABELS } from "@/lib/german-labels";
import type { WineIdentityRequestFields, WineResponse } from "@/shared/api-contract";

export interface IdentityFormValues {
  producer: string;
  name: string;
  vintage: string;
  country: string;
  region: string;
  appellation: string;
  grapeVarieties: string;
  wineType: WineType | "";
}

export function toIdentityFormValues(wine: WineResponse): IdentityFormValues {
  return {
    producer: toInputText(wine.producer),
    name: toInputText(wine.name),
    vintage: toInputText(wine.vintage),
    country: toInputText(wine.country),
    region: toInputText(wine.region),
    appellation: toInputText(wine.appellation),
    grapeVarieties: wine.grapeVarieties.join(", "),
    wineType: wine.wineType ?? "",
  };
}

export function toIdentityRequest(values: IdentityFormValues): WineIdentityRequestFields {
  return {
    producer: toNullableText(values.producer),
    name: toNullableText(values.name),
    vintage: parseOptionalInteger(values.vintage),
    country: toNullableText(values.country),
    region: toNullableText(values.region),
    appellation: toNullableText(values.appellation),
    grapeVarieties: parseCommaSeparatedList(values.grapeVarieties),
    wineType: values.wineType === "" ? null : values.wineType,
  };
}

const WINE_TYPE_OPTIONS = WINE_TYPES.map((wineType) => ({
  value: wineType,
  label: WINE_TYPE_LABELS[wineType],
}));

export interface IdentityFieldsProps {
  values: IdentityFormValues;
  onChange: (values: IdentityFormValues) => void;
}

export function IdentityFields({ values, onChange }: IdentityFieldsProps) {
  const setField = (field: keyof IdentityFormValues) => (text: string) =>
    onChange({ ...values, [field]: text });

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <TextField label="Weingut" value={values.producer} onChange={setField("producer")} />
      <TextField label="Wein" value={values.name} onChange={setField("name")} />
      <TextField
        label="Jahrgang"
        value={values.vintage}
        onChange={setField("vintage")}
        inputMode="numeric"
        maximumLength={4}
      />
      <SelectField
        label="Typ"
        value={values.wineType}
        onChange={(text) => setField("wineType")(text)}
        options={WINE_TYPE_OPTIONS}
        emptyOptionLabel="Unbekannt"
      />
      <TextField label="Region" value={values.region} onChange={setField("region")} />
      <TextField label="Land" value={values.country} onChange={setField("country")} />
      <TextField
        label="Appellation"
        value={values.appellation}
        onChange={setField("appellation")}
      />
      <TextField
        label="Traubensorten (mit Komma getrennt)"
        value={values.grapeVarieties}
        onChange={setField("grapeVarieties")}
      />
    </div>
  );
}
