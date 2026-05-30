export type Confidence = "high" | "medium" | "low" | "default";

export interface PickSummaryInput {
  matchSlot: string;
  winnerId: string;
  confidence: Confidence;
  rationale: string;
}

export type PickSummary = Record<Confidence, number>;

export function summarizePicks(picks: PickSummaryInput[]): PickSummary {
  return picks.reduce<PickSummary>(
    (summary, pick) => {
      summary[pick.confidence] += 1;
      return summary;
    },
    { high: 0, medium: 0, low: 0, default: 0 }
  );
}
