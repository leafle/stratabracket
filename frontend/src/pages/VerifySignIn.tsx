import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../api";

const sessionKey = "stratabracket.session";
const returnToKey = "stratabracket.returnTo";

export default function VerifySignIn() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("Verifying sign-in link");
  const [returnTo, setReturnTo] = useState(sessionStorage.getItem(returnToKey) ?? "/");
  const verified = useRef(false);

  useEffect(() => {
    if (verified.current) return;
    verified.current = true;

    const token = searchParams.get("token");
    if (!token) {
      setStatus("Token is required");
      return;
    }

    apiRequest<{ sessionToken: string }>(`/auth/verify?token=${encodeURIComponent(token)}`)
      .then((response) => {
        localStorage.setItem(sessionKey, response.sessionToken);
        const path = sessionStorage.getItem(returnToKey) ?? "/";
        sessionStorage.removeItem(returnToKey);
        setReturnTo(path);
        setStatus("Signed in");
      })
      .catch((error) => {
        setStatus(error instanceof Error ? error.message : "Unable to verify sign-in link");
      });
  }, [searchParams]);

  return (
    <main className="page strategy-page">
      <section className="auth-panel" aria-label="Sign-in status">
        <p className="eyebrow">Authentication</p>
        <h1>{status}</h1>
        {status === "Signed in" ? (
          <Link className="primary-action" to={returnTo}>
            Continue
          </Link>
        ) : null}
      </section>
    </main>
  );
}
