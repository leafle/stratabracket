import { Hono } from "hono";
import { requireAuth } from "../middleware/auth";
import type { AppVariables, Env } from "../types";

const bracket = new Hono<{ Bindings: Env; Variables: AppVariables }>();

bracket.use("*", requireAuth);

bracket.get("/:id/brackets", async (c) => {
  const pool = await c.env.DB.prepare("SELECT lock_time FROM pools WHERE id = ?").bind(c.req.param("id")).first<{ lock_time: number }>();
  if (!pool) return c.json({ error: "Pool not found" }, 404);
  if (pool.lock_time > Math.floor(Date.now() / 1000)) return c.json({ error: "Brackets are hidden until lock time" }, 403);

  const brackets = await c.env.DB.prepare(
    `SELECT entries.id AS entry_id, users.display_name, entries.strategy_text, picks.match_slot, picks.team_id, picks.confidence, picks.rationale
     FROM entries
     JOIN users ON users.id = entries.user_id
     LEFT JOIN picks ON picks.entry_id = entries.id
     WHERE entries.pool_id = ? AND entries.submitted = 1
     ORDER BY users.display_name, picks.match_slot`
  )
    .bind(c.req.param("id"))
    .all();

  return c.json({ brackets: brackets.results });
});

bracket.get("/matches", async (c) => {
  const matches = await c.env.DB.prepare(
    `SELECT matches.*, team_a.name AS team_a_name, team_b.name AS team_b_name, winner.name AS winner_name
     FROM matches
     LEFT JOIN teams team_a ON team_a.id = matches.team_a_id
     LEFT JOIN teams team_b ON team_b.id = matches.team_b_id
     LEFT JOIN teams winner ON winner.id = matches.winner_id
     ORDER BY matches.scheduled_time ASC, matches.slot ASC`
  ).all();

  return c.json({ matches: matches.results });
});

export default bracket;
