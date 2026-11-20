import test from 'node:test';
import assert from 'node:assert/strict';
import { ProfileRepository } from '../../js/profile-repository.js';
import { mergeInvitations } from '../../js/profile-store.js';

function profile(pid = 'GJ-PHGK-GZZ1') {
  return { profileId: pid, analyticsPid: 'analytics-' + pid.slice(-4), invitations: [{ code: 'g4c-nov26-radhakrishna' }], fields: { name: 'Vijay Kumar', preferred_language: 'English', email: 'private@example.org', date_of_birth: '1980-01-01' } };
}

function fixture({ existing = null, getProfile = null, verifyProfile = null, session = [] } = {}) {
  const saved = new Map(existing ? [[existing.pid, existing]] : []);
  const calls = [];
  const store = {
    async get(pid) { return saved.get(pid) || null; },
    async attach(value) { saved.set(value.pid, { ...value }); return saved.get(value.pid); }
  };
  const provider = {
    async getProfile(pid) { calls.push(['get', pid]); return getProfile ? getProfile(pid) : { ok: true, profile: profile(pid) }; },
    async verifyProfile(pid, dob, options) { calls.push(['verify', pid, dob, options.turnstileToken]); return verifyProfile ? verifyProfile(pid, dob, options) : { ok: true, profile: profile(pid) }; },
    async getSession() { calls.push(['session']); return { ok: true, profileIds: session }; }
  };
  const repository = new ProfileRepository({ store, provider, languageModel: () => ({ defaultContent: 'en', registry: { en: { name: 'English' }, kn: { name: 'Kannada' } } }) });
  return { repository, saved, calls };
}

test('same-browser session attachment projects an existing Gitajyoti profile locally', async () => {
  const { repository, saved, calls } = fixture({ session: ['GJ-PHGK-GZZ1'] });
  const result = await repository.attachSessionProfile();
  assert.equal(result.ok, true);
  assert.equal(result.profile.pid, 'GJ-PHGK-GZZ1');
  assert.equal(saved.get('GJ-PHGK-GZZ1').name, 'Vijay Kumar');
  assert.equal(saved.get('GJ-PHGK-GZZ1').analyticsPid, 'analytics-GZZ1');
  assert.equal(saved.get('GJ-PHGK-GZZ1').invitations[0].code, 'g4c-nov26-radhakrishna');
  assert.deepEqual(calls, [['session'], ['get', 'GJ-PHGK-GZZ1']]);
  assert.equal('email' in result.profile, false);
});

test('a requested PID auto-attaches only when the same PID is present in the session', async () => {
  const { repository, calls } = fixture({ session: ['GJ-7K3M-9QX2'] });
  const missing = await repository.attachSessionProfile({ expectedPid: 'GJ-PHGK-GZZ1' });
  assert.deepEqual(missing, { ok: false, code: 'not_found' });
  assert.deepEqual(calls, [['session']]);
});

test('an unverified PID asks for verification and DOB submits directly without a second lookup', async () => {
  const { repository, calls } = fixture({ getProfile: async () => ({ ok: false, code: 'unverified' }) });
  const first = await repository.attach('GJ-PHGK-GZZ1');
  assert.equal(first.code, 'unverified');
  const verified = await repository.attach('GJ-PHGK-GZZ1', { dateOfBirth: '1980-01-01', turnstileToken: 'captcha' });
  assert.equal(verified.ok, true);
  assert.deepEqual(calls, [['get', 'GJ-PHGK-GZZ1'], ['verify', 'GJ-PHGK-GZZ1', '1980-01-01', 'captcha']]);
});

test('an attached PID reopens locally without contacting the API', async () => {
  const existing = { pid: 'GJ-PHGK-GZZ1', name: 'Vijay Kumar', interfaceLanguage: 'en', contentLanguage: 'en', profileSource: 'gitajyoti' };
  const { repository, calls } = fixture({ existing });
  const result = await repository.attach(existing.pid);
  assert.equal(result.ok, true);
  assert.equal(result.existing, true);
  assert.deepEqual(calls, []);
});

test('persisted invitations remain immutable while newly connected invitations append', () => {
  const first = { code: 'g4c-nov26-radhakrishna', offering: { name: 'Original offering' } };
  const merged = mergeInvitations([first], [
    { code: 'g4c-nov26-radhakrishna', offering: { name: 'Changed remotely' } },
    { code: 'g4c-dec26-vedanta', offering: { name: 'New offering' } }
  ]);
  assert.deepEqual(merged, [
    first,
    { code: 'g4c-dec26-vedanta', offering: { name: 'New offering' } }
  ]);
});
