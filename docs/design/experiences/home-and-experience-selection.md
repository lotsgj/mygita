# Home and experience selection

**Status:** Current  
**Last updated:** 4 November 2026

## Diksoochi landing

After a profile is active, Diksoochi is the MyGita landing experience. A compact masthead uses the continuously but gently animated Krishna flute as its brand mark while a visually hidden heading preserves screen-reader and navigation semantics. Reduced-motion preferences stop the animation. The profile pill stays visible at the upper right.

The page has two primary sections. **Your journey** combines a large cinematic resume card with a warm achievement card. The resume card uses the image belonging to the most recently visited experience and always retains that experience’s saved SID. **Choose an experience** begins with localized product pills generated from the platform product registry. Selecting **Bhagavad Gita** or **Suktas** changes the experience cards without renaming MyGita or changing the profile’s global language preference. The selected product is remembered per profile; an explicit product deep link overrides it for that navigation.

For Bhagavad Gita, configured card order is Gita Chant, Gita Yoga, Gita Sara and Gita 700. Gita Chant presents a focused three-script chanting view; Gita Yoga uses the learning view; Gita Sara uses the contemplative transformation image; and Gita 700 uses the illuminated path. Suktas currently exposes Sukta Chant and lets its collection selector choose Ganesha Atharvashirsha or Purusha Sukta. Card labels, descriptions, order and availability come from product configuration rather than a hard-coded landing-page list.

On desktop the resume and achievement cards share a row and the experience cards share a row. On mobile the journey cards stack, while experience cards form a touch-friendly horizontal snap carousel. Selecting an experience card reveals an inline description and capability summary before the person continues into it. About MyGita, installation and local-media selection remain available below the two sections.

Know counts distinct chapters and shlokas only after at least ten seconds of meaningful visible engagement. Brief navigation does not count. When no journey dimension has data, the section says, “Your journey details will be updated here.” Once data exists, only the available dimensions appear as encouraging sentences—for example, “You have explored 2 chapters and 2 shlokas.” The interface does not show Know, Able or Use cards, labels, or zero values. The data model retains those dimensions so Able and Use can appear later when supported by explicit evidence; they are never inferred from time or playback.

The Know sentence includes a **Details** action. It opens a read-only **Your journey** page rather than an experience. Engagements for the same SID are combined across experiences. The list follows canonical Gita order and shows SID, Sanskrit shloka, meaning in the profile’s preferred content language, and a simple **Count** of meaningful engagements. Sanskrit and meaning occupy one line and truncate visually when needed; the complete value remains available as native title text.

People may choose **Cards** or **Table** on desktop and mobile through a compact icon-only segmented control. The inline SVG controls retain translated accessible names, tooltips and pressed states. Cards place SID and count on the first line, followed by Sanskrit and meaning. The table uses Shloka, Sanskrit shloka, Meaning and Count columns and may scroll horizontally on narrow screens. The initial default is table on desktop and cards on mobile; the explicit choice is stored per profile in IndexedDB.

Cards and table rows are selectable disclosure items. Clicking, tapping, pressing Enter or pressing Space expands the selected SID in place to show the complete Sanskrit shloka with its authored line breaks and the complete preferred-language meaning. A table disclosure appears as a full-width row beneath the summary row. Only one SID is expanded at a time; selecting it again collapses it. Switching views preserves the selected and expanded SID, while leaving Your journey clears expansion.

Expanded table disclosures centre the Sanskrit and meaning inside a constrained readable-width area. Card disclosures remain left-aligned.

The list uses roving keyboard focus. Up and Down move between table rows; Home and End move to the bounds. In Cards, Left and Right move to adjacent cards and Up and Down follow the visual grid. Left and Right intentionally do nothing in Table. Escape first collapses an expanded SID and, when none is expanded, returns to the originating view. A visible focus outline, rotating chevron, `aria-expanded`, translated item labels and connected detail regions make the interaction perceivable without adding experience navigation or engagement counts.

The player’s main menu exposes **Your journey — J** immediately after **Diksoochi / Home — A**, and Help documents the shortcut. Opening from Home records Home as the transient origin; opening from the player records the current player view. Back, or Escape when no disclosure is expanded, returns to that origin without rebuilding it. Player SID, language, scroll and fullscreen state therefore remain intact. Audio pauses when Your journey opens from the player and remains paused on return. This origin is session UI state and is not persisted in IndexedDB.

## Choices

The **Continue your journey** action always targets the most recently visited experience and that experience’s saved SID, even after the person explicitly returns Home. Its choice is independent of display order in the experience catalog.

The **Choose an experience** section is part of Diksoochi. Product pills first select a registered product; the cards then follow that product’s configured order. Every card opens the shared player with its declared renderer, book and ordered dataset.

Choosing an experience preserves the profile identifier and preferred content language in application navigation. The profile’s app language governs this interface; `lang` links affect content only. The **Diksoochi / Home** command (`A`) returns from the player to Diksoochi and records it as the resumable location. Direct experience URLs still open the requested experience.

## Collection source

Home establishes one media source for the rest of the session. Under HTTP, HTTPS and installed-PWA use, MyGita reads the remote root declared in `products/app.json`, then resolves all book and media references through the root catalog’s schema-2 mounts. Under `file://`, Home shows **Local media** and asks for the media root containing `catalog.json`. One selection supplies all registered products and experiences for the session. Once validated, Home shows the active source and offers **Change media**.

The selected files, parsed book datasets and managed object URLs are reused across products, experiences and Your journey for the current browser session. Individual views do not show their own folder chooser. Changing the source on Home clears parsed datasets and revokes local object URLs before validating the replacement. A direct file-mode experience URL retains its requested product, experience and SID, routes through Home for media selection, and continues automatically afterward.

## About

About MyGita is available throughout the path from profile setup to the player. It uses the flute as a Krishna-associated visual symbol, links to Gitajyoti and Light of the Self, and displays the deployed application version.
