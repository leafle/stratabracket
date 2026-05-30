import { describe, expect, it } from "vitest";
import { calculateEntryScore, roundPoints } from "./scoring";

describe("roundPoints", () => {
  it("returns configured base points by knockout round", () => {
    expect(roundPoints("R16")).toBe(2);
    expect(roundPoints("QF")).toBe(4);
    expect(roundPoints("SF")).toBe(8);
    expect(roundPoints("F")).toBe(16);
  });
});

describe("calculateEntryScore", () => {
  it("adds only correct picks and applies the optional high-confidence multiplier", () => {
    const score = calculateEntryScore(
      [
        { matchSlot: "R16-1", round: "R16", pickedTeamId: "bra", winnerId: "bra", confidence: "high" },
        { matchSlot: "QF-1", round: "QF", pickedTeamId: "arg", winnerId: "fra", confidence: "medium" },
        { matchSlot: "SF-1", round: "SF", pickedTeamId: "esp", winnerId: "esp", confidence: "low" }
      ],
      { highConfidenceMultiplier: true }
    );

    expect(score).toBe(11);
  });
});
