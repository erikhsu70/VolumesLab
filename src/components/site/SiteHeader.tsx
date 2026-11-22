import { Link } from "@tanstack/react-router";
import { ADDRESS, BRANDING, CONTACT, MAP_LINK } from "@/data/site";
import { healthCheckProduct } from "@/lib/health-check";

export function SiteHeader() {
  const healthCheck = healthCheckProduct();

  return (
    <header className="relative z-50 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="px-page">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 py-4">
          <Link to="/" className="shrink-0 leading-none">
            <img src={BRANDING.mark} alt="Volumes Lab" className="w-24" />
          </Link>
          <address className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-[11px] not-italic leading-relaxed text-foreground/85 sm:text-xs">
            <span className="font-bold">Volumes Lab</span>
            {ADDRESS.short && (
              <a href={MAP_LINK} target="_blank" rel="noreferrer" className="hover:underline">
                {ADDRESS.short}
              </a>
            )}
            {CONTACT.email && (
              <a href={`mailto:${CONTACT.email}`} className="break-all hover:underline">
                {CONTACT.email}
              </a>
            )}
          </address>
          <Link
            to="/$slug"
            params={{ slug: healthCheck?.slug ?? "health-check" }}
            className="inline-flex min-h-11 shrink-0 items-center justify-center bg-primary px-5 py-2.5 font-mono text-[12px] font-bold uppercase tracking-widest text-primary-foreground transition-colors hover:bg-primary-strong"
          >
            Book
          </Link>
        </div>
      </div>
    </header>
  );
}
