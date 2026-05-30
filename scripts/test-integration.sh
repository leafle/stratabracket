#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKER_PORT="${WORKER_PORT:-8787}"
API_BASE="http://127.0.0.1:${WORKER_PORT}"
WORKER_LOG="${TMPDIR:-/tmp}/stratabracket-worker-integration.log"
WORKER_PID=""

cleanup() {
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

for _ in {1..60}; do
  if curl -fsS "${API_BASE}/health" >/dev/null 2>&1; then
    cd "$ROOT_DIR"
    TEST_API_BASE="$API_BASE" npx vitest run --config vitest.integration.config.ts
    exit 0
  fi
  sleep 1
done

echo "Worker did not become healthy. Last log lines:" >&2
tail -40 "$WORKER_LOG" >&2 || true
exit 1
