import { describe, expect, it } from "vitest";

const API_BASE = process.env.TEST_API_BASE ?? "http://127.0.0.1:8787";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers
    }
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} failed with ${response.status}: ${JSON.stringify(body)}`);
  }

  return body as T;
}

async function signIn() {
  const magic = await request<{ devMagicLink: string }>("/auth/magic-link", {
    method: "POST",
    body: JSON.stringify({ email: "integration@example.com", displayName: "Integration User" })
  });
  const token = new URL(magic.devMagicLink).searchParams.get("token");
  expect(token).toBeTruthy();

  const session = await request<{ sessionToken: string }>(`/auth/verify?token=${token}`);
  expect(session.sessionToken).toBeTruthy();

  return session.sessionToken;
}

describe("worker integration flow", () => {
  it("authenticates, creates a pool, generates picks, submits, and lists the leaderboard", async () => {
    const sessionToken = await signIn();
    const authHeaders = { Authorization: `Bearer ${sessionToken}` };

    const pool = await request<{ id: string }>("/pools", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: "Integration Pool",
        lockTime: Math.floor(Date.now() / 1000) + 86_400,
        scoringConfig: { highConfidenceMultiplier: true, strategyBonus: false }
      })
    });
    expect(pool.id).toMatch(/^pool_/);

    await expect(
      request(`/pools/${pool.id}/entry/strategy`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ strategyText: "Prefer top FIFA-ranked teams unless a matchup is close." })
      })
    ).resolves.toEqual({ ok: true });

    const generated = await request<{ picks: Array<{ matchSlot: string; winnerId: string; confidence: string }> }>(
      `/pools/${pool.id}/entry/generate`,
      { method: "POST", headers: authHeaders }
    );
    expect(generated.picks.length).toBeGreaterThan(8);
    expect(generated.picks[0]).toMatchObject({ matchSlot: "R32-73", winnerId: "ga_runner_up", confidence: "default" });

    await expect(request(`/pools/${pool.id}/entry/submit`, { method: "POST", headers: authHeaders })).resolves.toEqual({
      ok: true
    });

    const leaderboard = await request<{ leaderboard: Array<{ display_name: string; score: number }> }>(
      `/${pool.id}/leaderboard`,
      { headers: authHeaders }
    );
    expect(leaderboard.leaderboard).toEqual([{ id: expect.any(String), score: 0, display_name: "Integration User", strategy_text: expect.any(String) }]);
  });
});
