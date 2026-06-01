import { ArrowRight, Plus } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api";
import AuthGate from "../components/AuthGate";

interface Pool {
  id: string;
  name: string;
  status: string;
  lock_time: number;
}

export default function Home() {
  return (
    <AuthGate title="Manage your pools">
      <PoolHome />
    </AuthGate>
  );
}

function PoolHome() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [poolName, setPoolName] = useState("");
  const [joinPoolId, setJoinPoolId] = useState("");
  const [status, setStatus] = useState("Loading pools");

  useEffect(() => {
    void loadPools();
  }, []);

  async function loadPools() {
    try {
      const response = await apiRequest<{ pools: Pool[] }>("/pools");
      setPools(response.pools);
      setStatus(response.pools.length ? "Choose a pool or create a new one." : "Create a pool or join one by ID.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load pools");
    }
  }

  async function createPool(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Creating pool");
    try {
      await apiRequest<{ id: string }>("/pools", {
        method: "POST",
        body: JSON.stringify({
          name: poolName,
          lockTime: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
          scoringConfig: { highConfidenceMultiplier: false, strategyBonus: false }
        })
      });
      setPoolName("");
      await loadPools();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to create pool");
    }
  }

  async function joinPool(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const poolId = joinPoolId.trim();
    if (!poolId) return;
    setStatus("Joining pool");
    try {
      await apiRequest(`/pools/${encodeURIComponent(poolId)}/join`, { method: "POST" });
      setJoinPoolId("");
      await loadPools();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to join pool");
    }
  }

  return (
    <main className="page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">AI-powered bracket pool</p>
          <h1>Write the strategy. Let the bracket follow.</h1>
        </div>
      </section>

      <section className="pool-actions" aria-label="Pool actions">
        <form className="pool-action" onSubmit={createPool}>
          <label>
            Pool name
            <input value={poolName} onChange={(event) => setPoolName(event.target.value)} required maxLength={120} aria-label="Pool name" />
          </label>
          <button className="primary-action" type="submit">
            <Plus size={18} /> Create Pool
          </button>
        </form>

        <form className="pool-action" onSubmit={joinPool}>
          <label>
            Pool ID
            <input value={joinPoolId} onChange={(event) => setJoinPoolId(event.target.value)} required aria-label="Pool ID" />
          </label>
          <button className="secondary-action" type="submit">Join Pool</button>
        </form>
      </section>

      <p className="auth-status">{status}</p>

      <section className="pool-list" aria-label="Pools">
        {pools.map((pool) => (
          <article className="pool-row" key={pool.id}>
            <div>
              <h2>{pool.name}</h2>
              <p>{pool.status} · ID {pool.id}</p>
            </div>
            <Link className="primary-action" to={`/pools/${pool.id}/entry`} aria-label={`Enter ${pool.name}`}>
              Enter <ArrowRight size={18} />
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
