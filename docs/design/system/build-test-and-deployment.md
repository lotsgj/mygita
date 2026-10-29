# Build, test and deployment

**Status:** Partial  
**Last updated:** 29 October 2026

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

`lotsgj/mygita` is the single development repository. The intended deployment model is to build affected products here and publish generated output to dedicated deployment repositories such as `lotsgj/gita` and `lotsgj/sukta`. Source products may move to separate repositories later without changing their data contracts. Cross-repository credentials, target branches, Pages settings, production cutover and replacement workflows are intentionally pending; the earlier uncommitted workflow prototypes were removed.

## Regression layers

- Unit tests cover collection normalization, renderer behavior, cue validation/indexing, and event logic.
- Contract tests cover schemas, collection alignment, experience audio composition, source isolation, deployment rules, and Rachana integrity.
- Player browser regression exercises the user journey, Gita 700, Gita Yoga, Gita Sara, and core interactions, including mixed image/deck navigation, question modes, equal desktop panels, mobile stacking, missing-media fallback, and local editing. Collection contracts additionally verify Gita Sara's 135-SID media/question coverage, SID-plus-order localization alignment, URL safety, reusable defaults, physical image assets, and normalized local-folder loading.
- Rachana browser regression covers HTTP and `file://`, routing/history, mobile navigation, sanitization, and PWA-cache exclusion.

## How tests are triggered

Tests currently run only when started manually. There is no Git hook, file watcher, pre-commit step or committed GitHub Actions workflow in `lotsgj/mygita` yet.

| Layer | Local command | Runs inside `npm run build` | Runs in GitHub Actions |
| --- | --- | --- | --- |
| Unit tests | `npm test` or `npm run test:unit` | Yes | Not currently configured |
| Contract tests | `npm test` or `npm run test:contract` | Yes | Not currently configured |
| Player browser regression | `npm run test:browser` | No | Not currently configured |
| Rachana browser regression | `npm run test:docs-browser` | No | Not currently configured |
| Manual checks in `tests/PARITY.md` | By hand on a device | No | No |

### On a development machine

- `npm test` runs every file matching `tests/unit/*.test.mjs` and `tests/contract/*.test.mjs` with the Node test runner.
- `npm run build` rebuilds the font CSS and both bundles, syntax-checks the bundles, and then runs the unit and contract tests before it writes `dist`. A failing test stops the build.
- The two browser regressions need Playwright's Chromium (`npx playwright install chromium`) and are never started by the build.
- All of these need Node.js and `npm install`. A machine without Node.js cannot run any automated check; changes made there are verified only when GitHub Actions runs.

Before pushing to `main`, run `npm test`, `npm run build`, `npm run test:browser`, and `npm run test:docs-browser`.

### Planned GitHub automation

A future workflow should run engine and affected-product checks for pull requests and protected-branch changes, then keep deployment as an explicitly controlled stage. Test and live publishing, version-history persistence, credentials, environment approvals and rollback must be redesigned and reviewed before that workflow is committed.

### Checks that stay manual

`tests/PARITY.md` lists the capabilities that must pass before a public release and how each is verified. A few have no automation and are confirmed by hand on real devices: pinch zoom in mobile fullscreen, the installed-PWA upgrade on desktop and mobile, and Clarity delivery in the deployed build.

### Keeping the two test lists aligned

`npm test` finds test files by pattern, but `scripts/build-deployment.mjs` names each unit and contract test file explicitly. A new test file is therefore picked up by `npm test` immediately and by the build, and so by GitHub Actions, only after it is added to that list. Add it in the same change that creates the file.
