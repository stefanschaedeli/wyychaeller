"use client";

export const PLACEMENT_PICKER_TITLE_ID = "placement-picker-title";
export const PLACEMENT_PICKER_TITLE = "Wo liegen die Flaschen?";
const BACK_LABEL = "Lagerort wechseln";
const CLOSE_LABEL = "Schliessen";

export interface PickerHeaderProps {
  title: string;
  /** A second line under the title, e.g. which wine is being placed. */
  subtitle?: string | null;
  /** When set, a back control above the title returns to the location list. */
  onBack?: () => void;
  onClose: () => void;
}

/** The overlay's top edge: back control (step 2 only), the step's heading, and the close cross. */
export function PickerHeader({ title, subtitle, onBack, onClose }: PickerHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-3 border-b border-line px-5 pb-3 pt-3">
      <div className="min-w-0 flex-1">
        {onBack !== undefined && (
          <button
            type="button"
            onClick={onBack}
            className="-ml-1 flex min-h-11 items-center gap-1 px-1 font-sans text-sm text-bordeaux"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              ‹
            </span>
            {BACK_LABEL}
          </button>
        )}
        <h2 id={PLACEMENT_PICKER_TITLE_ID} className="truncate text-2xl">
          {title}
        </h2>
        {subtitle && <p className="truncate text-ink-muted">{subtitle}</p>}
      </div>
      <button
        type="button"
        aria-label={CLOSE_LABEL}
        onClick={onClose}
        className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-sans text-2xl leading-none text-ink-muted transition-colors hover:bg-card hover:text-ink"
      >
        ×
      </button>
    </header>
  );
}
