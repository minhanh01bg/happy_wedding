# Admin quality implementation plan

Goal: complete the seven user-requested fixes, with reusable repository UI templates, verified scoped commits, and push the current branch.

Architecture: shared notification presentation with existing cursor APIs; resilient public settings normalization and uncached editable admin settings; shared review validation; database-backed list pagination; a single dashboard with period-based analytics and product rankings. Preserve Vietnamese copy, cached public pages, pooled SQLite transaction invariants and server-side validation.

Stack: Next.js App Router, Prisma SQLite, Zod, React, Tailwind, Vitest and Playwright. Read installed Next documentation before route/component changes.

## Task 1 — Notification template

Files: kit notification-list, kit gallery, admin/customer notification buttons/providers and component tests.
Red: loading skeleton and cursor load-more absent. Green: initial six rows, skeleton, accessible load-more, append/refresh race handling, reduced-motion support. Verify isolated notification tests and review. Commit `feat(notifications): add progressive shared notification list`.

## Task 2 — Settings resilience

Files: server/settings/store-settings, admin/settings/page and settings tests.
Red: legacy malformed public profile fields throw; admin depends on that public parser. Green: normalize invalid public fields individually and read editable admin profile uncached without dropping legacy values. Database errors still propagate. Verify legacy/valid sibling tests. Commit `fix(settings): tolerate legacy profile values in admin settings`.
Production direct and client navigation currently succeed; this is a reproduced data-resilience defect, not yet a confirmed explanation of the reported intermittent 500.

## Task 3 — Review code rejection

Files: types/review, a pure review-content validator and review schema/server/API tests.
Red: script markup and code fences accepted. Green: reject recognizable HTML/code blocks and executable snippets through shared Zod validation; preserve natural Vietnamese reviews and punctuation. Verify server does not persist rejected reviews. Commit `fix(reviews): reject code in review content`.

## Task 4 — Pagination coverage

Files: growing admin list pages/loaders and their tests, existing kit Pagination/server pagination utility.
Inventory current coverage; add server pagination where missing, preserve filters and clamp pages. Exempt bounded dashboard rankings and order/cart editor line items. Verify beyond-first-page data, total counts and filters. Commit scoped list fixes separately if independent.

## Task 5 — Unified analytics dashboard

Files: server admin dashboard/reports loaders, dashboard components, admin page/reports redirect, navigation and tests; order cost snapshot schema/write path if required after audit.
Red: dashboard missing period analytics/rankings, reports duplicated. Green: one period selection, revenue/channel/order/profit charts, quantity and profit rankings, preserve operational cards, redirect legacy reports URL and remove duplicate menu. Profit uses sale-time cost snapshots for new orders; never present unknown historical cost as known profit. Verify cancellations, discounts, fractional quantities, date boundaries, cost changes and empty periods. Commit data contract and UI in verified scoped parts.

## Task 6 — Header management entry

Files: storefront session-aware-actions/store-header and session/browser tests.
Red: two admin destinations in screenshot. Green: one accessible management entry with clearer shield icon for logged-in admin, discoverable admin login for guests, mobile layout preserved. Commit `fix(storefront): simplify admin access controls`.

## Final verification

Review each scoped diff before committing. Run focused tests during implementation with separate TEST_DATABASE_URL files. After all tasks: pnpm check && pnpm build; targeted Playwright for affected flows, React diagnostics, broad review. Push current branch only after gates pass. Preserve uploaded images and unrelated files.
