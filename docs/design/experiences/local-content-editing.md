# Local content editing

**Status:** Partial
**Last updated:** 4 November 2026

## Current boundary

MyGita playback does not include inline content editing. It reads canonical scripture, questions, decks, illustrations and audio metadata from the independently published Media root, while product folders retain configuration only. The removed editor assumed that masters and association files lived inside a product-owned `data/collections` folder; retaining it against the new boundary would write to the wrong ownership layer.

Content authoring will instead be a separate local-only editor. That tool may reuse shared rendering, parsing and validation libraries, but it is not part of the user-facing MyGita application.

## Intended media-authoring workflow

The future local editor will select a writable Media root, load the same schema-2 catalog and mounts used by playback, and edit only files owned by that root. It must update the relevant book masters, resource catalogs, associations, descriptors and generated manifest inventories together. Publishing must validate all logical paths and references and increment `content_version`; it must not require a MyGita application release.

The editor should derive editable fields from the content contract and preview renderer rather than from a fixed playback-shell list. It must support Gita 700 verse fields, Gita Yoga’s Sanskrit/Kannada/English fields, and Gita Sara’s visible verse language plus sparse illustration, deck and contemplation associations.

Save must continue to reject `#`, preserve unrelated fields and rows, and update only affected language masters. Sanskrit display edits change `shloka` without silently rewriting archival `shloka_raw`. Gita Sara authoring must preserve sparse composition: a media or question row exists only for a real association, and external provider URLs belong inside descriptors rather than owned-media catalog paths.

Conflict detection, unsaved-change warnings, atomic multi-file saves, download fallback, content-version changes and publishing are requirements for the future workflow rather than current product behavior.

## Boundaries

Media authoring will remain a deliberate local publishing workflow; it will not push to GitHub automatically. Native video editing, attribution, licensing, simultaneous multi-mount writes and remote collaborative authoring remain future extensions.
