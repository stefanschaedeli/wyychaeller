"use client";

import { parseBottleCount } from "@/lib/form-values";

const NO_BOTTLES = 0;

export interface CountStepperProps {
  value: number;
  onChange: (value: number) => void;
  /** Shown above the stepper when the surrounding panel needs a heading of its own. */
  label?: string;
}

/** Minus / number / plus, sized for a thumb: the only bottle-count control of the picker. */
export function CountStepper({ value, onChange, label }: CountStepperProps) {
  function changeFromText(text: string) {
    if (text.trim() === "") {
      onChange(NO_BOTTLES);
      return;
    }
    const parsedCount = parseBottleCount(text, NO_BOTTLES);
    if (parsedCount !== null) onChange(parsedCount);
  }

  return (
    <div>
      {label !== undefined && <p className="field-label">{label}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Eine Flasche weniger"
          className="button-ghost min-h-11 min-w-11"
          onClick={() => onChange(Math.max(NO_BOTTLES, value - 1))}
        >
          −
        </button>
        <input
          aria-label="Anzahl Flaschen"
          className="field-input min-h-11 w-20 text-center"
          inputMode="numeric"
          value={String(value)}
          onChange={(event) => changeFromText(event.target.value)}
        />
        <button
          type="button"
          aria-label="Eine Flasche mehr"
          className="button-ghost min-h-11 min-w-11"
          onClick={() => onChange(value + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}
