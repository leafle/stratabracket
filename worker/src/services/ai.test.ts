import { describe, expect, it } from "vitest";
import { parseAnthropicPicks } from "./ai";

describe("parseAnthropicPicks", () => {
  it("extracts and validates bracket picks from an Anthropic message response", () => {
    const picks = parseAnthropicPicks({
      content: [
        {
          type: "text",
          text: JSON.stringify([
            {
              match_slot: "R16-1",
              winner_id: "bra",
              confidence: "high",
              rationale: "Brazil advances because the strategy favors South American teams."
            }
          ])
        }
      ]
    });

    expect(picks).toEqual([
      {
        matchSlot: "R16-1",
        winnerId: "bra",
        confidence: "high",
        rationale: "Brazil advances because the strategy favors South American teams."
      }
    ]);
  });

  it("rejects malformed model output before database writes", () => {
    expect(() =>
      parseAnthropicPicks({
        content: [{ type: "text", text: JSON.stringify([{ match_slot: "R16-1", winner_id: "bra" }]) }]
      })
    ).toThrow("Anthropic response did not match bracket pick schema");
  });
});
