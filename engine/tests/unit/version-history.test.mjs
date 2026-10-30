import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeVersionHistory, validateVersionHistory, VersionHistoryStore } from '../../js/version-history.js';

const history = [
  { version: '1.30Sep2026-120000', date: '2026-09-30', message: 'Earlier update' },
  { version: '1.01Oct2026-080000', date: '2026-10-01', message: 'Morning update' },
  { version: '1.01Oct2026-090000', date: '2026-10-01', message: 'Later update' }
];

test('version history validates the compact deployment contract', () => {
  assert.equal(validateVersionHistory(history), history);
  assert.throws(() => validateVersionHistory([...history, history[0]]), /duplicate version/);
  assert.throws(() => validateVersionHistory([{ version: 'bad', date: '2026-10-01', message: 'x' }]), /invalid version/);
  assert.throws(() => validateVersionHistory([{ version: '1.01Oct2026-090000', date: 'bad', message: 'x' }]), /invalid date/);
});

test('display history merges device dates and sorts newest first', () => {
  const merged = mergeVersionHistory(history, [{ version: '1.01Oct2026-080000', dateSeen: '2026-10-01T08:05:00Z', dateInstalled: '2026-10-01T08:06:00Z' }]);
  assert.deepEqual(merged.map((record) => record.version), ['1.01Oct2026-090000', '1.01Oct2026-080000', '1.30Sep2026-120000']);
  assert.equal(merged[1].dateSeen, '2026-10-01T08:05:00Z');
  assert.equal(merged[1].dateInstalled, '2026-10-01T08:06:00Z');
});

test('current run-attempt versions sort newest first within the same day', () => {
  const merged = mergeVersionHistory([
    { version: '1.18-1', date: '2026-10-30', message: 'Earlier run' },
    { version: '1.19-1', date: '2026-10-30', message: 'Later run' },
    { version: '1.19-2', date: '2026-10-30', message: 'Later attempt' }
  ]);
  assert.deepEqual(merged.map((record) => record.version), ['1.19-2', '1.19-1', '1.18-1']);
});

test('current build message can be supplied by the active distribution', () => {
  const merged = mergeVersionHistory([], [], '1.16Oct2026-120000', 'Current Suktaverse build');
  assert.equal(merged[0].message, 'Current Suktaverse build');
});

test('a locally seen current build receives display metadata and remains first', () => {
  const merged = mergeVersionHistory(
    [{ version: '1.18-1', date: '2026-10-29', message: 'Earlier build' }],
    [{ version: '1.19-1', dateSeen: '2026-10-30T08:00:00Z' }],
    '1.19-1',
    'Current MyGita build'
  );
  assert.equal(merged[0].version, '1.19-1');
  assert.match(merged[0].date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(merged[0].message, 'Current MyGita build');
});

test('version history can use a distribution-specific database namespace', () => {
  const store = new VersionHistoryStore({ databaseName: 'suktaverse-version-history' });
  assert.equal(store.databaseName, 'suktaverse-version-history');
});
