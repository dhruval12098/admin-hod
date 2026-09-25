# Group 5 — Catalog/master-data safety plan

## Objective

Replace fragile direct catalog writes with strict, atomic, idempotent database boundaries. Preserve every existing ID, block destructive deletes while an item is referenced, retain system-lock rules, and return friendly errors without exposing raw database details.

## Live findings

- The live catalog contains 6 categories, 10 subcategories, 35 options, 16 metals, 5 GST slabs, 3 certificates, 2 material values, 6 generic ring sizes, 3 ring categories, 37 category-specific ring sizes, 11 stone shapes, 16 styles, 2 product-content rules, and 185 products.
- Twelve master-data delete endpoints currently call `.delete()` directly. Metals are the only area with an application-level usage check.
- Certificate IDs and ring-size IDs are stored in product arrays, so database foreign keys may not prevent dangling references.
- Category, subcategory, and option records are also referenced by products, link tables, homepage cards, navigation configuration, blog/FAQ content, and category posters.
- Metals use a parent/child model (`catalog_metals` + `metal_composition_parts`) and currently save those tables in separate operations.
- System-locked categories are protected only in application code; the database write boundary must enforce the same rule.

## Subgroup 5A — Shared CRUD boundary and simple reference masters

Cover GST slabs, certificates, material values, generic ring sizes, stone shapes, styles, and product-content rules.

1. Add an additive migration defining row snapshots, revisions, idempotency receipts, guarded create/update, and guarded delete RPCs.
2. Validate every field and enum explicitly. Reject unknown fields, duplicate names/slugs/codes, invalid UUIDs, and stale revisions.
3. Block deletion when referenced by:
   - GST: products, site default settings, or historical order items.
   - Certificates: any product `certificate_ids` array.
   - Material values: product material-value selections.
   - Ring sizes: any product `ring_size_ids` array.
   - Stone shapes: product shape tables or active discover-shape content.
   - Styles: products or style-selection/link tables.
   - Content rules: product shipping or care/warranty rule fields.
4. Return a structured usage summary and recommend setting status to hidden instead of deleting.
5. Wire list pages/editors to revision-aware envelopes and canonical returned rows.
6. Invalidate product/catalog caches only after a successful committed save.

Critical files:

- `app/api/catalog/{gst-slabs,certificates,material-values,ring-sizes,stone-shapes,styles,product-content-rules}/**/route.ts`
- `app/dashboard/catalog/{gst,certificates,material-values,ring-sizes,stone-shapes,styles}/**`
- `app/dashboard/catalog/catalog-client.tsx`
- New shared `lib/catalog-master-save.ts`
- New client save hook under `hooks/`
- New additive SQL migration and in-memory transaction test under `sql/` and `scripts/`

## Subgroup 5B — Ring categories and category-specific sizes

1. Save ring-category parents and category-size children atomically.
2. Preserve existing child IDs and require explicit deletion IDs.
3. Enforce uniqueness of size label within a category inside the database transaction.
4. Block deleting a ring category while products or category sizes reference it.
5. Block deleting a category-size row if any current product configuration references it; otherwise delete only the requested row.
6. Keep generic ring sizes separate from category-specific sizes to avoid mixing incompatible IDs.

Critical files:

- `app/api/catalog/ring-categories/**/route.ts`
- `app/api/catalog/ring-category-sizes/**/route.ts`
- `app/dashboard/catalog/ring-sizes/**`

## Subgroup 5C — Category hierarchy

Cover categories, subcategories, and options.

1. Add one hierarchy-aware transaction boundary for create/update/delete.
2. Keep IDs stable and enforce unique code/name/slug constraints with friendly conflict responses.
3. Generate a missing direct-link URL from the normalized slug when `nav_type = direct_link`; clear it when navigation is disabled or uses a mega menu.
4. Enforce system-locked category restrictions in the database RPC as well as the API.
5. Block reparenting a referenced subcategory or option when it would make existing product/category relationships inconsistent.
6. Block deletion using complete dependency checks:
   - Category: subcategories, products, blog/FAQ links, homepage cards, posters, and navigation references.
   - Subcategory: options, products, product link rows, homepage cards, and navbar sections.
   - Option: products, product option/style links, and homepage cards.
7. Never cascade-delete children or rewrite product relationships. The safe alternative is hiding the record or creating a replacement.
8. Update overview/detail page loaders to carry row revisions and consume canonical save responses.

Critical files:

- `app/api/catalog/{categories,subcategories,options}/**/route.ts`
- `app/dashboard/catalog/catalog-client.tsx`
- `app/dashboard/catalog/[slug]/page.tsx`
- `app/dashboard/catalog/[slug]/page-client.tsx`
- `lib/product-list-reference-cache.ts`

## Subgroup 5D — Metals and composition parts

1. Replace separate metal/part writes with one atomic parent-child RPC.
2. Preserve composition-part IDs, require explicit deletions, and reject foreign or duplicate IDs.
3. Validate composition percentages, ordering, labels, colors, and combined-metal display labels.
4. Keep the current friendly duplicate-name/slug behavior.
5. Expand guarded deletion checks to product selections, variants, media, purity pricing where applicable, and composition parts.
6. Ensure a late child failure rolls back the metal update and all earlier child operations.

Critical files:

- `app/api/catalog/metals/route.ts`
- `app/api/catalog/metals/[id]/route.ts`
- `app/dashboard/catalog/metals/**`
- `lib/product-metal-variants.ts`

## Security and compatibility rules

- Migrations are additive: no catalog rows are rewritten, deleted, or re-keyed during deployment.
- RPC execution is service-role only and rechecks the actor's admin profile.
- Every mutation uses an advisory transaction lock, request ID, expected revision, and canonical response.
- Unknown database errors are replaced with safe generic responses; known validation/conflict errors remain actionable.
- No foreign-key cascade behavior is added or changed.
- Existing product, order, navigation, CMS, and import data remains untouched.
- Each subgroup gets a separate SQL file and can be deployed and verified independently.

## Verification gates for every subgroup

1. Run the migration twice in PGlite to prove idempotent deployment.
2. Test create, update, unchanged save, stale revision, duplicate request retry, unknown/foreign IDs, explicit deletion, and permission denial.
3. Force a late database constraint failure and prove the entire transaction rolls back.
4. Verify referenced records cannot be deleted and unreferenced records can be deleted.
5. Verify IDs and creation timestamps remain unchanged after edits.
6. Run all earlier CMS regression tests plus the new catalog tests.
7. Run targeted TypeScript checks and `git diff --check`.
8. After the user runs each SQL migration, verify every RPC read-only against the live database before moving to the next subgroup.

## Execution order

Implement 5A first, then 5B, 5C, and 5D. Do not begin a later subgroup until the prior subgroup passes all gates and its SQL has been verified live.
