import { describe, expect, it } from "vitest";
import { summarizePicks } from "./bracketSummary";

describe("summarizePicks", () => {
  it("counts confidence levels and default picks", () => {
    expect(
      summarizePicks([
        { matchSlot: "R16-1", winnerId: "bra", confidence: "high", rationale: "Strategy pick." },
        { matchSlot: "R16-2", winnerId: "fra", confidence: "default", rationale: "Default pick by FIFA ranking." },
        { matchSlot: "QF-1", winnerId: "bra", confidence: "medium", rationale: "Strategy pick." }
      ])
    ).toEqual({ high: 1, medium: 1, low: 0, default: 1 });
  });
});
