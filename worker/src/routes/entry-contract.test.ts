import { describe, expect, it } from "vitest";
import { createApp } from "../app";
import type { Env } from "../types";

function createStatementResult(rows: unknown[] = []) {
  return {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn(async () => rows[0] ?? null),
    all: vi.fn(async () => ({ results: rows })),
    run: vi.fn(async () => ({ success: true }))
  };
}

function createDb(rows: Record<string, unknown[]> = {}) {
  return {
    prepare: vi.fn((sql: string) => {
      if (sql.includes("FROM sessions")) return createStatementResult(rows.session);
      if (sql.includes("FROM pools")) return createStatementResult(rows.pool);
      if (sql.includes("FROM entries")) return createStatementResult(rows.entry);
      if (sql.includes("FROM picks")) return createStatementResult(rows.picks);
      if (sql.includes("FROM teams")) return createStatementResult(rows.teams);
      if (sql.includes("FROM matches")) return createStatementResult(rows.matches);
      return createStatementResult([]);
    }),
    batch: vi.fn(async (statements: unknown[]) => {
      if (statements.length === 0) throw new Error("D1_ERROR: No SQL statements detected.");
      return [];
    }),
    exec: vi.fn(async () => ({ count: 0, duration: 0 }))
  } as unknown as D1Database;
}

describe("entry routes", () => {
  it("serves public auth routes through the production /api prefix", async () => {
    const app = createApp();
    const env = { DB: createDb() } as Env;

    const response = await app.request(
      "/api/auth/magic-link",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "player@example.com", displayName: "Player" })
      },
      env
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, message: "Magic link generated" });
  });

  it("rejects strategy updates for submitted entries", async () => {
    const app = createApp();
    const env = {
      DB: createDb({
        session: [{ user_id: "user_1", email: "a@example.com", display_name: "A" }],
        pool: [{ id: "pool_1", lock_time: Date.now() + 60_000, status: "open" }],
        entry: [{ id: "entry_1", submitted: 1 }]
      })
    } as Env;

    const response = await app.request(
      "/pools/pool_1/entry/strategy",
      {
        method: "PUT",
        headers: { Authorization: "Bearer session_token", "Content-Type": "application/json" },
        body: JSON.stringify({ strategyText: "Favor teams with elite midfield depth." })
      },
      env
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "Entry is already submitted" });
  });

  it("returns a clear error when no tournament matches are available for generation", async () => {
    const app = createApp();
    const env = {
      DB: createDb({
        session: [{ user_id: "user_1", email: "a@example.com", display_name: "A" }],
        entry: [{ id: "entry_1", strategy_text: "Trust favorites.", submitted: 0, score: 0 }],
        teams: [],
        matches: []
      })
    } as Env;

    const response = await app.request(
      "/pools/pool_1/entry/generate",
      {
        method: "POST",
        headers: { Authorization: "Bearer session_token" }
      },
      env
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "Tournament data is not loaded" });
  });
});
