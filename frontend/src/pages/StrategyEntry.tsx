import { Wand2 } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api";

export default function StrategyEntry() {
  const { poolId = "pool_demo" } = useParams();
  const navigate = useNavigate();
  const [strategyText, setStrategyText] = useState("South American sides get a boost in knockout pressure, but I trust elite European defenses late.");
  const [status, setStatus] = useState<string | null>(null);

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
