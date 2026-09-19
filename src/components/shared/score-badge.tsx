import type { ResearchConfidence } from "@/domain/wine-types";

export function ScoreBadge(props: { score: number | null; confidence: ResearchConfidence | null }) {
  if (props.score !== null) return <span className="pill">{props.score} Pkt</span>;
  if (props.confidence === "estimated") return <span className="pill">geschätzt</span>;
  return null;
}
