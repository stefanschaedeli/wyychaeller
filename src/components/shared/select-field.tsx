"use client";

import { useId } from "react";

export interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  emptyOptionLabel: string;
}

export function SelectField(props: SelectFieldProps) {
  const selectId = useId();
  return (
    <div>
      <label htmlFor={selectId} className="field-label">
        {props.label}
      </label>
      <select
        id={selectId}
        className="field-input"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      >
        <option value="">{props.emptyOptionLabel}</option>
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
