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

## ADR-005 · 2026-11-07 · Accepted · Mount inventories resolve logical paths
Logical path remains readable global identity; catalog mount inventory parts, not namespace-prefix rules, determine physical placement. Prefixes remain transitional until Tranche 2.
Why: incremental hashes, multiple repositories and future inventory splitting need an explicit physical index. Supersedes: ADR-001's prefix-to-mount selection, not its host-less path principle.

## ADR-006 · 2026-11-07 · Accepted · Content-Kit plans; callers perform I/O
Content-Kit is pure contract/edit/validation/reference/plan logic. Media Admin reads, writes, hashes, retries and executes plans; move and publish plans are explicit multi-file exceptions.
Why: one content-rule implementation without embedding editor or filesystem behavior in MyGita. Supersedes: ADR-003 only for explicit move/publish transactions.

## ADR-007 · 2026-11-08 · Accepted · Content-Kit 4 explicit variants and clean cutover
Parts declare representation and semantic dimensions; composition binds collection items while one pure resolver chooses variants then renditions. Paths carry no semantics.
Why: languages, voices, modes, themes and formats must scale as data. Cutover has no v3 compatibility or dual publication; Media publishes before MyGita. Supersedes: Content-Kit 3 localized filename/column conventions.
