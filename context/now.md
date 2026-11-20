# Now — 2026-11-17 · Codex

## Active
| Work | Agent | S | Scope | Claimed paths | State |
| --- | --- | --- | --- | --- | --- |
| W-0025 | Codex | S-24 | Gitajyoti-verified profile attachment and local profile projection | engine/js/profile-*, engine/js/player/, engine/player.html, tests, docs/design, context | checkpointed; browser/API acceptance remains |
| W-0026 | Codex | S-24 | Browser regression reliability for Profile ID attachment | engine/tests/browser/platform.cjs, workflow, context | done; full browser, unit and contract regression passes |

## Needs user
- —

## Handoffs (last 5)
- 2026-11-19 Codex → user/Claude: W-0027 makes `portrait_url` an optional logical-path field in the contributor contract. Claude may add published Acharya WebP/PNG assets and corresponding `acharya` contributor rows, then rebuild the Media inventory and publish.
- 2026-11-20 Codex → user/Claude: W-0028 consumes optional `analytics_pid` on profile GET/verify responses. API should add it additively to those profile objects; MyGita continues safely without it and never emits canonical PIDs to analytics.
- 2026-11-20 Codex → user/Website: W-0029 adds `pnpm run dev -- --website-url <website-origin>` for local registration testing. The Website's registration return URL remains `?pid=<profile-id>`; MyGita's API selection is unaffected.
- 2026-11-14 Codex → user/Claude: W-0024 records the final `apps/gita-jyoti/` sibling layout and ownership boundary. Codex owns MyGita and Website (separate conversation); Claude owns Media and Media Admin; cross-repository work goes through the user.
- 2026-11-09 Codex → user: W-0023 restores Rachana to the unified MyGita Pages artifact while retaining its browser-only, non-precache boundary; distribution and browser regressions cover the public route.
- 2026-11-09 Codex → user/Media Admin: W-0022 completes the coordinated Content-Kit 4 remote cutover; Media was published first, MyGita second, and deployment run 42564134772 passed for commit aa65af8c.
- 2026-11-09 Codex → user/Media Admin: W-0021 completes local Content-Kit 4 implementation; canonical mutation plans, snapshots, usage, validation and publish previews are ready. Coordinated remote cutover is next.
