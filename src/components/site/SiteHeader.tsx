import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { BRANDING } from "@/data/site";
import { productPath } from "@/data/catalog";
import { productsInSection, visibleSections } from "@/lib/sections";

export function SiteHeader() {
  const dropdown = useRef<HTMLDetailsElement>(null);
  const services = visibleSections().flatMap(section => productsInSection(section.key));

  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !dropdown.current?.contains(event.target)) {
        dropdown.current?.removeAttribute("open");
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dropdown.current?.open) {
        dropdown.current.removeAttribute("open");
        dropdown.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  return (
    <header className="relative z-50 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="px-page">
        <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 py-4">
          <Link to="/" className="shrink-0 leading-none" onClick={() => dropdown.current?.removeAttribute("open")}>
            <img src={BRANDING.mark} alt="Volumes Lab" className="w-24" />
          </Link>
          {services.length > 0 && (
            <details ref={dropdown} className="group min-w-0">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 bg-primary px-4 py-2.5 font-mono text-[12px] font-bold uppercase tracking-widest text-primary-foreground transition-colors hover:bg-primary-strong [&::-webkit-details-marker]:hidden" aria-controls="header-services">
                Book Services
                <span aria-hidden className="shrink-0 group-open:rotate-180">⌄</span>
              </summary>
              <nav id="header-services" aria-label="Services" className="absolute right-0 top-full w-full max-w-sm border border-border bg-background shadow-lg">
                <ul className="max-h-[min(65dvh,32rem)] overflow-y-auto overscroll-contain p-2">
                  {services.map(service => (
                    <li key={service.slug}>
                      <Link
                        to={productPath(service)}
                        onClick={() => dropdown.current?.removeAttribute("open")}
                        className="block min-h-11 break-words px-4 py-3 font-sans text-sm leading-relaxed transition-colors hover:bg-card focus-visible:bg-card"
                      >
                        {service.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </details>
          )}
        </div>
      </div>
    </header>
  );
}
