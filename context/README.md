# context/ — agent working memory (not published, not human docs)
Human-facing design lives in docs/design/ (including sampada.md). This folder is for agents: terse, structured, current.

## Files
| File | Holds | Rewrite or append | Limit |
| --- | --- | --- | --- |
| now.md | active work, claims, handoffs, needs-user | rewrite | ≤ 50 lines |
| log.md | completed work items | append only | ≤ 8 lines per entry |
| adr.md | cross-feature decisions | append only; supersede, never edit | ≤ 6 lines per ADR |
| features/<n>-<slug>.md | S-<n>: Brief (current truth), Parts, Open, Details, Changes | rewrite; history in git + Changes | Brief ≤ 1 page |

## Read
1. Always: now.md.
2. The feature you touch: features/<n>-<slug>.md up to `## Details`. Read further only for the detail you need.
3. History on demand: grep "S-<n>" log.md; adr.md by number.

## Write (each change needs the user's approval first — AGENTS.md rule 1)
- Start work: add a row to now.md › Active (work id, S-number, scope, claimed paths).
- Decision approved by the user: update the feature file (Brief and Details together); cross-feature ones get an ADR.
- Finish work: append to log.md; tick the part in the feature file; remove the Active row; add a handoff if needed.
- New feature idea: propose a Sampada line in now.md › Needs user; no work before the user approves it.
- Fix without a feature: log as "S: fix".
- Sampada status (To unfold → Done): only with the user's OK, updated in docs/design/sampada.md together with its Rachana docs.

## Ids
Work items: W-0001… (next id = last in log.md + 1). Features: S-<sampada number>. Decisions: ADR-001…
Dates: YYYY-MM-DD, IST.
