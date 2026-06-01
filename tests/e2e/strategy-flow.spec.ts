import { expect, test } from "@playwright/test";

const API_BASE = process.env.TEST_API_BASE ?? "http://127.0.0.1:8787";

test("a signed-in user can generate a bracket from the SPA", async ({ page, request }) => {
  const setupMagicResponse = await request.post(`${API_BASE}/auth/magic-link`, {
    data: { email: "setup-e2e@example.com", displayName: "Setup User" }
  });
  expect(setupMagicResponse.ok()).toBeTruthy();
  const setupMagic = (await setupMagicResponse.json()) as { devMagicLink: string };
  const setupToken = new URL(setupMagic.devMagicLink).searchParams.get("token");
  const setupVerifyResponse = await request.get(`${API_BASE}/auth/verify?token=${setupToken}`);
  const setupSession = (await setupVerifyResponse.json()) as { sessionToken: string };

  const poolResponse = await request.post(`${API_BASE}/pools`, {
    headers: { Authorization: `Bearer ${setupSession.sessionToken}` },
    data: { name: "Browser Pool", lockTime: Math.floor(Date.now() / 1000) + 86_400, scoringConfig: { highConfidenceMultiplier: false, strategyBonus: false } }
  });
  expect(poolResponse.ok()).toBeTruthy();
  const pool = (await poolResponse.json()) as { id: string };

  await page.goto(`/pools/${pool.id}/entry`);
  await page.getByRole("textbox", { name: "Email address" }).fill("e2e@example.com");
  await page.getByRole("textbox", { name: "Display name" }).fill("E2E User");
  await page.getByRole("button", { name: "Send Sign-In Link" }).click();
  await page.getByRole("link", { name: "Open development sign-in link" }).click();
  await expect(page.getByText("Signed in")).toBeVisible();
  await page.getByRole("link", { name: "Continue" }).click();

  await expect(page.getByRole("textbox", { name: "Tournament strategy" })).toBeVisible();
  await page.getByRole("textbox", { name: "Tournament strategy" }).fill("Trust top-ranked teams and avoid risky upsets.");
  await page.getByRole("button", { name: "Generate My Bracket" }).click();

  await expect(page).toHaveURL(new RegExp(`/pools/${pool.id}/review$`));
  await expect(page.getByRole("heading", { name: "Your generated bracket" })).toBeVisible();
});
