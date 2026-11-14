# S-19 Independently released books and media
Updated 2026-11-07 · Codex · Sampada: docs/design/sampada.md §19 · ADRs: 001, 002, 003, 004, 005, 006

## Brief — current truth
- Content lives in `apps/gita-jyoti/media` (`lotsgj/media`, served by media.gitajyoti.org). `apps/gita-jyoti/mygita-app` holds product config, engine and renderers.
- Logical paths + mounts (ADR-001). CI clones media to ../media; tests read it from there (or MYGITA_MEDIA_ROOT).
- Player is playback-only. File mode remembers the picked media folder (media-folder-store.js).
- Content-Kit 3 Tranche 1 is the pure contract layer used by `apps/gita-jyoti/media-admin`. Version 3.20261107-051550 freezes the mount inventory, collection tree, declared field types, reference graph and transaction-plan shape; callers own all I/O.
- Codex owns `mygita-app`; Claude owns `media` and `media-admin`; `website` is Codex-owned in a separate conversation. Cross-repository changes go through the user as hand-offs.
- Media scripts consume `engine/js/content-kit.js`, `engine/js/media-contract.js`, `engine/js/content-kit-v4-version.js` and the MyGita root for publishing. Keep these MyGita-owned paths stable or hand a coordinated move to Claude.
- Media has one split-ready mount inventory with 1,106 explicitly contracted files. Logical path is identity; cache identity remains path + SHA-256. Mount `prefixes` remain authoritative transitional runtime routing metadata—not Content-Kit ownership—and book-manifest hashes remain transitional until the Tranche 2 inventory cutover.
- A running app checks `catalog.json` when its media source opens and on foreground return only after 24 hours. Changed manifests cause only changed CSV/JSON to prefetch; binaries remain lazy. A pending revision activates at the next navigation boundary.
- Simple verse experiences render their canonical text first, then hydrate audio and visual metadata without moving the user away from the verse.

## Parts
- [x] media-only playback — W-0001
- [x] logical paths + mounts — W-0003
- [x] playback-only player — W-0004
- [x] content-kit v1 — W-0006
- [x] session catalog/table cache and text-first experience hydration — W-0011
- [x] content-kit v2 contracts, connected checks and generic edit operations — W-0012
- [x] schema-3 publish step and complete per-file hashed inventories — W-0012
- [x] per-file PWA sync, safe cache replacement and 24-hour foreground check — W-0012
- [x] Content-Kit 3 Tranche 1: mount inventory, collection tree, typed contracts, reference graph and Admin API — W-0013
- [ ] Content-Kit 3 Tranche 2: writable plans, multi-mount publishing, runtime/PWA inventory cutover and grace-period cleanup
- [ ] deploy and observe the media-only build; source diagnostics to Clarity (from Sampada)

## Open (user)
- Partial language coverage in the player: offer with fallback, or only when a book is complete?
- Authoritative product references across separately released Media and MyGita repositories; local product references are advisory in Tranche 1.
- Offline media packages are a separate future feature, not a side effect of Content-Kit sync.

## Details

### Content-Kit 3 media contract
- Version is major.generated-minor: `3.CCYYMMDD-HHMMSS`. Major changes only with human approval; the UTC minor is stamped once in tracked source, so rebuilds are deterministic. KIT_BUILD is the reproducible bundle-source hash.
- Bootstrap: media.ver → catalog.json → mounts[].inventories[{id,path,hash}] → physical files. A mount inventory entry declares path, media_type, mime_type, size, hash, contract and state. Inventory parts can be split later without changing the catalog contract.
- Logical path is globally unique identity. A contract is the sole authority for `single`, `records` or `segments`, keys and field types; inventory entries do not repeat that shape.
- File language and experience membership come only from manifest and registry relationships; Content-Kit does not infer semantics from filenames or directory paths.
- media.ver carries the catalog hash and kit version. Tranche 2 will add hash-before-activation, segment/file hash pairing, secondary-mount-first publication and retiring-path grace periods.
- Book manifests remain domain structure: verses, registries, resources and experiences. Books do not own physical files.
- All CSVs: '#'-delimited, first line headers, '\n' escapes newlines, '#' not allowed in values, empty lines ignored.
- Validators: media-contract.js (normalizeMediaCatalog, validateBookManifest, safeMediaPath).

### Content-Kit 3 API (engine/js/content-kit.js)
- listProducts(workspace = __MYGITA_LOCAL_WORKSPACE__) → [{ id, path, name, metadata, bookIds, languages, problems }].
  bookIds = experience.bookIds, else [bookId]; a bookId outside bookIds is reported as a problem.
- openMedia(readText) → { catalog, books: [{ id, manifestPath, manifest, name, languages, problems }], readText }.
  A book that fails validation has manifest null and is read-only.
- contentTree(media, bookId) is manifest/registry driven. It returns separate verse, detail, contemplation, illustration, chapter-icon, audio, deck, experience, registry and manifest nodes; `files` are direct definitions and `uses` are cross-node dependencies. `resources` is a physical inventory view, not ownership.
- readItems(file, text, { view }) → { fields: [{ name, editable, type }], items: [{ key, label, values, problems }] }.
- updateItem(file, text, key, values, { view }) → new text; only the affected line(s) change; throws Error with { path, key, field }.

| contract | headers | key | locked | views |
| --- | --- | --- | --- | --- |
| source-master | MASTER_HEADERS.sa | sid | cid, snum, sid, chapter_name | chapters |
| localized-master | LOCALIZED_MASTER_HEADERS | sid | cid, snum, sid, chapter_name | chapters |
| verse-details | VERSE_LOCALIZED_REGISTRY_HEADERS | collection_id | collection_id | — |
| question-master | CONTEMPLATION_MASTER_HEADERS | sid:order | sid, order | — |
| illustration-metadata | ILLUSTRATION_METADATA_HEADERS | sid:order | sid, order | — |

- Field types are declared per contract: text, multiline, number, ms, hash, media-path, external-url, enum and semantic-reference. Unknown contracts are blocking for tooling; a future runtime below catalog.minimum_kit_version retains its last-known-good catalog.
- buildReferenceGraph(documents) is the one forward/reverse path graph. related() uses it; exact structured product collection references replace substring matching. Product references remain advisory until cross-repository release order is designed.
- planMove(graph, from, to, grace) returns a pure transaction shape with reference writes, retirement, and secondary-to-primary publish order. Content-Kit performs no filesystem/network writes; Media Admin executes plans.
- view 'chapters': one item per cid with chapter_name; saving updates every row of that cid in the same file.
- Tests: engine/tests/unit/content-kit.test.mjs (round trip on every editable media file), engine/tests/contract/content-kit-bundle.test.mjs (freshness, parity, not deployed).

### Future: connected edits (audio, cues, assets)
- Chain: registry/audio row (catalog_url, cue_purpose_url, cue_url) → audio catalog row (sid, order, language, audio_url) → asset;
  cue rows (sid, asset_order, cue_order, cue_id, start_ms, end_ms) → catalog row; cue_id → cue purposes;
  experience/<exp>/audio.csv (sid, <x>_collection, <x>_order) → catalog row.
- Still one file per save: save what is referenced before what references it; delete in reverse.
- checkSave errors: blocking (dangling reference, invalid) refuses the save; pending (unused file or row) is allowed.

### Languages (review of W-0005)
- Roles: source (book), content (product offers), interface (i18n dictionaries).
- Review notes for Codex:
  1. Language registry is defined 3× (gita and sukta distribution.json, distribution.js fallback) → define once in products/app.json.
  2. Source language is declared per product; it is a book fact → add languages.source to each book manifest.
  3. Hardcoded en/kn remain: resume-adapter.js:14, profile-analytics.js:36, media-player.js:92, text-player.js:54,
     gita-yoga.js:40, verse-chant.js:107, i18n.js:4 (SUPPORTED_INTERFACE_LANGUAGES), collection-data.js loops over ['en','kn'],
     MASTER_HEADERS keyed by code, LOCALIZED_REGISTRY_FIELDS / per-language registry columns (master_en_url, metadata_kn_url, …).
  4. Old product-path loaders look unused (COLLECTION_ROOT 'data/collections', loadCollectionExperience, …FromFiles, …FromDirectory).

### Product → book
- distribution.json experiences carry bookId and bookIds; experience.json carries verseCollection and verseCollections.
  Sukta Chant: the single-value fields name only ganesha-atharva. Proposal: keep bookIds only.

## Changes
- 2026-11-14 recorded the final sibling-repository layout, agent ownership and cross-repository hand-off boundary (Codex)
- 2026-11-07 Content-Kit 3 contract hardening removed language/experience path inference, corrected illustration metadata typing, made version comparison major-aware, and clarified transitional prefix routing (Codex)
- 2026-11-07 Content-Kit 3 Tranche 1 implemented: deterministic 3.x identity, split-ready mount inventory, explicit contracts and field types, separate collection tree, pure reference/move planning, and Media validation across 1,106 files (Codex)
- 2026-11-06 content-kit v2, schema-3 publish, complete hashed inventories and incremental PWA media sync implemented and verified locally (Codex)
- 2026-11-04 created from the session discussion (Claude)
- 2026-11-04 editor design removed: mygita-admin is a separate app; context keeps mygita concerns only (Claude)
