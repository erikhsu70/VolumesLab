import { createFileRoute, Link } from "@tanstack/react-router";
import { pageGate } from "@/lib/pages";
import { SiteChrome } from "@/components/site/SiteChrome";
import { metaTags } from "@/data/meta";
import { ADDRESS, CONTACT, HOURS, MAP_LINK } from "@/data/site";
import { BookServicesLink } from "@/components/site/cards";
import { Eyebrow, SectionTitle } from "@/components/site/blocks";

export const Route = createFileRoute("/about/location")({
  beforeLoad: pageGate("location"),
  component: LocationPage,
  head: () => ({
    meta: metaTags("location"),
  }),
});

// Address, hours and contact are confirmed and come from @/data/site.
// "Getting here" is still a [Confirm] item from the brief (section 10.4).
// Built per render: the values come from the CMS and can change between requests.
const infoRows = (): { label: string; value: string }[] =>
  [
    {
      label: "Address",
      value: [ADDRESS.street, ADDRESS.district, `${ADDRESS.postalCode} ${ADDRESS.city}`.trim()]
        .filter(Boolean)
        .join(", "),
    },
    { label: "Opening hours", value: [HOURS.short, HOURS.walkIns].filter(Boolean).join(" · ") },
    { label: "Getting here", value: "Metro Alonso Martínez (L4, L5, L10), 4 min walk [confirm]" },
    { label: "Contact", value: CONTACT.email },
  ].filter((r) => r.value);

function LocationPage() {
  const info = infoRows();
  return (
    <SiteChrome>
      <section className="border-b border-border px-page py-20 md:py-24">
        <div className="mx-auto max-w-7xl">
          <Eyebrow>Location</Eyebrow>
          <SectionTitle as="h1" className="mt-6 max-w-3xl">
            Churruca 5, Justicia, Madrid
          </SectionTitle>
        </div>
      </section>
      <section className="px-page py-16">
        <div className="mx-auto max-w-7xl">
          <dl className="divide-y divide-border border-y border-border">
            {info.map((row) => (
              <div key={row.label} className="py-5">
                <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">
                  {row.label}
                </dt>
                <dd className="mt-1 text-base text-foreground/85">{row.label === "Address" ? <a href={MAP_LINK} target="_blank" rel="noreferrer" className="hover:underline">{row.value}</a> : row.label === "Contact" ? <a href={`mailto:${CONTACT.email}`} className="hover:underline">{row.value}</a> : row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="mx-auto mt-12 max-w-7xl">
          <BookServicesLink sourcePage="/about/location" />
        </div>
      </section>
    </SiteChrome>
  );
}
