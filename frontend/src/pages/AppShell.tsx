import { Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

const sessionKey = "stratabracket.session";

export default function AppShell() {
  const location = useLocation();
  const [hasSession, setHasSession] = useState(() => Boolean(localStorage.getItem(sessionKey)));

  useEffect(() => {
    setHasSession(Boolean(localStorage.getItem(sessionKey)));
  }, [location]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <Trophy size={22} aria-hidden />
          <span>StrataBracket</span>
        </Link>
        <nav>{hasSession ? <Link to="/">Pools</Link> : null}</nav>
      </header>
      <Outlet />
    </div>
  );
}
