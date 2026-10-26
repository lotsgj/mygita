# Shared player

**Status:** Current  
**Last updated:** 16 October 2026

## Persistent frame

The top bar has three stable zones: collection and chapter controls are left aligned, the SID is geometrically centred, and the main menu plus profile are right aligned. The collection selector is a circular pill containing the first localized grapheme of its short name, while its full localized name remains available to assistive technology and as a tooltip. It appears only when the active experience offers multiple verse collections. The chapter pill appears only when the chosen collection has multiple chapters. The top-bar profile pill shows the uploaded photo or one initial, never the full name. Current position within the chosen collection appears between the top bar and the first panel. The bottom control bar stays available on mobile and contains Go to, audio playback with seeking and elapsed/total time, and fullscreen.

## Navigation

Users can select a collection, select a chapter, go directly to an SID, or move to adjacent records. `B` opens the shared collection chooser; `C` opens chapters only when multiple chapters exist. Desktop keyboard shortcuts also include arrows, `G`, `L`, `A`, `P` or Space, `F`, `H`, `K`, `M`, `E`, and Escape. `Q` is available when the active renderer supports contemplation questions. Menu, collection and chapter choices support arrow-key movement and Enter. Mobile horizontal swipes move between verses.

## Dialog and fullscreen behavior

Escape closes an open dialog before leaving fullscreen. Desktop uses browser fullscreen. Mobile uses native fullscreen when supported; panels remain vertically stacked in portrait and landscape, with pinch zoom retained where the browser permits it.

## Shared capabilities

The shell supplies collection choice, content-language choice, chapter and SID routing, audio controls, profile access, About, Help, local editing entry, install/update notices, events, and resume. Collection switching reloads the active experience with the selected canonical verse collection and records the collection in the URL. Every shell label and message follows the profile’s app language; renderer content and collection names follow the independently selected content language. Renderers supply their own panel layout and editable field mapping.

The complete player uses bundled Noto Sans faces for English, Sanskrit and Kannada. Script-specific faces are selected without changing the common visual family, and are available offline with the application shell.

The shell selects a renderer through the experience registry. Each renderer owns its layout and editable-field map, while experience configuration declares reusable content and audio bindings. Renderers must represent each semantic field once; responsive CSS may reposition that node but must not create hidden duplicate data views.

Optional content capabilities are renderer-declared. A renderer that supports contemplation questions exposes its visible state and toggle action; the shared shell then shows **Questions (On/Off) — Q**. Experiences without that capability do not show the item. This lets Gita 700 and Gita Yoga adopt a question panel later without duplicating menu or keyboard behavior.

See [Gita Yoga](gita-yoga.md), [Gita 700](gita-700.md), and [Gita Sara](gita-sara.md) for the current renderers.
