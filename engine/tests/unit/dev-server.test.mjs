import test from 'node:test';
import assert from 'node:assert/strict';
import { options, registrationUrl, renderPlayerHtml } from '../../scripts/dev-server.mjs';

test('the development server defaults to production Gitajyoti registration', () => {
  assert.equal(registrationUrl(), 'https://gitajyoti.org/register.html');
  assert.deepEqual(options([]), { port: 4173, websiteUrl: 'https://gitajyoti.org/' });
});

test('the development server injects a configured Website origin only into its HTML response', () => {
  const local = 'http://127.0.0.1:8080/';
  assert.equal(registrationUrl(local), 'http://127.0.0.1:8080/register.html');
  assert.equal(renderPlayerHtml('<a href="https://gitajyoti.org/register.html">Register</a>', local), '<a href="http://127.0.0.1:8080/register.html">Register</a>');
  assert.deepEqual(options(['--', '--port', '4310', '--website-url', local]), { port: 4310, websiteUrl: local });
});
