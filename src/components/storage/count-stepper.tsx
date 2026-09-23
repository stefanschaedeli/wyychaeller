"use client";

import { useState } from "react";
import { commitCountText, parseCountWhileTyping } from "@/lib/count-input";

const NO_BOTTLES = 0;

export interface CountStepperProps {
  value: number;
  onChange: (value: number) => void;
  /** Shown above the stepper when the surrounding panel needs a heading of its own. */
  label?: string;
}

/** Minus / number / plus, sized for a thumb: the only bottle-count control of the picker. */
export function CountStepper({ value, onChange, label }: CountStepperProps) {
  // The field keeps what the user typed, so clearing it to retype a two-digit number works;
  // only a usable text commits. When the count changes elsewhere (the buttons, a new slot),
  // the buffer is adjusted during render, the pattern React documents for resetting state
  // on a changed prop — an effect would first render the stale text.
  const [text, setText] = useState(() => String(value));
  const [lastValue, setLastValue] = useState(value);
  if (lastValue !== value) {
    setLastValue(value);
    setText(String(value));
  }

  function changeFromText(typedText: string) {
    setText(typedText);
    const parsedCount = parseCountWhileTyping(typedText);
    if (parsedCount !== null && parsedCount !== value) onChange(parsedCount);
  }

  function commitOnBlur() {
    const committedCount = commitCountText(text, value);
    setText(String(committedCount));
    if (committedCount !== value) onChange(committedCount);
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
          value={text}
          onChange={(event) => changeFromText(event.target.value)}
          onBlur={commitOnBlur}
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
