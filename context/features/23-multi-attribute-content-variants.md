# S-23 Multi-attribute content variants
Updated 2026-11-09 · Codex · Sampada: docs/design/sampada.md §23 · ADR: 007

## Brief — current truth
- Content-Kit 4 is the active Media/MyGita contract locally and remotely. Canonical CK4 registries are authoritative; files under `runtime/` are generated, read-only compatibility projections rebuilt by publish.
- Canonical model: book → collection → part → semantic variant → item → rendition → asset.
- Paths carry identity only. Part contracts fix file/records representation; variants use content_url.
- Media-global contributor and cue-purpose vocabularies; dedicated defaults.csv per book/type; composition binds a collection item and never a variant.
- Semantic selection precedes capability-based rendition selection. Resolver output explains exact, any, explicit fallback and capability decisions.
- No Content-Kit 3 compatibility or dual publication. The coordinated cutover published Media first and MyGita second.

## Parts
- [x] Tranche 1 executable contract, fixtures, resolver, coverage and plan shapes — W-0016
- [x] Tranche 2A local Media migration, canonical collection API and derived runtime publication — W-0017, W-0018
- [x] Tranche 2B product bindings and higher-level mutation-plan builders — W-0019, W-0020, W-0021
- [x] Tranche 3 coordinated Media-first remote cutover — W-0022
- [x] Acharya portrait contributor contract — W-0027

## Open
- Exact existing-content migration IDs and verification report are implementation outputs, not runtime legacy mappings.
- Media Admin can now implement item and collection-field editing against `collections(media, bookId)`, the shared contract bundle, canonical tree, validation and safe publication workflow.
- MA-1 · done · Mutation plans for item, variant, default and collection changes — W-0021.
- MA-2 · done · Kit-4 product and experience binding slots and composition — W-0020.
- MA-3 · done · Shared collection/variant usage queries — W-0020.
- MA-4 · done · Media-wide language registry — W-0019.
- MA-5 · done · Shared validation-registry adapter — W-0019.
- MA-6 · done · Contract-owned English display labels — W-0019.
- MA-7 · done · Declared lexicographic resolver priorities — W-0019.
- MA-8 · done · Preference-side versus variant-side `any` semantics — W-0019.
- MA-9 · done · Scalar-only `none` sentinel — W-0019.
- MA-10 · done · Verified W-0016–W-0018 baselines checkpointed per repository.
- MA-13 · done · Final sibling-repository ownership and user-mediated hand-off boundary documented — W-0024.
- MA-15 · done · MyGita context and Rachana use the final `apps/gita-jyoti/…` folder layout — W-0024.
- MA-17 · accepted · Acharya portraits use ordinary `image/profile/acharya/<contributor_id>-<n>.(webp|png)` assets. `registry/contributors.csv` optionally adds `portrait_url`, a logical media path; only an `acharya` contributor may use it, and it must be an inventoried WebP or PNG image. No profile type, file-id layer or Acharya registry — W-0027.
- MA-18 · done · `openMedia()` returns usable media plus typed validation problems for malformed portraits; publish remains blocking and inventory rebuild precedes final validation — W-0030.
- MA-19 · done · Live-Media tests assert contributor contract properties rather than historical IDs — W-0030.
- MA-20 · done · Runtime audio credits preserve every contributor in stable declared order — W-0030.
- MA-21 · done · Variant `voice` is an ordered contributor-ID list; matching accepts any requested member, while contributor registry roles remain person-level — W-0030.
- MA-11 · done · Deck rendition declares a browser-supported presentation format and resolves under device capability checks — W-0030.
- MA-12 · done · Kit indexes variants/items and configured experience rows once per Media open; usage and resolver previews reuse them — W-0030.

### W-0030 plan — contributor and runtime hardening
1. Replace live contributor-ID assertions with role/registry contract checks; make ordered voice lists validate, resolve and produce complete credits. Accept when current Media and multi-voice fixtures pass without historical IDs.
2. Return non-fatal media validation diagnostics while retaining publish blocking; define deck's browser rendition. Accept when malformed portraits remain inspectable and a deck resolves under device capabilities.
3. Index item lookup and configured experience usage. Accept when real-Media usage is under one second and full experience resolution is suitable for interactive preview.

### W-0027 plan — Acharya portrait contract
1. Extend the contributor registry contract with optional `portrait_url`, retaining compatibility with the existing three-column registry. Accept when both schemas parse and `*_url` is documented as a logical path.
2. Validate role, path, inventory and MIME rules; expose contributor portrait resolution. Accept when WebP and PNG resolve, while non-Acharya, uninventoried and wrong-MIME paths fail.
3. Rebuild the shared bundles and run focused unit regression. Accept when existing Media remains valid without portrait data and all portrait tests pass.

### W-0019 plan — contract completion
1. Add the Media language registry and validation-registry adapter. Accept when unknown variant languages fail without caller-built ID lists.
2. Add contract-owned English labels. Accept when Media Admin can obtain type, part, attribute, value and field labels from `describe()`.
3. Make resolver comparison lexicographic and formalize `any`/`none`. Accept when declared higher-priority attributes win, preference-side `any` is indifferent, variant-side `any` is a fallback, and mixed `none` lists fail.
4. Rebuild bundles and inventories, run full relevant regression, then checkpoint and commit.

### W-0020 plan — product bindings and usage
1. Define binding slots and kit-4 composition rows. Accept when all Gita and Sukta experience rows resolve against real collections.
2. Migrate player loading to the normalized binding model. Accept when existing browser behavior is unchanged and `audioBinding` is absent.
3. Add `usage()`. Accept when every experience using `chanting-swami-brahmananda` is reported.
4. Rebuild, run full regression, then checkpoint and commit.

### W-0021 plan — mutation plans
1. Add item mutation plans. Accept when add/change/remove round-trip through a snapshot and `collections()`.
2. Add variant/default mutation plans. Accept when add/change/default operations validate and resolve.
3. Add collection mutation plans with usage-aware removal warnings. Accept when canonical and generated publication effects preview correctly and Media validates.
4. Rebuild, run full regression, then checkpoint and commit.

## Details
- Rachana: docs/design/system/content-kit-4-variants.md
- Source: engine/js/content-kit-v4.js; standalone bundle: engine/js/content-kit-v4.bundle.js.
- Fixtures: engine/tests/fixtures/content-kit-v4/.

## Changes
- 2026-11-08 Tranche 1 contract and representative fixtures created after MyGita/Media Admin design review (Codex)
- 2026-11-08 Tranche 2 migrated all local Media books, activated CK4 in MyGita and exposed canonical files to Media Admin (Codex)
- 2026-11-09 Tranche 2A completed canonical collection joins, ID vocabularies, MIME-derived current renditions and generated read-only runtime publication (Codex)
- 2026-11-09 Tranche 2B completed contract vocabularies, resolver semantics, product bindings, usage queries and mutation-plan previews (Codex)
- 2026-11-09 Tranche 3 published Media first and MyGita second; the exact MyGita deployment commit passed GitHub Actions (Codex)
- 2026-11-19 MA-17 added optional contributor `portrait_url`, strict Acharya role/path/inventory/MIME validation, and logical portrait resolution; WebP and PNG are supported (Codex)
- 2026-11-21 W-0030 completed ordered contributor voices and credits, non-fatal portrait diagnostics with publish blocking, JSON deck rendition support, and immutable-Media resolver/configuration caches (Codex)
