import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCmsNavigation } from '../src/lib/cms-navigation.ts';

test('navigation can read the hydrated snapshot while a shared refresh is still pending', async () => {
  let finish;
  let fetches = 0;
  let renders = 0;
  const cms = createCmsNavigation(() => {
    fetches++;
    return new Promise(resolve => { finish = resolve; });
  }, (_, fresh) => fresh, 0);
  cms.seed('{"name":"Old product","price":295}');
  const publish = async () => {
    renders++;
    assert.deepEqual(JSON.parse(cms.read()), { name: 'New product', price: 350 });
  };
  const first = cms.refresh(publish);
  const next = cms.refresh(publish);
  assert.equal(first, next);
  assert.equal(JSON.parse(cms.read()).price, 295);
  await Promise.resolve();
  assert.equal(fetches, 1);
  finish({ name: 'New product', price: 350 });
  await first;
  cms.seed('{"name":"Old product","price":295}');
  assert.equal(JSON.parse(cms.read()).price, 350, 'old hydration cannot overwrite fresh content');
  assert.equal(renders, 1);
});

test('unchanged and failed reads do not invalidate routes; recovery still updates them', async () => {
  const cms = createCmsNavigation(async () => {
    if (mode === 'error') throw new Error('offline');
    return mode === 'null' ? null : { price: mode === 'edited' ? 350 : 295 };
  }, (_, fresh) => fresh, 0);
  let mode = 'unchanged';
  let renders = 0;
  const publish = async () => { renders++; };
  cms.seed('{"price":295}');
  await cms.refresh(publish);
  mode = 'error';
  await assert.rejects(cms.refresh(publish), /offline/);
  mode = 'null';
  await cms.refresh(publish);
  assert.equal(renders, 0);
  assert.equal(JSON.parse(cms.read()).price, 295);
  mode = 'edited';
  await cms.refresh(publish);
  assert.equal(renders, 1);
  assert.equal(JSON.parse(cms.read()).price, 350);
});

test('a burst of navigation shares a trailing refresh rather than reading on every click', async (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'] });
  let calls = 0;
  const cms = createCmsNavigation(async () => ({ revision: ++calls }), (_, fresh) => fresh);
  const publish = async () => {};
  await cms.refresh(publish);
  const trailing = cms.refresh(publish);
  assert.equal(cms.refresh(publish), trailing);
  await Promise.resolve();
  t.mock.timers.tick(4_999);
  assert.equal(calls, 1);
  assert.equal(JSON.parse(cms.read()).revision, 1);
  t.mock.timers.tick(1);
  await trailing;
  assert.equal(calls, 2);
  assert.equal(JSON.parse(cms.read()).revision, 2);
});
