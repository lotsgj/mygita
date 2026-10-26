# Gitaverse distribution

This folder contains Gitaverse configuration and content. The reusable player engine lives in the sibling `verses` folder.

- `data/distribution.json` registers the product, storage/cache namespaces, and public experiences.
- `data/experiences` composes reusable collections into `gita-700`, `gita-yoga`, and `gita-sara`.
- `data/collections` contains Gita verse and media catalogs.
- `tests` contains Gita-specific contract and browser parity tests.
- `dist` is generated and is the deployable Gitaverse PWA.

From the sibling `verses` folder, build this distribution with:

```sh
node scripts/build-distribution.mjs ../gita
```
