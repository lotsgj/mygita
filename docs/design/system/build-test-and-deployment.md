# Build, test and deployment

**Status:** Current
**Last updated:** 29 October 2026

## Source and generated files

Maintainable shared JavaScript lives under `engine/js/player`, `engine/js/events`, and shared engine modules. Product definitions live under `products`: `products/gita` contains the Bhagavad Gita experiences and `products/sukta` contains the first Sukta experience. `engine/scripts/build-player.mjs` produces the shared player bundle and `engine/scripts/build-platform.mjs` combines the enabled products with the MyGita shell in `dist/mygita`.

## Versioning

The application version is `major.build`. The major value is repository-controlled. GitHub Actions supplies `<run-number>-<run-attempt>` as the build identifier and injects deployment configuration such as the optional `CLARITY_PROJECT_ID` repository variable. Source pages retain development placeholders; the deployment build writes production values into the generated output.

`version-history.json` remains the compact, source-controlled release narrative shown in About. Git history and the immutable Pages deployment record provide the detailed troubleshooting trail. Automating release-message additions is a separate enhancement; the deployment workflow does not modify the source branch.

## Local platform build

`pnpm run build:mygita` builds the unified platform into `dist/mygita`. `engine/index.html` remains a local harness: it asks for the repository's `products` folder and then exposes every valid registered product.

`pnpm run test:sukta` validates the Sukta masters, canonical SID alignment, registries and Player-4 wiring. Sukta is delivered as a product inside MyGita rather than as a separate PWA at this stage.

The build excludes audio binaries and archived prototype content. Rachana and Sampada remain at the repository root and are absent from `dist/mygita` and its PWA cache.

## GitHub Pages deployment

`lotsgj/mygita` is the single source and deployment repository. `.github/workflows/deploy-pages.yml` runs on pull requests, pushes to `main`, and manual dispatches. Every run installs locked dependencies, builds `dist/mygita`, and runs the engine, platform, Gita and Sukta checks. Pull requests stop after verification. A push to `main` or a manual run uploads only `dist/mygita` as the Pages artifact and deploys it through the protected `github-pages` environment.

The generated manifest and service-worker registration use relative scope paths. The same artifact therefore works first at the repository Pages URL and later at the root of `mygita.gitajyoti.org` without a second path-specific build.

Repository setup is intentionally separate from source automation:

1. Set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**.
2. Run the workflow and verify the default GitHub Pages URL.
3. Add `mygita.gitajyoti.org` under the repository's Pages custom-domain setting.
4. Only then create the GoDaddy `CNAME` record `mygita → lotsgj.github.io`.
5. Wait for GitHub's DNS and TLS checks, enable **Enforce HTTPS**, and verify installation/update behaviour.

The former `gitaverse.gitajyoti.org` origin remains a separate migration decision because installed PWAs and IndexedDB data are origin-bound.

## Regression layers

- Unit tests cover collection normalization, renderer behavior, cue validation/indexing, and event logic.
- Contract tests cover schemas, collection alignment, experience audio composition, source isolation, deployment rules, and Rachana integrity.
- Player browser regression exercises the user journey, Gita 700, Gita Yoga, Gita Sara, and core interactions, including mixed image/deck navigation, question modes, equal desktop panels, mobile stacking, missing-media fallback, and local editing. Collection contracts additionally verify Gita Sara's 135-SID media/question coverage, SID-plus-order localization alignment, URL safety, reusable defaults, physical image assets, and normalized local-folder loading.
- Rachana browser regression covers HTTP and `file://`, routing/history, mobile navigation, sanitization, and PWA-cache exclusion.

## How tests are triggered

Tests run locally on demand and automatically in GitHub Actions. There is no local Git hook or file watcher.

| Layer | Local command | Runs inside `npm run build` | Runs in GitHub Actions |
| --- | --- | --- | --- |
| Engine tests | `pnpm test` | No | Yes |
| Unit tests | `pnpm run test:unit` | No | Yes |
| Contract tests | `pnpm run test:contract`, `pnpm run test:gita`, `pnpm run test:sukta` | No | Yes |
| Platform and product browser regressions | `pnpm run test:platform-browser`, `pnpm run test:gita:browser`, `pnpm run test:sukta:browser` | No | Yes |
| Rachana browser regression | `pnpm run test:docs-browser` | No | Yes |
| Manual checks in `tests/PARITY.md` | By hand on a device | No | No |

### On a development machine

- `pnpm test` runs the engine test suite; unit and contract suites have explicit commands.
- `pnpm run build:mygita` rebuilds fonts and the player bundle before writing `dist/mygita`.
- Browser regressions need Playwright Chromium (`pnpm exec playwright install chromium`).
- GitHub Actions uses Node 24, pnpm 11.25.0 and the committed lockfile.

Before pushing to `main`, run the same engine, unit, contract and browser commands used by the workflow. A failing build or test prevents artifact upload and deployment.

### Checks that stay manual

`tests/PARITY.md` lists the capabilities that must pass before a public release and how each is verified. A few have no automation and are confirmed by hand on real devices: pinch zoom in mobile fullscreen, the installed-PWA upgrade on desktop and mobile, and Clarity delivery in the deployed build.

### Rollback

GitHub retains Pages deployments and workflow runs. The operational rollback is to revert the faulty source commit on `main` and let the workflow deploy the previously verified source state again. Generated `dist/mygita` output is not committed back to the repository.
