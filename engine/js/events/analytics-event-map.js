const DIRECT_EVENTS = new Set([
  'app_opened', 'profile_created', 'profile_selected', 'profile_updated', 'profile_switched',
  'experience_selected', 'language_changed', 'home_opened', 'data_load_failed', 'profile_storage_failed',
  'pwa_update_available', 'pwa_update_accepted', 'pwa_update_dismissed', 'pwa_update_completed', 'pwa_update_failed',
  'verse_viewed', 'verse_engaged_10s', 'verse_engaged_30s', 'verse_engaged_60s',
  'audio_started', 'audio_resumed', 'audio_paused', 'audio_seeked', 'audio_25', 'audio_50',
  'audio_75', 'audio_completed', 'audio_failed', 'gita_sara_view_changed',
  'rachana_opened', 'rachana_page_viewed', 'rachana_navigation_opened', 'rachana_profile_selected',
  'rachana_about_opened', 'rachana_gitaverse_opened', 'rachana_document_failed'
]);

const LOCATION_EVENTS = {
  next: 'next_verse', previous: 'previous_verse', swipe: 'verse_swiped', goto: 'goto_verse',
  chapter: 'chapter_selected', resume: 'experience_resumed'
};

function present(value) { return value == null || value === '' ? undefined : value; }
function compact(values) { return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined)); }

export function clarityEventName(event) {
  if (event.event === 'location_changed') return LOCATION_EVENTS[event.details.source] || null;
  return DIRECT_EVENTS.has(event.event) ? event.event : null;
}

export function analyticsParameters(event) {
  const parameters = {
    age_band: present(event.context.ageBand), gender_group: present(event.context.genderGroup),
    interface_language: present(event.context.profileLanguage), content_language: present(event.context.language),
    product: present(event.context.distribution), experience: present(event.context.experience),
    collection: present(event.context.collection), verse_id: present(event.context.sid), chapter_id: present(event.context.chapter),
    app_version: present(event.context.appVersion), display_mode: present(event.context.displayMode),
    surface: present(event.context.surface), documentation_page: present(event.context.documentationPage)
  };
  if (event.event === 'location_changed') parameters.navigation_source = present(event.details.source);
  if (event.event.startsWith('pwa_update_')) {
    parameters.update_from_version = present(event.details.fromVersion);
    parameters.update_to_version = present(event.details.toVersion);
    parameters.update_result = present(event.details.result || event.details.stage);
  }
  if (event.event === 'gita_sara_view_changed') parameters.view = present(event.details.view);
  const engagement = event.event.match(/^verse_engaged_(10|30|60)s$/);
  if (engagement) parameters.engagement_seconds = Number(engagement[1]);
  const audioProgress = event.event.match(/^audio_(25|50|75)$/);
  if (audioProgress) parameters.progress_percent = Number(audioProgress[1]);
  if (event.event.startsWith('profile_') || event.event === 'rachana_profile_selected') parameters.profile_action = event.event;
  if (['data_load_failed', 'profile_storage_failed', 'audio_failed', 'rachana_document_failed'].includes(event.event)) parameters.error_type = event.event;
  return compact(parameters);
}

export function googleAnalyticsParameters(event) {
  const { age_band, gender_group, ...parameters } = analyticsParameters(event);
  return parameters;
}

export function googleAnalyticsEventName(event) {
  if (event.event === 'location_changed') return 'verse_navigated';
  if (event.event.startsWith('profile_') || event.event === 'rachana_profile_selected') return 'profile_action';
  if (event.event.startsWith('pwa_update_')) return 'pwa_update';
  if (/^verse_engaged_(10|30|60)s$/.test(event.event)) return 'verse_engaged';
  if (/^audio_(25|50|75)$/.test(event.event)) return 'audio_progress';
  if (['data_load_failed', 'profile_storage_failed', 'audio_failed', 'rachana_document_failed'].includes(event.event)) return 'app_error';
  if (event.event === 'rachana_page_viewed') return null;
  return DIRECT_EVENTS.has(event.event) ? event.event : null;
}

export function analyticsPage(event) {
  if (event.event === 'home_opened') return { path: '/home', title: 'MyGita Home' };
  if (event.event === 'experience_selected' && event.context.experience) return { path: `/experience/${encodeURIComponent(event.context.experience)}`, title: `MyGita · ${event.context.experience}` };
  if (event.event === 'rachana_page_viewed' && event.context.documentationPage) return { path: `/rachana/${encodeURIComponent(event.context.documentationPage)}`, title: `Rachana · ${event.context.documentationPage}` };
  return null;
}
