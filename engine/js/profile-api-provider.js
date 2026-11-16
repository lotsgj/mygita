const PID_PATTERN = /^GJ-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

export function normalizeProfileId(value) {
  const pid = String(value || '').trim().toUpperCase();
  return PID_PATTERN.test(pid) ? pid : '';
}

export function apiOrigin(locationRef = globalThis.location) {
  const host = String(locationRef?.hostname || '').toLowerCase();
  return host === 'mygita.gitajyoti.org' || host === 'gitajyoti.org' || host.endsWith('.gitajyoti.org')
    ? 'https://api.gitajyoti.org'
    : 'https://dev.api.gitajyoti.org';
}

export class ProfileApiProvider {
  constructor({ baseUrl = apiOrigin(), loadClient } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.loadClient = loadClient || (() => import(`${this.baseUrl}/v1/client.js`));
    this.clientPromise = null;
  }

  async client() {
    if (!this.clientPromise) this.clientPromise = this.loadClient().then(({ connect }) => connect({ baseUrl: this.baseUrl }));
    return this.clientPromise;
  }

  async getProfile(pid) {
    const normalized = normalizeProfileId(pid);
    if (!normalized) return { ok: false, code: 'unverified', message: 'Enter a valid Profile ID.' };
    return (await this.client()).getProfile(normalized);
  }

  async getSession() {
    return (await this.client()).getSession();
  }

  async verifyProfile(pid, dateOfBirth, { turnstileToken = '', signal } = {}) {
    const normalized = normalizeProfileId(pid);
    if (!normalized) return { ok: false, code: 'unverified', message: 'Enter a valid Profile ID.' };
    return (await this.client()).verifyProfile(normalized, dateOfBirth, { turnstileToken, signal });
  }

  async forgetSession() {
    return (await this.client()).forgetSession();
  }

  async renderVerificationTurnstile(container) {
    const module = await this.loadClient();
    return module.renderTurnstile(container, { action: module.VERIFY_TURNSTILE_ACTION || 'verify_profile' });
  }
}
