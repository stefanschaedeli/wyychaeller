import { isUrgentMaturity } from "@/domain/drinking-maturity";
import type { DrinkingMaturity } from "@/domain/wine-types";
import { MATURITY_LABELS } from "@/lib/german-labels";

export function MaturityBadge({ maturity }: { maturity: DrinkingMaturity }) {
  const isUrgent = isUrgentMaturity(maturity);
  return (
    <span className={isUrgent ? "pill border-alert bg-alert text-paper" : "pill"}>
      {MATURITY_LABELS[maturity]}
    </span>
  );
}
