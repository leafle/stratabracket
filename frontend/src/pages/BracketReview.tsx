import { Check, RefreshCw } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import BracketViz from "../components/BracketViz";
import { summarizePicks } from "../components/bracketSummary";

const demoPicks = [
  { matchSlot: "R16-1", winnerId: "Argentina", confidence: "high" as const, rationale: "Your South American pressure theory strongly favors Argentina here." },
  { matchSlot: "R16-2", winnerId: "France", confidence: "default" as const, rationale: "Default pick by FIFA ranking because the strategy did not clearly resolve this matchup." },
  { matchSlot: "QF-1", winnerId: "Argentina", confidence: "medium" as const, rationale: "The strategy still favors Argentina, though the opposition quality lowers confidence." },
  { matchSlot: "SF-1", winnerId: "Spain", confidence: "medium" as const, rationale: "Spain advances because the strategy trusts elite European defenses late." },
  { matchSlot: "F", winnerId: "Spain", confidence: "low" as const, rationale: "Elite European defensive structure edges a close final." }
];

export default function BracketReview() {
  const { poolId = "pool_demo" } = useParams();
  const summary = summarizePicks(demoPicks);

  return (
    <main className="page review-page">
      <section className="review-header">
        <div>
          <p className="eyebrow">Bracket review</p>
          <h1>Your generated bracket</h1>
        </div>
        <div className="review-actions">
          <Link className="secondary-action" to={`/pools/${poolId}/entry`}>
            <RefreshCw size={18} /> Refine
          </Link>
          <button className="primary-action">
            <Check size={18} /> Submit
          </button>
        </div>
      </section>

      <section className="summary-strip" aria-label="Confidence summary">
        <span><strong>{summary.high}</strong> high</span>
        <span><strong>{summary.medium}</strong> medium</span>
        <span><strong>{summary.low}</strong> low</span>
        <span><strong>{summary.default}</strong> defaults</span>
      </section>

      <BracketViz picks={demoPicks} />
    </main>
  );
}
