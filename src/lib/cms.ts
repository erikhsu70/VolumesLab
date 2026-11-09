// Stable CMS hostname, independent of the hosting provider.
//
// Contract agreed with the client:
//   · Edits in the CMS appear on the site in (near) real time — content is
//     fetched per request on the server, cached briefly.
//   · If the CMS is down, the site must NOT go down with it: every reader
//     falls back to the last good copy it saw, and failing that, to the
//     content bundled in the repo (src/data/*), which is a full snapshot.
//
// Commercial values (price, duration, availability) never come from here.
// Momence owns those; the CMS collections do not even have the fields.

const CMS_URL = "https://cms.volumeslab.com";

/** How long a fetched value is served before we re-ask the CMS. */
const TTL_MS = 30_000;
/** How long we wait for the CMS before falling back. */
const TIMEOUT_MS = 3_500;

type CacheEntry = { value: unknown; fetchedAt: number };

// Per-server-instance cache. `lastGood` survives past the TTL so an outage
// serves stale content instead of an error page.
const cache = new Map<string, CacheEntry>();
const lastGood = new Map<string, unknown>();

async function fetchCms<T>(path: string): Promise<T | null> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.fetchedAt < TTL_MS) return hit.value as T;

  try {
    const res = await fetch(`${CMS_URL}${path}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`CMS ${res.status} for ${path}`);
    const value = (await res.json()) as T;
    cache.set(path, { value, fetchedAt: Date.now() });
    lastGood.set(path, value);
    return value;
  } catch {
    // Outage or timeout: last good copy if we ever had one, else null so the
    // caller falls back to the bundled snapshot.
    return (lastGood.get(path) as T | undefined) ?? null;
  }
}

/* ─────────────────────────── Posts ─────────────────────────── */

import { posts as bundledPosts, type Post, type PostBlock } from "@/data/blog";
import { editorialPosts } from "@/data/seoPosts";

type CmsPost = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  author: string;
  readingTime?: string | null;
  body: { root: { children: LexicalNode[] } };
};

type LexicalNode = {
  type: string;
  text?: string;
  tag?: string;
  children?: LexicalNode[];
};

/**
 * The site's post template renders paragraphs and subheadings. A Lexical
 * heading becomes a heading block, everything else (paragraphs, quotes, list
 * items) becomes a paragraph with its text content, so an article keeps its
 * structure without the template having to know Lexical.
 */
function lexicalToBlocks(root: { children: LexicalNode[] }): PostBlock[] {
  const out: PostBlock[] = [];
  const textOf = (n: LexicalNode): string =>
    n.text ?? (n.children ?? []).map(textOf).join("");
  const push = (node: LexicalNode) => {
    if (node.type === "list") {
      for (const item of node.children ?? []) push(item);
      return;
    }
    const text = textOf(node).trim();
    if (text) out.push({ type: node.type === "heading" ? "heading" : "paragraph", text });
  };
  for (const node of root.children ?? []) push(node);
  return out;
}

function adaptPost(p: CmsPost): Post {
  return {
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    date: p.date.slice(0, 10),
    category: p.category,
    author: p.author,
    readingTime: p.readingTime ?? "",
    body: lexicalToBlocks(p.body?.root ?? { children: [] }),
  };
}

export async function cmsPosts(): Promise<Post[]> {
  const res = await fetchCms<{ docs: CmsPost[] }>(
    "/api/posts?limit=100&sort=-date&depth=0",
  );
  if (!res?.docs?.length) return bundledPosts;
  const cms = res.docs.map(adaptPost);
  const cmsSlugs = new Set(cms.map((post) => post.slug));
  return [...editorialPosts.filter((post) => !cmsSlugs.has(post.slug)), ...cms].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
}

export async function cmsPost(slug: string): Promise<Post | undefined> {
  const all = await cmsPosts();
  return all.find((p) => p.slug === slug);
}

/* ─────────────────────────── FAQs ─────────────────────────── */

import { faqGroups as bundledFaqGroups } from "@/data/faq";

type CmsFaq = { group: string; question: string; answer: string; order: number };

export async function cmsFaqGroups(): Promise<typeof bundledFaqGroups> {
  const res = await fetchCms<{ docs: CmsFaq[] }>("/api/faqs?limit=200&depth=0");
  if (!res?.docs?.length) return bundledFaqGroups;

  // Group rows preserving first-seen group order, items by their order field.
  const groups = new Map<string, { q: string; a: string; order: number }[]>();
  for (const f of res.docs) {
    if (!groups.has(f.group)) groups.set(f.group, []);
    groups.get(f.group)!.push({ q: f.question, a: f.answer, order: f.order ?? 0 });
  }
  return Array.from(groups.entries()).map(([title, items]) => ({
    title,
    items: items
      .sort((a, b) => a.order - b.order)
      .map(({ q, a }) => ({ q, a })),
  }));
}

/* ─────────────────────────── Team ─────────────────────────── */

type CmsPerson = {
  id: number | string;
  name?: string | null;
  role?: string | null;
  credentials?: string | null;
  bio?: string | null;
  photo?: { url?: string | null } | number | null;
  order?: number | null;
};

export type Person = {
  id: string;
  name: string;
  role: string;
  credentials: string;
  bio: string;
  /** Absolute URL of the photo, or empty. */
  photo: string;
};

/**
 * The people of /about/team, in their CMS order. There is no bundled
 * fallback: with the CMS unreachable the page shows its placeholder text.
 */
export async function cmsTeam(): Promise<Person[]> {
  const res = await fetchCms<{ docs: CmsPerson[] }>("/api/team?limit=100&sort=order&depth=1");
  if (!res?.docs?.length) return [];
  return res.docs.map((p) => {
    const url = typeof p.photo === "object" && p.photo?.url ? p.photo.url : "";
    return {
      id: String(p.id),
      name: p.name ?? "",
      role: p.role ?? "",
      credentials: p.credentials ?? "",
      bio: p.bio ?? "",
      photo: url.startsWith("/") ? `${CMS_URL}${url}` : url,
    };
  });
}
