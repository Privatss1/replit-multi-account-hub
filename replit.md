# Replit Multi-Account Hub

A local web dashboard for managing and orchestrating multiple Replit accounts on a single project — with memory, skills, knowledge base, voice input, and free-tier limit monitoring.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/replit-hub run dev` — run the frontend (port 18649)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 18 + Vite + Tailwind CSS + shadcn/ui
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod, drizzle-zod
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all API contracts)
- `lib/db/src/schema/index.ts` — Drizzle DB schema
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/replit-hub/src/` — React frontend pages + components

## Architecture decisions

- All Replit account tokens stored encrypted in DB, never exposed in API responses (masked)
- API keys vault masks all values — only 4 prefix + 4 suffix shown
- Free-tier usage tracked locally per account (messagesUsed / messagesLimit)
- Limit warnings fire at 80% usage (yellow) and 100% (red), logged to activity feed
- Voice input uses browser Web Speech API — no external service needed

## Product

- **Multi-Account Hub**: Connect up to 10+ Replit accounts via API tokens
- **Projects**: Group work under named projects, link multiple accounts to each
- **Memory Base**: Per-project context that agents share (title, content, category, importance 1-5)
- **Skills Library**: Reusable prompt templates with usage tracking
- **Knowledge Base**: Global + per-project docs, notes, URLs, code snippets
- **API Vault**: Store all external API keys once (OpenAI, Anthropic, etc.)
- **Chat Center**: Multi-account conversation history with voice + file input
- **Limits Monitor**: Free-tier usage bars per account on the dashboard

## User preferences

- All Replit accounts are on the FREE tier — limit tracking is critical
- Limit warnings: yellow at 80%, red at 100%
- No emojis in the UI

## Gotchas

- Use `zod` (not `zod/v4`) in api-server routes — esbuild cannot resolve `zod/v4`
- The api-server build bundles everything; `zod` must be in `dependencies`, not just workspace catalog
- Workflow names follow pattern `artifacts/<slug>: <service-name>` (e.g. `artifacts/api-server: API Server`)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
