// Header per the client's homepage architecture (07/08/2026).
//
// The homepage is the whole funnel, so the section links are anchors into it
// rather than separate index pages. "Book Services" writes to the contact
// email for now (client, 23/09/2026: every Book CTA is a mailto until the
// booking platform is wired); see bookServicesHref().

import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { track } from "@/lib/analytics";
import { BRANDING, PAGES } from "@/data/site";
import { bookServicesHref } from "@/lib/booking";
import { sectionLabel, visibleSections } from "@/lib/sections";

type NavItem = { label: string; hash?: string; to?: string };

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  // Built per render: the CMS can switch pages and sections off, rename and
  // reorder the sections between requests.
  // Blog and FAQ are linked from the footer only. Team stays off in
  // "Pages on / off" until its content exists.
  const navItems: NavItem[] = [
    ...visibleSections().filter(s => s.title.trim()).map((s) => ({ label: sectionLabel(s.key), hash: s.key })),
    ...(PAGES.lab ? [{ label: "The Lab", to: "/about/lab" }] : []),
    ...(PAGES.team ? [{ label: "Team", to: "/about/team" }] : []),
  ];

  return (
    <nav className="relative z-50 border-b border-border bg-background/95 backdrop-blur-md">
      {/* Padding outside the column, like every section, so the logo and the
          Book Services button line up with the content's left and right
          edges (client, 23/09/2026). */}
      <div className="px-page">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 py-4">
        {/* The wordmark at the footer's size (client, 23/09/2026); it is the
            only logo on the homepage now that the hero has none. */}
        <Link to="/" onClick={closeMobile} className="leading-none">
          <img src={BRANDING.mark} alt="Volumes Lab" className="w-24" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden min-w-0 flex-wrap justify-end gap-y-2 items-center gap-x-5 font-mono text-[11px] font-bold uppercase tracking-widest lg:flex">
          {navItems.map((item) => (
            <NavLink key={item.hash ?? item.to} item={item} />
          ))}
          <BookServicesButton />
        </div>

        {/* Mobile burger */}
        <button
          className="border border-border px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-widest lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-label="Toggle menu"
        >
          {mobileOpen ? "Close −" : "Menu +"}
        </button>
      </div>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="border-t border-border px-page py-8 lg:hidden">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.hash ?? item.to}>
                <NavLink item={item} onNavigate={closeMobile} mobile />
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <BookServicesButton onNavigate={closeMobile} className="w-full justify-center" />
          </div>
        </div>
      )}
    </nav>
  );
}

function NavLink({
  item,
  onNavigate,
  mobile = false,
}: {
  item: NavItem;
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  const className = mobile
    ? "block py-2 font-display text-2xl font-bold uppercase tracking-tight"
    : "py-2 text-foreground/80 transition-colors hover:text-primary";

  return (
    <Link
      to={item.to ?? "/"}
      hash={item.hash}
      onClick={onNavigate}
      className={className}
    >
      {item.label}
    </Link>
  );
}

/** The site's global CTA: an email to the lab for now (client, 23/09/2026). */
function BookServicesButton({
  onNavigate,
  className = "",
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <a
      href={bookServicesHref()}
      onClick={() => {
        track("book_cta_click", { product: "all", destination: "email", source_page: "header" });
        onNavigate?.();
      }}
      className={`group inline-flex items-center gap-2 bg-primary px-5 py-2.5 font-mono text-[12px] font-bold uppercase tracking-widest text-primary-foreground transition-colors hover:bg-primary-strong ${className}`}
    >
      Book Services
      <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">
        →
      </span>
    </a>
  );
}

