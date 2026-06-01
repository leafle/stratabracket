import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { apiRequest } from "../api";

const sessionKey = "stratabracket.session";
const returnToKey = "stratabracket.returnTo";

export function hasSession() {
  return Boolean(localStorage.getItem(sessionKey));
}

export default function AuthGate({ children, title = "Enter your bracket" }: { children: ReactNode; title?: string }) {
  const [signedIn, setSignedIn] = useState(hasSession);

  if (!signedIn) {
    return <SignInRequired title={title} onSignedIn={() => setSignedIn(true)} />;
  }

  return <>{children}</>;
}

function SignInRequired({ onSignedIn, title }: { onSignedIn: () => void; title: string }) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState("Sign in to create, join, and enter pools.");
  const [devMagicLink, setDevMagicLink] = useState<string | null>(null);

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Sending sign-in link");
    setDevMagicLink(null);
    sessionStorage.setItem(returnToKey, window.location.pathname);

    try {
      const response = await apiRequest<{ devMagicLink?: string }>("/auth/magic-link", {
        method: "POST",
        body: JSON.stringify({ email, displayName: displayName || undefined })
      });
      setDevMagicLink(response.devMagicLink ? frontendVerifyUrl(response.devMagicLink) : null);
      setStatus("Check your email for a sign-in link.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to send sign-in link");
    }
  }

  return (
    <main className="page strategy-page">
      <section className="auth-panel" aria-label="Sign in">
        <div>
          <p className="eyebrow">Sign in</p>
          <h1>{title}</h1>
        </div>
        <form className="auth-form" onSubmit={sendMagicLink}>
          <label>
            Email address
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required aria-label="Email address" />
          </label>
          <label>
            Display name
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={80} aria-label="Display name" />
          </label>
          <button className="primary-action" type="submit">Send Sign-In Link</button>
        </form>
        <p className="auth-status">{status}</p>
        {devMagicLink ? (
          <a className="secondary-action" href={devMagicLink}>
            Open development sign-in link
          </a>
        ) : null}
        {hasSession() ? (
          <button className="secondary-action" type="button" onClick={onSignedIn}>
            Continue
          </button>
        ) : null}
      </section>
    </main>
  );
}

function frontendVerifyUrl(magicLinkUrl: string) {
  const url = new URL(magicLinkUrl);
  return `/auth/verify?token=${encodeURIComponent(url.searchParams.get("token") ?? "")}`;
}
