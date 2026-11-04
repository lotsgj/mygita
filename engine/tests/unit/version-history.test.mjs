import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeVersionHistory, validateVersionHistory, VersionHistoryStore } from '../../js/version-history.js';

const history = [
  { version: '1.30Sep2026-120000', date: '2026-09-30', title: 'Earlier update' },
  { version: '1.01Oct2026-080000', date: '2026-10-01', title: 'Morning update' },
  { version: '1.01Oct2026-090000', date: '2026-10-01', title: 'Later update', message: 'A little more detail.' }
];

test('version history validates the compact deployment contract', () => {
  assert.equal(validateVersionHistory(history), history);
  assert.throws(() => validateVersionHistory([...history, history[0]]), /duplicate version/);
  assert.throws(() => validateVersionHistory([{ version: 'bad', date: '2026-10-01', title: 'x' }]), /invalid version/);
  assert.throws(() => validateVersionHistory([{ version: '1.01Oct2026-090000', date: 'bad', title: 'x' }]), /invalid date/);
  assert.throws(() => validateVersionHistory([{ version: '1.01Oct2026-090000', date: '2026-10-01' }]), /no release title/);
});

test('display history merges device dates and sorts newest first', () => {
  const merged = mergeVersionHistory(history, [{ version: '1.01Oct2026-080000', dateSeen: '2026-10-01T08:05:00Z', dateInstalled: '2026-10-01T08:06:00Z' }]);
  assert.deepEqual(merged.map((record) => record.version), ['1.01Oct2026-090000', '1.01Oct2026-080000', '1.30Sep2026-120000']);
  assert.equal(merged[1].dateSeen, '2026-10-01T08:05:00Z');
  assert.equal(merged[1].dateInstalled, '2026-10-01T08:06:00Z');
});

test('current run-attempt versions sort newest first within the same day', () => {
  const merged = mergeVersionHistory([
    { version: '1.18-1', date: '2026-10-30', title: 'Earlier run' },
    { version: '1.19-1', date: '2026-10-30', title: 'Later run' },
    { version: '1.19-2', date: '2026-10-30', title: 'Later attempt' }
  ]);
  assert.deepEqual(merged.map((record) => record.version), ['1.19-2', '1.19-1', '1.18-1']);
});

test('current release title can be supplied with an English fallback', () => {
  const merged = mergeVersionHistory([], [], '1.16Oct2026-120000', 'Sukta chanting refinements');
  assert.equal(merged[0].title, 'Sukta chanting refinements');
  assert.equal(merged[0].current, true);
});

test('a locally seen current build receives display metadata and remains first', () => {
  const merged = mergeVersionHistory(
    [{ version: '1.18-1', date: '2026-10-29', title: 'Earlier build' }],
    [{ version: '1.19-1', dateSeen: '2026-10-30T08:00:00Z' }],
    '1.19-1',
    'MyGita playback improvements'
  );
  assert.equal(merged[0].version, '1.19-1');
  assert.match(merged[0].date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(merged[0].title, 'MyGita playback improvements');
  assert.equal(merged[0].current, true);
});

test('version history can use a distribution-specific database namespace', () => {
  const store = new VersionHistoryStore({ databaseName: 'suktaverse-version-history' });
  assert.equal(store.databaseName, 'suktaverse-version-history');
});
