// Shared SKU layout approved for the live site: essentials, explanation,
// preparation, three FAQs, location, then every other reachable service.
import { productPath, type Product } from "@/data/catalog";
import { getProductContent } from "@/data/productContent";
import { productLabels as L } from "@/data/pages";
import { Location } from "./Location";
import { bookingHref, bookingLabel, trackBooking } from "@/lib/booking";
import { productsInSection, visibleSections } from "@/lib/sections";
import { BookCta, IncludedBadge, SectionProductGrid } from "./cards";
import { Eyebrow, FaqList, SectionTitle, StickyBookBar } from "./blocks";

function priceLabel(product: Product) {
  return product.price === 0 && product.priceTbd ? "Price on booking" : `€${product.price}`;
}

function description(product: Product) {
  return product.shortDescription || product.tagline || "Ask our team for details before booking.";
}

function categoryLabel(product: Product) {
  const label = product.categoryLabel.trim();
  return label && !label.toLowerCase().includes("goes here") ? label : "Service";
}

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

function faqs(product: Product, preparation: string[]) {
  const content = getProductContent(product.slug);
  const items = [...(content?.faqs ?? [])];
  const fallbacks = [
    {
      q: "How should I prepare?",
      a: preparation.length
        ? preparation.join(" ")
        : "The team will confirm any preparation instructions before your appointment.",
    },
    {
      q: "What should I confirm before booking?",
      a: "Please confirm the current price, availability and any requirements with the team when you book.",
    },
    {
      q: "Where will it take place?",
      a: "The team will confirm your appointment location when you book.",
    },
  ];
  for (const fallback of fallbacks) {
    if (items.length >= 3) break;
    if (!items.some((item) => item.q.toLowerCase() === fallback.q.toLowerCase())) {
      items.push(fallback);
    }
  }
  return items.slice(0, 3);
}

export function ProductDetail({ product }: { product: Product }) {
  const content = getProductContent(product.slug);
  const path = productPath(product);
  const isMembership = product.category === "membership";
  const copy = splitOutcomeCopy(content?.outcomes ?? []);
  const whatItIs = copy.whatItIs.length ? copy.whatItIs : product.measures;
  const preparation = content?.prep.length ? content.prep : copy.prep;
  const howItWorks = content?.experience.length
    ? content.experience
    : product.protocol.length
      ? product.protocol.map((body, index) => ({ title: `Step ${index + 1}`, body }))
      : copy.whatItDoes.map((body) => ({ title: "What it does", body }));

  return (
    <div className="bg-background pb-20 md:pb-0">
      <section className="border-b border-border px-page py-14 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <Eyebrow>{categoryLabel(product)}</Eyebrow>
            <h1 className="mt-6 font-display text-4xl font-extrabold uppercase leading-[0.95] tracking-tight text-balance md:text-6xl">
              {product.name}
            </h1>
            <p className="mt-6 max-w-xl whitespace-pre-line text-lg leading-relaxed text-muted text-pretty">
              {description(product)}
            </p>
            {product.badges && product.badges.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {product.badges.map((badge) => (
                  <IncludedBadge key={badge}>{badge}</IncludedBadge>
                ))}
              </div>
            )}
            <div className="mt-8 flex flex-wrap items-baseline gap-x-8 gap-y-2">
              <span className="font-display text-3xl font-bold">
                {priceLabel(product)}
                {isMembership && product.price > 0 && (
                  <span className="ml-1 text-base font-normal text-muted">/mo</span>
                )}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-widest text-muted">
                {product.duration || "Duration on booking"}
              </span>
              {product.membership?.commitment && (
                <span className="font-mono text-[11px] uppercase tracking-widest text-muted">
                  {product.membership.commitment}
                </span>
              )}
            </div>
            <div className="mt-8">
              <BookCta product={product} sourcePage={path} className="px-8 py-4 text-xs" />
            </div>
            {product.priceTbd && L.priceTbdNote && (
              <p className="mt-4 max-w-md text-xs leading-relaxed text-muted">{L.priceTbdNote}</p>
            )}
          </div>
        </div>
      </section>

      <section className="border-b border-border px-page py-14 md:py-20">
        <div className="mx-auto max-w-7xl">
          <SectionTitle>What it is</SectionTitle>
          <ul className="mt-8 max-w-3xl space-y-4">
            {(whatItIs.length
              ? whatItIs
              : ["Ask our team what this service includes before booking."]
            ).map((item) => (
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
          {(Boolean(content?.experience.length) || product.protocol.length > 0) &&
            copy.whatItDoes.length > 0 && (
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

      <section className="border-b border-border px-page py-14 md:py-20">
        <div className="mx-auto max-w-7xl">
          <SectionTitle>How it works</SectionTitle>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {(howItWorks.length
              ? howItWorks
              : [
                  {
                    title: "Your appointment",
                    body: "The team will explain the process before you book.",
                  },
                ]
            ).map((step, index) => (
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

      <section className="border-b border-border px-page py-14 md:py-20">
        <div className="mx-auto max-w-7xl">
          <SectionTitle>How to prepare</SectionTitle>
          {preparation.length ? (
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
          ) : (
            <p className="mt-8 max-w-3xl text-base leading-relaxed text-muted">
              The team will confirm any preparation instructions before your appointment.
            </p>
          )}
        </div>
      </section>

      <section className="border-b border-border px-page py-14 md:py-20">
        <div className="mx-auto max-w-7xl">
          <SectionTitle>FAQs</SectionTitle>
          <div className="mt-8 max-w-4xl">
            <FaqList items={faqs(product, preparation)} />
          </div>
        </div>
      </section>

      <Location />

      <OtherProductsGrid product={product} />

      <StickyBookBar
        price={product.price === 0 && product.priceTbd ? undefined : product.price}
        duration={product.duration}
        href={bookingHref(product)}
        onClick={() => trackBooking(product, path)}
        ctaLabel={bookingLabel(product)}
      />
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
