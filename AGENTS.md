# Wedding Studio — guidance

This repository was cloned from `my_task`. The active product is a wedding invitation service. Keep customer-facing text in Vietnamese.

## Commands

- Node 22, pnpm 10.28.2.
- Install/setup: `pnpm install && pnpm run setup` (use **run**, because `pnpm setup` is a built-in pnpm command).
- Local: `pnpm dev` on port 3200.
- Full gate: `pnpm check && pnpm build`; browser gate: `pnpm test:e2e`.
- Unit/integration DB is isolated at `prisma/prisma/test.db`; tests run serially.
- E2E uses only `prisma/e2e.db`, port 3201, and `.next-e2e`; its setup resets only that fixed test DB.

## Invariants

- Every customer mutation authorizes via current session and Invitation.ownerId. Every admin mutation resolves a valid DB session and owner/manager role.
- API cookie mutations require safe origin and streamed body limits. Validate with Zod. Expose Vietnamese domain errors and correlation IDs for unexpected failures.
- `src/server/wedding/service.ts` owns order creation and payment activation. Calculate price from catalog; snapshot benefits and money in integer VND. Do not accept price/status from the browser.
- Payment confirmation creates a unique transaction record and activates the order atomically with audit. A customer payment note must never mark the order paid.
- A public invitation requires published status, an enabled owner and paid entitlement with future expiry. Never expose drafts through public URL.
- Admin suspension cannot be reversed by the invitation owner. Version-check edits to avoid overwrites.
- Personal guest tokens are opaque capabilities. Keep them out of logs and referrers. Never expose a complete guest list on public pages.
- GuestResponse wishes default to pending and render publicly only after approval. RSVP replays update one response.
- SQLite uses one pooled connection; use only `tx` within interactive transactions. Never call root Prisma from inside them.
- Production fails closed for Redis, rate-limit HMAC, canonical origin, public URL and admin password hash. Build-only placeholders must never become runtime defaults.
- Use logger, not direct console for application logging. Never commit `.env`, `.local-admin-password`, DB files or uploaded images.
- Fresh migrations describe the new wedding domain; never apply them to the source my_task database.

## Domain documentation

Read `CONTEXT.md` and `docs/README.md` before changing wedding behavior. The baseline specification is `docs/superpowers/specs/2026-10-03-wedding-platform-design.md`; subsystem plans are in `docs/superpowers/plans/`, API contracts in `docs/API-CONTRACTS.md`, and decisions in `docs/adr/`. These documents were added after implementation: do not infer prior brainstorming approval or TDD from their existence. Keep plan checkboxes open until the stated action has fresh evidence; documentation work does not authorize production deployment or invent real couple/bank details. Update the relevant spec, contracts, ADR and verification together with behavior changes.

## Workflow

Read relevant installed Next.js docs under `node_modules/next/dist/docs/` before changes. Verify before committing. The `base` remote points at the original local clone and intentionally has disabled pushes. The `origin` remote is `https://github.com/minhanh01bg/happy_wedding.git`; publish wedding project changes there. Commit each completed, verified piece of work separately with a focused message; do not accumulate unrelated work into one large commit.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
