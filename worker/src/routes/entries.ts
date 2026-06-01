import { Hono } from "hono";
import { nanoid } from "nanoid";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { generateBracket } from "../services/ai";
import { loadTournamentContext } from "../services/tournament";
import type { AppVariables, Env, GeneratedPick } from "../types";

const entries = new Hono<{ Bindings: Env; Variables: AppVariables }>();

const strategyBody = z.object({
  strategyText: z.string().max(4000)
});

entries.use("*", requireAuth);

entries.get("/:id/entry", async (c) => {
  const entry = await ensureEntry(c.env.DB, c.req.param("id"), c.get("user").id);
  const picks = await c.env.DB.prepare("SELECT match_slot, team_id, confidence, rationale FROM picks WHERE entry_id = ? ORDER BY match_slot")
    .bind(entry.id)
    .all();

  return c.json({ entry, picks: picks.results });
});

entries.put("/:id/entry/strategy", async (c) => {
  const body = strategyBody.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "Invalid strategy payload" }, 400);

  const entry = await ensureEntry(c.env.DB, c.req.param("id"), c.get("user").id);
  if (entry.submitted) return c.json({ error: "Entry is already submitted" }, 409);

  await c.env.DB.prepare("UPDATE entries SET strategy_text = ? WHERE id = ?").bind(body.data.strategyText, entry.id).run();
  return c.json({ ok: true });
});

entries.post("/:id/entry/generate", async (c) => {
  const entry = await ensureEntry(c.env.DB, c.req.param("id"), c.get("user").id);
  if (entry.submitted) return c.json({ error: "Entry is already submitted" }, 409);

  const strategyText = entry.strategy_text ?? "";
  const context = await loadTournamentContext(c.env.DB);
  if (context.matches.length === 0 || context.teams.length === 0) {
    return c.json({ error: "Tournament data is not loaded" }, 409);
  }

  const generatedPicks = await generateBracket(strategyText, context, c.env);
  if (generatedPicks.length === 0) {
    return c.json({ error: "Bracket generation returned no picks" }, 502);
  }

  await replacePicks(c.env.DB, entry.id, generatedPicks);

  return c.json({ picks: generatedPicks });
});

entries.post("/:id/entry/submit", async (c) => {
  const pool = await c.env.DB.prepare("SELECT lock_time FROM pools WHERE id = ?").bind(c.req.param("id")).first<{ lock_time: number }>();
  if (!pool) return c.json({ error: "Pool not found" }, 404);
  if (pool.lock_time <= Math.floor(Date.now() / 1000)) return c.json({ error: "Pool is locked" }, 409);

  const entry = await ensureEntry(c.env.DB, c.req.param("id"), c.get("user").id);
  const pickCount = await c.env.DB.prepare("SELECT COUNT(*) AS count FROM picks WHERE entry_id = ?").bind(entry.id).first<{ count: number }>();
  if (!pickCount?.count) return c.json({ error: "Generate a bracket before submitting" }, 409);

  await c.env.DB.prepare("UPDATE entries SET submitted = 1 WHERE id = ?").bind(entry.id).run();
  return c.json({ ok: true });
});

export async function ensureEntry(db: D1Database, poolId: string, userId: string) {
  const now = Math.floor(Date.now() / 1000);
  const existing = await db.prepare("SELECT * FROM entries WHERE pool_id = ? AND user_id = ?").bind(poolId, userId).first<{
    id: string;
    strategy_text: string | null;
    submitted: number;
    score: number;
  }>();

  if (existing) return existing;

  const id = `entry_${nanoid(10)}`;
  await db.prepare("INSERT INTO entries (id, pool_id, user_id, created_at) VALUES (?, ?, ?, ?)").bind(id, poolId, userId, now).run();
  return { id, strategy_text: null, submitted: 0, score: 0 };
}

async function replacePicks(db: D1Database, entryId: string, picks: GeneratedPick[]) {
  await db.prepare("DELETE FROM picks WHERE entry_id = ?").bind(entryId).run();
  if (picks.length === 0) return;

  await db.batch(
    picks.map((pick) =>
      db.prepare("INSERT INTO picks (id, entry_id, match_slot, team_id, confidence, rationale) VALUES (?, ?, ?, ?, ?, ?)").bind(
        `pick_${nanoid(10)}`,
        entryId,
        pick.matchSlot,
        pick.winnerId,
        pick.confidence,
        pick.rationale
      )
    )
  );
}

export default entries;
