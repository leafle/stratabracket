import type { TournamentContext } from "../types";

export async function loadTournamentContext(db: D1Database): Promise<TournamentContext> {
  const teams = await db
    .prepare("SELECT id, name, fifa_ranking, confederation, group_stage_record FROM teams ORDER BY fifa_ranking ASC")
    .all<{
      id: string;
      name: string;
      fifa_ranking: number | null;
      confederation: string | null;
      group_stage_record: string | null;
    }>();

  const matches = await db
    .prepare("SELECT slot, round, team_a_id, team_b_id FROM matches ORDER BY scheduled_time ASC, slot ASC")
    .all<{ slot: string; round: string; team_a_id: string | null; team_b_id: string | null }>();

  return {
    teams: teams.results.map((team) => ({
      id: team.id,
      name: team.name,
      fifaRanking: team.fifa_ranking,
      confederation: team.confederation,
      groupStageRecord: team.group_stage_record
    })),
    matches: matches.results.map((match) => ({
      slot: match.slot,
      round: match.round,
      teamAId: match.team_a_id,
      teamBId: match.team_b_id
    }))
  };
}
