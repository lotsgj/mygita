# MyGita platform and product model

**Status:** Current  
**Last updated:** 29 October 2026

## Naming decision

**MyGita** is both the shared platform name and the intended user-facing app brand. The source repository is `lotsgj/mygita`, with one local working tree that currently contains the engine, documentation and initial product definitions.

The current Bhagavad Gita distribution still carries the technical product folder `products/gita`, the Gitaverse app identity and the `gitaverse.gitajyoti.org` origin. Renaming that product folder, changing the public app identity and migrating installed PWAs are separate changes; the platform decision does not pretend those transitions are already complete.

## The hierarchy

- **Platform** — the shared MyGita engine, design system, profiles, local journey model, authoring support, tests, build tools and documentation.
- **Product** — an independently buildable and potentially independently deployed content offering with its own identity, configuration, PWA, origin and local-data namespace.
- **Collection** — a reusable scripture, composition or media set, such as Bhagavad Gita, Ganesha Atharvashirsha, Purusha Sukta or a chanting collection.
- **Experience** — a purposeful way to engage with one or more collections, such as chanting, guided learning, complete reading or contemplation.
- **Renderer** — the reusable presentation implementation selected by an experience.

A scripture does not automatically need to be a product. Several related scriptures can remain collections within one product while retaining independent catalogs, masters, navigation and media.

## Initial product direction

The repository currently contains:

- `products/gita` — the Bhagavad Gita product definition; a later change may rename the folder and public identifiers to `bhagavad-gita`.
- `products/sukta` — a provisional Sukta product containing Ganesha Atharvashirsha and Purusha Sukta as distinct verse collections.

An **Advaita Chants** product is an approved direction but is not yet present. Compositions such as Nirvana Shatkam and Upadesa Saram should begin as independent collections inside that product unless a distinct audience, brand, domain, navigation model, release cycle or storage boundary justifies a separate product.

The same rule applies to Suktas: start with a coherent bundled product, preserve collection boundaries, and split a collection into its own product only when the user or operational need is clear.

## Repository and distribution strategy

MyGita is initially a single source repository capable of building multiple products. Each build combines the shared engine with one product definition and writes an isolated distribution. Products may later publish to separate deployment repositories and domains.

The shared platform registry now lives directly under `products/`:

- `app.json` owns MyGita-wide identity, storage/cache compatibility, supported languages and the default product.
- `collection.csv` owns stable product IDs, implementation folder paths, order and enablement. A product ID is a durable user-data and URL identity; it is deliberately independent of a folder name.
- `collection_en.csv` and `collection_kn.csv` own localized product names, short names and descriptions.
- each registered product continues to own its experiences, collections, translations and product visuals through its `data/distribution.json` and product folder.

Home reads this registry and presents product pills above the experience cards. Selecting a product changes the cards to that product without changing the global profile or content-language preference. URLs and resume records carry product plus experience, collection and SID, so **Continue your journey** can return to the actual latest product even when another product is currently selected.

The shared Home title, browser title, About surface, installation/update wording, icons and PWA manifest remain **MyGita** when products change. These platform surfaces come from `products/app.json`; a product distribution cannot rename the shell. The selected product is remembered per profile. A direct URL with an explicit `product` parameter takes precedence for that navigation, while a later ordinary Home visit restores the profile's product choice.

In `file://` mode the user selects the `products` folder once. The platform validates the registry, opens each enabled product's data root and reuses that choice for playback and editing. It no longer asks the user to choose an individual product or collections folder repeatedly.

If one locally selected product is unavailable or malformed, its pill remains visible but disabled with the reason available as help text; other valid products remain usable. A deployed build remains strict and fails when an enabled product cannot be built.

`npm run build:mygita` creates one unified `dist/mygita` PWA containing the shared shell and the enabled product definitions. Product catalogs remain lazy-loaded; the service worker precaches the shared shell and visuals rather than every product data file. The older named product build remains available while deployment migration is reviewed.

If ownership, repository size, permissions or release cadence later require source separation, product configuration and content can move to dedicated repositories while retaining the same platform contracts. That capability is preserved, but a multi-repository source model is not required now.

## Decisions still open

- The final public name and domain migration from Gitaverse to MyGita.
- The technical rename of `products/gita` to `products/bhagavad-gita`.
- Whether the Sukta product remains bundled or selected scriptures become independent products.
- The exact composition and public name of the future Advaita Chants product.

These transitions belong in [Sampada](../sampada.md) until implemented and verified.
