const rows = [
  { rank: 1, name: "Avery", score: 28, possible: 92, alive: "Champion alive" },
  { rank: 2, name: "Morgan", score: 24, possible: 88, alive: "Finalist alive" },
  { rank: 3, name: "Casey", score: 18, possible: 76, alive: "Semifinalist alive" }
];

export default function Leaderboard() {
  return (
    <main className="page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Live standings</p>
          <h1>Leaderboard</h1>
        </div>
      </section>
      <table className="leaderboard">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Score</th>
            <th>Possible</th>
            <th>Alive</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td>{row.rank}</td>
              <td>{row.name}</td>
              <td>{row.score}</td>
              <td>{row.possible}</td>
              <td>{row.alive}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
