import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const allowed = new Set(['cdn.jsdelivr.net', 'api.fontshare.com']);
const responses = new Map();
function download(url) {
  if (!responses.has(url)) responses.set(url, (async () => {
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200, url);
    assert.equal(response.headers.get('access-control-allow-origin'), '*', url);
    return Buffer.from(await response.arrayBuffer());
  })());
  return responses.get(url);
}
function verify(bytes, integrity) {
  assert.match(integrity, /^sha384-[A-Za-z0-9+/]{64}$/);
  assert.equal('sha384-' + createHash('sha384').update(bytes).digest('base64'), integrity);
}
for (const file of ['index.html', 'about.html']) test(`${file}: every remote script/stylesheet matches its actual SHA-384 and supports CORS`, async () => {
  const html = await readFile(new URL(file, root), 'utf8');
  let remote = 0;
  for (const match of html.matchAll(/<(script|link)\b[^>]*>/gi)) {
    const tag = match[0];
    if (match[1] === 'link' && !/rel="stylesheet"/.test(tag)) continue;
    const url = /(?:src|href)="(https:\/\/[^"\s]+)"/.exec(tag)?.[1];
    if (!url) continue;
    remote++;
    assert(allowed.has(new URL(url).hostname));
    const integrity = /integrity="([^"]+)"/.exec(tag)?.[1];
    assert(integrity, `${file} has an unprotected CDN resource`);
    assert.match(tag, /crossorigin="anonymous"/);
    verify(await download(url), integrity);
  }
  assert.equal(remote, 5);
});
test('integrity verification rejects modified resource bytes', () => {
  const original = Buffer.from('reviewed resource');
  const sri = 'sha384-' + createHash('sha384').update(original).digest('base64');
  verify(original, sri);
  assert.throws(() => verify(Buffer.from('modified resource'), sri));
});
test('integrity verification rejects malformed or truncated hashes', () => {
  for (const integrity of ['', 'sha384-fake', 'sha256-fake']) assert.throws(() => verify(Buffer.from('x'), integrity));
});
