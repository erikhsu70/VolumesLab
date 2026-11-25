import { allProducts, productPath } from "@/data/catalog";
import { PAGES, type PageKey } from "@/data/site";
import { pageMeta, type PageMeta } from "@/data/meta";
import { cmsPosts } from "./cms";
import { applyCmsContent, cmsSiteContent } from "./cms-content";
import { productReachable } from "./sections";
import { canonical } from "./seo";

const pagePaths: Record<PageKey, string> = {
  about: "/about",
  lab: "/about/lab",
  location: "/about/location",
  contact: "/contact",
  faq: "/faq",
  blog: "/blog",
  legal: "/legal",
  team: "/about/team",
};

const escapeXml = (value: string) =>
  value.replace(
    /[<>&"']/g,
    (char) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[char]!,
  );

/** Read the same CMS snapshot and visibility rules used by the page loaders. */
export async function sitemapResponse(request: Request): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
  }

  const [content, posts] = await Promise.all([cmsSiteContent(), cmsPosts()]);
  // Keep applying and reading the shared data synchronous, as in the root loader.
  applyCmsContent(content);
  // /waitlist is a standalone landing linked from outside the site; it is
  // not reachable through on-site links, so the sitemap carries it (the
  // static build crawls from here).
  const paths = new Set<string>(["/", "/waitlist"]);
  for (const key of Object.keys(pagePaths) as PageKey[]) {
    if (PAGES[key] && !(pageMeta[key] as PageMeta).noindex) paths.add(pagePaths[key]);
  }
  for (const product of allProducts) {
    if (productReachable(product)) paths.add(productPath(product));
  }
  if (PAGES.blog) {
    for (const post of posts) paths.add(`/blog/${post.slug}`);
  }

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    [...paths]
      .map((path) => `  <url><loc>${escapeXml(canonical(path).href)}</loc></url>`)
      .join("\n") +
    "\n</urlset>\n";
  return new Response(request.method === "HEAD" ? null : xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=60, must-revalidate",
    },
  });
}
