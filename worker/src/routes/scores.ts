import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { calculateEntryScore } from "../services/scoring";
import type { AppVariables, Env, Round } from "../types";

const scores = new Hono<{ Bindings: Env; Variables: AppVariables }>();
const resultBody = z.object({ winnerId: z.string().min(1) });

scores.use("*", requireAuth);

scores.get("/:id/leaderboard", async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT entries.id, entries.score, users.display_name, entries.strategy_text
     FROM entries
     JOIN users ON users.id = entries.user_id
     WHERE entries.pool_id = ? AND entries.submitted = 1
     ORDER BY entries.score DESC, users.display_name ASC`
  )
    .bind(c.req.param("id"))
    .all();

  return c.json({ leaderboard: rows.results });
});

scores.post("/admin/matches/:id/result", async (c) => {
  const body = resultBody.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "winnerId is required" }, 400);

  const match = await c.env.DB.prepare("SELECT slot, round FROM matches WHERE id = ?").bind(c.req.param("id")).first<{
    slot: string;
    round: Round;
  }>();
  if (!match) return c.json({ error: "Match not found" }, 404);

  await c.env.DB.prepare("UPDATE matches SET winner_id = ?, status = 'complete' WHERE id = ?").bind(body.data.winnerId, c.req.param("id")).run();
  await recalculatePoolScores(c.env.DB, match.slot, match.round);

  return c.json({ ok: true });
});

async function recalculatePoolScores(db: D1Database, matchSlot: string, round: Round) {
  const impacted = await db.prepare(
    `SELECT entries.id AS entry_id, entries.pool_id, picks.team_id, picks.confidence
     FROM picks
     JOIN entries ON entries.id = picks.entry_id
     WHERE picks.match_slot = ? AND entries.submitted = 1`
  )
    .bind(matchSlot)
    .all<{ entry_id: string; pool_id: string; team_id: string; confidence: "high" | "medium" | "low" | "default" }>();

  for (const entry of impacted.results) {
    const scoringConfig = await db.prepare("SELECT scoring_config FROM pools WHERE id = ?").bind(entry.pool_id).first<{ scoring_config: string }>();
    const match = await db.prepare("SELECT winner_id FROM matches WHERE slot = ?").bind(matchSlot).first<{ winner_id: string | null }>();
    const add = calculateEntryScore(
      [{ matchSlot, round, pickedTeamId: entry.team_id, winnerId: match?.winner_id ?? null, confidence: entry.confidence }],
      JSON.parse(scoringConfig?.scoring_config ?? "{}")
    );
    await db.prepare("UPDATE entries SET score = score + ? WHERE id = ?").bind(add, entry.entry_id).run();
  }
}

export default scores;
