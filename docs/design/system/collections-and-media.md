# Collections and media

**Status:** Current  
**Last updated:** 7 November 2026

## Ownership boundary

MyGita product folders contain configuration, not scripture content:

```text
products/<product>/data/distribution.json
products/<product>/data/experiences/collection.csv
products/<product>/data/experiences/<experience>/catalog.csv
products/<product>/data/experiences/<experience>/experience.json
```

All verse masters, collection registries, localized collection names, chapter icons, questions, decks and experience association CSVs live in media. Build guards reject a product distribution containing a `data/collections` tree or content association files.

## Portable media root

Canonical mutable content is being separated from application releases into one independently deployable media root:

```text
media.ver
catalog.json
files.json
book/<book-id>/manifest.json
book/<book-id>/verses/...
book/<book-id>/questions/...
book/<book-id>/illustration/...
book/<book-id>/audio/...
book/<book-id>/experience/...
audio/...
image/...
video/...
deck/...
docs/...
```

Content-Kit 3 introduces a physical inventory per mount. `media.ver` cheaply identifies the current root catalog; `catalog.json` lists mount inventory parts with hashes; and each inventory declares every physical path’s MIME type, size, SHA-256, contract and lifecycle state. Paths remain readable global identities and references in existing CSV/JSON remain unchanged. Contracts—not directory-name inference—define whether a file is a single resource, keyed records or segmented media and declare its keys and field types. Language and experience membership likewise come from explicit manifest and registry relationships, never filenames or folders. Book manifests remain domain structure rather than physical ownership. Current mount prefixes are authoritative transitional runtime routing metadata, but do not express Content-Kit ownership; prefix routing and duplicate book-manifest hashes will be removed during the Tranche 2 runtime inventory cutover.

`products/app.json` declares the bootstrap location of `catalog.json`. After that one read, every owned reference is a strict logical path. Paths cannot be absolute, contain backslashes, escape with dot segments, or use an undeclared namespace. The engine’s one resolver selects the mount and produces either a versioned remote URL or a file from the selected local mount. Local binaries receive managed object URLs that are revoked when the source is released. Owned absolute URLs and implicit legacy-path guessing are deliberately unsupported; external provider URLs are permitted only inside an explicit provider descriptor such as a Google Deck descriptor.

The service is deliberately separate from renderers. The book-to-experience adapter combines manifest-declared content with product-owned experience configuration and passes the result through the existing normalization pipeline. It supports shared resources across experiences and records the active book content version on the normalized dataset.

`pnpm run verify:media-parity` is a strict media-only audit. It proves that Gita 700, Gita Yoga, Gita Chant, Gita Sara, Ganesha Atharva and Purusha Sukta normalize successfully without a bundled scripture source.

Web and PWA sessions load the remote media book. If validation or loading fails, the app reports that content is unavailable; it never substitutes a bundled scripture copy. The root catalog is fetched when the media source opens. A foreground return checks it only when the previous check is at least 24 hours old. If a book manifest hash changed, the app fetches that manifest, compares per-file hashes, and prefetches only changed CSV/JSON metadata. Binary media remains lazy. A pending content revision never interrupts the current verse or audio; it becomes active at the next navigation boundary. Every remote request carries the logical path and file hash, and the service worker keys cached bytes by those values rather than by physical host URL. Once a replacement is stored successfully, older cached revisions of that path can be evicted. Media is never precached during PWA installation.

In `file://` mode, the app’s product configuration is already embedded in a built distribution or supplied by the local development harness. Home therefore asks for the media root once, validates `catalog.json`, and reuses that source across products and experiences. On browsers with the File System Access API, MyGita stores the opaque directory handle in IndexedDB. A later session automatically restores a still-authorized folder; when the browser requires permission again, Home offers a user-initiated reconnect. Home also permits changing the folder, retaining the previous remembered choice when validation of a replacement fails, or explicitly forgetting it. Folder-upload fallback follows the same content contract but cannot persist files across browser restarts. MyGita contains no legacy product-data editor because products no longer own editable scripture files; writable media authoring remains a separate future workflow requiring conflict and version design.

The verse registry keeps structural metadata language-neutral:

```text
collection.csv: collection_id#order#enabled#path#catalog_url
```

Human-facing collection metadata is stored separately in `collection_sa.csv`, `collection_en.csv`, and `collection_kn.csv`, each using `collection_id#name#short_name#description`. Identity and ordering must agree across the four files. The shared player uses `short_name` in its compact collection pill and `name` plus `description` in the chooser, falling back to English and then `collection_id` when a localized value is absent.

An experience may declare `verseCollections` to expose more than one canonical verse collection. Its original `verseCollection` remains the default. Collection-specific composition files are declared through `collectionResources` when the collections do not share SID identities. This keeps verse masters reusable while preventing one collection’s audio or image associations from leaking into another.

See [How catalogs become experiences](catalog-to-player.md) for the complete hierarchy, the authoritative role of `sequence.csv`, and worked Gita 700, Gita Yoga, and Gita Sara examples.

## Verse masters

The Bhagavad Gita verse catalog points to `master_sa.csv`, `master_en.csv`, and `master_kn.csv`. Each master contains every SID in the same canonical order, even when some content fields are empty.

- Sanskrit: `cid`, `snum`, `sid`, `chapter_name`, `shloka_raw`, `shloka`, `word_by_word`, `meaning`, `word_by_word_meaning`.
- English and Kannada: `cid`, `snum`, `sid`, `chapter_name`, `transliteration`, `meaning`, `word_by_word_meaning`.

`shloka_raw` preserves the unformatted Sanskrit source. `shloka` is the independently maintained presentation value and may contain intentional line breaks for rendering. The player displays `shloka`; it does not automatically regenerate one field from the other during loading or editing.

`#` is prohibited in values because files are hash-delimited. Intentional line breaks are encoded as `\n`. Display line-break markers belong in `shloka`, not `shloka_raw`.

## Media

Media is owned by reusable collections, not by an experience. A catalog uses SID plus order as the unique identity, permitting multiple assets for one SID and reuse across experiences.

The audio registry uses:

```text
collection_id#title#contributor#language#catalog_url#cue_purpose_url#cue_url#attribution#license#source
```

Each audio catalog uses `sid#order#language#audio_url`. Gita 700’s composition uses the purpose-specific fields `chant_full_sa_collection` and `chant_full_sa_order`. Gita Yoga uses `audio_collection` and `audio_order`; its `experience.json` declares those names through `audioBinding.collectionField` and `audioBinding.orderField`. This generic binding lets future experiences define their own composition vocabulary without placing provider paths in a renderer.

`audio_url` is a logical path such as `audio/bhagavad-gita/chanting-swami-brahmananda/sa/chapter-01/01-001.mp3`. In web and PWA sessions its mount currently resolves beneath `https://media.gitajyoti.org/`; in `file://` mode the same logical path resolves inside the selected `media` folder and is exposed through a temporary `blob:` URL. The Swami Brahmananda collection uses MP3; the AJ Padma and AJ Vijay learning collection uses OGG.

MyGita stores audio binding configuration only; audio registries, catalogs, cue-purpose definitions, cue timings and binaries belong to Media. Production audio binaries do not belong in this repository or its deployment artifact. The build excludes MP3, M4A, OGG, Opus, and WAV files as a defensive boundary, while contract tests fail if a production audio binary enters the application source or distribution.

The PWA does not precache the media library. The resolver marks owned requests with logical identity and the file’s SHA-256; the service worker therefore remains independent of the physical media origin, fetches with anonymous CORS, and progressively caches only content the person uses. Cached recordings retain byte-range behavior for seeking.

Gita 700’s image composition references its chapter icons through the same reusable-collection principle.

## Gita Sara

Gita Sara is a registered experience with 135 explicitly ordered SIDs: nine Dhyana verses followed by 126 selected Gita shlokas. Its `sequence.csv` is the sole owner of experience membership and order independently of the 746-row canonical master order. Audio remains a complete purpose-specific manifest; optional media compositions are sparse.

Gita Sara’s audio composition references the reusable Swami Brahmananda collection for all 126 numbered shlokas. The nine Dhyana rows remain present with blank audio references because that collection has no matching recordings.

The reusable `deck` type has a Google-deck collection whose catalog uses `sid#order#language#deck_url#title`. Here `deck_url` is a logical `deck/...json` descriptor path, not the provider URL. The descriptor declares schema, provider, external source and minimal display settings; a provider adapter converts it to the playable embed URL. Experience composition uses `sid#order#deck_collection#deck_order`, allowing more than one explicitly ordered deck per SID. A SID without a deck has no composition row.

The loader converts an approved Google Slides share URL to an HTTPS embed URL and adds `rm=minimal` together with non-autoplay parameters. A missing deck never blocks text or audio.

The three-panel renderer uses reusable illustrations and contemplation lines. Illustration catalogs use `sid#order#image_url`; English and Kannada metadata use `sid#order#alt_text#caption`. A local catalog entry is valid only when its file exists, and files use `<sid>-<order>.webp`, for example `1.1-1.webp`. Text catalogs use `sid#order#line_type`; localized masters use `sid#order#text`. Catalog and localized records align exactly by SID plus order.

Gita Sara composes source-specific assets through sparse `illustrations.csv`, `decks.csv`, and `contemplations.csv` files. Its sparse unified `media.csv` supplies cross-type order through `media_type`, collection, and asset order. Composition rows exist only for actual associations; their SIDs must belong to `sequence.csv` and remain in its relative order. Missing illustration or contemplation associations resolve to shared defaults.

Owned image URLs are strict `image/...` logical paths. External provider URLs do not appear in image catalogs. Normalized media retains catalog and resolved identities. Reusable image and question defaults are declared once in `experience.json` and applied only when no authored media or question exists. The normalized model exposes `media.items` and `contemplation.lines`, including localized content and `isFallback` markers.

## Audio cues

An audio collection may optionally declare both cue files in its registry row:

- `cue-purpose.csv`: `cue_id#language#purpose#description`
- `cue.csv`: `sid#asset_order#cue_order#cue_id#start_ms#end_ms`

The two URLs must be supplied as a pair. The loader validates cue identifiers, ordering, non-overlap, time ranges, asset references, and uniqueness, then builds an index by collection, SID, and asset order. Invalid cue metadata is isolated from ordinary verse and audio loading so the source recording remains usable without segment controls.

The current AJ Padma and AJ Vijay collection does not yet publish cue files. Cue-region display and segment playback are therefore not active. The cue contract has automated fixture coverage, including a 4,500-record performance case, so production cue files can be added without changing the collection model.

Gita Yoga’s composition deliberately contains all canonical SIDs even though its learning-mode audio is still being produced. Blank collection/order values mean that no recording is available for that SID; text rendering and navigation remain available.

## Validation

The loader verifies required headers, unique/aligned SIDs, catalog references, mounts, logical media paths, manifest hashes and per-file hashes before producing normalized rows. Content-Kit 3 additionally validates mount-inventory uniqueness, explicit contracts, declared field types, complete semantic-tree assignment and reference integrity. The current Media root validates 1,106 physical files across Bhagavad Gita, Ganesha Atharva and Purusha Sukta. Tranche 2 will make these inventories authoritative for runtime resolution and publishing. HTTP and file chooser loading continue to share the same resolution rules.

## Runtime source

A shared collection-source service owns runtime loading. Web and PWA sessions use the configured remote media root; file-mode sessions use the media folder selected on Home. It caches normalized datasets by experience and book and also shares parsed immutable registries and verse masters across experiences in the same session. Replacing or explicitly refreshing a source clears those caches and revokes local object URLs. For ordinary verse experiences, canonical masters and sequence data form a usable text-first dataset; the player displays that verse immediately and hydrates audio and visual metadata when their registries and catalogs finish. Rich composed experiences such as Gita Sara retain their atomic load boundary. A local media selection is strict—invalid or incomplete content is reported rather than silently replaced.
