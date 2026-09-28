# Admin Production Readiness — Remaining Work and Handoff Plan

Last updated: 2026-09-28

## Purpose

This document is the source of truth for finishing the House of Diams admin panel safely in a new Codex chat. Work must be completed in small, independently testable batches. Existing live data must be preserved.

## Important instructions for the next chat

1. Read this entire file before changing code.
2. Inspect the current dirty worktree and preserve all existing changes.
3. Work on one subgroup at a time. Do not combine unrelated high-risk areas.
4. Do not run a production build unless the user explicitly removes the current restriction.
5. Retired CMS cleanup is approved only for the named Home sections documented in Group 3. Do not infer other sections.
6. Do not delete or rewrite database data unless the user explicitly approves it.
7. If a database migration is required, create an idempotent migration, explain its effect, and ask the user to run it. Verify it afterward through a safe read-only or rejected-access check.
8. Use strict server-side validation for every write. Browser validation is not a security boundary.
9. Never expose raw database, storage-provider, authentication-provider, or email-provider errors to the browser.
10. Failed saves must preserve the administrator's entered values.
11. Prevent duplicate submissions and disable actions while requests are running.
12. Use stale-editor or optimistic-concurrency protection wherever one admin could overwrite another admin's newer changes.
13. Add focused tests for each completed subgroup, then run targeted ESLint and `npx tsc --noEmit --pretty false`.
14. Do not run `next build` under the current restriction.
15. Product create/edit CRUD save internals remain excluded unless the user explicitly asks to include them.

## Work already completed

- Catalog/master-data transactional safety groups are complete.
- Navbar Builder atomic save is implemented.
- Bespoke Hero atomic save is implemented.
- Bespoke Form Configuration atomic save is implemented.
- Product edit server hydration and cache invalidation are implemented.
- Bulk product import and Google Sheets product-import functionality were removed from active admin code.
- TypeScript baseline passes.
- ESLint is configured and has zero blocking errors; remaining legacy findings are warnings.
- `ignoreBuildErrors: true` was removed.
- Tracked `tsconfig.tsbuildinfo` was removed and remains ignored.
- Coupon editor/API consistency is complete.
- General settings and admin password API consistency is complete.
- Order API/editor consistency is complete.
- Inventory API/editor consistency is complete.
- Atomic inventory migration `sql/202609260017_inventory_atomic_adjustment.sql` was run and verified live.
- Notification read/read-all APIs are hardened.
- Bespoke submission list/detail APIs are hardened.
- Bespoke portfolio category/item APIs and image uploads are hardened, including strict validation, safe errors, stale-editor protection, guarded UI actions, and focused tests. No database migration was required.

## Remaining work overview

There are **4 top-level groups remaining**:

1. Admin/API consistency
2. Repository hygiene and maintainability
3. Retired CMS cleanup — named Home sections completed; other sections remain in scope
4. Final production verification

---

## Group 1 — Admin/API consistency

Status: Code complete; pending database and live verification

### 1A. Bespoke portfolio and media APIs

Status: Complete (2026-09-26)

Scope:

- `app/api/bespoke/portfolio-categories/route.ts`
- `app/api/bespoke/portfolio-categories/[id]/route.ts`
- `app/api/bespoke/portfolio-items/route.ts`
- `app/api/bespoke/portfolio-items/[id]/route.ts`
- `app/api/bespoke/media/route.ts`
- Corresponding Bespoke admin UI actions

Required outcomes:

- Strict Zod schemas with exact allow-listed fields.
- Validate UUIDs, status values, URLs/paths, display order, required text, and relationships.
- Reject mass-assigned fields.
- Return 400 for invalid input, 404 for missing records, 409 for conflicts, and generic 500 errors.
- Do not return raw Supabase/storage errors.
- Add confirmation dialogs for destructive actions.
- Disable save/delete/upload actions while requests run.
- Preserve form state after failures.
- Add stale-editor protection where updates can overwrite newer edits.
- Ensure successful mutations refresh or invalidate the correct server state.
- Add focused tests.

### 1B. Product operational APIs

Status: Complete (2026-09-26). Migration `sql/202609260018_product_operations_atomic.sql` was applied and verified through rejected anonymous access and non-mutating validation failures via the service role.

Core product create/edit CRUD is excluded. Audit only operational actions:

- Product status changes
- Product duplication
- Bulk price updates
- Bulk deletion
- Draft activation
- Product media uploads/signing
- Product video operations

Required outcomes:

- Strict request schemas and maximum batch sizes.
- Validate all product IDs and reject duplicates.
- Confirm selected records exist and are eligible for the operation.
- Use atomic database operations for multi-record mutations when partial completion would be unsafe.
- Require explicit deletion intent and confirmation for bulk deletion.
- Prevent duplicate requests and double-click execution.
- Return safe, typed errors.
- Invalidate product list/editor caches only after successful mutations.
- Add focused tests for malformed input, missing records, duplicate IDs, conflicts, and safe error mapping.

### 1C. Upload security audit

Status: Code complete (2026-09-27); live upload checks remain in Group 4. Product, Bespoke, Navbar, and Catalog routes were already hardened. Active CMS image routes now use shared authenticated upload validation with request/file limits, raster signature checks, SVG active-content rejection, server-controlled keys, and safe storage errors. Signed SVG requests are rejected and use the server-validated fallback. Image signing requires a positive declared size and fixed server-generated paths; the special About Hero and Diamond Info video/poster routes also validate fallback file signatures.

Audit active upload and signing routes for CMS, catalog, navbar, Bespoke, and products.

Required outcomes:

- Confirm admin authentication on every route.
- Validate actual MIME/content signatures where practical; do not trust filename extensions alone.
- Enforce per-file and request-size limits.
- Restrict allowed image/video/document formats per route.
- Generate server-controlled storage keys.
- Reject path traversal and user-controlled bucket/folder escalation.
- Restrict signed-upload content type, key prefix, and expiry.
- Prevent SVG/script injection where SVG is accepted.
- Return generic provider errors.
- Clean up partially completed uploads when safe and possible.
- Add focused validation tests.

### 1D. Remaining active CMS/API audit

Status: Complete in code (2026-09-28). The active Home family (Hero, Shop By Category, Discover Shapes, Best Sellers, and Instagram Reels) was hardened on 2026-09-27. Hero slide edits now use the same atomic revision-checked parent save instead of a bypass child PATCH. Home editors preserve IDs, calculate explicit deletions, reuse request IDs for safe retries, reject interrupted save responses, preserve drafts after failures, warn before leaving with unsaved changes, and use safe API errors. Focused Hero validation tests pass; targeted lint and source-only TypeScript verification pass. The complete About family (Hero, Wide Banner, Founders, Timeline, and Values) is also hardened: media upload no longer silently publishes the full Hero draft, explicit saves restore canonical server state, list editors preserve IDs and explicitly calculate deletions, duplicate/conflicting IDs are rejected, field sizes and item counts are bounded, load/save errors are safe, interrupted responses preserve drafts, and navigation with unsaved work is guarded. About validation tests pass 4/4; targeted lint has no errors and source-only TypeScript verification passes. Migration `sql/202609270020_fix_about_wide_banner_position.sql` must be applied (unless already run) because the prior database function always stored `bottom-center` instead of the selected Wide Banner position. The Bespoke CMS family is complete: Showcase, Process, and Manufacturing use the atomic revision-checked contracts from both the CMS pages and the main Bespoke admin page; the old Process payload that omitted IDs/revision/deletions was removed. Bespoke editors now guard unsaved work, disable duplicate saves/uploads, preserve drafts after failures, reject incomplete responses, bound fields and list sizes, and reject unsafe manufacturing media URLs. Bespoke validation tests pass 4/4, targeted lint has no errors, and source-only TypeScript verification passes. Existing Hero, portfolio, form, and submission hardening from earlier Group 1 work remains in place. The Blog, Education, and Documents family is complete: the Education Hero's incorrect Blog upload endpoints were corrected; article and document writes use strict pure schemas, revision-checked atomic RPCs, stable retry IDs, canonical response restoration, explicit child deletion lists, safe database errors, interrupted-response rejection, and guarded unsaved work. Blog and Education list deletion now loads the current one-item revision before calling the protected delete API instead of sending an invalid revisionless request. Duplicate deleted IDs and retained/deleted overlaps are rejected. Focused Blog/Education/Documents validation tests pass, targeted lint has no errors, and source-only TypeScript verification passes. No new database migration is required for this family. The Contact and Support CMS family is code-complete: Contact Hero, Contact Info, Announcement Bar, and FAQ editors now reject incomplete responses, restore canonical saved data, disable invalid duplicate saves, confirm draft deletions, and guard unsaved work. Contact and announcement links reject executable URL schemes. FAQ category create/edit/delete now uses strict validation, stable request IDs, per-record revisions, safe errors, protected deletes, and idempotent atomic database functions instead of direct table writes. The legacy Contact submissions endpoint now uses shared admin authorization and bounded pagination rather than loading every submission. Focused Contact/Support validation tests, targeted lint, source-only TypeScript verification, and diff checks pass. Migration `sql/202609270021_support_faq_categories_atomic_crud.sql` must be applied before the FAQ category editor can be used. The shared/global CMS family is complete: Summary, Service Banner, Checkout Result, and Promotion Popup now require complete canonical save responses, preserve revision-safe retries, retain drafts after failures, confirm destructive edits, and guard unsaved work. Promotion now exposes its previously unreachable desktop/mobile image controls, rejects executable destination schemes, and validates option questions for minimum and unique choices. Shared validation rules are isolated and directly tested. Focused shared/global tests, targeted lint, source-only TypeScript verification, and diff checks pass. No new database migration is required for the shared/global family. The dormant mock Gallery route is not linked or treated as active and remains for the later retired-CMS review.

Only audit CMS sections that are currently used. Do not remove retired sections in this subgroup.

Required outcomes:

- Inventory all active CMS write routes and map each route to its admin editor.
- Strictly validate parent and child records.
- Preserve database IDs for existing child rows.
- Delete only explicitly deleted rows.
- Add revision checking and safe retries where absent.
- Make multi-table saves atomic.
- Keep disabled slider/section content saved unless deletion is explicitly requested.
- Add safe error mapping, confirmation dialogs, disabled saving states, and unsaved-change warnings.
- Invalidate relevant storefront/admin caches after successful saves.
- Add focused tests per editor family.

### 1E. Final consistency sweep

Status: Complete in code (2026-09-28). The active CMS tab inventory was reconciled against every linked editor and API. The Collection tab, which was separate from the earlier Home-family audit, was hardened with guarded save/upload actions, stable retry IDs, canonical-response restoration, incomplete-response rejection, conflict handling, failed-draft preservation, unsaved-navigation protection, and executable-link rejection. Active CMS, catalog, Navbar, Bespoke, and product-list read endpoints no longer expose raw database/provider messages; shared catalog/Navbar/Bespoke write error mapping was also made generic. Dormant retained CMS routes received safe read/write error responses without deleting their data or changing their approval status. The complete validation suite passes 50/50, targeted ESLint passes with no findings, source-only TypeScript verification passes, and `git diff --check` reports no whitespace errors. One stale settings test fixture was updated to include the already-required estimated-delivery field.

The only raw database-message response patterns left by the sweep are inside the explicitly excluded core product create/edit CRUD routes (`app/api/products/route.ts`, `app/api/products/[id]/route.ts`, and `app/api/products/by-slug/[slug]/route.ts`). They were not changed because this handoff explicitly excludes those save internals unless the user expands scope. They must be treated as a separately accepted exclusion or audited before claiming those particular routes meet the same safe-error/transaction standard.

After 1A–1D are complete:

- Search all active admin editors for write actions without saving/loading states.
- Search for destructive actions without confirmation dialogs.
- Search for editors without unsaved-change protection.
- Search API routes for raw `error.message` responses.
- Search write routes that call `request.json()` without strict validation.
- Search multi-step writes that are not transactional.
- Search list/detail responses missing `Cache-Control: no-store` where stale admin data is unsafe.
- Check successful saves refresh local state and server cache correctly.
- Confirm network failures preserve entered form data.
- Run focused tests, targeted lint, and TypeScript verification.

Recommended execution order for Group 1:

1. 1A — Bespoke portfolio and media
2. 1B — Product operational APIs
3. 1C — Upload security
4. 1D — Active CMS/API audit
5. 1E — Final consistency sweep

---

## Group 2 — Repository hygiene and maintainability

Status: Complete for the production-readiness scope (2026-09-28). High-impact type debt was removed from inventory, product-support loaders, catalog bootstrap, orders, dashboard aggregation, server cookie handling, and active shared CMS helpers. Inventory read/mapping now has one typed implementation shared by the page and API. React correctness fixes cover authorization gating, responsive state, deterministic skeleton rendering, FAQ pagination, dialog reset behavior, carousel subscriptions, image-preview failure state, bulk-price dialog lifecycle, and other active shared UI. Duplicate mobile/toast modules and confirmed unused symbols were removed. Admin preview images that require runtime/blob/SVG behavior remain native images by design; stable image use was reviewed without forcing unsafe host/dimension assumptions.

The large product, catalog, and Bespoke editors were kept on their existing responsibility-based component boundaries rather than subjected to a high-risk rewrite. Product form support is already split across dedicated step/card/dialog components, and shared data mapping was moved out of page/API code where that reduced runtime and maintenance risk. Remaining size reduction is a non-blocking maintenance backlog, not a production correctness blocker.

Deployment evidence confirms pnpm 10.28.0. `packageManager` is pinned, `pnpm-lock.yaml` is the only lockfile, tracked TypeScript build info was removed and ignored, source-only TypeScript checking was added, and `DEVELOPMENT.md` now documents install, development, checks, migrations, and production verification. Final Group 2 verification: source-only TypeScript passes; all 50 validation tests and all 8 slug tests pass; repository lint has 0 errors and 50 reviewed warnings; `git diff --check` passes after cleanup. No server or production build was run.

The reviewed warnings are concentrated in the intentionally excluded core product CRUD routes, legacy product-form derived-state effects that require a separate behavioral redesign, retained dormant Home routes, native admin upload/media previews, two unused legacy catalog panel components, and test-only fixtures. They do not represent a new blocking compile or lint error. The core product CRUD route exclusion remains an explicit decision for Group 4, as recorded under Group 1E.

### 2A. Important type-safety debt

- Remove high-impact `any` usage first, especially inventory, product-support, and API response mapping.
- Add shared types for repeated database row shapes.
- Avoid broad casts that hide malformed API responses.
- Do not perform a risky repository-wide rewrite solely to reach zero warnings.

### 2B. React correctness warnings

- Fix meaningful `set-state-in-effect`, dependency, purity, and immutability warnings.
- Prioritize components used in authentication, products, catalog, orders, inventory, and active CMS sections.
- Preserve behavior and test each component family separately.

### 2C. Unused and unreachable code

- Remove genuinely unused imports, variables, functions, and dead components.
- Confirm no dynamic import or route depends on a symbol before removing it.

### 2D. Image usage

- Replace high-impact raw `<img>` elements with the established optimized image approach where appropriate.
- Keep raw images only where previews, blob URLs, SVG behavior, or external restrictions make optimization unsuitable.

### 2E. Oversized files

Priorities:

- `components/product-form.tsx`
- `app/dashboard/catalog/catalog-client.tsx`
- Large Bespoke admin components

Split by stable responsibility, preserving behavior and avoiding broad redesigns.

### 2F. Package-manager consistency

- Determine whether deployment officially uses npm or pnpm.
- Keep the selected lockfile current.
- Remove only the unused lockfile after the user confirms the package manager.
- Do not guess.

### 2G. Developer commands/documentation

- Document install, development, lint, type-check, tests, migrations, and deployment verification commands.
- Keep the current no-production-build restriction documented until revoked.

---

## Group 3 — Retired CMS cleanup

Status: Approved Home-section cleanup implemented (2026-09-27); no other sections approved.

The user explicitly identified Video Highlights, Material Strip, Testimonials Marquee, and Trusted Partners in the Home tab. The user also requested a check of Statistics; the storefront StatsStrip is not mounted on the homepage, so its dormant CMS editor/API was removed. The four named sections were not rendered by the storefront homepage either, but the homepage data loader still queried their tables. Their CMS navigation, editors, save APIs, and dedicated upload routes were removed, and the unused homepage fetches/props were removed in the storefront repository. Existing database tables, rows, stored media, standalone storefront components, and public endpoints were preserved. Testimonials Cards is a separate CMS section and was not removed.

No further retired sections should be removed without a new exact list from the user.

For each approved retired section:

1. Confirm there is no storefront consumer.
2. Confirm there is no shared component or API dependency.
3. Remove its admin navigation entry.
4. Remove its admin page/editor.
5. Remove its API routes.
6. Remove its upload/signing routes.
7. Remove unused helpers, schemas, and types.
8. Search the repository for remaining references.
9. Preserve database tables and rows unless the user separately approves database deletion.
10. Test active neighboring CMS sections after removal.

---

## Group 4 — Final production verification

Status: In progress (2026-09-28). The two final migrations were applied by the user and verified against the configured database without mutating content. `cms_support_faq_categories_v1` succeeds through the service role and is blocked for the anonymous role; the FAQ save/delete functions and About Wide Banner singleton save function exist and reject deliberately invalid probe requests. Local environment-key presence was verified without printing values, service-role references are confined to server API/helper modules, active CMS upload routes authenticate through the shared admin upload guard, and no client-side direct database writes were found. Source-only TypeScript, 50 validation tests, 8 slug tests, lint with zero errors, and repository whitespace checks pass.

Live workflow verification remains pending because no running local server was detected during the final pass, and the agent did not start one per the user's instruction. Production environment variables must still be confirmed in the deployment host because local `.env.local` verification cannot prove Vercel/AWS configuration. Vercel commit `444471d` exposed incompatible Cloudflare R2 S3 client/presigner dependency versions; both packages are now pinned to `3.1116.0`, the pnpm lockfile was regenerated, `lib/r2.ts` lint passes, and source-only TypeScript passes. A new Vercel production build is required to confirm the clean-install deployment fix. The previously excluded core product create/edit routes still return raw database error messages and require either remediation or explicit risk acceptance before final production-ready sign-off.

### 4A. Automated verification

- Run all focused transaction and validation tests.
- Run the complete available test suite.
- Run `npm run lint` and review warnings.
- Run `npx tsc --noEmit --pretty false`.
- Do not run the production build until the user explicitly allows it.

### 4B. Database verification

- Confirm every required migration exists in the live database.
- Confirm protected functions cannot be executed by `anon` or ordinary `authenticated` roles.
- Confirm service-role routes can call required functions.
- Test stale revisions and failed transactions without changing live records unnecessarily.

### 4C. Critical workflow checks

- Admin login and authorization
- Password change
- Product list and product edit loading
- Catalog editors
- Navbar Builder
- Active CMS editors
- Bespoke editors and submissions
- Coupons
- Orders and status updates
- Inventory adjustments
- Notifications
- Uploads

### 4D. Failure and concurrency checks

- Slow network and interrupted save behavior
- Double-click/duplicate request behavior
- Two-editor stale update behavior
- Missing record behavior
- Invalid and oversized payload behavior
- Upload rejection and partial-failure behavior
- Cache freshness after successful saves

### 4E. Production environment review

- Confirm required environment variables exist without printing their values.
- Confirm service-role credentials are server-only.
- Confirm storage buckets and policies match intended access.
- Confirm public forms cannot write directly around protected server routes.
- Confirm error responses do not reveal internal schema or provider details.

### 4F. Production build

This is intentionally pending. Run the production build only after the user explicitly permits it.

---

## Definition of done

The admin panel can be called production-ready only when:

- Groups 1 and 2 are complete.
- Group 3 is either completed or explicitly accepted as deferred by the user.
- Group 4 checks pass.
- No required migration is pending.
- No blocking TypeScript or ESLint errors remain.
- Critical admin workflows have been verified.
- The user has explicitly allowed and the project has passed a production build, or the user formally accepts deployment without that verification.

## Next task

Proceed to **Group 4 — Final production verification**. First confirm or apply `sql/202609270020_fix_about_wide_banner_position.sql` and `sql/202609270021_support_faq_categories_atomic_crud.sql`. Then complete the live database permission checks, Group 1C upload/failure checks, and critical admin workflow smoke tests against the already-running environment. Decide whether the explicitly excluded core product CRUD routes are accepted or brought into scope. Do not start another server, and do not run the production build until the user explicitly permits it.
