import test from 'node:test';
import assert from 'node:assert/strict';
import { apiOrigin, normalizeProfileId, ProfileApiProvider } from '../../js/profile-api-provider.js';
import { localProfileFromApi } from '../../js/profile-repository.js';

test('normalizes only canonical Crockford Profile IDs', () => {
  assert.equal(normalizeProfileId(' gj-7k3m-9qx2 '), 'GJ-7K3M-9QX2');
  assert.equal(normalizeProfileId('GJ-7K3I-9QX2'), '');
  assert.equal(normalizeProfileId('1'), '');
});

test('selects production only for the Gitajyoti host', () => {
  assert.equal(apiOrigin({ hostname: 'mygita.gitajyoti.org' }), 'https://api.gitajyoti.org');
  assert.equal(apiOrigin({ hostname: 'localhost' }), 'https://dev.api.gitajyoti.org');
});

test('the API provider is lazy and delegates verification', async () => {
  let loaded = 0;
  const provider = new ProfileApiProvider({ baseUrl: 'https://example.test', loadClient: async () => {
    loaded += 1;
    return { connect: () => ({ getProfile: async (pid) => ({ ok: true, profile: { profileId: pid } }) }) };
  } });
  assert.equal(loaded, 0);
  assert.deepEqual(await provider.getProfile('GJ-7K3M-9QX2'), { ok: true, profile: { profileId: 'GJ-7K3M-9QX2' } });
  assert.equal(loaded, 1);
});

test('API profile projection retains only MyGita local fields', () => {
  const profile = localProfileFromApi({ profileId: 'GJ-7K3M-9QX2', analyticsPid: 'analytics-7k3m', invitations: [{ code: 'g4c-nov26-radhakrishna', offering: { name: 'Gita class' } }], fields: {
    name: 'Vijay Kumar', mobile: '+9198', email: 'v@example.org', date_of_birth: '1980-01-01', gender: 'male', preferred_language: 'English'
  } }, () => ({ defaultContent: 'en', registry: { en: { name: 'English' }, kn: { name: 'Kannada' } } }));
  assert.deepEqual(Object.keys(profile).sort(), ['analyticsPid', 'attachedAt', 'contentLanguage', 'interfaceLanguage', 'invitations', 'name', 'pid', 'profileSource']);
  assert.equal(profile.pid, 'GJ-7K3M-9QX2');
  assert.equal(profile.analyticsPid, 'analytics-7k3m');
  assert.equal(profile.invitations[0].code, 'g4c-nov26-radhakrishna');
});
