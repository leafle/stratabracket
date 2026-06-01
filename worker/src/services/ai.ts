import { z } from "zod";
import type { Env, GeneratedPick, TournamentContext } from "../types";

const defaultAnthropicModel = "claude-sonnet-4-6";

const anthropicPickSchema = z.array(
  z.object({
    match_slot: z.string().min(1),
    winner_id: z.string().min(1),
    confidence: z.enum(["high", "medium", "low", "default"]),
    rationale: z.string().min(1)
  })
);

const anthropicResponseSchema = z.object({
  content: z.array(z.object({ type: z.string(), text: z.string() })).min(1)
});

export function parseAnthropicPicks(responseBody: unknown): GeneratedPick[] {
  const response = anthropicResponseSchema.parse(responseBody);
  const text = response.content.find((item) => item.type === "text")?.text ?? response.content[0].text;

  try {
    const parsed = anthropicPickSchema.parse(JSON.parse(text));
    return parsed.map((pick) => ({
      matchSlot: pick.match_slot,
      winnerId: pick.winner_id,
      confidence: pick.confidence,
      rationale: pick.rationale
    }));
  } catch (error) {
    throw new Error("Anthropic response did not match bracket pick schema", { cause: error });
  }
}

export async function generateBracket(
  strategy: string,
  tournamentContext: TournamentContext,
  env: Env
): Promise<GeneratedPick[]> {
  if (!env.ANTHROPIC_API_KEY) {
    return generateDefaultBracket(tournamentContext, strategy);
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL ?? defaultAnthropicModel,
      max_tokens: 2000,
      system: buildSystemPrompt(tournamentContext),
      messages: [{ role: "user", content: strategy }]
    })
  });

  if (!response.ok) {
    throw new Error(`Anthropic request failed with status ${response.status}`);
  }

  return parseAnthropicPicks(await response.json());
}

export function buildSystemPrompt(tournamentContext: TournamentContext): string {
  return [
    "You are a World Cup bracket prediction engine.",
    "",
    "TOURNAMENT CONTEXT:",
    `Teams: ${JSON.stringify(tournamentContext.teams)}`,
    `Bracket slots: ${JSON.stringify(tournamentContext.matches)}`,
    "",
    "TASK:",
    "Given the user's strategy statement, fill in every match in the knockout bracket.",
    "For each match, output JSON with: match_slot, winner_id, confidence, rationale.",
    "Confidence must be one of high, medium, low, default.",
    "Use default confidence and FIFA ranking when the strategy does not clearly address a match.",
    "Respond ONLY with a JSON array. No prose. No markdown."
  ].join("\n");
}

function generateDefaultBracket(context: TournamentContext, strategy: string): GeneratedPick[] {
  const teamsById = new Map(context.teams.map((team) => [team.id, team]));

  return context.matches.map((match) => {
    const teamA = match.teamAId ? teamsById.get(match.teamAId) : undefined;
    const teamB = match.teamBId ? teamsById.get(match.teamBId) : undefined;
    const winner = [teamA, teamB]
      .filter(Boolean)
      .sort((a, b) => (a?.fifaRanking ?? 999) - (b?.fifaRanking ?? 999))[0];

    return {
      matchSlot: match.slot,
      winnerId: winner?.id ?? teamA?.id ?? teamB?.id ?? "tbd",
      confidence: "default",
      rationale: strategy.trim()
        ? "Default pick by FIFA ranking because the strategy did not clearly resolve this matchup."
        : "Default pick by FIFA ranking because no strategy was provided."
    };
  });
}
