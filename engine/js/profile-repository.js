import { normalizeProfileId, ProfileApiProvider } from './profile-api-provider.js';

function languageId(value, languageModel) {
  const wanted = String(value || '').trim().toLowerCase();
  const model = languageModel();
  const found = Object.entries(model.registry || {}).find(([id, language]) => [id, language.name, language.nativeName]
    .some((candidate) => String(candidate || '').trim().toLowerCase() === wanted));
  return found?.[0] || model.defaultContent || 'en';
}

export function localProfileFromApi(profile, languageModel) {
  const pid = normalizeProfileId(profile?.profileId);
  if (!pid) throw new Error('The Profile service returned an invalid Profile ID.');
  const fields = profile?.fields || {};
  return {
    pid,
    name: String(fields.name || '').trim() || pid,
    interfaceLanguage: languageId(fields.preferred_language, languageModel),
    contentLanguage: languageId(fields.preferred_language, languageModel),
    attachedAt: new Date().toISOString(),
    profileSource: 'gitajyoti',
    analyticsPid: String(profile?.analyticsPid || profile?.analytics_pid || '').trim(),
    invitations: Array.isArray(profile?.invitations) ? profile.invitations.map((invitation) => ({ ...invitation })) : []
  };
}

export class ProfileRepository {
  constructor({ store, provider = new ProfileApiProvider(), languageModel }) {
    this.store = store;
    this.provider = provider;
    this.languageModel = languageModel;
  }

  async attachApiProfile(apiProfile) {
    const profile = localProfileFromApi(apiProfile, this.languageModel);
    return this.store.attach(profile);
  }

  async attach(pid, { dateOfBirth = '', turnstileToken = '', signal } = {}) {
    const normalized = normalizeProfileId(pid);
    if (!normalized) return { ok: false, code: 'invalid_field', field: 'pid', message: 'Enter a valid Profile ID.' };
    const known = await this.store.get(normalized);
    if (known) return { ok: true, profile: known, existing: true };
    if (dateOfBirth) {
      const verified = await this.provider.verifyProfile(normalized, dateOfBirth, { turnstileToken, signal });
      if (!verified.ok) return verified;
      return { ok: true, profile: await this.attachApiProfile(verified.profile) };
    }
    const current = await this.provider.getProfile(normalized);
    if (current.ok) return { ok: true, profile: await this.attachApiProfile(current.profile) };
    return current;
  }

  async attachSessionProfile({ expectedPid = '' } = {}) {
    const session = await this.provider.getSession();
    const expected = normalizeProfileId(expectedPid);
    const profileIds = session.ok ? (session.profileIds || []).map(normalizeProfileId).filter(Boolean) : [];
    const pid = expected ? (profileIds.includes(expected) ? expected : '') : profileIds.at(-1);
    return pid ? this.attach(pid) : { ok: false, code: 'not_found' };
  }
}
