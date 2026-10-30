# Profiles and first use

**Status:** Current  
**Last updated:** 30 October 2026

## First visit

Gitaverse requires a profile; there is no guest route. On first use, the person enters a name, exact date of birth, optional gender, mandatory app language, preferred Gita content language, optional profile photo, and whether the profile should open automatically on this device. App language has no preselected value. Choosing it initially suggests the same content language, but the two choices remain independent.

Analytics is informational rather than an opt-in and no notice interrupts profile creation. An **Anonymous usage** link in the landing footer lets the person read what Microsoft Clarity and Google Analytics measure and what is excluded. Names, exact dates of birth, photos and private content remain local; profile surfaces are masked from Clarity.

## Returning visits

When no default profile is set, Gitaverse displays all local profiles and lets the person choose one or add another. A default profile bypasses selection. The persistent profile pill opens, in order, **My preferences**, **View / edit profile**, and **Switch / manage profiles**; those actions are not duplicated in the main menu.

The profile form separates personal details from a **My preferences** card. That card owns app language and preferred content language. Choosing **My preferences** opens the same profile form focused on this card, while **View / edit profile** opens the complete form. Both routes share one save action and one stored profile record.

After profile selection, Gitaverse either resumes the saved location or opens experience selection. The profile’s app language controls all Gitaverse labels and messages. Content language controls chapter names, transliteration, meaning, and word-by-word meaning and may differ by experience. An explicit `lang` URL parameter overrides content only; it never changes interface language.

## Profile identity

Each device assigns an incremental numeric `pid`. The event bus may use local identity to update resume and Diksoochi state, but analytics adapters do not transmit the local PID or anonymous profile identifier. Clarity receives age only as a band; Google Analytics does not receive age or gender. Under-13 ages become unknown, and invalid or missing dates use the missing band.

See [Profiles and local storage](../system/profiles-and-local-storage.md) and [Events, analytics and resume](../system/events-analytics-and-resume.md).
