import type { Env } from "../types";

const sender = { email: "login@smyth.dev", name: "StrataBracket" };

export async function sendMagicLinkEmail(env: Env, email: string, magicLinkUrl: string): Promise<void> {
  if (!env.EMAIL) return;

  await env.EMAIL.send({
    from: sender,
    to: email,
    subject: "Your StrataBracket sign-in link",
    html: `<p>Use this link to sign in to StrataBracket:</p><p><a href="${magicLinkUrl}">Sign in</a></p>`,
    text: `Use this link to sign in to StrataBracket: ${magicLinkUrl}`
  });
}
