import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { captureCms, snapshotFile } from './cms-snapshot.mjs';

const origin = 'http://127.0.0.1:4189';
const output = resolve('.output/public');
const snapshot = JSON.parse(await readFile(snapshotFile, 'utf8'));
const server = spawn(process.execPath, ['--import', './scripts/static-fetch.mjs', '.output/server/index.mjs'], {
  env: { ...process.env, PORT: '4189', HOST: '127.0.0.1' }, stdio: ['ignore', 'pipe', 'pipe'],
});
let errors = '';
server.stderr.on('data', chunk => { errors += chunk; });
server.stdout.resume();
const get = path => fetch(origin + path, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
async function save(name, value) {
  const target = resolve(output, name);
  if (!target.startsWith(output + '/')) throw new Error('Unsafe output path');
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, value);
}
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(`Render server exited: ${errors}`);
    try { if ((await get('/sitemap.xml')).ok) { ready = true; break; } } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  if (!ready) throw new Error(`Render server did not start: ${errors}`);
  const sitemapResponse = await get('/sitemap.xml');
  if (!sitemapResponse.ok) throw new Error('Sitemap rendering failed');
  const sitemap = await sitemapResponse.text();
  const queued = new Set([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => new URL(m[1]).pathname));
  if (!queued.has('/')) throw new Error('Sitemap is empty');
  const required = new Set(queued);
  // Include enabled noindex pages as well as the sitemap's indexable pages.
  for (const path of ['/about', '/about/lab', '/about/location', '/about/team', '/contact', '/faq', '/blog', '/legal']) queued.add(path);
  const completed = new Set();
  const redirects = new Map();
  for (const path of queued) {
    if (queued.size > 1000) throw new Error('Unexpected static crawl size');
    if (path.includes('..') || /[\\\s]/.test(path)) throw new Error(`Unsafe route: ${path}`);
    const response = await get(path);
    if (response.status === 404 && !required.has(path)) continue;
    if (response.status >= 300 && response.status < 400) {
      const destination = response.headers.get('location');
      if (!destination?.startsWith('/') || destination.startsWith('//')) throw new Error('Unexpected redirect');
      redirects.set(path, `${path} ${destination} ${response.status === 301 ? 301 : 302}`);
      queued.add(new URL(destination, origin).pathname);
      continue;
    }
    if (!response.ok) throw new Error(`Cannot render ${path}: ${response.status}`);
    const html = await response.text();
    if (!html.includes('<html') || !html.includes('<main')) throw new Error(`Invalid HTML: ${path}`);
    await save(path === '/' ? 'index.html' : `${path.slice(1).replace(/\/$/, '')}.html`, html);
    completed.add(path);
    for (const match of html.matchAll(/href="([^"#?]+)"/g)) {
      const href = match[1];
      if (!href.startsWith('/') || href.startsWith('//') || /\.[a-z0-9]+$/i.test(href)) continue;
      queued.add(href);
    }
  }
  const missing = [...required].filter(path => !completed.has(path) && !redirects.has(path));
  if (missing.length) throw new Error(`Missing sitemap pages: ${missing.join(', ')}`);
  const notFound = await get('/static-build-unknown-page');
  if (notFound.status !== 404) throw new Error('404 rendering failed');
  await save('404.html', await notFound.text());
  await save('sitemap.xml', sitemap);
  // Preserve historical URLs without running a Worker for redirects.
  const legacy = ['/book /#tests 302', '/cart /#tests 302', '/tests /#tests 302',
    '/assessments /#assessments 302', '/memberships /#memberships 302', '/training /#train 302',
    ...['tests', 'assessments', 'medical', 'training', 'memberships'].map(p => `/${p}/:slug /:slug 301`)];
  // The CMS renamed the same published membership from founder to Membership.
  // Keep shared links working without changing its current canonical slug.
  if (!completed.has('/founder') && completed.has('/Membership')) legacy.push('/founder /Membership 301');
  if (completed.has('/legal')) legacy.push('/legal/:slug /legal 302');
  await save('_redirects', [...redirects.values(), ...legacy].join('\n') + '\n');
  await save('_headers', '/*\n  Cache-Control: public, max-age=0, must-revalidate\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/_cms-version.json\n  Cache-Control: no-store\n');
  // Never publish a mixed/outdated snapshot if an editor saved during rendering.
  if ((await captureCms()).hash !== snapshot.hash) throw new Error('CMS changed during build; next sync will retry');
  await save('_cms-version.json', JSON.stringify({hash: snapshot.hash, commit: process.env.GITHUB_SHA || 'local', generatedAt: new Date().toISOString(), pages: completed.size}));
  console.log(`Prepared ${completed.size} HTML pages, sitemap, redirects and 404; no runtime rendering.`);
} finally {
  if (server.exitCode === null) {
    server.kill('SIGTERM');
    await Promise.race([once(server, 'exit'), new Promise(r => setTimeout(r, 2000))]);
    if (server.exitCode === null) server.kill('SIGKILL');
  }
}
