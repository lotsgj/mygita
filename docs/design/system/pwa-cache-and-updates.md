# PWA cache and updates

**Status:** Current  
**Last updated:** 6 November 2026

## Build-time cache manifest

The deployment build inventories the application assets and writes a versioned asset manifest. The service worker uses this manifest to precache the current application shell and data. Changed deployments create a new cache identity; activation removes obsolete Gitaverse caches.

This content-hash/build-version approach lets unchanged URL assets be reused by normal browser and service-worker caching while ensuring changed files—including collection CSV or chapter SVG files—are represented by the new deployment.

## Runtime strategy

Navigation and asset requests use service-worker policies appropriate to the app shell and versioned deployment. The update manager watches registration lifecycle changes and offers an explicit reload when a waiting worker is ready. Because mobile operating systems may resume an installed PWA without reloading its document, the manager also checks on visible foreground return, `pageshow`, and restored connectivity. Ordinary foreground checks are throttled to one per minute; an already waiting worker is surfaced immediately.

The compact deployed English-only version history is part of the shell cache. Each release record has a version, date, short user-facing title and optional one-sentence message. A separate IndexedDB database records one row per exact version with immutable `dateSeen` and, after confirmed service-worker activation/reload, `dateInstalled`. About merges deployed and local records by version, calculates the `Current` badge, falls back to “MyGita improvements and refinements” when release copy is unavailable, and displays newest first. Ordering uses the release date followed by the precise recorded time or the build sequence encoded in either the legacy timestamp version or current `major.run-attempt` version.

## Independently published media

The application shell and Media use separate update paths. Media schema 3 gives every book manifest and every declared file a full SHA-256 identity. On app open, MyGita fetches the tiny root media catalog without caching it. A visible foreground return repeats that check only after 24 hours. An unchanged manifest hash ends the check without downloading the manifest or content.

When a manifest hash changes, MyGita downloads that manifest and compares file hashes. Changed CSV and JSON are prefetched; audio, images, video and other binary assets remain lazy until used. The current verse or recording continues with its existing dataset. The pending revision is activated at the next verse, chapter, collection or experience navigation boundary. Cache Storage owns canonical response bytes; parsed tables remain session memory, while local storage retains only the last-check time. A file replacement is written under its new logical-path-plus-hash key before older revisions of that same logical path are removed, preserving a safe offline fallback if the network write fails.

Clarity is initialized with `app_version` and display mode. Update events carry applicable source and target versions; notification events are deduplicated per waiting version. Update acceptance does not imply success—the post-reload completion event is authoritative.

## Cache boundaries

The archived `x` tree is neither deployed nor cached. Rachana’s `docs.html`, documentation Markdown, docs CSS/JavaScript, and parser assets are deployed for browser access but deliberately omitted from PWA precache and bypassed by the service worker.

## Storage constraints

Browser storage quotas are device- and browser-controlled, especially on mobile. Gitaverse must not assume all audio can be retained offline. Future downloadable audio packs should use explicit user choice, quota checks, eviction visibility, and graceful streaming fallback.
