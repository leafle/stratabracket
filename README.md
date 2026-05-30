# StrataBracket

Cloudflare-first World Cup bracket pool app. The frontend is a React SPA for Cloudflare Pages, and the API is a Hono Worker backed by D1.

## Local Development

```bash
npm install
npm run dev --workspace frontend
npm run dev --workspace worker
```

The frontend proxies `/api/*` to the local Worker on `127.0.0.1:8787`.

## Database

```bash
wrangler d1 execute stratabracket-db --local --file=./worker/schema.sql
wrangler d1 execute stratabracket-db --local --file=./worker/seed.sql
```

## Secrets

```bash
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put EMAIL_API_KEY
```

If `ANTHROPIC_API_KEY` is missing locally, bracket generation falls back to deterministic FIFA-ranking picks. If `EMAIL_API_KEY` is missing, magic-link tokens are created without sending email and the development response includes the link.

## Verification

```bash
npm test
npm run typecheck
npm run build
```
