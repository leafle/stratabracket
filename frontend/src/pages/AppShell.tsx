import { Trophy } from "lucide-react";
import { Link, Outlet } from "react-router-dom";

export default function AppShell() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <Trophy size={22} aria-hidden />
          <span>StrataBracket</span>
        </Link>
        <nav>
          <Link to="/">Pools</Link>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
