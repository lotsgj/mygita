# S-23 Multi-attribute content variants
Updated 2026-11-09 · Codex · Sampada: docs/design/sampada.md §23 · ADR: 007

## Brief — current truth
- Content-Kit 4 is the active local Media/MyGita contract. Canonical CK4 registries are authoritative; files under `runtime/` are generated, read-only compatibility projections rebuilt by publish.
- Canonical model: book → collection → part → semantic variant → item → rendition → asset.
- Paths carry identity only. Part contracts fix file/records representation; variants use content_url.
- Media-global contributor and cue-purpose vocabularies; dedicated defaults.csv per book/type; composition binds a collection item and never a variant.
- Semantic selection precedes capability-based rendition selection. Resolver output explains exact, any, explicit fallback and capability decisions.
- No Content-Kit 3 compatibility or dual publication. Final cutover publishes Media first, then MyGita, in a maintenance window.

## Parts
- [x] Tranche 1 executable contract, fixtures, resolver, coverage and plan shapes — W-0016
- [x] Tranche 2A local Media migration, canonical collection API and derived runtime publication — W-0017, W-0018
- [ ] Tranche 2B product bindings and higher-level mutation-plan builders
- [ ] Tranche 3 coordinated Media-first remote cutover

## Open
- Exact existing-content migration IDs and verification report are implementation outputs, not runtime legacy mappings.
- Media Admin can now implement item and collection-field editing against `collections(media, bookId)`, the shared contract bundle, canonical tree, validation and safe publication workflow.

## Details
- Rachana: docs/design/system/content-kit-4-variants.md
- Source: engine/js/content-kit-v4.js; standalone bundle: engine/js/content-kit-v4.bundle.js.
- Fixtures: engine/tests/fixtures/content-kit-v4/.

## Changes
- 2026-11-08 Tranche 1 contract and representative fixtures created after MyGita/Media Admin design review (Codex)
- 2026-11-08 Tranche 2 migrated all local Media books, activated CK4 in MyGita and exposed canonical files to Media Admin (Codex)
- 2026-11-09 Tranche 2A completed canonical collection joins, ID vocabularies, MIME-derived current renditions and generated read-only runtime publication (Codex)
