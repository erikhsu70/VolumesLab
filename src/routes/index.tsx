// Homepage = the whole funnel.
//
// Built directly from the client's homepage architecture (07/08/2026): the CMS
// holds no transactional step, it exists to explain the offer and hand the
// visitor to Momence. The diagram's order was:
//
//   contact + map → intro → TESTS → ASSESSMENTS → MEDICAL APPOINTMENT
//   → TRAIN → MEMBERSHIPS → FAQ / Legal / Blog
//
// Since 12/09/2026 the section order, names and on/off are the CMS's
// (Home page → Sections); the diagram is only the bundled default. Since
// 23/09/2026 the map is its own "Location" section at the bottom, right
// above the footer, and the hero is text only.
//
// Every card carries the same CTA pair: Book (→ the SKU in Momence) and
// More info (→ this CMS).

import { createFileRoute } from "@tanstack/react-router";
import { SiteChrome } from "@/components/site/SiteChrome";
import { Location } from "@/components/site/Location";
import { SectionProductGrid } from "@/components/site/cards";
import { ADDRESS, CONTACT, HOURS, MAP_LINK } from "@/data/site";
import { homePage, type HeadlineSize } from "@/data/pages";
import { visibleSections } from "@/lib/sections";
import { canonical } from "@/lib/seo";
import { metaTags } from "@/data/meta";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: metaTags("home"),
    links: [canonical("/")],
  }),
});

function Home() {
  return (
    <SiteChrome>
      <ContactBlock />
      <Intro />

      {/* Order, names and on/off come from the CMS (Home page → Sections). */}
      {visibleSections().map((s) => (
        <Section key={s.key} id={s.key} title={s.title} description={s.description} collapsible={s.collapsible}>
          <SectionProductGrid section={s.key} />
        </Section>
      ))}

      <Location />
    </SiteChrome>
  );
}

/* ---------------- Contact block ---------------- */

// Heading size, chosen in the CMS (Home page → Headline size). "large" is the
// original; the client asked for the title on one line (14/09/2026).
const headlineClass: Record<HeadlineSize, string> = {
  small: "text-2xl md:text-3xl",
  medium: "text-3xl md:text-4xl",
  large: "text-3xl md:text-5xl",
};

// The hero: headline, address, email and hours, on the same left edge as the
// header logo and every section below (client, 23/09/2026: "align left"). No
// logo here, the header carries it; the map moved to the Location section at
// the bottom of the page.
function ContactBlock() {
  return (
    <section className="border-b border-border px-page py-12 md:py-16">
      <div className="mx-auto max-w-7xl">
        {homePage.headline && (
          <h1
            className={`font-display font-extrabold uppercase leading-[1.05] tracking-tight text-balance break-words ${headlineClass[homePage.headlineSize]}`}
          >
            {homePage.headline}
          </h1>
        )}

        <address className="mt-6 space-y-1 text-base not-italic leading-relaxed text-foreground/85">
          <p>
            <a
              href={MAP_LINK}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-foreground/30 underline-offset-4 hover:text-foreground hover:decoration-foreground"
            >
              {ADDRESS.short}
            </a>
          </p>
          <p>
            <a href={`mailto:${CONTACT.email}`} className="hover:text-primary">
              {CONTACT.email}
            </a>
          </p>
        </address>

        <dl className="mt-6 space-y-1 font-mono text-[11px] uppercase tracking-widest text-muted">
          {HOURS.weekdays.value && (
            <div className="flex flex-wrap gap-x-3">
              <dt>Open {HOURS.weekdays.label}</dt>
              <dd className="tabular-nums text-foreground">{HOURS.weekdays.value}</dd>
            </div>
          )}
          {HOURS.weekend.value && (
            <div className="flex flex-wrap gap-x-3">
              <dt>{HOURS.weekend.label}</dt>
              <dd className="tabular-nums text-foreground">{HOURS.weekend.value}</dd>
            </div>
          )}
        </dl>
        {HOURS.walkIns && (
          <p className="mt-4 font-mono text-[11px] font-bold uppercase tracking-widest text-primary">
            {HOURS.walkIns}
          </p>
        )}
      </div>
    </section>
  );
}

/* ---------------- Intro ---------------- */

function Intro() {
  if (!homePage.intro) return null;
  return (
    <section className="border-b border-border px-page py-10 md:py-14">
      <div className="mx-auto max-w-7xl">
        <p className="max-w-4xl whitespace-pre-line text-lg leading-relaxed text-foreground/85 md:text-xl">
          {homePage.intro}
        </p>
      </div>
    </section>
  );
}

/* ---------------- Section shell ---------------- */

function Section({
  id,
  title,
  description,
  children,
  collapsible,
}: {
  id: string;
  title: string;
  description?: string;
  collapsible?: boolean;
  children: React.ReactNode;
}) {
  const heading = <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
    {title && <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight md:text-3xl">{title}</h2>}
    {description && <p className="font-mono text-[11px] uppercase tracking-widest text-muted">{description}</p>}
  </div>;
  return (
    <section id={id} className="scroll-mt-20 border-b border-border px-page py-10 md:py-14">
      <div className="mx-auto max-w-7xl">
        {collapsible ? (
          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden" aria-label={title || `Section ${homePage.sections.findIndex(s => s.key === id) + 1}`}>
              {heading}
              <span aria-hidden className="shrink-0 text-2xl group-open:rotate-180">⌄</span>
            </summary>
            <div className="mt-8">{children}</div>
          </details>
        ) : <>{heading}<div className="mt-8">{children}</div></>}
      </div>
    </section>
  );
}
