import { describe, expect, it, vi } from "vitest";
import { sendMagicLinkEmail } from "./email";
import type { Env } from "../types";

describe("sendMagicLinkEmail", () => {
  it("sends magic links through the Cloudflare Email binding", async () => {
    const send = vi.fn().mockResolvedValue({ messageId: "msg_123" });
    const env = { EMAIL: { send } } as unknown as Env;

    await sendMagicLinkEmail(env, "player@example.com", "https://sb.smyth.dev/api/auth/verify?token=abc");

    expect(send).toHaveBeenCalledWith({
      from: { email: "login@smyth.dev", name: "StrataBracket" },
      to: "player@example.com",
      subject: "Your StrataBracket sign-in link",
      html: '<p>Use this link to sign in to StrataBracket:</p><p><a href="https://sb.smyth.dev/api/auth/verify?token=abc">Sign in</a></p>',
      text: "Use this link to sign in to StrataBracket: https://sb.smyth.dev/api/auth/verify?token=abc"
    });
  });

  it("skips sending when the email binding is unavailable", async () => {
    await expect(sendMagicLinkEmail({} as Env, "player@example.com", "https://sb.smyth.dev")).resolves.toBeUndefined();
  });
});
