import { Link, useRouterState } from "@tanstack/react-router";
import { ADDRESS, BRANDING, MAP_LINK } from "@/data/site";
import { healthCheckProduct } from "@/lib/health-check";

export function SiteHeader() {
  const healthCheck = healthCheckProduct();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const onHealthCheck = pathname.replace(/\/$/, "") === "/health-check";

  return (
    <header className="relative z-50 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="px-page">
        <div className="mx-auto flex max-w-7xl flex-nowrap items-center gap-x-2 py-2.5 md:gap-x-4">
          <Link to="/" className="shrink-0 leading-none">
            <img src={BRANDING.mark} alt="Volumes Lab" className="h-11 w-auto max-w-24 object-contain" />
          </Link>
          <address className="flex min-w-0 flex-1 flex-nowrap items-center gap-x-2 whitespace-nowrap font-sans text-sm not-italic leading-relaxed text-foreground/85 md:gap-x-4">
            <Link to="/" className="font-bold hover:underline">Volumes Lab</Link>
            {ADDRESS.short && (
              <a href={MAP_LINK} target="_blank" rel="noreferrer" className="hover:underline">
                {ADDRESS.short}
              </a>
            )}
          </address>
          {!onHealthCheck && (
            <Link
              to="/$slug"
              params={{ slug: healthCheck?.slug ?? "health-check" }}
              className="volumes-cta hidden shrink-0 items-center justify-center border border-border bg-transparent font-mono text-[10px] font-bold uppercase tracking-widest text-foreground transition-colors hover:border-foreground"
            >
              Book Health Check
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
