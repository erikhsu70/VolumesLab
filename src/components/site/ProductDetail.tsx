// Shared SKU layout: show only product sections with authored copy.
import { productPath, type Product } from "@/data/catalog";
import { getProductContent } from "@/data/productContent";
import { bookingHref, bookingLabel, trackBooking } from "@/lib/booking";
import { productsInSection, visibleSections } from "@/lib/sections";
import { BookCta, IncludedBadge, SectionProductGrid } from "./cards";
import { FaqList, SectionTitle } from "./blocks";

type CopySection = "whatItIs" | "whatItDoes" | "whyItMatters" | "prep";

function splitOutcomeCopy(items: string[]) {
  const sections: Record<CopySection, string[]> = {
    whatItIs: [],
    whatItDoes: [],
    whyItMatters: [],
    prep: [],
  };
  const headings: Record<string, CopySection> = {
    "what it is": "whatItIs",
    "what it does": "whatItDoes",
    "why it matters": "whyItMatters",
    "how to prepare": "prep",
  };

  for (const item of items) {
    let section: CopySection = "whatItIs";
    let lines: string[] = [];
    const flush = () => {
      const body = lines.join("\n").trim();
      if (body) sections[section].push(body);
      lines = [];
    };
    for (const line of item.split(/\r?\n/)) {
      const next = headings[line.trim().toLowerCase()];
      if (next) {
        flush();
        section = next;
      } else {
        lines.push(line);
      }
    }
    flush();
  }
  return sections;
}

export function ProductDetail({ product }: { product: Product }) {
  const content = getProductContent(product.slug);
  const path = productPath(product);
  const copy = splitOutcomeCopy(content?.outcomes ?? []);
  // Cleared CMS fields stay cleared. Do not refill sections with bundled
  // product.measures, product.protocol or generic booking FAQs.
  const whatItIs = copy.whatItIs;
  const authoredPrep = (content?.prep ?? []).filter((item) => item.trim());
  const preparation = authoredPrep.length ? authoredPrep : copy.prep;
  const experience = (content?.experience ?? []).filter(
    (step) => step.title.trim() && step.body.trim(),
  );
  const howItWorks = experience.length
    ? experience
    : copy.whatItDoes.map((body) => ({ title: "What it does", body }));
  const faqItems = (content?.faqs ?? []).filter((item) => item.q.trim() && item.a.trim());
  const showWhatItDoes = experience.length > 0 && copy.whatItDoes.length > 0;
  const showOverview = whatItIs.length > 0 || showWhatItDoes || copy.whyItMatters.length > 0;
  const heroDescription = product.shortDescription?.trim() ?? "";

  return (
    <div className="flex flex-1 flex-col bg-background">
      <section className="flex flex-1 items-center border-b border-border px-page py-14 md:py-20">
        <div className="mx-auto w-full max-w-7xl">
          <div className="max-w-3xl">
            <h1 className={product.slug === "health-check" ? "service-title health-check-detail-title font-display text-balance uppercase leading-[0.95] tracking-tight" : "service-title font-display text-4xl font-extrabold uppercase leading-[0.95] tracking-tight text-balance md:text-6xl"}>
              {product.name}
            </h1>
            {heroDescription && (
              <p className="mt-6 max-w-xl whitespace-pre-line text-lg leading-relaxed text-muted text-pretty">
                {heroDescription}
              </p>
            )}
            {product.badges && product.badges.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {product.badges.map((badge) => (
                  <IncludedBadge key={badge}>{badge}</IncludedBadge>
                ))}
              </div>
            )}
            <div className="mt-8 flex flex-wrap items-baseline gap-x-8 gap-y-2">
              {product.price > 0 && (
                <span className="font-display text-3xl font-bold">
                  €{product.price}
                  {product.pricePeriod && (
                    <span className="ml-1 text-base font-normal text-muted">{product.pricePeriod}</span>
                  )}
                </span>
              )}
              {product.duration && (
                <span className="font-mono text-[11px] uppercase tracking-widest text-muted">
                  {product.duration}
                </span>
              )}
              {product.membership?.commitment && (
                <span className="font-mono text-[11px] uppercase tracking-widest text-muted">
                  {product.membership.commitment}
                </span>
              )}
            </div>
            <div className="mt-8">
              <BookCta product={product} sourcePage={path} className="volumes-cta" />
            </div>
          </div>
        </div>
      </section>

      {showOverview && (
      <section className="border-b border-border px-page py-14 md:py-20">
        <div className="mx-auto max-w-7xl">
          {whatItIs.length > 0 && <SectionTitle>What it is</SectionTitle>}
          {whatItIs.length > 0 && <ul className="mt-8 max-w-3xl space-y-4">
            {whatItIs.map((item) => (
              <li
                key={item}
                className="flex gap-4 whitespace-pre-line text-base leading-relaxed text-foreground/85"
              >
                <span aria-hidden className="mt-1 font-mono text-[11px] text-primary">
                  ·
                </span>
                {item}
              </li>
            ))}
          </ul>}
          {showWhatItDoes && (
              <div className="mt-10 max-w-3xl">
                <h3 className="font-display text-xl font-extrabold uppercase tracking-tight">
                  What it does
                </h3>
                {copy.whatItDoes.map((item) => (
                  <p
                    key={item}
                    className="mt-3 whitespace-pre-line text-base leading-relaxed text-foreground/85"
                  >
                    {item}
                  </p>
                ))}
              </div>
            )}
          {copy.whyItMatters.length > 0 && (
            <div className="mt-10 max-w-3xl">
              <h3 className="font-display text-xl font-extrabold uppercase tracking-tight">
                Why it matters
              </h3>
              {copy.whyItMatters.map((item) => (
                <p
                  key={item}
                  className="mt-3 whitespace-pre-line text-base leading-relaxed text-foreground/85"
                >
                  {item}
                </p>
              ))}
            </div>
          )}
        </div>
      </section>
      )}

      {howItWorks.length > 0 && (
      <section className="border-b border-border px-page py-14 md:py-20">
        <div className="mx-auto max-w-7xl">
          <SectionTitle>How it works</SectionTitle>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {howItWorks.map((step, index) => (
              <li key={`${step.title}-${index}`} className="border-t-2 border-primary pt-5">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-3 font-display text-xl font-extrabold uppercase tracking-tight">
                  {step.title}
                </h3>
                {step.body && (
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">
                    {step.body}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>
      )}

      {preparation.length > 0 && (
      <section className="border-b border-border px-page py-14 md:py-20">
        <div className="mx-auto max-w-7xl">
          <SectionTitle>How to prepare</SectionTitle>
          <ul className="mt-8 max-w-3xl space-y-3">
              {preparation.map((item) => (
                <li
                  key={item}
                  className="flex gap-4 whitespace-pre-line text-base leading-relaxed text-foreground/85"
                >
                  <span aria-hidden className="mt-1 font-mono text-[11px] text-primary">
                    ·
                  </span>
                  {item}
                </li>
              ))}
            </ul>
        </div>
      </section>
      )}

      {faqItems.length > 0 && (
      <section className="border-b border-border px-page py-14 md:py-20">
        <div className="mx-auto max-w-7xl">
          <SectionTitle>FAQs</SectionTitle>
          <div className="mt-8 max-w-4xl">
            <FaqList items={faqItems} />
          </div>
        </div>
      </section>
      )}

      <OtherProductsGrid product={product} />
    </div>
  );
}

function OtherProductsGrid({ product }: { product: Product }) {
  const sections = visibleSections().filter((section) =>
    productsInSection(section.key).some(
      (item) => item.status !== "hidden" && item.slug !== product.slug,
    ),
  );
  if (!sections.length) return null;

  return (
    <section className="px-page py-14 md:py-20" aria-labelledby="other-products-title">
      <div className="mx-auto max-w-7xl">
        <h2
          id="other-products-title"
          className="font-display text-3xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-5xl"
        >
          Other products
        </h2>
        <div className="mt-8 space-y-6">
          {sections.map((section) => (
            <SectionProductGrid
              key={section.key}
              section={section.key}
              excludeSlug={product.slug}
              sourcePage={productPath(product)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

