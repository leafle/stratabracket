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
```

If `ANTHROPIC_API_KEY` is missing locally, bracket generation falls back to deterministic FIFA-ranking picks. Magic-link email is sent through the Cloudflare Email Service binding named `EMAIL`; when that binding is unavailable locally, magic-link tokens are created without sending email and the development response includes the link.

## Deployment

Deployments run from `.github/workflows/deploy.yml` on pushes to `main` or from a manual workflow dispatch. The workflow installs dependencies, runs `npm run verify`, deploys the Worker with Wrangler, then deploys `frontend/dist` to Cloudflare Pages. The production app is configured for `https://sb.smyth.dev`, with `/api/*` routed to the Worker and the SPA served by Cloudflare Pages.

Configure these GitHub repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The Cloudflare Pages project defaults to `stratabracket`. To use another project name, set the GitHub repository variable `CLOUDFLARE_PAGES_PROJECT_NAME`.

Before deploying, onboard `smyth.dev` in Cloudflare Email Sending and authorize `login@smyth.dev` as a sender. Add `sb.smyth.dev` as a custom domain on the Cloudflare Pages project.

## Verification

```bash
npm test
npm run test:coverage
npm run test:integration
npm run test:e2e
npm run typecheck
npm run build
```

`npm run test:unit` runs the fast Vitest suite for worker services, route contracts, and frontend utilities.
`npm run test:coverage` uses the same suite with V8 coverage reporting in `coverage/`.

`npm run test:integration` seeds the local Wrangler D1 database, starts the Worker on `127.0.0.1:8787`, and runs API flow tests against the live HTTP server.

`npm run test:e2e` starts both the local Worker and the Vite frontend, then runs Playwright Chromium tests against the SPA. On a new machine, install the local browser once with:

```bash
npx playwright install chromium
```

For machine-independent verification, run everything inside Docker:

```bash
docker compose run --rm verify
```

The Docker image is based on Playwright's browser image, so it includes the headless browser runtime and only requires Docker on the host.
