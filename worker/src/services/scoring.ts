import type { Confidence, Round } from "../types";

export interface PickResult {
  matchSlot: string;
  round: Round;
  pickedTeamId: string;
  winnerId: string | null;
  confidence: Confidence;
}

export interface ScoringOptions {
  highConfidenceMultiplier?: boolean;
}

const POINTS_BY_ROUND: Record<Round, number> = {
  R16: 2,
  QF: 4,
  SF: 8,
  F: 16,
  CHAMPION: 32
};

export function roundPoints(round: Round): number {
  return POINTS_BY_ROUND[round];
}

export function calculateEntryScore(picks: PickResult[], options: ScoringOptions = {}): number {
  return picks.reduce((score, pick) => {
    if (!pick.winnerId || pick.winnerId !== pick.pickedTeamId) return score;

    const base = roundPoints(pick.round);
    const multiplier = options.highConfidenceMultiplier && pick.confidence === "high" ? 1.5 : 1;
    return score + base * multiplier;
  }, 0);
}
