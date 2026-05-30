import { ArrowRight, Plus } from "lucide-react";
import { Link } from "react-router-dom";

const demoPools = [{ id: "pool_demo", name: "World Cup Friends Pool", status: "Open", entries: 18 }];

export default function Home() {
  return (
    <main className="page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">AI-powered bracket pool</p>
          <h1>Write the strategy. Let the bracket follow.</h1>
        </div>
        <button className="icon-button" aria-label="Create pool">
          <Plus size={20} />
        </button>
      </section>

      <section className="pool-list" aria-label="Pools">
        {demoPools.map((pool) => (
          <article className="pool-row" key={pool.id}>
            <div>
              <h2>{pool.name}</h2>
              <p>{pool.status} · {pool.entries} entries</p>
            </div>
            <Link className="primary-action" to={`/pools/${pool.id}/entry`}>
              Enter <ArrowRight size={18} />
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
