# S-19 Independently released books and media
Updated 2026-11-06 · Codex · Sampada: docs/design/sampada.md §19 · ADRs: 001, 002, 003, 004

## Brief — current truth
- Content lives in lotsgj/media (media.gitajyoti.org). mygita holds product config, engine and renderers.
- Logical paths + mounts (ADR-001). CI clones media to ../media; tests read it from there (or MYGITA_MEDIA_ROOT).
- Player is playback-only. File mode remembers the picked media folder (media-folder-store.js).
- content-kit v2 (ADR-002): engine/js/content-kit.js; bundle engine/js/content-kit.bundle.js sets globalThis.MyGitaContentKit.
  API: describe · listProducts · openMedia · contentTree · readItems · updateItem · insertItem · removeItem · newFile · addToManifest · removeFromManifest · checkFile · checkSave · related · publish.
- Consumers outside mygita (e.g. apps/mygita-admin) use content-kit; their design lives with them.
- Schema 3 uses full SHA-256 hashes for every manifest and file. `content_version` is a release label changed once per publish, never by edits.
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
- [ ] deploy and observe the media-only build; source diagnostics to Clarity (from Sampada)

## Open (user)
- Partial language coverage in the player: offer with fallback, or only when a book is complete?

## Details

### Media contract
- catalog.json (schema 3: content_version, mounts[{prefix, remote, local}], books[{book_id, manifest, manifest_hash}])
  → book/<id>/manifest.json (verses, registries, resources, experiences[{id,files}], files[{path,hash}])
  → registries → catalogs and masters.
- All CSVs: '#'-delimited, first line headers, '\n' escapes newlines, '#' not allowed in values, empty lines ignored.
- Validators: media-contract.js (normalizeMediaCatalog, validateBookManifest, safeMediaPath).

### content-kit v2 API (engine/js/content-kit.js)
- listProducts(workspace = __MYGITA_LOCAL_WORKSPACE__) → [{ id, path, name, metadata, bookIds, languages, problems }].
  bookIds = experience.bookIds, else [bookId]; a bookId outside bookIds is reported as a problem.
- openMedia(readText) → { catalog, books: [{ id, manifestPath, manifest, name, languages, problems }], readText }.
  A book that fails validation has manifest null and is read-only.
- contentTree(media, bookId, { sourceLanguage = 'sa' }) → [{ kind, collectionId, title, editable: 'text'|'none',
  files: [{ path, language, contract, editable, views }] }]. Kinds: verses, details, questions, images, audio, deck.
- readItems(file, text, { view }) → { fields: [{ name, editable, type }], items: [{ key, label, values, problems }] }.
- updateItem(file, text, key, values, { view }) → new text; only the affected line(s) change; throws Error with { path, key, field }.

| contract | headers | key | locked | views |
| --- | --- | --- | --- | --- |
| source-master | MASTER_HEADERS.sa | sid | cid, snum, sid, chapter_name | chapters |
| localized-master | LOCALIZED_MASTER_HEADERS | sid | cid, snum, sid, chapter_name | chapters |
| verse-details | VERSE_LOCALIZED_REGISTRY_HEADERS | collection_id | collection_id | — |
| question-master | CONTEMPLATION_MASTER_HEADERS | sid:order | sid, order | — |
| illustration-metadata | ILLUSTRATION_METADATA_HEADERS | sid:order | sid, order | — |

- Field types: text | multiline | number (others reserved: ms, path, enum).
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
- 2026-11-06 content-kit v2, schema-3 publish, complete hashed inventories and incremental PWA media sync implemented and verified locally (Codex)
- 2026-11-04 created from the session discussion (Claude)
- 2026-11-04 editor design removed: mygita-admin is a separate app; context keeps mygita concerns only (Claude)
