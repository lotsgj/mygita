# Events, analytics and resume

**Status:** Current  
**Last updated:** 30 October 2026

## Event bus

The player emits validated, versioned events to a small first-party event bus. Each event receives an event ID, session ID, timestamp, app version, optional local profile IDs, context, and event-specific details. Events are immutable after creation. Adapter failures are isolated so analytics cannot break playback or navigation.

## Adapters

- **Resume** listens to location changes and Home openings, then saves the current screen plus the last meaningful place for each experience and profile.
- **Diksoochi** listens only to the 10-, 30- and 60-second visible verse-engagement thresholds and updates bounded profile-local per-SID aggregates used by Know.
- **Analytics projection** is the shared privacy allowlist and provider mapping. Clarity and Google Analytics consume this projection rather than reading arbitrary event details.
- **Clarity** loads only when a valid build-configured project ID is present. It answers interface-behaviour questions using grouped context and approved custom events.
- **Google Analytics** loads only when a valid build-configured GA4 measurement ID is present. It answers aggregate adoption and journey questions, consolidates related canonical events, disables advertising signals and personalisation, and uses explicit sanitized virtual page views.
- **Sentry** is an extension placeholder and is not configured as a live monitoring service.

There is no durable analytics event queue in IndexedDB. Clarity and Google Analytics use their in-memory browser queues; failed delivery does not grow local storage.

Diksoochi’s aggregates are independent user-state summaries, not queued Clarity events. Brief verse navigation does not create a Know record.

## Privacy context

Clarity receives age band, grouped gender, profile interface language, content language, experience, application version, and display mode. Google Analytics receives product and experience activity, interface and content language, display mode, application version and approved operational context, but not age or gender. Neither provider receives the local PID, anonymous profile ID, name, exact birth date, photo, verse text, notes, voice content or arbitrary event details. Profile form surfaces are masked from Clarity.

Analytics is disclosed without interrupting first use. The landing footer’s **Anonymous usage** link explains the two services and the private fields that are excluded.

## Engagement events

All 37 validated canonical event types are eligible for the shared analytics projection. Clarity retains its detailed custom-event vocabulary. Google Analytics consumes the same event types but consolidates related profile, navigation, engagement, audio-progress, update and error activity into a smaller reporting vocabulary.

Gita Sara emits `gita_sara_view_changed` with only `two_panel` or `three_panel`. It measures use of the optional contemplation panel without transmitting questions, verse text, or a personal response.

PWA mappings cover update available, accepted, dismissed, completed and failed. `app_version` and display mode initialize both analytics adapters even before a profile event. PWA lifecycle events may run without profile context and carry only applicable source/target versions plus completion result or failure stage. The same waiting version produces only one available event per page session.

Rachana uses the same bus and both analytics adapters for handbook opening, document views, navigation opening, profile selection, About, Open MyGita, and document failures. Analytics identifies `surface=rachana` and the stable documentation route. Google Analytics emits a sanitized virtual page view; Markdown content, URL query parameters and local profile identifiers are excluded.

## Resume precedence

An explicit `play`, `sid`, or `lang` request wins. Otherwise the chosen/default profile’s saved Diksoochi or experience location is restored. Going to Diksoochi does not erase any experience point: selecting Gita 700 again, for example, restores its last SID and language. Every accepted navigation updates resumable state through the same event path used for analytics.
