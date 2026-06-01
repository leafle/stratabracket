import { afterEach, describe, expect, it, vi } from "vitest";
import { generateBracket, parseAnthropicPicks } from "./ai";
import type { TournamentContext } from "../types";

const tournamentContext: TournamentContext = {
  teams: [
    { id: "bra", name: "Brazil", confederation: "CONMEBOL", fifaRanking: 5, groupStageRecord: "2-0-1" },
    { id: "usa", name: "United States", confederation: "CONCACAF", fifaRanking: 14, groupStageRecord: "1-1-1" }
  ],
  matches: [{ slot: "R16-1", round: "R16", teamAId: "bra", teamBId: "usa" }]
};

afterEach(() => {
  vi.unstubAllGlobals();
});

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

  it("uses the current Claude Sonnet model by default", async () => {
    const fetch = vi.fn().mockResolvedValue(
      Response.json({
        content: [
          {
            type: "text",
            text: JSON.stringify([{ match_slot: "R16-1", winner_id: "bra", confidence: "high", rationale: "Brazil is stronger." }])
          }
        ]
      })
    );
    vi.stubGlobal("fetch", fetch);

    await generateBracket("Trust Brazil.", tournamentContext, { ANTHROPIC_API_KEY: "sk-ant-test" } as never);

    expect(JSON.parse(fetch.mock.calls[0][1].body).model).toBe("claude-sonnet-4-6");
  });

  it("allows the Anthropic model to be configured", async () => {
    const fetch = vi.fn().mockResolvedValue(
      Response.json({
        content: [
          {
            type: "text",
            text: JSON.stringify([{ match_slot: "R16-1", winner_id: "bra", confidence: "high", rationale: "Brazil is stronger." }])
          }
        ]
      })
    );
    vi.stubGlobal("fetch", fetch);

    await generateBracket("Trust Brazil.", tournamentContext, {
      ANTHROPIC_API_KEY: "sk-ant-test",
      ANTHROPIC_MODEL: "claude-haiku-4-5"
    } as never);

    expect(JSON.parse(fetch.mock.calls[0][1].body).model).toBe("claude-haiku-4-5");
  });
});
