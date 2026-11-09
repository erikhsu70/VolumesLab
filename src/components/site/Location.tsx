import { ADDRESS, MAP_EMBED, MAP_LINK } from "@/data/site";

/* ---------------- Location (map) ---------------- */

// The last section of the page, right above the footer (client, 23/09/2026):
// a "Location" heading on the content column and the map running from left
// to right between the two vertical margin lines SiteChrome fixes at 16px
// (24px from tablets up).
export function Location() {
  return (
    <section id="location" className="scroll-mt-20 border-b border-border pt-10 md:pt-14">
      <div className="px-page">
        <div className="mx-auto flex max-w-7xl flex-wrap items-baseline gap-x-6 gap-y-2">
          <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight md:text-3xl">Location</h2>
          {ADDRESS.short && (
            <a
              href={MAP_LINK}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[11px] uppercase tracking-widest text-muted hover:text-primary"
            >
              {ADDRESS.short}
            </a>
          )}
        </div>
      </div>
      <div className="mx-4 mt-8 h-[320px] border-t border-border md:mx-6 md:h-[420px]">
        <iframe
          title={`Volumes Lab, ${ADDRESS.full}`}
          src={MAP_EMBED}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="block h-full w-full"
        />
      </div>
    </section>
  );
}

