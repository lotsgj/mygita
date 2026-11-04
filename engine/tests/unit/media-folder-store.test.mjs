import test from 'node:test';
import assert from 'node:assert/strict';
import { directoryPermission } from '../../js/media-folder-store.js';

test('remembered directory permission is checked without prompting during startup', async () => {
  const calls = [];
  const handle = {
    kind: 'directory',
    async queryPermission(options) { calls.push(['query', options]); return 'granted'; },
    async requestPermission(options) { calls.push(['request', options]); return 'granted'; }
  };
  assert.equal(await directoryPermission(handle), 'granted');
  assert.deepEqual(calls, [['query', { mode: 'read' }]]);
});

test('reconnect requests read permission only from a user action', async () => {
  const calls = [];
  const handle = {
    kind: 'directory',
    async queryPermission() { calls.push('query'); return 'prompt'; },
    async requestPermission(options) { calls.push(['request', options]); return 'granted'; }
  };
  assert.equal(await directoryPermission(handle, { request: true }), 'granted');
  assert.deepEqual(calls, [['request', { mode: 'read' }]]);
  assert.equal(await directoryPermission(null), 'denied');
});
