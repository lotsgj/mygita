# Log (append only)

## W-0001 · 2026-11-03 · Codex · S-19 · media-only playback
Commits: mygita b12ac6e · Scripture content loads only from media; products keep configuration.

## W-0002 · 2026-11-03 · user · S: fix · CI clones the media repo
Commits: mygita ba395ad (edited on GitHub; author "Gita Jyoti") · .github/workflows/deploy-pages.yml clones lotsgj/media to ../media.

## W-0003 · 2026-11-03 · Codex · S-19 · logical paths + mounts
Commits: mygita 9542b94, media e7b1f34 · catalog schema 2 with mounts; logical paths; generated manifest files; Gita Sara persistence fix.

## W-0004 · 2026-11-04 · Codex · S-19 · playback-only player
Commits: mygita d6930b5 · Edit mode removed (editor.js, editor.css, WritableCollectionWorkspace); media folder remembered (media-folder-store.js).

## W-0005 · 2026-11-04 · Codex · S-21 · content languages + panels
Commits: mygita 50b7b2c · language-model.js; languages + panels per product in distribution.json. CI #8 green on re-run.
Follow-ups: docs.bundle.js stale; remaining hardcoded en/kn (features/19-independent-media.md › Languages).

## W-0006 · 2026-11-04 · Claude · S-19 · content-kit v1
Commits: mygita a2faa16 · CI #9 green
Changed: engine/js/content-kit.js (+ content-kit.bundle.js, scripts/build-content-kit.mjs, 2 test files); collection-data.js exports; encode restored.
Tests: unit 51, contract 26, gita 6, sukta 2, 4 browser suites — all pass.
Follow-ups: editor UI (S-19); later related()/checkSave() for audio.

## W-0007 · 2026-11-04 · Claude · S: — (agent workflow) · agent instructions + shared context
Changed: AGENTS.md, CLAUDE.md (global rules: approval first, Sampada alignment); context/ (README, now, log, adr, features/19-independent-media.md);
docs/design/sampada.md adds S-21 (To unfold, Major).

## W-0008 · 2026-11-04 · Codex · S-21 · panel languages in My Preferences
Changed: removed panel languages from the player menu; existing profiles receive product-grouped experience cards in My Preferences; first-time setup remains simple.
Tests: unit 51, contract 26, Gita and Sukta browser regressions; Gita browser covers hidden-first-use, persistence and reset.

## W-0009 · 2026-11-04 · Codex · S: fix · refresh Rachana bundle
Changed: rebuilt docs/assets/docs.bundle.js from the current shared profile and documentation sources.
Tests: contract 26 pass.

## W-0010 · 2026-11-04 · Codex · S: fix · stabilize media reselection
Changed: generation-guarded media source replacement and experience loads; stale selections cannot overwrite current state; file input resets after use; shared ProfileUI tolerates Rachana without experience controls.
Tests: unit 52; exact CI build/test sequence; Rachana browser; five consecutive Gita browser runs with five file-mode reselections each.
