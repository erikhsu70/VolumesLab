// Build-time only: every rendered page sees one complete, validated CMS snapshot.
import { readFile } from 'node:fs/promises';
import { CMS, snapshotFile } from './cms-snapshot.mjs';
const { responses } = JSON.parse(await readFile(snapshotFile, 'utf8'));
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (url.origin !== CMS) return realFetch(input, init);
  const key = url.pathname + url.search;
  if (!Object.hasOwn(responses, key)) throw new Error(`Unsnapshotted CMS request: ${key}`);
  if (responses[key]?.__unavailable) {
    return Response.json({ error: 'CMS resource temporarily unavailable' }, { status: 503 });
  }
  return Response.json(responses[key]);
};
