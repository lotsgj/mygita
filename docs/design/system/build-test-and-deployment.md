# Build, test and deployment

**Status:** Partial  
**Last updated:** 16 October 2026

## Source and generated files

Maintainable shared JavaScript lives under `engine/js/player`, `engine/js/events`, and shared engine modules. Product definitions live under `products`: `products/gita` is the deployable Gitaverse definition, while `products/sukta` now contains the tested Suktaverse data and first experience contract. `engine/scripts/build-player.mjs` produces the shared player bundle; `engine/scripts/build-docs.mjs` produces `docs/assets/docs.bundle.js`; `engine/scripts/build-distribution.mjs <product>` combines the engine and selected product into `dist/<product>` once that product has its required branding assets.

## Versioning

The application version is `major.minor`. The major value is repository-controlled. GitHub Actions supplies the build identifier in `ddMMMccyy-HHmmss` form and injects deployment configuration such as `CLARITY_PROJECT_ID`. Source pages retain development placeholders; the deployment build writes production values into the output.

Each successful deployment appends `{version, date, message}` to `version-history.json`. The array is stored oldest first on the persistent `deployment-history` branch; About sorts it newest first, using the timestamp inside equal-date version IDs as a secondary key. The workflow rejects malformed or duplicate version records. The change message is the deployment commit subject; Git history remains the detailed troubleshooting record.

## Local product build

`npm run build:gita` builds Gitaverse into `dist/gita`. `npm run verify:gita` builds it, runs engine and product contracts, and runs the product browser/PWA regression. `engine/index.html` remains a local harness: it asks for a product folder such as `products/gita` before starting the shared player.

`npm run test:sukta` validates the 18-row Ganesha Atharvashirsha masters, canonical SID alignment, empty media composition, registries, distribution isolation, and Player-4 wiring. A Suktaverse production build is intentionally deferred until its product-owned social image, icons, card image, theme and deployment destination are supplied.

The build copies an explicit allowlist and fails if archived `x` content enters output or the asset manifest. Rachana and Sampada remain at the repository root and are absent from `dist/gita` and its PWA cache.

## Repository deployment — pending

After local verification, the Verses repository will become the single development repository. Its GitHub workflow will build affected products and publish generated output to dedicated deployment repositories such as `lotsgj/gita` and `lotsgj/sukta`. Cross-repository credentials, target branches, Pages settings, and production cutover have intentionally not been changed yet.

## Regression layers

- Unit tests cover collection normalization, renderer behavior, cue validation/indexing, and event logic.
- Contract tests cover schemas, collection alignment, experience audio composition, source isolation, deployment rules, and Rachana integrity.
- Player browser regression exercises the user journey, Gita 700, Gita Yoga, Gita Sara, and core interactions, including mixed image/deck navigation, question modes, equal desktop panels, mobile stacking, missing-media fallback, and local editing. Collection contracts additionally verify Gita Sara's 135-SID media/question coverage, SID-plus-order localization alignment, URL safety, reusable defaults, physical image assets, and normalized local-folder loading.
- Rachana browser regression covers HTTP and `file://`, routing/history, mobile navigation, sanitization, and PWA-cache exclusion.

## How tests are triggered

Tests run automatically only in GitHub Actions. On a development machine nothing runs by itself: there is no Git hook, file watcher, or pre-commit step, so every local run is started by hand.

| Layer | Local command | Runs inside `npm run build` | Runs in GitHub Actions |
| --- | --- | --- | --- |
| Unit tests | `npm test` or `npm run test:unit` | Yes | Yes, through the build |
| Contract tests | `npm test` or `npm run test:contract` | Yes | Yes, through the build |
| Player browser regression | `npm run test:browser` | No | Yes, after the build |
| Rachana browser regression | `npm run test:docs-browser` | No | Yes, after the build |
| Manual checks in `tests/PARITY.md` | By hand on a device | No | No |

### On a development machine

- `npm test` runs every file matching `tests/unit/*.test.mjs` and `tests/contract/*.test.mjs` with the Node test runner.
- `npm run build` rebuilds the font CSS and both bundles, syntax-checks the bundles, and then runs the unit and contract tests before it writes `dist`. A failing test stops the build.
- The two browser regressions need Playwright's Chromium (`npx playwright install chromium`) and are never started by the build.
- All of these need Node.js and `npm install`. A machine without Node.js cannot run any automated check; changes made there are verified only when GitHub Actions runs.

Before pushing to `main`, run `npm test`, `npm run build`, `npm run test:browser`, and `npm run test:docs-browser`.

### In GitHub Actions

The `Build and deploy Gitaverse` workflow starts on three events:

- A push to `main`.
- Any pull request.
- A manual start from the Actions tab (`workflow_dispatch`).

Each run installs dependencies and Chromium, runs the deployment build (which includes the unit and contract tests), then the player browser regression, then the Rachana browser regression. Any failure stops the run, so nothing is deployed. A pull-request run stops after the tests; it does not record version history or deploy. Pushes to other branches without a pull request are not tested.

### Checks that stay manual

`tests/PARITY.md` lists the capabilities that must pass before a public release and how each is verified. A few have no automation and are confirmed by hand on real devices: pinch zoom in mobile fullscreen, the installed-PWA upgrade on desktop and mobile, and Clarity delivery in the deployed build.

### Keeping the two test lists aligned

`npm test` finds test files by pattern, but `scripts/build-deployment.mjs` names each unit and contract test file explicitly. A new test file is therefore picked up by `npm test` immediately and by the build, and so by GitHub Actions, only after it is added to that list. Add it in the same change that creates the file.
