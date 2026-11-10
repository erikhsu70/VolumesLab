import { ADDRESS, BRANDING, COMPANY, CONTACT, MAP_LINK, PAGES, instagramUrl } from "@/data/site";
import { pageMeta, type PageMetaKey } from "@/data/meta";
import type { Product } from "@/data/catalog";
import type { Post } from "@/data/blog";
import type { Faq } from "@/data/faq";
import type { Person } from "./cms";
import { canonical, SITE_URL } from "./seo";
import { productReachable } from "./sections";

type Node = Record<string, unknown>;
export type SchemaData = {
  product?: Product;
  post?: Post;
  posts?: Post[];
  faqGroups?: { title: string; items: Faq[] }[];
  people?: Person[];
};

const pages: Record<string, { key: PageMetaKey; type: string; label: string }> = {
  "/": { key: "home", type: "WebPage", label: "Home" },
  "/about": { key: "about", type: "AboutPage", label: "About" },
  "/about/lab": { key: "lab", type: "AboutPage", label: "The lab" },
  "/about/location": { key: "location", type: "WebPage", label: "Location" },
  "/about/team": { key: "team", type: "AboutPage", label: "Team" },
  "/contact": { key: "contact", type: "ContactPage", label: "Contact" },
  "/faq": { key: "faq", type: "FAQPage", label: "FAQ" },
  "/blog": { key: "blog", type: "CollectionPage", label: "Blog" },
  "/legal": { key: "legal", type: "WebPage", label: "Legal & Privacy" },
};
const businessId = `${SITE_URL}/#business`;
const websiteId = `${SITE_URL}/#website`;
const ref = (id: string) => ({ "@id": id });

/** Same content as the rendered route, with no additional CMS requests. */
export function structuredData(pathname: string, data: SchemaData = {}): Node | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  const config = pages[path];
  const product = data.product;
  const post = data.post;
  if (config && config.key !== "home" && !PAGES[config.key]) return null;
  if (!config && !product && !post) return null;
  if (product && (path !== `/${product.slug}` || !productReachable(product))) return null;
  if (post && (path !== `/blog/${post.slug}` || !PAGES.blog)) return null;

  const url = canonical(path).href;
  const pageId = `${url}#webpage`;
  const name = product?.name ?? post?.title ?? pageMeta[config.key].title;
  const description = product?.tagline ?? post?.excerpt ?? pageMeta[config.key].description;
  const business: Node = {
    "@type": "LocalBusiness",
    "@id": businessId,
    name: COMPANY.tradingName || ADDRESS.name,
    legalName: COMPANY.legalName || undefined,
    url: SITE_URL,
    logo: new URL(BRANDING.logo, SITE_URL).href,
    email: CONTACT.email || undefined,
    telephone: CONTACT.phone || undefined,
    sameAs: instagramUrl() ? [instagramUrl()] : undefined,
    hasMap: MAP_LINK || undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: ADDRESS.street || undefined,
      addressLocality: ADDRESS.city || undefined,
      postalCode: ADDRESS.postalCode || undefined,
      addressCountry: ADDRESS.country || undefined,
    },
  };
  const page: Node = {
    "@type": config?.type ?? "WebPage",
    "@id": pageId,
    url,
    name,
    description,
    inLanguage: "en",
    isPartOf: ref(websiteId),
    about: ref(businessId),
  };
  const graph: Node[] = [
    business,
    {
      "@type": "WebSite",
      "@id": websiteId,
      url: SITE_URL,
      name: COMPANY.tradingName || ADDRESS.name,
      publisher: ref(businessId),
      inLanguage: "en",
    },
    page,
  ];

  if (path !== "/") {
    const crumbs = [{ name: "Home", item: SITE_URL }];
    if (post) crumbs.push({ name: "Blog", item: canonical("/blog").href });
    else if (path.startsWith("/about/") && PAGES.about)
      crumbs.push({ name: "About", item: canonical("/about").href });
    crumbs.push({ name: config?.label ?? name, item: url });
    page.breadcrumb = ref(`${url}#breadcrumb`);
    graph.push({
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: crumbs.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        ...crumb,
      })),
    });
  }
  if (product) {
    page.mainEntity = ref(`${url}#service`);
    graph.push({
      "@type": "Service",
      "@id": `${url}#service`,
      url,
      name: product.name,
      description: product.tagline,
      serviceType: product.categoryLabel || undefined,
      provider: ref(businessId),
      mainEntityOfPage: ref(pageId),
    });
  }
  if (post) {
    page.mainEntity = ref(`${url}#article`);
    graph.push({
      "@type": "BlogPosting",
      "@id": `${url}#article`,
      url,
      headline: post.title,
      description: post.excerpt,
      datePublished:
        /^\d{4}-\d{2}-\d{2}$/.test(post.date) && !Number.isNaN(Date.parse(post.date))
          ? post.date
          : undefined,
      author: post.author
        ? /^volumes\s*lab$/i.test(post.author.trim())
          ? ref(businessId)
          : { "@type": "Person", name: post.author }
        : undefined,
      publisher: ref(businessId),
      mainEntityOfPage: ref(pageId),
      inLanguage: "en",
    });
  }
  if (path === "/faq") {
    const questions =
      data.faqGroups?.flatMap((group) => group.items).filter(({ q, a }) => q.trim() && a.trim()) ??
      [];
    if (questions.length)
      page.mainEntity = questions.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      }));
    else page["@type"] = "WebPage";
  }
  if (path === "/blog" && data.posts) {
    page.mainEntity = {
      "@type": "ItemList",
      itemListElement: data.posts.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.title,
        url: canonical(`/blog/${item.slug}`).href,
      })),
    };
  }
  if (path === "/about/team" && data.people?.length) {
    page.mainEntity = data.people
      .filter((person) => person.name)
      .map((person) => ({
        "@type": "Person",
        name: person.name,
        jobTitle: person.role || undefined,
        description: person.bio || undefined,
        image: person.photo || undefined,
        worksFor: ref(businessId),
      }));
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

/** Prevent CMS text from closing a JSON-LD script element. */
export function serializeStructuredData(value: Node): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

