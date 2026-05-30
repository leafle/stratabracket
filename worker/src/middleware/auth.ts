import type { Context, Next } from "hono";
import type { AppVariables, Env } from "../types";

type AppContext = Context<{ Bindings: Env; Variables: AppVariables }>;

export async function requireAuth(c: AppContext, next: Next) {
  const authorization = c.req.header("Authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";

  if (!token) {
    return c.json({ error: "Missing bearer token" }, 401);
  }

  const now = Math.floor(Date.now() / 1000);
  const session = await c.env.DB.prepare(
    `SELECT users.id AS user_id, users.email, users.display_name
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token = ? AND sessions.type = 'session' AND sessions.expires_at > ?`
  )
    .bind(token, now)
    .first<{ user_id: string; email: string; display_name: string }>();

  if (!session) {
    return c.json({ error: "Invalid or expired session" }, 401);
  }

  c.set("user", {
    id: session.user_id,
    email: session.email,
    displayName: session.display_name
  });
  await next();
}
