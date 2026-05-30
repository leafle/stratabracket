import { Hono } from "hono";
import { nanoid } from "nanoid";
import { z } from "zod";
import { sendMagicLinkEmail } from "../services/email";
import type { AppVariables, Env } from "../types";

const auth = new Hono<{ Bindings: Env; Variables: AppVariables }>();

const magicLinkBody = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(80).optional()
});

auth.post("/magic-link", async (c) => {
  const body = magicLinkBody.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "Valid email is required" }, 400);

  const now = Math.floor(Date.now() / 1000);
  const userId = `user_${nanoid(12)}`;
  const token = nanoid(32);
  const displayName = body.data.displayName ?? body.data.email.split("@")[0];

  await c.env.DB.prepare(
    `INSERT INTO users (id, email, display_name, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET display_name = excluded.display_name`
  )
    .bind(userId, body.data.email, displayName, now)
    .run();

  const user = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(body.data.email).first<{ id: string }>();
  await c.env.DB.prepare("INSERT INTO sessions (token, user_id, type, expires_at, created_at) VALUES (?, ?, 'magic_link', ?, ?)")
    .bind(token, user?.id ?? userId, now + 15 * 60, now)
    .run();

  const origin = c.env.APP_ORIGIN ?? new URL(c.req.url).origin;
  const magicLinkUrl = `${origin}/auth/verify?token=${token}`;
  await sendMagicLinkEmail(c.env, body.data.email, magicLinkUrl);

  return c.json({
    ok: true,
    message: "Magic link generated",
    devMagicLink: c.env.ENVIRONMENT === "production" ? undefined : magicLinkUrl
  });
});

auth.get("/verify", async (c) => {
  const token = c.req.query("token");
  if (!token) return c.json({ error: "Token is required" }, 400);

  const now = Math.floor(Date.now() / 1000);
  const magicLink = await c.env.DB.prepare(
    "SELECT user_id FROM sessions WHERE token = ? AND type = 'magic_link' AND expires_at > ?"
  )
    .bind(token, now)
    .first<{ user_id: string }>();

  if (!magicLink) return c.json({ error: "Invalid or expired magic link" }, 401);

  const sessionToken = nanoid(40);
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token),
    c.env.DB.prepare("INSERT INTO sessions (token, user_id, type, expires_at, created_at) VALUES (?, ?, 'session', ?, ?)")
      .bind(sessionToken, magicLink.user_id, now + 7 * 24 * 60 * 60, now)
  ]);

  return c.json({ sessionToken });
});

export default auth;
