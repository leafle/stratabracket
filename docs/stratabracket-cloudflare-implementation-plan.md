# StrataBracket — Cloudflare Implementation Plan

---

## 1. Platform Summary

The entire app runs on Cloudflare's developer platform. No external servers, no VMs, no Docker. Every component maps to a managed Cloudflare product.

| Layer | Cloudflare Product |
|---|---|
| Frontend | Cloudflare Pages |
| API | Workers (Hono framework) |
| Database | D1 (SQLite at the edge) — sessions, pools, brackets, everything |
| AI bracket generation | Anthropic API (external call from Worker) |
| Static assets | Pages (unlimited, free) |

---

## 2. Cost Reality Check

### Free tier is viable for a friend-group pool (< ~100 participants)

| Product | Free Allowance | Notes |
|---|---|---|
| Pages | Unlimited bandwidth | Static assets always free |
| Workers | 100K requests/day | ~3K req/day for 50 users, well within limits |
| D1 | 5M reads + 5M writes/month, 5 GB storage | Handles all data including sessions |

**Verdict:** Free tier comfortably handles a private pool with up to ~100 active users. The only cost is the **Anthropic API** for bracket generation — a few cents per user total.

### If you grow beyond a friend group → Workers Paid at $5/month

Unlocks higher D1 limits and is the right call for a public or large pool. Anthropic API costs remain the only variable cost worth tracking.

---

## 3. Architecture

```
Browser
  │
  ▼
Cloudflare Pages (React SPA)
  │  static HTML/JS/CSS served from edge
  │
  ▼  API calls
Cloudflare Worker (Hono router)
  ├── D1 Database     ← everything: sessions, pools, entries, brackets, matches
  └── Anthropic API   ← bracket generation (external fetch)
```

### Why Hono?
Lightweight router built for Workers. Express-style routing with zero overhead, first-class TypeScript support, and middleware for auth, CORS, and validation.

---

## 4. Project Structure

```
stratabracket/
├── frontend/                  # React SPA → deploys to Pages
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── StrategyEntry.tsx   # the main UX
│   │   │   ├── BracketReview.tsx
│   │   │   └── Leaderboard.tsx
│   │   └── components/
│   │       ├── BracketViz.tsx
│   │       ├── StrategyEditor.tsx
│   │       └── MatchCard.tsx
│
├── worker/                    # Cloudflare Worker → API
│   ├── src/
│   │   ├── index.ts           # Hono app entrypoint
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── pools.ts
│   │   │   ├── entries.ts     # strategy submit + bracket gen
│   │   │   ├── bracket.ts
│   │   │   └── scores.ts
│   │   └── services/
│   │       ├── ai.ts          # Anthropic API integration
│   │       └── scoring.ts
│   ├── schema.sql             # D1 schema
│   └── wrangler.toml
```

---

## 5. Database Schema (D1)

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,          -- nanoid
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Magic link tokens and sessions both live here
CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  type TEXT NOT NULL,           -- 'magic_link' | 'session'
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE pools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  commissioner_id TEXT NOT NULL REFERENCES users(id),
  lock_time INTEGER NOT NULL,   -- unix timestamp; first game kickoff
  scoring_config TEXT NOT NULL, -- JSON
  status TEXT NOT NULL DEFAULT 'open', -- open | active | complete
  created_at INTEGER NOT NULL
);

CREATE TABLE pool_members (
  pool_id TEXT NOT NULL REFERENCES pools(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (pool_id, user_id)
);

CREATE TABLE entries (
  id TEXT PRIMARY KEY,
  pool_id TEXT NOT NULL REFERENCES pools(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  strategy_text TEXT,
  submitted INTEGER NOT NULL DEFAULT 0, -- 0 = draft, 1 = submitted
  score INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  UNIQUE(pool_id, user_id)
);

CREATE TABLE picks (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES entries(id),
  match_slot TEXT NOT NULL,     -- e.g. "QF1", "SF2", "F"
  team_id TEXT NOT NULL,
  confidence TEXT NOT NULL,     -- high | medium | low | default
  rationale TEXT NOT NULL,
  UNIQUE(entry_id, match_slot)
);

CREATE TABLE matches (
  id TEXT PRIMARY KEY,
  round TEXT NOT NULL,
  slot TEXT NOT NULL UNIQUE,
  team_a_id TEXT,
  team_b_id TEXT,
  winner_id TEXT,
  scheduled_time INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' -- pending | live | complete
);

CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  fifa_ranking INTEGER,
  confederation TEXT            -- UEFA | CONMEBOL | CAF | etc.
);

-- Index for frequent session lookups
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

A scheduled Worker runs nightly to delete expired sessions:
```sql
DELETE FROM sessions WHERE expires_at < unixepoch();
```

---

## 6. Worker API Routes

```
POST /auth/magic-link          # generate token in D1, send email
GET  /auth/verify?token=...    # exchange magic link token for session token

GET  /pools                    # list pools user belongs to
POST /pools                    # create pool (commissioner)
GET  /pools/:id                # pool detail + member list
POST /pools/:id/join           # join via invite link

GET  /pools/:id/entry          # get current user's entry (draft or submitted)
PUT  /pools/:id/entry/strategy # save strategy text (draft only)
POST /pools/:id/entry/generate # call Anthropic API, return bracket picks
POST /pools/:id/entry/submit   # lock entry; fails after lock_time

GET  /pools/:id/leaderboard    # current standings (polled every 60s client-side)
GET  /pools/:id/brackets       # all submitted brackets (post-lock only)

POST /admin/matches/:id/result # commissioner: record match result
```

---

## 7. AI Bracket Generation (Worker → Anthropic)

The `/entry/generate` endpoint is the core of the app. The Worker calls the Anthropic API with a structured prompt and returns picks as JSON, which are upserted into the `picks` table.

### System Prompt Structure

```
You are a World Cup bracket prediction engine.

TOURNAMENT CONTEXT:
- 32 teams, group stage complete, knockout bracket follows
- Teams: [{ id, name, confederation, fifa_ranking, group_stage_record }]
- Bracket slots: [Round of 16 matchups → QF → SF → Final]

TASK:
Given the user's strategy statement, fill in every match in the knockout bracket.
For each match, output JSON with: winner_id, confidence ("high"|"medium"|"low"|"default"),
rationale (one sentence referencing the user's strategy).

Use "default" confidence and FIFA ranking to resolve any match the strategy does not
clearly address. Flag it as a default pick in the rationale.

Respond ONLY with a JSON array. No prose, no markdown.
```

### Worker code sketch

```typescript
// worker/src/services/ai.ts

export async function generateBracket(
  strategy: string,
  tournamentContext: TournamentContext,
  env: Env
): Promise<Pick[]> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: buildSystemPrompt(tournamentContext),
      messages: [{ role: "user", content: strategy }],
    }),
  });

  const data = await response.json();
  const text = data.content[0].text;
  return JSON.parse(text) as Pick[];
}
```

The Anthropic API key is stored as a **Worker secret** (never in source):
```bash
wrangler secret put ANTHROPIC_API_KEY
```

---

## 8. Auth: Magic Link via Email

No passwords. User enters email → Worker generates a short-lived token → stored in D1 `sessions` table with `type = 'magic_link'` and 15-minute expiry → emailed via Resend (free tier: 3,000 emails/month) → clicking the link exchanges the token for a long-lived session token (7-day expiry, `type = 'session'`).

Auth middleware on every protected route reads the `Authorization: Bearer {token}` header, queries D1 for a valid non-expired session, and injects the user into the request context. The query is a simple indexed primary key lookup — fast enough without KV.

---

## 9. Leaderboard: Polling over WebSocket

The leaderboard page polls `GET /pools/:id/leaderboard` every 60 seconds during active match windows. This is a straightforward D1 query aggregating scores across entries.

No Durable Objects, no WebSockets. Match results only change a few times per day during the tournament — real-time push isn't worth the complexity for this use case.

---

## 10. Deployment

### One-time setup

```bash
npm install -g wrangler
wrangler login

# Create D1 database
wrangler d1 create stratabracket-db

# Apply schema
wrangler d1 execute stratabracket-db --file=./worker/schema.sql

# Set secrets
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put EMAIL_API_KEY
```

### wrangler.toml

```toml
name = "stratabracket-worker"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[[d1_databases]]
binding = "DB"
database_name = "stratabracket-db"
database_id = "<your-d1-id>"

# Nightly cleanup of expired sessions
[[triggers]]
crons = ["0 0 * * *"]

[vars]
ENVIRONMENT = "production"
```

### Pages deployment

```bash
# Connect GitHub repo in Cloudflare dashboard
# Build command: npm run build
# Output directory: dist
# Worker is auto-bound as /api/* via Pages Functions proxy
```

### CI/CD

Connect the GitHub repo to Cloudflare Pages. Every push to `main` deploys the frontend automatically. Worker deploys via:
```bash
wrangler deploy   # or via GitHub Actions
```

---

## 11. Development Workflow

```bash
# Run Worker + D1 locally
wrangler dev --local

# Run frontend dev server (proxies /api to local worker)
npm run dev --prefix frontend

# Run D1 migrations locally
wrangler d1 execute stratabracket-db --local --file=./worker/schema.sql
```

Wrangler's local mode simulates D1 fully in-process — no remote resources needed during development.

---

## 12. Build Phases

### Phase 1 — Foundation (1–2 weeks)
- Wrangler project scaffold
- D1 schema + seed data (32 teams, bracket slots)
- Magic link auth (tokens and sessions in D1)
- Basic Hono routes for pools and entries
- Pages SPA shell with routing

### Phase 2 — Core Feature (1–2 weeks)
- Strategy input UI
- `/entry/generate` endpoint + Anthropic integration
- Bracket visualization component
- Submit + lock logic (check `lock_time` before allowing submit)

### Phase 3 — Tournament Mode (1 week)
- Match result entry (commissioner)
- Scoring calculation on result write
- Leaderboard page with 60s polling
- Post-lock bracket reveal (other participants' strategies visible)

### Phase 4 — Polish (1 week)
- Strategy card display
- Mobile-responsive bracket viz
- Error states (strategy too vague, API failure, past lock time)
- Invite link flow

---

## 13. Cost Estimate

| Scenario | Monthly Cost |
|---|---|
| Private pool, ~30 users, free tier | ~$0 + Anthropic API (~$0.10 total) |
| Private pool, ~100 users, free tier | ~$0 + Anthropic API (~$0.30 total) |
| Public pool, 1K+ users | $5/month (Workers Paid) + Anthropic API (~$3–5) |

**Bottom line: for a friend-group pool, this is effectively free to run.**
