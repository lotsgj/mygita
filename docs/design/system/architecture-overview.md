# Architecture overview

**Status:** Current  
**Last updated:** 16 October 2026

## Layers

Verses is the shared source tree for independently branded static verse applications:

1. `engine/player.html` supplies the reusable application and dialog structure.
2. `engine/css` supplies the shell, editor, and renderer presentation.
3. `engine/js/player/player-core.js` coordinates routing, profiles, collections, renderer selection, audio, editing, events, resume, and PWA behavior.
4. `engine/js/player/renderers` contains experience-specific rendering.
5. `products/gita` owns Gitaverse identity, collections, experience configuration, branding, theme, and product tests.
6. `products/sukta` defines Suktaverse identity, registered Ganesha Atharvashirsha and Purusha Sukta collections, and the first **Sukta Chant** experience. It reuses Player-4 under the public `sukta-chant` experience ID; the configured experience currently opens Ganesha Atharvashirsha. Product artwork and PWA assets remain a later tranche, so a deployable Suktaverse build is not produced yet.
7. Build scripts combine `engine` with one named product and write generated output to `dist/<product>`.

The repository root owns Rachana and Sampada under `docs`, along with the monorepo package and future `.github` automation. Product builds exclude documentation. The engine owns only reusable Noto Sans font assets; every other visual asset belongs to its product folder.

## Runtime flow

The active profile establishes language and resume context. The requested experience is loaded through registries and catalogs, normalized by SID, and passed to the registered renderer. Experience configuration can declare generic audio-binding field names, allowing each composition to select a reusable collection and asset order without provider-specific renderer code. Shared controls update location, audio, or shell state. Events fan out to independent adapters.

Distribution configuration also overlays product-specific interface language on the shared dictionaries. Gitaverse therefore retains Gita wording while Suktaverse can name its own product, content language, loading, storage, installation and About surfaces without forking the shell.

Renderers create one DOM element per semantic content field. Responsive CSS places those elements into desktop or mobile layouts rather than maintaining duplicated hidden views. Presentation-only layers may supply panel backgrounds without owning content or edit state.

## Isolation

The active application has no dependency on the archived `x` directory. Deployment explicitly rejects `x`. Rachana remains available from the Verses source surface and is not copied into a product PWA.

## Typography

The player bundles variable Noto Sans fonts for Latin, Devanagari and Kannada. One CSS family selects the appropriate script face by Unicode range, and rendered verse fields carry `sa`, `en` or `kn` language metadata. All player surfaces use this family; Rachana retains its independent documentation typography. A build script embeds the font data in the player font stylesheet so HTTPS, installed PWA and `file://` mode render identically. The generated stylesheet is part of the offline shell; source fonts and SIL Open Font License notices remain deployment assets without being cached a second time.

## Extension points

Add experiences through configuration, compositions, and renderers registered in `js/player/renderers/registry.js`. Add telemetry or local behavior through event adapters. Add media through reusable type collections rather than embedding provider-specific paths in renderer code. Optional audio cue files are validated and indexed by the collection layer; a future UI can consume that index without changing the source audio.
