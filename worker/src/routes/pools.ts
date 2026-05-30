import { Hono } from "hono";
import { nanoid } from "nanoid";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import type { AppVariables, Env } from "../types";

const pools = new Hono<{ Bindings: Env; Variables: AppVariables }>();

const createPoolBody = z.object({
  name: z.string().min(1).max(120),
  lockTime: z.number().int().positive(),
  scoringConfig: z
    .object({
      highConfidenceMultiplier: z.boolean().default(false),
      strategyBonus: z.boolean().default(false)
    })
    .default({ highConfidenceMultiplier: false, strategyBonus: false })
});

pools.use("*", requireAuth);

pools.get("/", async (c) => {
  const user = c.get("user");
  const result = await c.env.DB.prepare(
    `SELECT pools.id, pools.name, pools.lock_time, pools.status, pools.scoring_config
     FROM pools
     JOIN pool_members ON pool_members.pool_id = pools.id
     WHERE pool_members.user_id = ?
     ORDER BY pools.created_at DESC`
  )
    .bind(user.id)
    .all();

  return c.json({ pools: result.results });
});

pools.post("/", async (c) => {
  const body = createPoolBody.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "Invalid pool payload" }, 400);

  const now = Math.floor(Date.now() / 1000);
  const id = `pool_${nanoid(10)}`;
  const user = c.get("user");

  await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO pools (id, name, commissioner_id, lock_time, scoring_config, status, created_at) VALUES (?, ?, ?, ?, ?, 'open', ?)"
    ).bind(id, body.data.name, user.id, body.data.lockTime, JSON.stringify(body.data.scoringConfig), now),
    c.env.DB.prepare("INSERT INTO pool_members (pool_id, user_id, joined_at) VALUES (?, ?, ?)").bind(id, user.id, now)
  ]);

  return c.json({ id }, 201);
});

pools.get("/:id", async (c) => {
  const pool = await c.env.DB.prepare("SELECT * FROM pools WHERE id = ?").bind(c.req.param("id")).first();
  if (!pool) return c.json({ error: "Pool not found" }, 404);

  const members = await c.env.DB.prepare(
    `SELECT users.id, users.display_name, users.email
     FROM pool_members
     JOIN users ON users.id = pool_members.user_id
     WHERE pool_members.pool_id = ?
     ORDER BY users.display_name`
  )
    .bind(c.req.param("id"))
    .all();

  return c.json({ pool, members: members.results });
});

pools.post("/:id/join", async (c) => {
  const user = c.get("user");
  const pool = await c.env.DB.prepare("SELECT id FROM pools WHERE id = ?").bind(c.req.param("id")).first();
  if (!pool) return c.json({ error: "Pool not found" }, 404);

  await c.env.DB.prepare("INSERT OR IGNORE INTO pool_members (pool_id, user_id, joined_at) VALUES (?, ?, ?)")
    .bind(c.req.param("id"), user.id, Math.floor(Date.now() / 1000))
    .run();

  return c.json({ ok: true });
});

export default pools;
