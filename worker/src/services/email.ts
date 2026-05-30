import type { Env } from "../types";

export async function sendMagicLinkEmail(env: Env, email: string, magicLinkUrl: string): Promise<void> {
  if (!env.EMAIL_API_KEY) return;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.EMAIL_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "StrataBracket <login@stratabracket.app>",
      to: email,
      subject: "Your StrataBracket sign-in link",
      html: `<p>Use this link to sign in to StrataBracket:</p><p><a href="${magicLinkUrl}">Sign in</a></p>`
    })
  });

  if (!response.ok) {
    throw new Error(`Email provider failed with status ${response.status}`);
  }
}
