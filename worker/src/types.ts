export type Confidence = "high" | "medium" | "low" | "default";
export type Round = "R16" | "QF" | "SF" | "F" | "CHAMPION";

export interface Env {
  DB: D1Database;
  EMAIL?: SendEmail;
  ANTHROPIC_API_KEY?: string;
  ENVIRONMENT?: string;
  APP_ORIGIN?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

export interface AppVariables {
  user: AuthUser;
}

export interface GeneratedPick {
  matchSlot: string;
  winnerId: string;
  confidence: Confidence;
  rationale: string;
}

export interface TournamentTeam {
  id: string;
  name: string;
  confederation: string | null;
  fifaRanking: number | null;
  groupStageRecord: string | null;
}

export interface TournamentMatch {
  slot: string;
  round: string;
  teamAId: string | null;
  teamBId: string | null;
}

export interface TournamentContext {
  teams: TournamentTeam[];
  matches: TournamentMatch[];
}
