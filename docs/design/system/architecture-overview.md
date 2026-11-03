# Architecture overview

**Status:** Current  
**Last updated:** 3 November 2026

## Layers

MyGita is the shared source repository and platform for independently configurable static verse products:

1. `engine/player.html` supplies the reusable application and dialog structure.
2. `engine/css` supplies the shell, editor, and renderer presentation.
3. `engine/js/player/player-core.js` coordinates routing, profiles, collections, renderer selection, audio, editing, events, resume, and PWA behavior.
4. `engine/js/player/renderers` contains experience-specific rendering.
5. `products/gita` owns Bhagavad Gita product identity, experience configuration, product visuals, theme and tests. Scripture content does not live in this folder.
6. `products/sukta` owns the provisional Sukta product configuration and the first **Sukta Chant** experience. Ganesha Atharvashirsha and Purusha Sukta content are independently supplied by media books.
7. `products/app.json` plus the language-specific product registries define the platform-visible product set independently of implementation folder names.
8. The unified build combines `engine` with every enabled registry product and writes `dist/mygita`; GitHub Actions verifies that artifact and publishes it through GitHub Pages. The older named-product builder remains as a regression fixture during migration.
9. `products/app.json` declares the portable media root. MyGita retains only platform code plus stable product identity, experience configuration and branding. The media repository owns all scripture content: verse masters, localized collection metadata, experience associations, chapter icons, questions, decks and reusable binary media.

The MyGita repository root owns Rachana and Sampada under `docs`, along with the monorepo package and future `.github` automation. Product builds exclude documentation. The engine owns only reusable Noto Sans font assets; every other visual asset belongs to its product folder.

## Runtime flow

The active profile establishes global interface-language and content-language preferences and remembers its selected product. Home selects a product, then an experience within that product. The requested experience is loaded through product-relative registries and catalogs, normalized by SID, and passed to the registered renderer. Product identity participates in URLs and resume keys; profile identity, language preferences and MyGita shell branding remain platform-wide. Explicit product deep links override the remembered choice for that navigation. Experience configuration can declare generic audio-binding field names, allowing each composition to select a reusable collection and asset order without provider-specific renderer code. Shared controls update location, audio, or shell state. Events fan out to independent adapters.

Distribution configuration also overlays product-specific interface language on the shared dictionaries. The current Bhagavad Gita and provisional Sukta definitions can therefore name their own content language, loading, storage, installation and About surfaces without forking the shell.

The shared media-source service reads one schema-2 catalog and resolves strict logical paths through explicit `book`, `audio`, `image`, `video`, `deck`, and `docs` mounts. The same resolver serves remote, PWA and selected-folder modes; host placement is not embedded in book or experience catalogs. It validates schema, identity and paths and owns the lifecycle of local object URLs. A book-to-experience adapter combines product-owned experience configuration with manifest-declared registries, masters, associations, chapter icons and media. The adapter produces the existing normalized renderer model; an executable media-only audit covers every row of all four Gita experiences and both Sukta collections.

Web and installed-PWA sessions require the configured remote media book; they do not silently fall back to bundled scripture content. A missing or invalid media source produces an explicit unavailable state. `file://` sessions select the media root once on Home and retain that choice across product and experience changes. Experience declarations map their default and permitted books explicitly. The root catalog is checked fresh; all other content is versioned and progressively cached by logical path plus content version. The complete library is never added to the install shell.

For troubleshooting, the document root exposes `data-content-source`, `data-content-book`, and `data-content-version`. A successful scripture screen reports `media-book`; this makes unintended bundled loading visible to tests and support diagnostics.

Renderers create one DOM element per semantic content field. Responsive CSS places those elements into desktop or mobile layouts rather than maintaining duplicated hidden views. Presentation-only layers may supply panel backgrounds without owning content or edit state.

## Isolation

The active application has no dependency on the archived `x` directory. Deployment explicitly rejects `x`. Rachana remains available from the MyGita source surface and is not copied into a product PWA.

## Typography

The player bundles variable Noto Sans fonts for Latin, Devanagari and Kannada. Each script has a distinct CSS family, and rendered verse fields carry `sa`, `en` or `kn` language metadata that orders the appropriate family first. Kannada Vedic accent marks are deliberately assigned to the Kannada face so Android and installed PWAs shape each base letter and its combining marks together; the Devanagari face remains the fallback for Vedic signs absent from the Kannada font. All player surfaces use these Noto Sans stacks; Rachana retains its independent documentation typography. A build script embeds the font data in the player font stylesheet so HTTPS, installed PWA and `file://` mode render identically. The generated stylesheet is part of the offline shell; source fonts and SIL Open Font License notices remain deployment assets without being cached a second time.

## Extension points

Add experiences through configuration, compositions, and renderers registered in `js/player/renderers/registry.js`. Add telemetry or local behavior through event adapters. Add media through reusable type collections rather than embedding provider-specific paths in renderer code. Optional audio cue files are validated and indexed by the collection layer; a future UI can consume that index without changing the source audio.
