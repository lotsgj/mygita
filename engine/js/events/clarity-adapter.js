import { analyticsParameters, clarityEventName } from './analytics-event-map.js';

export class ClarityAdapter {
  constructor({ projectId = '', target = globalThis, documentRef = globalThis.document } = {}) {
    this.id = 'clarity';
    this.projectId = String(projectId || '').trim();
    this.target = target;
    this.document = documentRef;
    this.enabled = /^[a-z0-9]+$/i.test(this.projectId);
    this.started = false;
    this.tags = new Map();
  }

  accepts(event) {
    return this.enabled && (Boolean(event.context.ageBand) || event.event.startsWith('pwa_update_'));
  }

  initialize({ appVersion, displayMode }) {
    if (!this.enabled) return;
    this.start();
    this.setTag('app_version', appVersion);
    this.setTag('display_mode', displayMode);
  }

  start() {
    if (this.started) return;
    this.started = true;
    const clarity = this.target.clarity = this.target.clarity || function clarityQueue() {
      (clarity.q = clarity.q || []).push(arguments);
    };
    if (this.document?.querySelector(`script[data-clarity-project="${this.projectId}"]`)) return;
    const script = this.document.createElement('script');
    script.async = true;
    script.dataset.clarityProject = this.projectId;
    script.src = `https://www.clarity.ms/tag/${encodeURIComponent(this.projectId)}`;
    this.document.head.appendChild(script);
  }

  setTag(key, value) {
    if (value == null || value === '' || this.tags.get(key) === String(value)) return;
    this.tags.set(key, String(value));
    this.target.clarity('set', key, String(value));
  }

  handle(event) {
    this.start();
    const projected = analyticsParameters(event);
    const tags = {
      age_band: projected.age_band, gender_group: projected.gender_group,
      profile_language: projected.interface_language, experience: projected.experience,
      content_language: projected.content_language, app_version: projected.app_version,
      display_mode: projected.display_mode, surface: projected.surface,
      rachana_page: projected.documentation_page
    };
    Object.entries(tags).forEach(([key, value]) => this.setTag(key, value));
    if (event.event.startsWith('pwa_update_')) {
      this.setTag('update_from_version', event.details.fromVersion);
      this.setTag('update_to_version', event.details.toVersion);
      this.setTag('update_result', event.details.result || event.details.stage);
    }
    if (event.event === 'gita_sara_view_changed') this.setTag('gita_sara_view', event.details.view);

    const eventName = this.eventName(event);
    if (eventName) this.target.clarity('event', eventName);
  }

  eventName(event) {
    return clarityEventName(event);
  }
}
