import { afterEach, describe, expect, it, vi } from "vitest";
import { sendMagicLinkEmail } from "./email";
import type { Env } from "../types";

describe("sendMagicLinkEmail", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends magic links through Resend", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const env = { RESEND_API_KEY: "re_123" } as Env;

    await sendMagicLinkEmail(env, "player@example.com", "https://sb.smyth.dev/api/auth/verify?token=abc");

    expect(fetch).toHaveBeenCalledWith("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer re_123",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "StrataBracket <login@smyth.dev>",
        to: "player@example.com",
        subject: "Your StrataBracket sign-in link",
        html: '<p>Use this link to sign in to StrataBracket:</p><p><a href="https://sb.smyth.dev/api/auth/verify?token=abc">Sign in</a></p>',
        text: "Use this link to sign in to StrataBracket: https://sb.smyth.dev/api/auth/verify?token=abc"
      })
    });
  });

  it("skips sending when the Resend API key is unavailable", async () => {
    await expect(sendMagicLinkEmail({} as Env, "player@example.com", "https://sb.smyth.dev")).resolves.toBeUndefined();
  });

  it("throws when Resend rejects the email", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

    await expect(
      sendMagicLinkEmail({ RESEND_API_KEY: "re_123" } as Env, "player@example.com", "https://sb.smyth.dev")
    ).rejects.toThrow("Email provider failed with status 401");
  });
});
