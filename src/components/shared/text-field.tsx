"use client";

import { useId } from "react";

export interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: "text" | "numeric" | "decimal";
  placeholder?: string;
  isRequired?: boolean;
  maximumLength?: number;
}

export function TextField(props: TextFieldProps) {
  const inputId = useId();
  return (
    <div>
      <label htmlFor={inputId} className="field-label">
        {props.label}
      </label>
      <input
        id={inputId}
        className="field-input"
        value={props.value}
        inputMode={props.inputMode ?? "text"}
        placeholder={props.placeholder}
        required={props.isRequired}
        maxLength={props.maximumLength ?? 200}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </div>
  );
}
