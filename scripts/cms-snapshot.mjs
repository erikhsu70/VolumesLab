import { createHash } from 'node:crypto';
import { mkdir, writeFile, appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const CMS = 'https://cms.volumeslab.com';
export const snapshotFile = '.static-build/cms.json';
const collections = ['tests', 'assessments', 'medical', 'training', 'memberships'];
const globals = ['site-settings', 'home-page', 'product-labels', 'about-page',
  'legal-page', 'page-meta', 'page-visibility', 'faq-page', 'blog-page', 'contact-page'];

export async function captureCms() {
  const responses = {};
  async function read(path) {
    const response = await fetch(CMS + path, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`CMS unavailable: ${path} (${response.status})`);
    const value = await response.json();
    if (!value || typeof value !== 'object') throw new Error(`Invalid CMS response: ${path}`);
    responses[path] = value;
    return value;
  }
  for (const collection of collections) {
    let page = 1;
    let value;
    do {
      if (page > 100) throw new Error('CMS pagination limit exceeded');
      value = await read(`/api/${collection}?limit=100&depth=1&page=${page++}`);
      if (!Array.isArray(value.docs)) throw new Error(`Invalid collection: ${collection}`);
    } while (value.hasNextPage);
  }
  for (const name of globals) await read(`/api/globals/${name}`);
  for (const path of ['/api/posts?limit=100&sort=-date&depth=0',
    '/api/faqs?limit=200&depth=0', '/api/team?limit=100&sort=order&depth=1']) {
    const value = await read(path);
    if (!Array.isArray(value.docs) || value.hasNextPage) {
      throw new Error(`Collection exceeds the application's supported pagination: ${path}`);
    }
  }
  const canonical = (v) => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object'
    ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
  const hash = createHash('sha256').update(JSON.stringify(canonical(responses))).digest('hex');
  return { hash, responses };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const snapshot = await captureCms();
  await mkdir('.static-build', { recursive: true });
  await writeFile(snapshotFile, JSON.stringify(snapshot));
  let changed = true;
  if (process.argv.includes('--check')) {
    try {
      const response = await fetch('https://volumes-lab-web.nicolasserragj.workers.dev/_cms-version.json', {
        cache: 'no-store', signal: AbortSignal.timeout(15000),
      });
      if (response.ok) {
        const deployed = await response.json();
        changed = deployed.hash !== snapshot.hash || deployed.commit !== process.env.GITHUB_SHA;
      }
    } catch { /* A missing deployment must be rebuilt. CMS failures above are fatal. */ }
  }
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
  console.log(`CMS snapshot captured; publication needed: ${changed}`);
}
