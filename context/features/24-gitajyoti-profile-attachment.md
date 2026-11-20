# S-24 — Gitajyoti profile attachment

## Brief
- Gitajyoti owns registration and identity. MyGita only attaches an API-verified existing Profile ID (PID) as a device-local profile.
- Canonical PIDs use Crockford Base32 (`GJ-7K3M-9QX2`) and are local IndexedDB keys. A device may attach multiple verified profiles.
- On first attachment, MyGita uses the API session cookie when available; otherwise it verifies PID plus date of birth and Turnstile. It stores a minimal local projection for offline use.
- After attachment, startup uses local storage only. API responses and API session data are never cached by the service worker.
- A matching same-device API session can set up a `?pid=` profile automatically. Otherwise the PID stays read-only and MyGita asks for DOB plus Turnstile proof.
- The local projection may retain API-supplied `analytics_pid` and invitations. Invitations are durable, immutable profile connections; analytics identity is sent only when the existing analytics preference is enabled.

## Parts
- [ ] W-0025 Profile provider, repository, local PID keys, attachment UI and regressions — implementation and focused regressions in progress
- [x] W-0026 Browser regression reliability — canonical mock attachment, deterministic cleanup and bounded CI suites
- [x] W-0029 Configurable Website registration origin for local development
- [x] W-0028 Session-first setup, local invitation projection and consent-bound analytics identity

## Open
- [ ] API contract: `getProfile`, `getSession`, `verifyProfile` and `forgetSession` from API client 1.1.0 — accepted
- [ ] API-2 · asked · Add optional `analytics_pid` to API-client profile results from create/get/verify. MyGita accepts either client-camel `analyticsPid` or wire-camel `analytics_pid`; an absent value suppresses vendor identity without blocking profile attachment.

## Details
- Profile ID in a URL is onboarding input, not an authorization credential. Remove `pid` from the URL after successful attachment.
- A local projection contains PID, display name, initial preferred language, device preferences, photo and local journey data. It excludes email, mobile, DOB, gender and API session data.
- MyGita opens `?pid=` by attempting session-backed lookup. If unverified it requests DOB and a `verify_profile` Turnstile token. Without `?pid=`, existing local profiles open normally; an empty device offers PID attachment and a link to Gitajyoti registration.
- Same-device session lookup and API interaction are confined to a lazy API provider; screens use a repository.
- Focused regression covers canonical PID normalization, production/dev API selection, safe API-to-local projection, session attachment, DOB verification without a duplicate lookup, local reuse without an API call, and string PID delivery to local resume/journey adapters. Browser acceptance remains: API-backed same-device cookie, DOB + Turnstile, URL cleanup, multiple-profile attachment and offline reopening.
- W-0028 plan: 1. project optional API `analytics_pid` and invitations, and require an exact PID match before session auto-attachment (accept when repository tests prove unmatched sessions fall back); 2. render a non-interactive setup state before the session attempt and retain PID + DOB proof on fallback (accept when browser coverage verifies both paths); 3. configure GA and Clarity only with `analytics_pid` for an analytics-consented active profile (accept when adapter tests prove raw PIDs remain absent).

## Changes
- 2026-11-16 W-0025 started; API attachment boundary and focused regression added. Full browser acceptance remains.
- 2026-11-17 W-0026 started after CI run 43929204404: platform browser regression used the retired local-creation form and leaked Chromium after its failure, causing the grouped browser step to run until GitHub's six-hour limit.
- 2026-11-17 W-0026 done: platform and product browser fixtures use canonical mocked PIDs, every failure closes browser/server resources, and CI isolates each browser suite with bounded timeouts. Full browser, unit and contract regression passes locally.
- 2026-11-20 W-0028 done: an exact same-device session PID auto-attaches behind a short setup state; any mismatch falls back to read-only PID, DOB and Turnstile proof. Local profiles merge API invitations by code without mutating an existing connection. Optional `analytics_pid` alone configures GA `user_id` and Clarity `identify` when the profile's existing analytics preference allows it; canonical PIDs remain outside both vendors.
- 2026-11-20 W-0029 done: production HTML retains the public Gitajyoti registration URL. The local MyGita server accepts `--website-url` and rewrites only its in-memory `player.html` response, so Website registration can return to a local MyGita profile-attachment flow without local ports entering shipped assets or API selection.
