// Shared conversion blocks for Volumes Lab pages.
// All follow the site design system: hairline borders, mono eyebrows,
// condensed uppercase display type, cream/ink palette.

import { Link } from "@tanstack/react-router";
import { track } from "@/lib/analytics";
import { bookingOpensTab } from "@/lib/booking";

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-primary">
      {children}
    </p>
  );
}

export function SectionTitle({
  children,
  className = "",
  as: Tag = "h2",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <Tag
      className={`font-display text-3xl font-extrabold uppercase leading-[0.95] tracking-tight text-balance md:text-5xl ${className}`}
    >
      {children}
    </Tag>
  );
}
export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {items.map((f, i) => (
        <li key={i}>
          <details
            className="group py-6"
            onToggle={(e) => {
              if (e.currentTarget.open) track("faq_expand", { question: f.q });
            }}
          >
            <summary className="flex cursor-pointer list-none items-baseline justify-between gap-8">
              <span className="font-display text-xl font-bold group-hover:opacity-70">{f.q}</span>
              <span className="shrink-0 font-mono text-xs uppercase text-muted group-open:hidden">Open +</span>
              <span className="hidden shrink-0 font-mono text-xs uppercase text-foreground group-open:inline">Close −</span>
            </summary>
            <p className="mt-4 max-w-3xl whitespace-pre-line text-base leading-relaxed text-muted">{f.a}</p>
          </details>
        </li>
      ))}
    </ul>
  );
}
export function StickyBookBar({
  price,
  duration,
  pricePeriod,
  href,
  ctaLabel,
  onClick,
}: {
  price?: number;
  duration?: string;
  pricePeriod?: string;
  href: string;
  ctaLabel: string;
  onClick?: () => void;
}) {
  const newTab = bookingOpensTab();
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md md:hidden">
      <div className="leading-tight">
        <p className="font-display text-xl font-bold">{price === undefined ? "Price on booking" : `€${price}`}{pricePeriod && <span className="ml-1 text-sm font-normal">{pricePeriod}</span>}</p>
        {duration && <p className="font-mono text-[9px] uppercase tracking-widest text-muted">{duration}</p>}
      </div>
      <a
        href={href}
        target={newTab ? "_blank" : undefined}
        rel="noreferrer"
        onClick={onClick}
        className="flex-1 bg-primary py-3 text-center font-mono text-[11px] uppercase tracking-widest text-primary-foreground transition-colors hover:bg-primary-strong"
      >
        {ctaLabel}
      </a>
    </div>
  );
}

