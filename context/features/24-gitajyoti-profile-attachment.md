# S-24 — Gitajyoti profile attachment

## Brief
- Gitajyoti owns registration and identity. MyGita only attaches an API-verified existing Profile ID (PID) as a device-local profile.
- Canonical PIDs use Crockford Base32 (`GJ-7K3M-9QX2`) and are local IndexedDB keys. A device may attach multiple verified profiles.
- On first attachment, MyGita uses the API session cookie when available; otherwise it verifies PID plus date of birth and Turnstile. It stores a minimal local projection for offline use.
- After attachment, startup uses local storage only. API responses and API session data are never cached by the service worker.

## Parts
- [ ] W-0025 Profile provider, repository, local PID keys, attachment UI and regressions — implementation and focused regressions in progress

## Open
- [ ] API contract: `getProfile`, `getSession`, `verifyProfile` and `forgetSession` from API client 1.1.0 — accepted

## Details
- Profile ID in a URL is onboarding input, not an authorization credential. Remove `pid` from the URL after successful attachment.
- A local projection contains PID, display name, initial preferred language, device preferences, photo and local journey data. It excludes email, mobile, DOB, gender and API session data.
- MyGita opens `?pid=` by attempting session-backed lookup. If unverified it requests DOB and a `verify_profile` Turnstile token. Without `?pid=`, existing local profiles open normally; an empty device offers PID attachment and a link to Gitajyoti registration.
- Same-device session lookup and API interaction are confined to a lazy API provider; screens use a repository.
- Focused regression covers canonical PID normalization, production/dev API selection, safe API-to-local projection, session attachment, DOB verification without a duplicate lookup, local reuse without an API call, and string PID delivery to local resume/journey adapters. Browser acceptance remains: API-backed same-device cookie, DOB + Turnstile, URL cleanup, multiple-profile attachment and offline reopening.

## Changes
- 2026-11-16 W-0025 started; API attachment boundary and focused regression added. Full browser acceptance remains.
