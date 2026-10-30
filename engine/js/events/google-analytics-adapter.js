import { analyticsPage, googleAnalyticsEventName, googleAnalyticsParameters } from './analytics-event-map.js';

export class GoogleAnalyticsAdapter {
  constructor({ measurementId = '', target = globalThis, documentRef = globalThis.document, locationRef = globalThis.location } = {}) {
    this.id = 'google-analytics';
    this.measurementId = String(measurementId || '').trim();
    this.target = target;
    this.document = documentRef;
    this.location = locationRef;
    this.enabled = /^G-[A-Z0-9]+$/i.test(this.measurementId);
    this.started = false;
  }

  accepts(event) {
    return this.enabled && Boolean(googleAnalyticsEventName(event) || analyticsPage(event));
  }

  initialize({ appVersion, displayMode }) {
    if (!this.enabled || this.started) return;
    this.started = true;
    const dataLayer = this.target.dataLayer = this.target.dataLayer || [];
    this.target.gtag = this.target.gtag || function googleTagQueue() { dataLayer.push(arguments); };
    this.target.gtag('js', new Date());
    this.target.gtag('config', this.measurementId, {
      send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
      app_version: appVersion, display_mode: displayMode
    });
    if (!this.document?.querySelector(`script[data-ga-measurement-id="${this.measurementId}"]`)) {
      const script = this.document.createElement('script');
      script.async = true;
      script.dataset.gaMeasurementId = this.measurementId;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(this.measurementId)}`;
      this.document.head.appendChild(script);
    }
  }

  handle(event) {
    this.initialize({ appVersion: event.context.appVersion, displayMode: event.context.displayMode });
    const parameters = googleAnalyticsParameters(event);
    const eventName = googleAnalyticsEventName(event);
    if (eventName) this.target.gtag('event', eventName, parameters);
    const page = analyticsPage(event);
    if (page) this.target.gtag('event', 'page_view', {
      ...parameters, page_title: page.title, page_location: this.pageLocation(page.path)
    });
  }

  pageLocation(path) {
    const origin = /^https?:$/.test(this.location?.protocol || '') ? this.location.origin : 'https://mygita.gitajyoti.org';
    return new URL(path, origin).href;
  }
}
