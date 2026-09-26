# Admin Production Readiness — Remaining Work and Handoff Plan

Last updated: 2026-09-26

## Purpose

This document is the source of truth for finishing the House of Diams admin panel safely in a new Codex chat. Work must be completed in small, independently testable batches. Existing live data must be preserved.

## Important instructions for the next chat

1. Read this entire file before changing code.
2. Inspect the current dirty worktree and preserve all existing changes.
3. Work on one subgroup at a time. Do not combine unrelated high-risk areas.
4. Do not run a production build unless the user explicitly removes the current restriction.
5. Do not implement retired CMS cleanup until the user identifies exactly which sections must be removed.
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
3. Retired CMS cleanup — intentionally postponed
4. Final production verification

---

## Group 1 — Admin/API consistency

Status: In progress

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

Status: In progress. Product and Bespoke upload routes are hardened. Navbar and Catalog upload routes were consolidated onto strict shared validation with request/file limits, raster signature checks, SVG active-content rejection, server-controlled keys, and safe storage errors.

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

Status: Partially complete

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

Status: Postponed by user

Do not begin this group until the user provides the exact sections to remove.

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

Status: Pending

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

Continue **Group 1C — Upload security audit** with the active CMS upload/signing route families. Reuse `lib/admin-image-upload.ts` where the route uses server-mediated uploads; audit direct-sign routes separately for declared size, fixed content type/key prefix, short expiry, and safe fallback behavior.
