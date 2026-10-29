# Architecture overview

**Status:** Current  
**Last updated:** 29 October 2026

## Layers

MyGita is the shared source repository and platform for independently configurable static verse products:

1. `engine/player.html` supplies the reusable application and dialog structure.
2. `engine/css` supplies the shell, editor, and renderer presentation.
3. `engine/js/player/player-core.js` coordinates routing, profiles, collections, renderer selection, audio, editing, events, resume, and PWA behavior.
4. `engine/js/player/renderers` contains experience-specific rendering.
5. `products/gita` owns the Bhagavad Gita collections, experience configuration, product visuals, theme and tests. Its technical folder name remains for compatibility while the shared application identity is MyGita.
6. `products/sukta` provisionally bundles registered Ganesha Atharvashirsha and Purusha Sukta collections and the first **Sukta Chant** experience. It reuses Player-4 under the public `sukta-chant` experience ID; the configured experience currently opens Ganesha Atharvashirsha. The final bundled-versus-independent product decision remains open.
7. `products/app.json` plus the language-specific product registries define the platform-visible product set independently of implementation folder names.
8. The unified build combines `engine` with every enabled registry product and writes `dist/mygita`; GitHub Actions verifies that artifact and publishes it through GitHub Pages. The older named-product builder remains as a regression fixture during migration.

The MyGita repository root owns Rachana and Sampada under `docs`, along with the monorepo package and future `.github` automation. Product builds exclude documentation. The engine owns only reusable Noto Sans font assets; every other visual asset belongs to its product folder.

## Runtime flow

The active profile establishes global interface-language and content-language preferences and remembers its selected product. Home selects a product, then an experience within that product. The requested experience is loaded through product-relative registries and catalogs, normalized by SID, and passed to the registered renderer. Product identity participates in URLs and resume keys; profile identity, language preferences and MyGita shell branding remain platform-wide. Explicit product deep links override the remembered choice for that navigation. Experience configuration can declare generic audio-binding field names, allowing each composition to select a reusable collection and asset order without provider-specific renderer code. Shared controls update location, audio, or shell state. Events fan out to independent adapters.

Distribution configuration also overlays product-specific interface language on the shared dictionaries. The current Bhagavad Gita and provisional Sukta definitions can therefore name their own content language, loading, storage, installation and About surfaces without forking the shell.

Renderers create one DOM element per semantic content field. Responsive CSS places those elements into desktop or mobile layouts rather than maintaining duplicated hidden views. Presentation-only layers may supply panel backgrounds without owning content or edit state.

## Isolation

The active application has no dependency on the archived `x` directory. Deployment explicitly rejects `x`. Rachana remains available from the MyGita source surface and is not copied into a product PWA.

## Typography

The player bundles variable Noto Sans fonts for Latin, Devanagari and Kannada. One CSS family selects the appropriate script face by Unicode range, and rendered verse fields carry `sa`, `en` or `kn` language metadata. All player surfaces use this family; Rachana retains its independent documentation typography. A build script embeds the font data in the player font stylesheet so HTTPS, installed PWA and `file://` mode render identically. The generated stylesheet is part of the offline shell; source fonts and SIL Open Font License notices remain deployment assets without being cached a second time.

## Extension points

Add experiences through configuration, compositions, and renderers registered in `js/player/renderers/registry.js`. Add telemetry or local behavior through event adapters. Add media through reusable type collections rather than embedding provider-specific paths in renderer code. Optional audio cue files are validated and indexed by the collection layer; a future UI can consume that index without changing the source audio.
