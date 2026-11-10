// The homepage sections as the CMS defines them (Home page → Sections): their
// order, whether each is on, and what each is called. Every surface that lists
// the sections (homepage, top menu, footer) reads from here so a
// section switched off in the CMS disappears from all of them at once, and its
// SKU pages answer 404 like a page switched off in "Pages on / off".

import { notFound } from "@tanstack/react-router";
import {
  allProducts,
  assessments,
  medical,
  memberships,
  tests,
  training,
  type Product,
  type ProductCategory,
} from "@/data/catalog";
import { homePage, type HomeSection, type SectionKey } from "@/data/pages";

/** Category a service takes when it sits in a section, and back. */
export const categoryOfSection: Record<SectionKey, ProductCategory> = {
  tests: "test",
  assessments: "assessment",
  medical: "medical",
  train: "training",
  memberships: "membership",
};

export function sectionOfCategory(category: ProductCategory): SectionKey {
  switch (category) {
    case "test":
      return "tests";
    case "assessment":
      return "assessments";
    case "medical":
      return "medical";
    case "membership":
      return "memberships";
    case "training":
    case "package":
      return "train";
  }
}

/** The live services of a section, in CMS order. */
export function productsInSection(key: SectionKey): Product[] {
  return allProducts.filter(p => (p.section ?? sectionOfCategory(p.category)) === key && p.status !== "hidden");
}

export function sectionByKey(key: SectionKey): HomeSection | undefined {
  return homePage.sections.find((s) => s.key === key);
}

/** On in the CMS. A section the CMS does not list is off. */
export function sectionEnabled(key: SectionKey): boolean {
  return sectionByKey(key)?.enabled ?? false;
}

/**
 * The sections to show, in order: on in the CMS and with at least one live
 * service. An empty section would be a heading over nothing and a menu link
 * to nowhere.
 */
export function visibleSections(): HomeSection[] {
  return homePage.sections.filter((s) => s.enabled && productsInSection(s.key).length > 0);
}

/** Menu and footer label of a section; the key when the title was cleared. */
export function sectionLabel(key: SectionKey): string {
  return sectionByKey(key)?.title || `Section ${homePage.sections.findIndex(s => s.key === key) + 1}`;
}

/**
 * Where a generic "Book" CTA sends people: the top of the catalogue on the
 * homepage, not Momence's generic landing (client, 12/09/2026: the SKU is
 * chosen on volumeslab.com; only a SKU's own Book leaves for Momence).
 */
export function catalogueAnchor(): string {
  return visibleSections()[0]?.key ?? "tests";
}

/** Whether a service's pages and links are reachable: its section is on. */
export function productReachable(p: Pick<Product, "category" | "section" | "status">): boolean {
  return p.status !== "hidden" && sectionEnabled(p.section ?? sectionOfCategory(p.category));
}

/**
 * For SKU route loaders: the product, or 404 when it does not exist or its
 * section is switched off in the CMS.
 */
export function requireProduct(list: Product[], slug: string): Product {
  const product = list.find((p) => p.slug === slug);
  if (!product || !productReachable(product)) throw notFound();
  return product;
}

/**
 * For the flat /$slug route: the service with that slug in any section, or
 * 404 when there is none or its section is switched off in the CMS.
 */
export function requireProductBySlug(slug: string): Product {
  return requireProduct(allProducts, slug);
}

