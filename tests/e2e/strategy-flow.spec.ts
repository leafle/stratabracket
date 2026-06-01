import { expect, test } from "@playwright/test";

const API_BASE = process.env.TEST_API_BASE ?? "http://127.0.0.1:8787";

test("a signed-in user can generate a bracket from the SPA", async ({ page, request }) => {
  const runId = Date.now().toString(36);
  const browserPoolName = `Browser Pool ${runId}`;
  const joinablePoolName = `Joinable Pool ${runId}`;
  const setupMagicResponse = await request.post(`${API_BASE}/auth/magic-link`, {
    data: { email: "setup-e2e@example.com", displayName: "Setup User" }
  });
  expect(setupMagicResponse.ok()).toBeTruthy();
  const setupMagic = (await setupMagicResponse.json()) as { devMagicLink: string };
  const setupToken = new URL(setupMagic.devMagicLink).searchParams.get("token");
  const setupVerifyResponse = await request.get(`${API_BASE}/auth/verify?token=${setupToken}`);
  const setupSession = (await setupVerifyResponse.json()) as { sessionToken: string };

  const joinablePoolResponse = await request.post(`${API_BASE}/pools`, {
    headers: { Authorization: `Bearer ${setupSession.sessionToken}` },
    data: { name: joinablePoolName, lockTime: Math.floor(Date.now() / 1000) + 86_400, scoringConfig: { highConfidenceMultiplier: false, strategyBonus: false } }
  });
  expect(joinablePoolResponse.ok()).toBeTruthy();
  const joinablePool = (await joinablePoolResponse.json()) as { id: string };

  await page.goto("/");
  await page.getByRole("textbox", { name: "Email address" }).fill("e2e@example.com");
  await page.getByRole("textbox", { name: "Display name" }).fill("E2E User");
  await page.getByRole("button", { name: "Send Sign-In Link" }).click();
  await page.getByRole("link", { name: "Open development sign-in link" }).click();
  await expect(page.getByText("Signed in")).toBeVisible();
  await page.getByRole("link", { name: "Continue" }).click();

  await page.getByRole("textbox", { name: "Pool name" }).fill(browserPoolName);
  await page.getByRole("button", { name: "Create Pool" }).click();
  await expect(page.getByRole("heading", { name: browserPoolName })).toBeVisible();

  await page.getByRole("textbox", { name: "Pool ID" }).fill(joinablePool.id);
  await page.getByRole("button", { name: "Join Pool" }).click();
  await expect(page.getByRole("heading", { name: joinablePoolName })).toBeVisible();

  await page.getByRole("link", { name: `Enter ${browserPoolName}` }).click();
  await expect(page.getByRole("textbox", { name: "Tournament strategy" })).toBeVisible();
  await page.getByRole("textbox", { name: "Tournament strategy" }).fill("Trust top-ranked teams and avoid risky upsets.");
  await page.getByRole("button", { name: "Generate My Bracket" }).click();

  await expect(page).toHaveURL(new RegExp("/pools/pool_.+/review$"));
  await expect(page.getByRole("heading", { name: "Your generated bracket" })).toBeVisible();
});
