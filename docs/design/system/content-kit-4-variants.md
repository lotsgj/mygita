# Content-Kit 4 variant contract

**Status:** Partial  
**Last updated:** 9 November 2026

Content-Kit 4 makes content variation explicit data. Its executable contract is frozen and the local Media/MyGita integration is complete. Canonical CK4 registries are authoritative; the existing renderers consume an explicitly isolated `runtime_view` until their normalized input layer is replaced. Files under `runtime/` are generated, read-only projections rebuilt during publication.

## Canonical model

The hierarchy is **book → collection → part → semantic variant → item → rendition → asset**. A book is a digital book; a collection is reusable content of one type within that book; a part is a component with its own dimensions and key space; a semantic variant differs by meaning or presentation; a rendition is another physical delivery of that same semantic content; and an asset is one inventoried physical file.

Paths identify files only. Filenames and folders never determine language, mode, voice, theme, ownership or experience membership.

## Content types and parts

The initial types are verse, question, image, audio, video and deck. Every type supports localized `collection-metadata`. Verse and question text are file-level parts. Image metadata is file-level while image items are records. Audio and video recordings are records. The part contract fixes representation and every variant row uses `content_url`.

Icon is not a separate type: chapter icons are an image collection whose configured binding expresses their use.

## Attributes and renditions

Semantic attributes include ordered languages, voice, mode, theme and subtitles. Variant-side `any` is a wildcard fallback ranked below an exact match. Preference-side `any` means the caller is indifferent to that attribute; defaults and later tie-breakers decide. `none` has no value and is eligible only when explicitly requested, explicitly listed as a fallback, or the caller is indifferent. It is a scalar sentinel and cannot appear inside an ordered language list. An omitted attribute does not apply to the part.

Format and optional quality, dimensions, resolution, bitrate and sample rate are rendition attributes. Resolution always selects a semantic variant before selecting a supported rendition. Current Media catalogs derive one rendition for each referenced asset from the inventory MIME type and hash; filenames do not determine format. Dedicated rendition registries remain a later extension.

## Identity and registries

A collection is identified by book, content type and collection ID. A variant is additionally scoped by part and variant ID; a rendition ID is scoped by its variant. Binding-slot IDs are scoped by product and configured experience. Language, contributor and cue-purpose IDs are Media-global.

Variant registries live at `registry/<type>/<part>-variants.csv`; rendition registries use `<part>-renditions.csv`; and `registry/<type>/defaults.csv` holds one default variant per collection part. Languages, contributors and cue purposes are ID-based, Media-wide vocabularies declared by the root catalog. Ordered languages serialize as comma-separated BCP-47 codes, preserving order. The kit exposes these registries in validator-ready form, so callers do not rebuild ID lists.

Item keys follow each part contract's declared key components. A single component remains unchanged; compound components join with `:` in declaration order, so `sid + order` becomes `1.1:2`. The default variant of a part defines its `expected_keys`; coverage compares every other variant with that stable baseline.

## Composition and configured experiences

Composition rows name a binding slot, structured collection identity and logical item key. They never name a variant. Product experience configuration defines each slot's content type, part, semantic preferences, rendition preferences, profile-language behavior and the composition fields that supply collection and item identity. `configuredExperiences()` normalizes Gita and Sukta configurations and their existing composition files into the same kit-4 rows. The player and Media Admin therefore consume one binding declaration without `audioBinding` or UI-side interpretation.

The shared resolver combines profile preferences, configured-experience preferences, product defaults, collection defaults, capabilities and explicit fallbacks, then returns the chosen variant and rendition together with its reasoning. Semantic attributes are compared lexicographically in each part contract's declared priority order; a lower-priority exact match cannot outweigh a higher-priority preference. `usage()` reports every product, experience and binding slot using a collection; variant-specific usage applies the same resolver.

## Coverage and segments

Intrinsic coverage compares variants with their part's declared baseline key space. Usage coverage compares a collection with a book or configured-experience sequence. Sparse optional collections remain valid; missing coverage is pending unless completeness is explicitly required.

Segment meaning and order are semantic, while timings are bound to a rendition and pinned asset hash. This single model supports audio, video and slide timelines. Replacing a segmented asset without revalidating its timing bindings blocks publication.

## Plans and I/O

Content-Kit is pure. It returns operations with stable IDs, logical paths, precondition hashes or absence checks, and postcondition hashes. Media Admin performs I/O and journals progress. Plans are idempotent and order assets before inventories, content and registries before manifests, the root catalog after manifests, and `media.ver` last.

## Delivery tranches

Tranche 1 froze the executable contract, standalone bundle, fixtures and tests. Tranche 2 migrated Media, activated CK4 in MyGita, added `collections(media, bookId)`, exposed one tree node per canonical collection, made renderer runtime files derived and read-only, and supplied Media Admin with a safe publisher. Product binding slots, higher-level mutation-plan builders and remote cutover remain later work. Tranche 3 publishes Media first and MyGita second in a controlled maintenance window. Content-Kit 4 is a clean remote cutover: there is no Content-Kit 3 compatibility or dual publication.

The executable source is `engine/js/content-kit-v4.js`; representative fixtures are under `engine/tests/fixtures/content-kit-v4/`.
