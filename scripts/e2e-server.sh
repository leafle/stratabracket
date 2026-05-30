#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKER_PORT="${WORKER_PORT:-8787}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
WORKER_LOG="${TMPDIR:-/tmp}/stratabracket-worker-e2e.log"
FRONTEND_LOG="${TMPDIR:-/tmp}/stratabracket-frontend-e2e.log"
WORKER_PID=""
FRONTEND_PID=""

cleanup() {
  if [[ -n "$FRONTEND_PID" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null || true
    wait "$FRONTEND_PID" 2>/dev/null || true
  fi
  if [[ -n "$WORKER_PID" ]] && kill -0 "$WORKER_PID" 2>/dev/null; then
    kill "$WORKER_PID" 2>/dev/null || true
    wait "$WORKER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

cd "$ROOT_DIR/worker"
npx wrangler d1 execute stratabracket-db --local --file=./schema.sql
npx wrangler d1 execute stratabracket-db --local --file=./seed.sql
npx wrangler dev --local --ip 127.0.0.1 --port "$WORKER_PORT" >"$WORKER_LOG" 2>&1 &
WORKER_PID="$!"

cd "$ROOT_DIR"
npm run dev --workspace frontend -- --host 127.0.0.1 --port "$FRONTEND_PORT" >"$FRONTEND_LOG" 2>&1 &
FRONTEND_PID="$!"

wait "$WORKER_PID" "$FRONTEND_PID"
