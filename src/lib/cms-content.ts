// Full-site content from the CMS, and the apply step that makes it count.
//
// The root route fetches ONE bundle per request and `applyCmsContent` pours it
// over the bundled data modules in place. ESM live bindings propagate the
// update to every importer, so the whole site is editable from a single seam.
//
// The contract with the client:
//   · The CMS owns editorial content and, since 10/09/2026, which services and
//     pages exist: a service is on the site only while its Live checkbox is
//     ticked, and a page only while it is ticked in "Pages on / off".
//   · Since 12/09/2026 the CMS also owns each service's price, duration,
//     section and order, and which homepage sections exist, in what order and
//     under what name. An empty price shows "Price on booking".
//   · No CMS field is mandatory. A field the editor clears is cleared on the
//     site too, except for the handful that must never be empty for the site
//     to work (contact email, the Momence home link, SEO titles), which fall
//     back to the bundled value.
//   · If the CMS is down: whatever was last applied in this instance, or the
//     bundled snapshot on a cold one. The site never empties because of an
//     outage.

import {
  memberships,
  assessments,
  tests,
  medical,
  training,
  allProducts,
  type Product,
  type ProductCategory,
} from "@/data/catalog";
import { productContent, type ProductContent } from "@/data/productContent";
import {
  homePage,
  productLabels,
  aboutPage,
  labPage,
  legalPage,
  faqPage,
  blogPage,
  contactPage,
  HEADLINE_SIZES,
  SECTION_KEYS,
  type HeadlineSize,
  type HomeSection,
  type SectionKey,
} from "@/data/pages";
import { categoryOfSection } from "@/lib/sections";
import { pageMeta, type PageMeta, type PageMetaKey } from "@/data/meta";
import {
  ADDRESS,
  BRANDING,
  CONTACT,
  DEFAULT_BRANDING,
  HOURS,
  COMPANY,
  DEFAULT_PAGES,
  PAGES,
  TEXT,
  TEXT_SIZES,
  TEXT_SIZE_CSS,
  LETTER_CASES,
  LETTER_CASE_CSS,
  setMapLink,
  type LetterCase,
  type PageKey,
  type TextSize,
} from "@/data/site";
import { LINKS, setBookingHome } from "@/lib/momence";

import { CMS_URL } from "@/lib/cms-origin";
const TIMEOUT_MS = 3_500;

/* ────────────────────────── fetch one bundle ────────────────────────── */

type CmsDoc = Record<string, unknown>;

async function get(path: string): Promise<CmsDoc | null> {
  try {
    const res = await fetch(`${CMS_URL}${path}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as CmsDoc;
  } catch {
    return null;
  }
}

export type CmsBundle = {
  /** Docs from the five service collections, each tagged with its category. */
  products: CmsDoc[];
  /**
   * Categories whose collection loaded. Only these are authoritative: an empty
   * collection that loaded removes every service in that category, while a
   * category that failed to load keeps whatever the site currently shows.
   */
  categories?: string[];
  site: CmsDoc | null;
  home: CmsDoc | null;
  labels: CmsDoc | null;
  about: CmsDoc | null;
  legal: CmsDoc | null;
  meta: CmsDoc | null;
  pages?: CmsDoc | null;
  faq?: CmsDoc | null;
  blog?: CmsDoc | null;
  contact?: CmsDoc | null;
};

// Last successful read of each collection, per instance, so a blip after the
// first request serves the previous list instead of nothing.
const collectionCache = new Map<string, CmsDoc[]>();

async function getCollection(collection: string): Promise<CmsDoc[] | null> {
  const docs: CmsDoc[] = [];
  let page = 1;
  while (true) {
    const result = await get(`/api/${collection}?limit=100&depth=1&page=${page}`);
    if (!result || !Array.isArray(result.docs)) return collectionCache.get(collection) ?? null;
    docs.push(...(result.docs as CmsDoc[]));
    if (!result.hasNextPage) break;
    page++;
  }
  collectionCache.set(collection, docs);
  return docs;
}

/**
 * Fetches everything the site renders, in parallel. Null on total failure —
 * the caller then skips the apply step and the current content keeps serving.
 */
export async function cmsSiteContent(): Promise<CmsBundle | null> {
  // One collection per category since the 25/08 restructure; each doc carries
  // its category so the apply step can find the bundled counterpart.
  const categoryOf: Record<string, string> = {
    tests: "test",
    assessments: "assessment",
    medical: "medical",
    training: "training",
    memberships: "membership",
  };
  const serviceCollections = Object.keys(categoryOf);
  const [svcResults, site, home, labels, about, legal, meta, pages, faq, blog, contact] = await Promise.all([
    Promise.all(serviceCollections.map(getCollection)),
    get("/api/globals/site-settings"),
    get("/api/globals/home-page"),
    get("/api/globals/product-labels"),
    get("/api/globals/about-page"),
    get("/api/globals/legal-page"),
    get("/api/globals/page-meta"),
    get("/api/globals/page-visibility"),
    get("/api/globals/faq-page"),
    get("/api/globals/blog-page"),
    get("/api/globals/contact-page"),
  ]);

  const products: CmsDoc[] = [];
  const categories: string[] = [];
  svcResults.forEach((res, i) => {
    if (!res) return;
    const cat = categoryOf[serviceCollections[i]];
    categories.push(cat);
    for (const d of res) products.push({ ...d, category: cat });
  });
  if (
    !categories.length && !site && !home && !labels && !about && !legal && !meta && !pages && !faq && !blog && !contact
  )
    return null;

  return { products, categories, site, home, labels, about, legal, meta, pages, faq, blog, contact };
}

/* ────────────────────────── apply over modules ────────────────────────── */

const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v : undefined);

/**
 * Editable copy: a field the CMS carries wins even when empty, because an
 * editor cleared it on purpose. A field the CMS does not carry (older CMS
 * deploy, never saved) keeps the current value.
 */
const own = (doc: CmsDoc, key: string, current: string): string =>
  key in doc ? (str(doc[key]) ?? "") : current;

const texts = (v: unknown): string[] | undefined =>
  Array.isArray(v)
    ? v.map((x) => str((x as CmsDoc)?.text)).filter((x): x is string => !!x)
    : undefined;

/** Relationship value → slug, whether depth resolved it to a doc or left an id. */
const relSlug = (v: unknown): string | undefined =>
  typeof v === "object" && v !== null ? str((v as CmsDoc).slug) : undefined;

function applyProduct(target: Product, doc: CmsDoc) {
  // A service with no name would be unreachable in the panel and unreadable
  // on a card, so the name is the one product field that never goes empty.
  target.name = str(doc.name) ?? target.name;
  target.categoryLabel = own(doc, "categoryLabel", target.categoryLabel);
  target.shortDescription = own(doc, "shortDescription", target.shortDescription ?? "");
  const badges = texts(doc.badges);
  if (badges) target.badges = badges;
  const included = texts(doc.included);
  if (included) target.measures = included;

  // Price and duration are typed in the CMS (12/09/2026). The site never read
  // them from Momence; an empty price reads "Price on booking".
  if ("price" in doc) {
    const n = typeof doc.price === "number" ? doc.price : Number(doc.price);
    if (Number.isFinite(n) && n > 0) {
      target.price = n;
      target.priceTbd = false;
    } else {
      target.price = 0;
      target.priceTbd = true;
    }
  }
  if ("duration" in doc) {
    target.duration = str(doc.duration);
    target.durationTbd = !target.duration;
  }

  // Empty = the general booking page (bookingHref falls back to it).
  if ("momenceUrl" in doc) {
    const momenceUrl = str(doc.momenceUrl) ?? "";
    target.bookingUrl = momenceUrl;
    LINKS[target.slug] = momenceUrl;
  }

  if (Array.isArray(doc.includedTests)) {
    target.includedTests = doc.includedTests.map(relSlug).filter((s): s is string => !!s);
  }
  if ("includedInMembership" in doc)
    target.includedInMembership = relSlug(doc.includedInMembership);

  if (typeof doc.membership === "object" && doc.membership && target.membership) {
    const m = doc.membership as CmsDoc;
    const t = target.membership;
    t.goal = own(m, "goal", t.goal);
    t.trainingFrequency = own(m, "trainingFrequency", t.trainingFrequency ?? "");
    t.doctorInvolvement = own(m, "doctorInvolvement", t.doctorInvolvement ?? "");
    t.retesting = own(m, "retesting", t.retesting ?? "");
    t.commitment = own(m, "commitment", t.commitment ?? "");
    t.medicationNote = own(m, "medicationNote", t.medicationNote ?? "");
    t.bloodworkNote = own(m, "bloodworkNote", t.bloodworkNote ?? "");
  }
}

function applyContent(target: ProductContent, doc: CmsDoc) {
  const outcomes = texts(doc.outcomes);
  if (outcomes) target.outcomes = outcomes;
  if (Array.isArray(doc.experience)) {
    target.experience = (doc.experience as CmsDoc[])
      .map((e) => ({ title: str(e.title) ?? "", body: str(e.body) ?? "" }))
      .filter((e) => e.title);
  }
  const prep = texts(doc.prep);
  if (prep) target.prep = prep;
  if (Array.isArray(doc.faqs)) {
    target.faqs = (doc.faqs as CmsDoc[])
      .map((f) => ({ q: str(f.q) ?? "", a: str(f.a) ?? "" }))
      .filter((f) => f.q && f.a);
  }
}

// Immutable baselines: a service hidden and later restored gets its commercial
// data back, and a field removed in the CMS cannot leak from an earlier request.
const baselineProducts = structuredClone(allProducts);
const baselineContent = structuredClone(productContent);
const baselineLinks = { ...LINKS };
const baselineSections = structuredClone(homePage.sections);
const collections: Partial<Record<ProductCategory, Product[]>> = {
  membership: memberships,
  assessment: assessments,
  test: tests,
  medical,
  training,
};

function newProduct(slug: string, category: ProductCategory, doc: CmsDoc): Product {
  return {
    slug,
    category,
    name: str(doc.name) ?? slug,
    categoryLabel: "",
    tagline: "",
    price: 0,
    priceTbd: true,
    durationTbd: true,
    measures: [],
    protocol: [],
    goodFor: [],
    status: "available",
    ...(category === "membership" ? { membership: { goal: "" } } : {}),
  };
}

function applyCatalogue(bundle: CmsBundle) {
  const fetched = new Set(bundle.categories ?? bundle.products.map((d) => String(d.category)));

  // Categories that did not load keep exactly what the site shows now.
  const kept = allProducts.filter((p) => !fetched.has(p.category));
  const keptSlugs = new Set(kept.map((p) => p.slug));
  for (const key of Object.keys(productContent))
    if (!keptSlugs.has(key)) delete productContent[key];
  for (const [slug, content] of Object.entries(baselineContent)) {
    if (!keptSlugs.has(slug)) productContent[slug] = structuredClone(content);
  }
  for (const key of Object.keys(LINKS)) if (!keptSlugs.has(key)) delete LINKS[key];
  for (const [slug, url] of Object.entries(baselineLinks))
    if (!keptSlugs.has(slug)) LINKS[slug] = url;

  const next: Product[] = [...kept];
  const rank = new Map<Product, SortKey>();
  for (const doc of bundle.products) {
    const slug = str(doc.slug);
    // "Section on the website" moves a SKU to another section without
    // re-creating it: the doc stays in its collection, the product changes
    // category, list and URL.
    const category = sectionCategory(doc.section) ?? (doc.category as ProductCategory);
    if (!slug || !collections[category] || doc.live === false) continue;
    const baselineIndex = baselineProducts.findIndex((p) => p.slug === slug);
    const baseline = baselineProducts[baselineIndex];
    const product = baseline
      ? { ...structuredClone(baseline), category }
      : newProduct(slug, category, doc);
    rank.set(product, {
      order: typeof doc.order === "number" ? doc.order : Number.POSITIVE_INFINITY,
      baseline: baselineIndex === -1 ? Number.POSITIVE_INFINITY : baselineIndex,
      created: str(doc.createdAt) ?? "",
    });
    applyProduct(product, doc);
    // The CMS short description is the only description the editor can see,
    // so it is also what the page's meta description reads.
    if (product.shortDescription) product.tagline = product.shortDescription;
    if (category === "training" && doc.training && typeof doc.training === "object") {
      product.training = { ...product.training, ...(doc.training as object) };
    }
    next.push(product);
    const content = productContent[slug] ?? {
      outcomes: [],
      experience: [],
      prep: [],
      goodFor: [],
      faqs: [],
    };
    applyContent(content, doc);
    productContent[slug] = content;
  }

  // Within a section: the Order field first (1 before 2, empty last), then the
  // bundled order, then oldest first, so a fresh SKU lands at the end instead
  // of the top.
  const byRank = (a: Product, b: Product) => {
    const ra = rank.get(a) ?? keptRank;
    const rb = rank.get(b) ?? keptRank;
    return cmpNum(ra.order, rb.order) || cmpNum(ra.baseline, rb.baseline) || ra.created.localeCompare(rb.created);
  };
  for (const [category, target] of Object.entries(collections)) {
    if (fetched.has(category))
      target.splice(0, target.length, ...next.filter((p) => p.category === category).sort(byRank));
  }
  allProducts.splice(0, allProducts.length, ...Object.values(collections).flatMap((c) => c ?? []));
}

type SortKey = { order: number; baseline: number; created: string };
const keptRank: SortKey = { order: Number.POSITIVE_INFINITY, baseline: Number.POSITIVE_INFINITY, created: "" };
const cmpNum = (a: number, b: number) => (a === b ? 0 : a < b ? -1 : 1);

const sectionCategory = (v: unknown): ProductCategory | undefined =>
  typeof v === "string" && (SECTION_KEYS as string[]).includes(v)
    ? categoryOfSection[v as SectionKey]
    : undefined;

/** Array of {key: text} rows → strings; undefined when the CMS has no such field. */
const rows = (v: unknown, key: string): string[] | undefined =>
  Array.isArray(v)
    ? (v as CmsDoc[]).map((x) => str(x[key])).filter((x): x is string => !!x)
    : undefined;

/**
 * Absolute URL of an upload field the CMS populated (depth ≥ 1), or empty.
 * Files on Vercel Blob come with an absolute URL; files served by the CMS
 * itself come as `/api/media/file/…` and get the CMS origin.
 */
function uploadUrl(v: unknown): string {
  if (!v || typeof v !== "object") return "";
  const url = str((v as CmsDoc).url);
  if (!url) return "";
  return url.startsWith("/") ? `${CMS_URL}${url}` : url;
}

/**
 * The text size the bundle asks for, medium when the CMS has no (valid)
 * value. Exposed so the root route can write the matching <style> from the
 * loader data on both server and client without depending on apply order.
 */
export function cmsTextSize(bundle: CmsBundle | null): TextSize {
  const size = str(bundle?.site?.textSize);
  return size && (TEXT_SIZES as string[]).includes(size) ? (size as TextSize) : "medium";
}

function letterCase(v: unknown): LetterCase {
  const c = str(v);
  return c && (LETTER_CASES as string[]).includes(c) ? (c as LetterCase) : "uppercase";
}

/**
 * A background colour from the CMS as a 6-digit hex, or null for the default.
 * Accepts #rgb / #rrggbb with or without the #; anything else is ignored,
 * which also keeps free text out of the <style> it is written into.
 */
export function cmsBackground(bundle: CmsBundle | null): string | null {
  const raw = str(bundle?.site?.backgroundColor)?.trim().replace(/^#/, "");
  if (!raw) return null;
  if (/^[0-9a-f]{3}$/i.test(raw)) return `#${raw.replace(/./g, "$&$&").toLowerCase()}`;
  if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw.toLowerCase()}`;
  return null;
}

/**
 * The CSS the root route writes into <head>: text size, letter case per
 * family and, when set, the background. Cards and the light fills are
 * derived from the background so a new colour keeps the same tonal steps
 * (cards a touch lighter, fills a touch darker) instead of beige boxes on it.
 */
export function cmsLookCss(bundle: CmsBundle | null): string {
  const s = bundle?.site;
  let css =
    `html{font-size:${TEXT_SIZE_CSS[cmsTextSize(bundle)]}}` +
    `:root{--case-titles:${LETTER_CASE_CSS[letterCase(s?.titleCase)]};` +
    `--case-labels:${LETTER_CASE_CSS[letterCase(s?.labelCase)]}}`;
  const bg = cmsBackground(bundle);
  if (bg) {
    css +=
      `:root{--background:${bg};` +
      `--card:color-mix(in srgb,${bg} 67%,white);--popover:color-mix(in srgb,${bg} 67%,white);` +
      `--secondary:color-mix(in srgb,${bg} 95%,black);--accent:color-mix(in srgb,${bg} 95%,black)}`;
  }
  return css;
}

let appliedStamp = "";

/**
 * Applies a bundle over the data modules. Safe to call repeatedly (server per
 * request, client on hydration and navigation): the same bundle is a no-op.
 */
export function applyCmsContent(bundle: CmsBundle | null) {
  if (!bundle) return;

  // Cheap idempotence: skip if this exact bundle was already applied.
  const stamp = JSON.stringify(bundle);
  if (stamp === appliedStamp) return;
  appliedStamp = stamp;

  applyCatalogue(bundle);

  // ---- site settings ----
  if (bundle.site) {
    const s = bundle.site;
    TEXT.size = cmsTextSize(bundle);
    const branding = s.branding as CmsDoc | undefined;
    if (branding) {
      // A cleared upload is the default file, never a broken image.
      BRANDING.logo = uploadUrl(branding.logo) || DEFAULT_BRANDING.logo;
      BRANDING.mark = uploadUrl(branding.mark) || DEFAULT_BRANDING.mark;
    }
    const contact = s.contact as CmsDoc | undefined;
    if (contact) {
      // Every "write to us" link needs an address, so the email never empties.
      CONTACT.email = str(contact.email) ?? CONTACT.email;
      // Phone and Instagram sit in the footer line (client, 14/09/2026);
      // cleared in the CMS = gone from the line.
      const phone = str(contact.phone) ?? "";
      CONTACT.phone = phone;
      CONTACT.phoneHref = phone ? `tel:${phone.replace(/[^+0-9]/g, "")}` : "";
      CONTACT.instagram = own(contact, "instagram", CONTACT.instagram);
    }
    const address = s.address as CmsDoc | undefined;
    if (address) {
      ADDRESS.street = own(address, "street", ADDRESS.street);
      ADDRESS.district = own(address, "district", ADDRESS.district);
      ADDRESS.postalCode = own(address, "postalCode", ADDRESS.postalCode);
      ADDRESS.city = own(address, "city", ADDRESS.city);
      ADDRESS.short = own(address, "short", ADDRESS.short);
      ADDRESS.full = own(address, "full", ADDRESS.full);
      // Every "Open in Maps" link needs somewhere to go: empty keeps the current one.
      setMapLink(str(address.mapsUrl) ?? "");
    }
    const hours = s.hours as CmsDoc | undefined;
    if (hours) {
      HOURS.weekdays.label = own(hours, "weekdaysLabel", HOURS.weekdays.label);
      HOURS.weekdays.value = own(hours, "weekdaysValue", HOURS.weekdays.value);
      HOURS.weekend.label = own(hours, "weekendLabel", HOURS.weekend.label);
      HOURS.weekend.value = own(hours, "weekendValue", HOURS.weekend.value);
      HOURS.short = own(hours, "short", HOURS.short);
      HOURS.walkIns = own(hours, "walkIns", HOURS.walkIns);
    }
    const company = s.company as CmsDoc | undefined;
    if (company) {
      COMPANY.legalName = own(company, "legalName", COMPANY.legalName);
      COMPANY.tradingName = own(company, "tradingName", COMPANY.tradingName);
      COMPANY.taxId = str(company.taxId) ?? null;
      COMPANY.registeredAddress = str(company.registeredAddress) ?? null;
      COMPANY.registrationNumber = str(company.registrationNumber) ?? null;
    }
    const momence = s.momence as CmsDoc | undefined;
    // Every Book CTA needs somewhere to go: an empty link keeps the bundled one.
    if (momence) setBookingHome(str(momence.bookingHome) ?? "");
  }

  // ---- home page copy ----
  if (bundle.home) {
    const h = bundle.home;
    homePage.headline = own(h, "headline", homePage.headline);
    const size = str(h.headlineSize);
    if (size && (HEADLINE_SIZES as string[]).includes(size)) homePage.headlineSize = size as HeadlineSize;
    homePage.intro = own(h, "intro", homePage.intro);
    if (Array.isArray(h.sections)) {
      // The list is the order. A section missing from the list is off, like an
      // unticked one. An empty list (global never saved, or every row deleted)
      // keeps the current sections: a homepage with nothing on it is never
      // what anyone meant.
      const seen = new Set<SectionKey>();
      const next: HomeSection[] = [];
      for (const row of h.sections as CmsDoc[]) {
        const key = row.section as SectionKey;
        if (!SECTION_KEYS.includes(key) || seen.has(key)) continue;
        seen.add(key);
        const current =
          homePage.sections.find((s) => s.key === key) ?? baselineSections.find((s) => s.key === key)!;
        next.push({
          key,
          enabled: row.enabled !== false,
          title: own(row, "title", current.title),
          description: own(row, "description", current.description),
        });
      }
      if (next.length) homePage.sections = next;
    } else {
      // A CMS deploy from before 12/09/2026 still sends one group per section.
      for (const s of homePage.sections) {
        const sec = h[s.key] as CmsDoc | undefined;
        if (!sec) continue;
        s.title = own(sec, "title", s.title);
        s.description = own(sec, "description", s.description);
      }
    }
  }

  // ---- product page labels (drive all 19 SKU pages) ----
  if (bundle.labels) {
    const l = bundle.labels;
    productLabels.whatItIs = own(l, "whatItIs", productLabels.whatItIs);
    productLabels.howItWorks = own(l, "howItWorks", productLabels.howItWorks);
    productLabels.questions = own(l, "questions", productLabels.questions);
    productLabels.prepPrefix = own(l, "prepPrefix", productLabels.prepPrefix);
    productLabels.priceTbdNote = own(l, "priceTbdNote", productLabels.priceTbdNote);
    const m = l.modules as CmsDoc | undefined;
    if (m) {
      const mods = productLabels.modules;
      mods.testIncludedIn = own(m, "testIncludedIn", mods.testIncludedIn);
      mods.testNote = own(m, "testNote", mods.testNote);
      mods.assessmentIncludes = own(m, "assessmentIncludes", mods.assessmentIncludes);
      mods.trainingOtherOptions = own(m, "trainingOtherOptions", mods.trainingOtherOptions);
      mods.trainingNote = own(m, "trainingNote", mods.trainingNote);
      mods.membershipIncluded = own(m, "membershipIncluded", mods.membershipIncluded);
      mods.membershipHowToJoin = own(m, "membershipHowToJoin", mods.membershipHowToJoin);
      mods.medicalTitle = own(m, "medicalTitle", mods.medicalTitle);
      mods.medicalIntro = own(m, "medicalIntro", mods.medicalIntro);
      mods.medicalNote = own(m, "medicalNote", mods.medicalNote);
      const msteps = rows(m.membershipSteps, "step");
      if (msteps) (mods as { membershipSteps: string[] }).membershipSteps = msteps;
      const dsteps = rows(m.medicalSteps, "step");
      if (dsteps) (mods as { medicalSteps: string[] }).medicalSteps = dsteps;
    }
    const cta = l.finalCta as CmsDoc | undefined;
    if (cta) {
      productLabels.finalCta.membership = own(cta, "membership", productLabels.finalCta.membership);
      productLabels.finalCta.training = own(cta, "training", productLabels.finalCta.training);
      productLabels.finalCta.medical = own(cta, "medical", productLabels.finalCta.medical);
      productLabels.finalCta.default = own(cta, "default", productLabels.finalCta.default);
    }
  }

  // ---- about + lab ----
  if (bundle.about) {
    const a = bundle.about;
    if (Array.isArray(a.steps)) {
      (aboutPage as { steps: { title: string; body: string }[] }).steps = (a.steps as CmsDoc[])
        .map((x) => ({ title: str(x.title) ?? "", body: str(x.body) ?? "" }))
        .filter((x) => x.title);
    }
    if (Array.isArray(a.labAreas)) {
      (labPage as { areas: { title: string; body: string }[] }).areas = (a.labAreas as CmsDoc[])
        .map((x) => ({ title: str(x.title) ?? "", body: str(x.body) ?? "" }))
        .filter((x) => x.title);
    }
  }

  // ---- legal ----
  if (bundle.legal) {
    const l = bundle.legal;
    legalPage.title = own(l, "title", legalPage.title);
    legalPage.privacyHeading = own(l, "privacyHeading", legalPage.privacyHeading);
    legalPage.backLink = own(l, "backLink", legalPage.backLink);
    if (Array.isArray(l.privacy)) {
      (legalPage as { privacy: { lead: string; body: string }[] }).privacy = (l.privacy as CmsDoc[])
        .map((x) => ({ lead: str(x.lead) ?? "", body: str(x.body) ?? "" }))
        .filter((x) => x.lead || x.body);
    }
  }

  // ---- page meta / SEO: never empty, a blank tab title helps nobody ----
  if (bundle.meta) {
    for (const key of Object.keys(pageMeta) as PageMetaKey[]) {
      const m = bundle.meta[key] as CmsDoc | undefined;
      if (!m) continue;
      const target: PageMeta = pageMeta[key];
      target.title = str(m.title) ?? target.title;
      target.description = str(m.description) ?? target.description;
      target.shareTitle = str(m.shareTitle) ?? target.shareTitle;
      target.shareDescription = str(m.shareDescription) ?? target.shareDescription;
    }
  }

  // ---- FAQ page framing (the questions are the Faqs collection) ----
  if (bundle.faq) {
    const f = bundle.faq;
    faqPage.eyebrow = own(f, "eyebrow", faqPage.eyebrow);
    faqPage.headline = own(f, "headline", faqPage.headline);
    faqPage.intro = own(f, "intro", faqPage.intro);
    faqPage.band = own(f, "band", faqPage.band);
  }

  // ---- Blog index framing (the posts are the Posts collection) ----
  if (bundle.blog) {
    const b = bundle.blog;
    blogPage.eyebrow = own(b, "eyebrow", blogPage.eyebrow);
    blogPage.headline = own(b, "headline", blogPage.headline);
    blogPage.intro = own(b, "intro", blogPage.intro);
    const cta = b.cta as CmsDoc | undefined;
    if (cta) {
      blogPage.cta.eyebrow = own(cta, "eyebrow", blogPage.cta.eyebrow);
      blogPage.cta.headline = own(cta, "headline", blogPage.cta.headline);
      blogPage.cta.button = own(cta, "button", blogPage.cta.button);
    }
  }

  // ---- Contact page wording (address, email, hours come from site settings) ----
  if (bundle.contact) {
    const c = bundle.contact;
    contactPage.eyebrow = own(c, "eyebrow", contactPage.eyebrow);
    contactPage.headline = own(c, "headline", contactPage.headline);
    contactPage.intro = own(c, "intro", contactPage.intro);
    contactPage.gettingHere = own(c, "gettingHere", contactPage.gettingHere);
    const form = c.form as CmsDoc | undefined;
    if (form) {
      contactPage.form.title = own(form, "title", contactPage.form.title);
      contactPage.form.intro = own(form, "intro", contactPage.form.intro);
    }
  }

  // ---- pages on / off ----
  if (bundle.pages) {
    for (const key of Object.keys(PAGES) as PageKey[]) {
      const v = bundle.pages[key];
      // A toggle the CMS does not have yet keeps its bundled default (Team
      // is off until the client switches it on).
      PAGES[key] = typeof v === "boolean" ? v : DEFAULT_PAGES[key];
    }
  }
}
