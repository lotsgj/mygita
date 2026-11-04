# Architectural decisions (append only)

## ADR-001 · 2026-11-03 · Accepted · Logical media paths with mounts
Content names files by host-less logical paths (book/, audio/, image/, video/, deck/, docs/); catalog.json mounts map prefixes to remote and local roots.
Why: storage can move or spill across repos without content edits. Supersedes: —

## ADR-002 · 2026-11-04 · Accepted · Contracts only in mygita, via content-kit
Media contracts and checks are defined once in mygita; tools use engine/js/content-kit.js (ES module) or content-kit.bundle.js (file://).
Why: player, editor and validator cannot disagree. Consequence: tools hold no contract code. Supersedes: —

## ADR-003 · 2026-11-04 · Accepted · One record in one file per save; git is undo
The editor rewrites one record of one file per save; connected changes are separate saves, referenced content first.
Why: single-file writes are atomic in the browser, so no multi-file transactions or backups. Supersedes: —

## ADR-004 · 2026-11-04 · Accepted · Languages are data
Languages come from configuration and manifests, never code literals; one language registry; each product chooses what it offers.
Why: adding a language = data + font, no code change. Supersedes: —
