import type { PickSummaryInput } from "./bracketSummary";

interface BracketVizProps {
  picks: PickSummaryInput[];
}

const rounds = [
  { name: "Round of 16", prefix: "R16" },
  { name: "Quarterfinals", prefix: "QF" },
  { name: "Semifinals", prefix: "SF" },
  { name: "Final", prefix: "F" }
];

export default function BracketViz({ picks }: BracketVizProps) {
  return (
    <section className="bracket" aria-label="Generated bracket">
      {rounds.map((round) => (
        <div className="round" key={round.name}>
          <h2>{round.name}</h2>
          <div className="match-stack">
            {picks
              .filter((pick) => pick.matchSlot === round.prefix || pick.matchSlot.startsWith(`${round.prefix}-`))
              .map((pick) => (
                <article className={`match-card confidence-${pick.confidence}`} key={pick.matchSlot} title={pick.rationale}>
                  <span>{pick.matchSlot}</span>
                  <strong>{pick.winnerId}</strong>
                  <p>{pick.rationale}</p>
                </article>
              ))}
          </div>
        </div>
      ))}
    </section>
  );
}
