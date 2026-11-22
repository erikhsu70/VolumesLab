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
import { useEffect, useState } from "react";
import { SiteChrome } from "@/components/site/SiteChrome";
import { ProductCard, SectionProductGrid } from "@/components/site/cards";
import { homePage } from "@/data/pages";
import { productsInSection, visibleSections } from "@/lib/sections";
import { healthCheckProduct } from "@/lib/health-check";
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
  const healthCheck = healthCheckProduct();
  const sections = visibleSections().filter((section) => productsInSection(section.key).some((p) => p.slug !== healthCheck?.slug));
  return (
    <SiteChrome>
      <ContactBlock />
      <Intro />

      {/* Order, names and on/off come from the CMS (Home page → Sections). */}
      {sections.map((s) => (
        <Section key={s.key} id={s.key} title={s.title} description={s.description} collapsible={s.collapsible}>
          <SectionProductGrid section={s.key} excludeSlug={healthCheck?.slug} />
        </Section>
      ))}

    </SiteChrome>
  );
}

/* ---------------- Contact block ---------------- */

// Home hero with two equal-width cards: Momence waitlist and CMS Health Check.
function ContactBlock() {
  const healthCheck = healthCheckProduct();
  return (
    <section className="flex flex-1 items-center justify-center min-h-0 border-b border-border px-4 py-4 md:px-12 md:py-6">
      <div className="mx-auto h-full w-full max-w-7xl md:h-auto">
        <div className="home-contact-cards grid h-full min-h-0 w-full grid-rows-2 items-stretch gap-4 md:h-auto md:grid-rows-none md:grid-cols-2 md:gap-6">
          <WaitlistForm />
          {healthCheck && (
            <ProductCard p={healthCheck} sourcePage="/" compact />
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Momence waitlist ---------------- */

function WaitlistForm() {
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const style = document.createElement("style");
    style.id = "momence-waitlist-colors";
    style.textContent = `:root {
      --momenceColorBackground: #F7F5F6;
      --momenceColorPrimary: 33, 33, 33;
      --momenceColorBlack: 3, 1, 13;
    }`;
    document.head.appendChild(style);

    const script = document.createElement("script");
    script.id = "momence-plugin-lead-form-src";
    script.type = "module";
    script.async = true;
    script.setAttribute("host_id", "319187");
    script.setAttribute("fields", "firstName,lastName,email");
    script.setAttribute("token", "KajVVpeQjP");
    script.setAttribute("country_code", "es");
    script.setAttribute("source_id", "301458");
    script.setAttribute(
      "data-field-def",
      JSON.stringify({
        firstName: { type: "text", label: "Name", required: true, hidden: false, placeholder: "Name" },
        lastName: { type: "text", label: "Surname", required: true, hidden: false, placeholder: "Surname" },
        email: { type: "email", label: "Email", required: true, hidden: false, placeholder: "Email" },
      }),
    );
    script.setAttribute("data-on-success-msg", "You joined the waitlist.");
    script.src = "https://momence.com/plugin/lead-form/lead-form.js";
    document.body.appendChild(script);

    // Momence owns this DOM. Normalize its generated fields after the plugin renders.
    const formRoot = document.getElementById("momence-plugin-lead-form");
    const normalizeForm = () => {
      if (formRoot?.textContent?.includes("You joined the waitlist.")) setJoined(true);
      if (!formRoot) return;
      const fields = Array.from(formRoot.querySelectorAll<HTMLInputElement>('input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"])'));
      const placeholders = ["Name", "Surname", "Email"];
      fields.slice(0, 3).forEach((input, i) => {
        if (input.placeholder !== placeholders[i]) input.placeholder = placeholders[i];
        input.setAttribute("aria-label", placeholders[i]);
      });
      formRoot.querySelectorAll("label").forEach((label) => {
        const value = (label.textContent ?? "").replaceAll("*", "").trim().toLowerCase();
        if (["first name", "last name", "name", "surname", "email"].includes(value) && !label.querySelector("input")) {
          label.classList.add("volumes-waitlist-field-label");
        }
      });
      const submit = formRoot.querySelector<HTMLButtonElement>('button[type="submit"], input[type="submit"]');
      if (submit) {
        if (submit instanceof HTMLInputElement) {
          if (submit.value !== "Join the waitlist") submit.value = "Join the waitlist";
        } else if (submit.textContent?.trim() !== "Join the waitlist") {
          submit.textContent = "Join the waitlist";
        }
      }
    };
    const observer = new MutationObserver(normalizeForm);
    if (formRoot) observer.observe(formRoot, { childList: true, subtree: true, characterData: true });
    normalizeForm();

    return () => {
      observer.disconnect();
      script.remove();
      style.remove();
    };
  }, []);

  return (
    <div className={`volumes-waitlist flex w-full min-w-0 flex-col border border-border bg-card px-6 pb-2.5 pt-6 text-center text-foreground ${joined ? "volumes-waitlist-joined min-h-[160px] justify-center" : ""}`}>
      {!joined && <h2 className="volumes-waitlist-title mb-4 font-display text-lg font-bold uppercase leading-tight">Join the Waitlist</h2>}
      <div id="momence-plugin-lead-form" className={joined ? "volumes-waitlist-success" : ""} />
    </div>
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
    <section id={id} className="scroll-mt-20 border-b border-border px-page py-10 last:border-b-0 md:py-14">
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
