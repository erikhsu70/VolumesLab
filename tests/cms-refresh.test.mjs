import assert from 'node:assert/strict';
import { test } from 'node:test';
import { startCmsRefresh } from '../src/lib/cms-refresh.ts';

const tick = () => new Promise(resolve => setImmediate(resolve));
function targets() {
  const page = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  return { page, browser: new EventTarget() };
}

test('direct entry refreshes once and coalesces simultaneous browser events', async () => {
  const { page, browser } = targets();
  let calls = 0;
  let finish;
  const stop = startCmsRefresh(() => {
    calls++;
    return new Promise(resolve => { finish = resolve; });
  }, page, browser);
  assert.equal(calls, 1);
  browser.dispatchEvent(new Event('focus'));
  browser.dispatchEvent(new Event('pageshow'));
  page.dispatchEvent(new Event('visibilitychange'));
  assert.equal(calls, 1);
  finish();
  await tick();
  browser.dispatchEvent(new Event('focus'));
  assert.equal(calls, 2);
  finish();
  stop();
});

test('hidden tabs defer refresh until visible, and cleanup removes all listeners', async () => {
  const { page, browser } = targets();
  page.visibilityState = 'hidden';
  let calls = 0;
  const stop = startCmsRefresh(async () => { calls++; }, page, browser);
  assert.equal(calls, 0);
  page.visibilityState = 'visible';
  page.dispatchEvent(new Event('visibilitychange'));
  assert.equal(calls, 1);
  await tick();
  stop();
  page.dispatchEvent(new Event('visibilitychange'));
  for (const event of ['focus', 'pageshow', 'online']) browser.dispatchEvent(new Event(event));
  assert.equal(calls, 1);
});

test('an unavailable CMS does not cause an unhandled rejection and can retry online', async () => {
  const { page, browser } = targets();
  let calls = 0;
  const stop = startCmsRefresh(async () => { calls++; throw new Error('offline'); }, page, browser);
  await tick();
  browser.dispatchEvent(new Event('online'));
  await tick();
  assert.equal(calls, 2);
  stop();
});
