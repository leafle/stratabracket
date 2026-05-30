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

  app.use(
    "*",
    cors({
      origin: (origin, c) => c.env.APP_ORIGIN ?? origin,
      allowHeaders: ["Authorization", "Content-Type"],
      allowMethods: ["GET", "POST", "PUT", "OPTIONS"]
    })
  );

  app.get("/health", (c) => c.json({ ok: true, service: "stratabracket-worker" }));
  app.route("/auth", auth);
  app.route("/pools", pools);
  app.route("/pools", entries);
  app.route("/pools", bracket);
  app.route("/pools", scores);
  app.route("/", scores);

  return app;
}
