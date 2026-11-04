# Agent instructions

## Global rules
1. Approval first: propose before you change anything (code, content, config, docs, context/,
   commits, pushes). State what you will change and why, then wait for the user's explicit yes.
   Reading, analysing and running tests need no approval.
2. Align with Sampada (docs/design/sampada.md) at the start of every discussion or task:
   - It fits an existing item → say "This is S-<n> <title>" and name the part of it you're working on.
   - Nothing fits → propose a new Sampada line (number, title, tag, one-line summary) and
     ask the user to approve it before any work.
   - The work changes an item's scope or status → propose the Sampada edit along with the change.
   - Fixes not tied to a feature: say "fix" (no Sampada line needed).
3. Before any work, read context/now.md, then follow context/README.md.
4. Do not edit files another agent has claimed in context/now.md, or commit its uncommitted
   changes, without the user's OK.
5. Commits: author vjmaker <vijayakumar.puttaraju@gmail.com>; no AI or assistant attribution.
