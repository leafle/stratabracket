import { Wand2 } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api";

const sessionKey = "stratabracket.session";

export default function StrategyEntry() {
  const { poolId = "pool_demo" } = useParams();
  const navigate = useNavigate();
  const [strategyText, setStrategyText] = useState("South American sides get a boost in knockout pressure, but I trust elite European defenses late.");
  const [status, setStatus] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(() => Boolean(localStorage.getItem(sessionKey)));

  if (!hasSession) {
    return <SignInRequired onSignedIn={() => setHasSession(true)} />;
  }

  async function generateBracket() {
    setStatus("Saving strategy");
    try {
      await apiRequest(`/pools/${poolId}/entry/strategy`, {
        method: "PUT",
        body: JSON.stringify({ strategyText })
      });
      setStatus("Generating bracket");
      await apiRequest(`/pools/${poolId}/entry/generate`, { method: "POST" });
      navigate(`/pools/${poolId}/review`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Generation failed");
    }
  }

  return (
    <main className="page strategy-page">
      <section className="strategy-editor">
        <div className="editor-heading">
          <p className="eyebrow">Strategy entry</p>
          <span>{strategyText.length}/4000</span>
        </div>
        <textarea
          value={strategyText}
          onChange={(event) => setStrategyText(event.target.value)}
          maxLength={4000}
          aria-label="Tournament strategy"
        />
        <div className="editor-actions">
          <p>{status ?? "What do you believe about this tournament that others might not?"}</p>
          <button className="primary-action" onClick={generateBracket}>
            <Wand2 size={18} />
            Generate My Bracket
          </button>
        </div>
      </section>
    </main>
  );
}

function SignInRequired({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState("Sign in to save and generate your bracket.");
  const [devMagicLink, setDevMagicLink] = useState<string | null>(null);

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Sending sign-in link");
    setDevMagicLink(null);
    sessionStorage.setItem("stratabracket.returnTo", window.location.pathname);

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
          <h1>Enter your bracket</h1>
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
        {localStorage.getItem(sessionKey) ? (
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
