# S-21 Configurable content languages and renderer panels
Updated 2026-11-04 · Codex · Sampada: docs/design/sampada.md §21 · ADRs: 004

## Brief — current truth
- Product configuration declares source, content and interface languages; experience panels bind to semantic roles.
- The engine resolves those roles and passes language assignments to reusable renderers.
- Profiles keep one global content-language preference plus sparse product/experience/panel overrides.
- Panel overrides live under My Preferences after profile creation; first-time setup asks only for app and global content language.
- The player menu remains focused on playback and navigation.

## Parts
- [x] product language model and role-bound panels — W-0005
- [x] profile-specific panel choices in My Preferences — W-0008
- [ ] one shared language registry in products/app.json
- [ ] book-level source language in Media manifests
- [ ] remove remaining hardcoded English/Kannada assumptions
- [ ] row-based localized registries rather than language-specific columns

## Open (user)
- Partial language coverage: offer a configured language with per-book fallback, or only after every book is complete?

## Details

### Preference experience
- First-time profile setup contains app language and preferred content language only.
- Existing profiles see Languages by experience, grouped by product and expandable experience cards.
- Only panels marked userSelectable appear. A blank value means use the experience binding/default.
- Use experience defaults clears every override for that experience.
- IndexedDB keys remain profile + product + experience; values contain only explicitly overridden panel IDs.

## Changes
- 2026-11-04 created from W-0005 and the approved W-0008 preference placement (Codex)
