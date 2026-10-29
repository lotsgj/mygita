# Experience model

**Status:** Current  
**Last updated:** 29 October 2026

## Model

MyGita separates the shared application shell from product configuration, reusable collections and individual experiences. The shell owns profiles, experience selection, common navigation, language, fullscreen, help, editing entry, audio controls, installation, updates, analytics, and resume. A registered renderer owns the panels and presentation rules of an experience. A product decides which collections and experiences are available in its distribution.

## Current Bhagavad Gita experiences

**Gita 700** is live. It presents four panels for the Sanskrit shloka, transliteration, meaning, and word-by-word meaning.

**Gita Yoga** is live. It presents Sanskrit, Kannada, and English chanting text in a responsive three-panel learning layout and uses its experience-specific composite audio composition where available.

Its learning-audio collection is intentionally incomplete while production continues. Missing audio never blocks verse text. The data layer supports validated cue metadata, but cue-region controls and user-selectable audio collections remain future enhancements.

**Gita Sara** is live. It follows an explicitly ordered 135-SID subset, combines reusable Swami Brahmananda audio with an ordered image/Google-deck media stream and localized contemplation questions, and presents equal verse, media, and question panels. Missing authored media and questions resolve to shared defaults.

## URL contract

The application entry is `player.html`. Important query parameters are:

- `play=gita-700` — open an experience.
- `sid=6.7` — open a stable verse directly.
- `lang=kn` — choose Kannada content; English content is `en`. Interface language always comes from the profile.
- `pid=<number>` — identify the selected local profile.

An explicit URL location takes precedence over a saved resume location. Otherwise, the selected profile can return to its most recently recorded home or experience location.

## Extending the model

A new experience supplies configuration and composition data under its product data root, then selects a registered renderer. Reusable text and media remain in their type-specific collections. The same renderer can support public experience names in different products. See [Platform and product model](platform-and-product-model.md) and [Collections and media](../system/collections-and-media.md).
