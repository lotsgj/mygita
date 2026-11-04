# Experience model

**Status:** Current  
**Last updated:** 4 November 2026

## Model

MyGita separates the shared application shell from product configuration, reusable collections and individual experiences. The shell owns profiles, experience selection, common navigation, language, fullscreen, help, audio controls, installation, updates, analytics, and resume. A registered renderer owns the panels and presentation rules of an experience. A product decides which collections and experiences are available in its distribution. Content authoring is outside the playback application.

## Language and panel contract

Each product distribution declares a language registry rather than relying on a fixed Sanskrit/English/Kannada list. The registry identifies the source language, ordered content languages, default content language, interface languages, native labels, script and writing direction. Book manifests declare whichever language masters they actually provide; normalization turns them into the same `languages.<code>` row model. Adding a registered master such as Hindi therefore does not require a new renderer branch.

An experience declares semantic panels and binds each panel to `source`, `preferred`, `alternate`, `next_available`, `none`, or an explicit `fixed:<code>` language. It also declares the semantic fields used by that panel and whether the person may choose its language. The engine resolves these bindings against the active product, available book masters, global content preference and profile-specific overrides. Renderers receive only the resolved panel-to-language map and continue to own geometry, typography and responsive behavior.

Selectable panels appear under **My Preferences → Languages by experience** after a profile has been created. They are deliberately excluded from first-time profile setup, which asks only for app and global content language. Products group their experiences in compact expandable cards consistent with the profile form; each panel can retain its experience default or select an allowed language. The profile stores only overrides under product plus experience plus panel ID, so changing the global content preference still updates every panel that remains on its experience default. **Use experience defaults** removes all overrides for that experience. This contract is intended to be consumed by a future product/experience editor as well as the hand-maintained JSON configuration.

## Current Bhagavad Gita experiences

**Gita 700** is live. It presents four panels for the Sanskrit shloka, transliteration, meaning, and word-by-word meaning.

**Gita Yoga** is live. It presents Sanskrit, Kannada, and English chanting text in a responsive three-panel learning layout and uses its experience-specific composite audio composition where available.

Its learning-audio collection is intentionally incomplete while production continues. Missing audio never blocks verse text. The data layer supports validated cue metadata, but cue-region controls and user-selectable audio collections remain future enhancements.

**Gita Sara** is live. It follows an explicitly ordered 135-SID subset, combines reusable Swami Brahmananda audio with an ordered image/Google-deck media stream and localized contemplation questions, and presents equal verse, media, and question panels. Missing authored media and questions resolve to shared defaults.

## URL contract

The application entry is `player.html`. Important query parameters are:

- `play=gita-700` — open an experience.
- `sid=6.7` — open a stable verse directly.
- `lang=<code>` — choose any content language registered by the active product. Interface language always comes from the profile.
- `pid=<number>` — identify the selected local profile.

An explicit URL location takes precedence over a saved resume location. Otherwise, the selected profile can return to its most recently recorded home or experience location.

## Extending the model

A new experience supplies configuration and composition data under its product data root, then selects a registered renderer. Reusable text and media remain in their type-specific collections. The same renderer can support public experience names in different products. See [Platform and product model](platform-and-product-model.md) and [Collections and media](../system/collections-and-media.md).
