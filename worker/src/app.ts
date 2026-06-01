import { Hono } from "hono";
import { cors } from "hono/cors";
import auth from "./routes/auth";
import bracket from "./routes/bracket";
import entries from "./routes/entries";
import pools from "./routes/pools";
import scores from "./routes/scores";
import type { AppVariables, Env } from "./types";

export function createApp() {
  const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();
  const api = new Hono<{ Bindings: Env; Variables: AppVariables }>();

  app.use(
    "*",
    cors({
      origin: (origin, c) => c.env.APP_ORIGIN ?? origin,
      allowHeaders: ["Authorization", "Content-Type"],
      allowMethods: ["GET", "POST", "PUT", "OPTIONS"]
    })
  );

  api.get("/health", (c) => c.json({ ok: true, service: "stratabracket-worker" }));
  api.route("/auth", auth);
  api.route("/pools", pools);
  api.route("/pools", entries);
  api.route("/pools", bracket);
  api.route("/pools", scores);
  api.route("/", scores);

  app.route("/", api);
  app.route("/api", api);

  return app;
}
