import { expect, test } from "@playwright/test";

const API_BASE = process.env.TEST_API_BASE ?? "http://127.0.0.1:8787";

test("a signed-in user can generate a bracket from the SPA", async ({ page, request }) => {
  const magicResponse = await request.post(`${API_BASE}/auth/magic-link`, {
    data: { email: "e2e@example.com", displayName: "E2E User" }
  });
  expect(magicResponse.ok()).toBeTruthy();
  const magic = (await magicResponse.json()) as { devMagicLink: string };
  const token = new URL(magic.devMagicLink).searchParams.get("token");
  expect(token).toBeTruthy();

  const verifyResponse = await request.get(`${API_BASE}/auth/verify?token=${token}`);
  expect(verifyResponse.ok()).toBeTruthy();
  const session = (await verifyResponse.json()) as { sessionToken: string };

  const poolResponse = await request.post(`${API_BASE}/pools`, {
    headers: { Authorization: `Bearer ${session.sessionToken}` },
    data: {
      name: "Browser Pool",
      lockTime: Math.floor(Date.now() / 1000) + 86_400,
      scoringConfig: { highConfidenceMultiplier: false, strategyBonus: false }
    }
  });
  expect(poolResponse.ok()).toBeTruthy();
  const pool = (await poolResponse.json()) as { id: string };

  await page.addInitScript((sessionToken) => {
    localStorage.setItem("stratabracket.session", sessionToken);
  }, session.sessionToken);

  await page.goto(`/pools/${pool.id}/entry`);
  await expect(page.getByRole("textbox", { name: "Tournament strategy" })).toBeVisible();
  await page.getByRole("textbox", { name: "Tournament strategy" }).fill("Trust top-ranked teams and avoid risky upsets.");
  await page.getByRole("button", { name: "Generate My Bracket" }).click();

  await expect(page).toHaveURL(new RegExp(`/pools/${pool.id}/review$`));
  await expect(page.getByRole("heading", { name: "Your generated bracket" })).toBeVisible();
});
