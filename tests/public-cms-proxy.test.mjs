import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicCmsProxy } from '../src/lib/public-cms-proxy.ts';

test('proxy forwards only anonymous reads to the fixed CMS', async () => {
  let seen;
  const mock = async (url, init) => { seen = { url: String(url), init }; return Response.json({ docs: [] }); };
  const request = new Request('https://preview.example/_cms/api/tests?depth=0', {
    headers: { Authorization: 'Bearer private', Cookie: 'private=1' },
  });
  const response = await publicCmsProxy(request, 'https://cms.volumeslab.com', mock);
  assert.equal(response.status, 200);
  assert.equal(seen.url, 'https://cms.volumeslab.com/api/tests?depth=0');
  assert.deepEqual(seen.init.headers, { Accept: 'application/json' });
  assert.equal(seen.init.redirect, 'manual');
});

test('proxy blocks admin, users, sessions and writes without contacting CMS', async () => {
  const mock = () => { throw new Error('Must not contact CMS'); };
  for (const path of ['/api/users', '/admin', '/api/service-index', '/api/tests/login', '/api/media/file/a%2Fb']) {
    assert.equal((await publicCmsProxy(new Request('https://preview.example/_cms' + path), 'https://cms.volumeslab.com', mock)).status, 404);
  }
  assert.equal((await publicCmsProxy(new Request('https://preview.example/_cms/api/tests', { method: 'POST' }), 'https://cms.volumeslab.com', mock)).status, 405);
});

test('proxy never follows redirects or leaks upstream cookies', async () => {
  const request = new Request('https://preview.example/_cms/api/tests');
  assert.equal((await publicCmsProxy(request, 'https://cms.volumeslab.com', async () => new Response(null, { status: 302, headers: { Location: 'https://other.example' } }))).status, 502);
  const response = await publicCmsProxy(request, 'https://cms.volumeslab.com', async () => new Response('{}', { headers: { 'Set-Cookie': 'private=1', 'Content-Type': 'application/json' } }));
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
