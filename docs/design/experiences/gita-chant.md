# Gita Chant

**Status:** Current  
**Last updated:** 4 November 2026

## Purpose

Gita Chant is a verse-centred chanting experience built with the reusable Player-4 renderer. It presents only the current learning unit in three scripts so the person can remain focused on recitation without meanings, word-by-word text or learning-stage controls.

## Layout and language order

Desktop uses three fixed-height panels between the shared top menu and audio controls: Sanskrit on the left, the profile’s preferred content language in the middle, and the other supported transliteration on the right. Changing content language reorders the same English and Kannada panel elements; it does not duplicate visible and hidden content.

On mobile, each language panel receives the full vertical player area between the top menu and audio controls. Panels stack vertically and the person scrolls from one language to the next; the design deliberately does not compress all three into one viewport.

## Text fitting

The fitter preserves authored source lines, considers both width and height, and chooses the largest bounded size that fits within padding on all four edges. It does not split words. When an unusually long source line would force an unreadably small no-wrap size, the renderer may wrap only at spaces or hyphens, applies a hanging indent and left-aligns the resulting long-form block. Ordinary verse units remain unwrapped and left-aligned consistently across panels. Script-specific line heights protect Devanagari and Kannada conjuncts and Vedic accent marks, while per-script scale factors keep the three panels optically related. Short verses are capped so they do not balloon between adjacent SIDs.

## Shared player behavior

Gita Chant uses the shared chapter, collection, profile, menu, resume, direct-SID, keyboard, fullscreen and audio controls. Its canonical text comes from the Bhagavad Gita media book through the same logical-path contract as the other Gita experiences. It does not own a second copy of verse masters.

## Verification

Unit tests cover the Player-4 semantic model and preferred-language order. Browser regression checks desktop and mobile panel geometry, authored line preservation, long-line wrapping, word boundaries, panel overflow, font caps and refitting after resize and font loading.
