const STAR_VALUES = [1, 2, 3, 4, 5] as const;

export interface StarRatingInputProps {
  value: number | null;
  onChange: (value: number) => void;
}

export function StarRatingInput({ value, onChange }: StarRatingInputProps) {
  return (
    <fieldset>
      <legend className="field-label">Deine Bewertung</legend>
      <div className="flex gap-1">
        {STAR_VALUES.map((starValue) => (
          <label
            key={starValue}
            className="relative flex h-11 w-11 cursor-pointer items-center justify-center text-2xl"
          >
            <input
              type="radio"
              name="starRating"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label={starValue === 1 ? "1 Stern" : `${starValue} Sterne`}
              checked={value === starValue}
              onChange={() => onChange(starValue)}
            />
            <span
              aria-hidden="true"
              className={`pointer-events-none ${value !== null && starValue <= value ? "text-gold" : "text-line"}`}
            >
              ★
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
