# Log (append only)

## W-0001 · 2026-11-03 · Codex · S-19 · media-only playback
Commits: mygita b12ac6e · Scripture content loads only from media; products keep configuration.

## W-0002 · 2026-11-03 · user · S: fix · CI clones the media repo
Commits: mygita ba395ad (edited on GitHub; author "Gita Jyoti") · .github/workflows/deploy-pages.yml clones lotsgj/media to ../media.

## W-0003 · 2026-11-03 · Codex · S-19 · logical paths + mounts
Commits: mygita 9542b94, media e7b1f34 · catalog schema 2 with mounts; logical paths; generated manifest files; Gita Sara persistence fix.

## W-0004 · 2026-11-04 · Codex · S-19 · playback-only player
Commits: mygita d6930b5 · Edit mode removed (editor.js, editor.css, WritableCollectionWorkspace); media folder remembered (media-folder-store.js).

## W-0005 · 2026-11-04 · Codex · S-21 · content languages + panels
Commits: mygita 50b7b2c · language-model.js; languages + panels per product in distribution.json. CI #8 green on re-run.
Follow-ups: docs.bundle.js stale; remaining hardcoded en/kn (features/19-independent-media.md › Languages).

## W-0006 · 2026-11-04 · Claude · S-19 · content-kit v1
Commits: mygita a2faa16 · CI #9 green
Changed: engine/js/content-kit.js (+ content-kit.bundle.js, scripts/build-content-kit.mjs, 2 test files); collection-data.js exports; encode restored.
Tests: unit 51, contract 26, gita 6, sukta 2, 4 browser suites — all pass.
Follow-ups: editor UI (S-19); later related()/checkSave() for audio.

## W-0007 · 2026-11-04 · Claude · S: — (agent workflow) · agent instructions + shared context
Changed: AGENTS.md, CLAUDE.md (global rules: approval first, Sampada alignment); context/ (README, now, log, adr, features/19-independent-media.md);
docs/design/sampada.md adds S-21 (To unfold, Major).

## W-0008 · 2026-11-04 · Codex · S-21 · panel languages in My Preferences
Changed: removed panel languages from the player menu; existing profiles receive product-grouped experience cards in My Preferences; first-time setup remains simple.
Tests: unit 51, contract 26, Gita and Sukta browser regressions; Gita browser covers hidden-first-use, persistence and reset.

## W-0009 · 2026-11-04 · Codex · S: fix · refresh Rachana bundle
Changed: rebuilt docs/assets/docs.bundle.js from the current shared profile and documentation sources.
Tests: contract 26 pass.

## W-0010 · 2026-11-04 · Codex · S: fix · stabilize media reselection
Changed: generation-guarded media source replacement and experience loads; stale selections cannot overwrite current state; file input resets after use; shared ProfileUI tolerates Rachana without experience controls.
Tests: unit 52; exact CI build/test sequence; Rachana browser; five consecutive Gita browser runs with five file-mode reselections each.

## W-0011 · 2026-11-05 · Codex · S-19 · faster experience opening
Changed: catalog checks occur once per app opening; parsed registries and masters are shared across experiences for the session; ordinary verse experiences render canonical text before audio and visual metadata finish hydrating. Explicit refresh and media-source replacement invalidate the relevant caches.
Tests: engine 6, unit 52, contract 26, Gita contract 6, and Gita browser regression pass.

## W-0012 · 2026-11-06 · Codex · S-19 · content-kit v2 + per-file media sync
Changed: centralized data-driven contracts and generic local-editor API; schema-3 full SHA-256 inventories and publish/validate workflow; hash-addressed progressive cache; changed metadata prefetch; lazy binaries; 24-hour foreground check; safe navigation-boundary activation.
Media: catalog and three book manifests migrated; duplicate validation replaced by content-kit checks and idempotent publish validation.
Tests: engine, unit, contract, Gita/Sukta contracts, platform/Gita/Sukta/Rachana browser regressions, production build and Media tests pass locally.

## W-0013 · 2026-11-07 · Codex · S-19 · Content-Kit 3 Tranche 1
Changed: unified deterministic 3.x kit identity; split-ready mount inventory; explicit file contracts and typed fields; manifest-driven collection tree; pure reference graph and grace-aware move plans; minimum-kit guard.
Media: catalog, book manifests, `media.ver`, and 1,106-file hashed inventory migrated to Content-Kit 3; reproducible inventory builder and validation added.
Docs: Rachana, Sampada, S-19 and ADRs aligned; Tranche 2 retains runtime/PWA inventory cutover, multi-mount publishing and retiring-path cleanup.
Tests: MyGita unit 61 and contract 26; Media contract 4; full browser regression and production build passed during implementation; final generated bundles match source.

## W-0014 · 2026-11-07 · Codex · S-19 · Content-Kit 3 contract hardening
Changed: tree language and experience assignment now use manifest/registry relationships only; illustration `alt_text` is explicitly multiline; kit compatibility compares numeric majors and rejects malformed versions.
Transition: mount prefixes are documented and tested as authoritative runtime routing only until the Tranche 2 inventory cutover; they do not express Content-Kit ownership.
Tests: MyGita unit 61 and contract 26; focused Content-Kit/docs 28; Media contract 4; generated bundles and whitespace checks pass.

## W-0015 · 2026-11-07 · Codex · S-22 · analytics integration-test backlog
Changed: Sampada records deterministic local Clarity/GA stubs for blocking browser regression and a separate optional non-blocking live-provider smoke check.
Reason: CI run 42350581717 passed application tests but was blocked by an exception inside Clarity's externally hosted beta script.

## W-0016 · 2026-11-08 · Codex · S-23 · Content-Kit 4 Tranche 1
Changed: frozen separate v4 contract and standalone bundle for parts, variants, renditions, defaults, structured identity, generic bindings, resolver explanations, coverage and idempotent publication plans; active v3 runtime unchanged.
Fixtures: representative verse, question, image, audio, composition and transaction data for parallel Media Admin/MyGita implementation.
Docs: S-23 added to Sampada; Rachana contract, S-23 context and ADR-007 record the clean three-tranche Media-first cutover.
Tests: focused v4/docs 20, full unit 68, full contract 29, production MyGita build and whitespace checks pass.

## W-0017 · 2026-11-08 · Codex · S-23 · Content-Kit 4 Tranche 2
Changed: activated CK4 across MyGita and locally migrated all three Media books to canonical collection/variant/default registries. Renderer compatibility is explicitly separated under `runtime_view`; inventory-owned mounts no longer depend on prefixes.
Media Admin: unblocked on the shared CK4 bundle, content tree, file contracts, validator and idempotent publisher.
Tests: Media 4/4; MyGita unit 68/68 and contract 29/29.

## W-0018 · 2026-11-09 · Codex · S-23 · Content-Kit 4 Tranche 2A hardening
Changed: added the canonical `collections(media, bookId)` join and one tree node per collection; defined stable item keys and default-variant coverage authority; added Media-wide contributor/cue-purpose registries; corrected image versus metadata parts; and derived current renditions from inventory MIME type and hash.
Publication: canonical CK4 metadata now regenerates read-only `runtime/` compatibility files; direct runtime edits are blocked; the Media publisher refreshes inventory, manifests, catalog and `media.ver` after generated writes.
Tests: publish acceptance proves a canonical title edit reaches the runtime copy and its hashes; all canonical variants validate against real language/contributor registries. Product bindings and higher-level mutation-plan builders remain Tranche 2B.

## W-0019 · 2026-11-09 · Codex · S-23 · Content-Kit 4 contract completion
Changed: added Media-wide language IDs and validator-ready registries, contract-owned English labels, declared lexicographic attribute priorities, preference-side `any` semantics and scalar-only `none` validation.
Tests: MyGita 115 non-browser checks; Media 4/4 plus validator over 1,155 files and three books.
