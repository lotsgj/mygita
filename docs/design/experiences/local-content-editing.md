# Local content editing

**Status:** Partial
**Last updated:** 7 November 2026

## Current boundary

MyGita playback does not include inline content editing. It reads canonical scripture, questions, decks, illustrations and audio metadata from the independently published Media root, while product folders retain configuration only. The removed editor assumed that masters and association files lived inside a product-owned `data/collections` folder; retaining it against the new boundary would write to the wrong ownership layer.

Content authoring will instead be a separate local-only editor. That tool may reuse shared rendering, parsing and validation libraries, but it is not part of the user-facing MyGita application.

## Intended media-authoring workflow

The future local editor will select a writable Media root, load the Content-Kit 3 catalog and mount inventories, and edit registered files. It must update the relevant book masters, resource catalogs, associations, descriptors and generated inventories together. Publishing validates logical paths and references, calculates full SHA-256 hashes, and advances Media independently of a MyGita application release.

Content-Kit 3 is the shared pure foundation. Version 3.20261107-051550 exposes split-ready mount inventories, explicitly declared contracts and field types, separate collection nodes, byte-preserving record operations, validation, a shared forward/reverse reference graph and grace-aware move-plan structures. It performs no filesystem or network writes and contains no editor interaction. Media Admin owns folder access, hashing bytes, writes, retries, previews, confirmation and plan execution. The current Tranche 1 read-only surface is sufficient for Media Admin to begin in parallel; writable publication and the MyGita runtime/PWA inventory cutover are Tranche 2.

The editor should derive editable fields from the content contract and preview renderer rather than from a fixed playback-shell list. It must support Gita 700 verse fields, Gita Yoga’s Sanskrit/Kannada/English fields, and Gita Sara’s visible verse language plus sparse illustration, deck and contemplation associations.

Save must continue to reject `#`, preserve unrelated fields and rows, and update only affected language masters. Sanskrit display edits change `shloka` without silently rewriting archival `shloka_raw`. Gita Sara authoring must preserve sparse composition: a media or question row exists only for a real association, and external provider URLs belong inside descriptors rather than owned-media catalog paths.

Conflict detection, unsaved-change warnings, atomic multi-file saves, download fallback and the visual editor remain requirements for the future workflow. Content-versioned publishing and validation are now implemented in the Media command-line workflow.

## Boundaries

Media authoring will remain a deliberate local publishing workflow; it will not push to GitHub automatically. Native video editing, attribution, licensing, simultaneous multi-mount writes and remote collaborative authoring remain future extensions.
