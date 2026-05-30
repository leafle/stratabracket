# StrataBracket — World Cup Pool App Spec
### AI-Powered Bracket Generation via Natural Language Strategy

---

## 1. Product Overview

**StrataBracket** is a World Cup bracket pool app where participants don't pick winners game-by-game — they articulate their *strategy* in plain English and the AI generates a complete bracket from it. Strategies can be layered and refined after seeing the resulting bracket. The experience rewards insight and creativity, not just luck.

**Core Differentiator:** You predict *why* teams will win, not just *who* will win. The AI translates your football philosophy into picks.

---

## 2. Key User Flows

### 2.1 Pool Creation (Commissioner)
1. Create a pool with a name, entry deadline, and scoring rules
2. Invite participants via link or email
3. Set optional house rules (max bracket refinements, strategy character limit, etc.)
4. Configure the scoring system (see §6)

### 2.2 Bracket Entry (Participant)
1. **Write your strategy** — free-text field, natural language, no structure required
   - Example: *"South American teams always outperform their seedings in knockout rounds. European defenses will choke in the heat."*
2. **Generate bracket** — AI interprets the strategy and fills out the complete bracket
3. **Review results** — see the full bracket with AI-generated reasoning for each pick
4. **Optionally refine** — modify the strategy and regenerate as many times as desired; this is a free-form drafting loop with no history tracked
5. **Lock in** — submit the final bracket before the first game kicks off; no changes allowed after submission

### 2.3 Tournament Phase
- Scores update automatically as real matches conclude
- Live leaderboard shows standings
- Per-round breakdowns show who's still alive and by how much

---

## 3. AI Strategy Engine

### 3.1 Input: Strategy Statements
Participants write strategies as free-form text. The AI should handle:
- **Team-level predictions:** *"Brazil will make the final"*
- **Regional biases:** *"African teams are underrated this cycle"*
- **Tactical/stylistic beliefs:** *"Counter-attacking teams will beat possession-heavy sides"*
- **Upset theories:** *"I expect at least two top-8 seeds to go out in the Round of 16"*
- **Meta-strategies:** *"I'm always picking the host nation to go one round further than expected"*
- **Contradictions and specificity:** If a strategy has internal contradictions, the AI should note them and make a reasoned resolution rather than silently pick one

### 3.2 Output: Generated Bracket + Reasoning
For every match in the bracket, the AI outputs:
- **Winner pick**
- **Confidence level** (high / medium / low) — derived from how strongly the strategy implies this outcome
- **One-sentence rationale** linking the pick back to the user's stated strategy
  - Example: *"Argentina advances (high confidence) — your South American uplift theory makes them strong favorites in this quarterfinal."*

### 3.3 Handling Ambiguity
When a strategy doesn't clearly resolve a matchup:
- Fall back to FIFA rankings, adjusted by any applicable strategy modifiers
- Flag the match as a "default pick" so the user knows their strategy didn't cover it
- Encourage them to refine

### 3.4 Strategy Refinement
- Participants can freely edit their strategy and regenerate their bracket as many times as they want before submitting
- The AI should acknowledge what changed in the new generation: *"You added that Spain will win it all. This changed 3 picks: Spain now advances past France in the semis, and the final."*
- Once submitted, the bracket and strategy are locked — no further changes

---

## 4. Data Model

### 4.1 Pool
```
id, name, commissioner_id, entry_deadline, lock_time,
scoring_config, status (open/active/complete)
```

### 4.2 Entry
```
id, pool_id, user_id, strategy_text,
bracket_picks: [ { match_id, pick_team_id, confidence, rationale } ],
score (computed), status (draft/submitted)
```

### 4.3 Match
```
id, round, slot, team_a_id, team_b_id, winner_id (null until played),
scheduled_time, actual_result
```

### 4.4 User
```
id, display_name, email, avatar
```

---

## 5. Screens & UX

### 5.1 Strategy Input Page
- Large, open writing area — feels like a notepad, not a form
- Character count and optional prompt suggestions ("What do you believe about this tournament that others might not?")
- "Generate My Bracket" CTA
- **No bracket UI is shown until after generation** — keeps focus on the strategy

### 5.2 Bracket Review Page
- Standard bracket visualization (left-to-right rounds)
- Each match node shows:
  - Winning team picked
  - Confidence indicator (color-coded dot or bar)
  - On hover/tap: the AI rationale sentence
- Picks that are "default" (not driven by strategy) are visually distinguishable
- Summary panel: *"Your strategy produced X high-confidence picks, Y medium, Z defaults."*
- Refinement panel: shows current strategy text; participant can edit and regenerate freely until they submit

### 5.3 Leaderboard
- Real-time rankings
- Points earned vs. points possible
- "Alive in tournament" indicator (are any of your final picks still possible?)
- Strategy previews visible to all participants (post-deadline)

### 5.4 Match Detail
- Who picked whom across all pool participants
- Consensus vs. contrarian picks highlighted
- After result: who gained/lost points

### 5.5 Commissioner Dashboard
- Pool status, entry count, submission rate
- Lock pool / force-close entries
- Scoring rule configuration

---

## 6. Scoring

### 6.1 Base System
| Round | Points per correct pick |
|---|---|
| Round of 32 (Group Stage) | 1 |
| Round of 16 | 2 |
| Quarterfinals | 4 |
| Semifinals | 8 |
| Final | 16 |
| Champion | 32 |

### 6.2 Confidence Multiplier (Optional Rule)
If enabled by commissioner: picks marked high confidence by the AI earn 1.5× points if correct, but 0 if wrong (vs. no-penalty wrong picks at normal confidence).

This rewards strategies that make bold, specific claims and are right.

### 6.3 Strategy Bonus (Optional Rule)
Post-tournament, commissioner can award bonus points (1–5) for most creative, prescient, or entertaining strategy. Adds a human judging layer.

---

## 7. Technical Architecture

### 7.1 Frontend
- React SPA (or Next.js for SSR on leaderboard/public pages)
- Bracket visualization: custom SVG component or a library like `react-bracket`
- Real-time updates: WebSocket or Server-Sent Events for live score changes

### 7.2 Backend
- REST + WebSocket API
- Auth: OAuth (Google/Apple) or magic link email
- Database: PostgreSQL (relational structure suits bracket/pool data well)

### 7.3 AI Layer
- **Model:** Claude (via Anthropic API) with a structured prompt
- **Prompt design:** System prompt encodes all 32 teams, current group draw, FIFA rankings, and any tournament-specific context (host nation, injury news if available). User strategy is injected as the variable input.
- **Output format:** Structured JSON — one object per match with `winner_id`, `confidence`, `rationale`
- **Caching:** Cache bracket generation per (strategy_hash, tournament_state) — regeneration only if strategy or group results have changed

### 7.4 Tournament Data
- Source match schedule and results from an open football data API (e.g., football-data.org, API-Football)
- Webhook or polling to update match results and trigger score recalculations

---

## 8. Strategy Display & Social Features

### 8.1 Strategy Cards
After the deadline, each participant's strategy is revealed as a "card" visible to the pool. Encourages reading and trash talk.

### 8.2 Consensus Map
Visualization showing: for each match, what % of pool participants picked each team, and what the dominant *reasoning themes* were (grouped by AI topic extraction from strategies).

### 8.3 Strategy Hall of Fame
Post-tournament: highlight the strategy that scored highest, the most contrarian strategy, and the most entertaining one (commissioner's pick).

---

## 9. Edge Cases & Rules

| Scenario | Handling |
|---|---|
| Strategy mentions a team not in the tournament | AI flags it, asks for clarification or ignores |
| Strategy is too vague to produce any picks | AI generates a default bracket and prompts refinement |
| User submits after first game kicks off | Entry rejected; read-only view of their draft |
| Tournament match postponed | Picks preserved; scoring delayed |
| AI generates a clearly wrong rationale | User can flag it; commissioner can void a pick (manual override) |

---

## 10. MVP vs. Full Launch Scope

### MVP (v1)
- Single pool per commissioner
- Strategy input + unlimited pre-submission refinements
- Manual score entry by commissioner (no live API)
- Leaderboard
- Basic bracket visualization

### v2 (Post-launch)
- Multiple pools per user
- Live match data integration
- Confidence multiplier scoring
- Consensus map visualization
- Mobile-native apps

### v3
- Public pools / open enrollment
- Strategy Hall of Fame
- Social sharing (bracket + strategy card as image)
- AI strategy suggestions / prompts to help less creative users

---

## 11. Open Questions for Stakeholders

1. **Should strategies be public before the deadline?** (Encourages counter-strategizing vs. privacy until lock)
2. **Is confidence multiplier scoring opt-in per-pool or globally on/off?**
3. **Do we want a mobile app at launch or just a responsive web app?**
4. **What's the authentication story — social login only, or email/password too?**
5. **Should AI rationale be generated per-match or summarized at a round level?**
