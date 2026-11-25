// Standalone waitlist landing page (client, 25/11/2026: "Create a separate
// landing page, volumeslab.com/waitlist. Header & footer as always, just
// the waitlist card"). Same SiteChrome as the rest of the site; the only
// content is the shared Momence waitlist card.

import { createFileRoute } from "@tanstack/react-router";
import { SiteChrome } from "@/components/site/SiteChrome";
import { WaitlistForm } from "@/components/site/WaitlistForm";
import { canonical, metaDescription } from "@/lib/seo";

export const Route = createFileRoute("/waitlist")({
  component: WaitlistPage,
  head: () => ({
    meta: [
      { title: "Join the Waitlist, Volumes Lab Madrid" },
      { name: "description", content: metaDescription("Join the Volumes Lab waitlist. Lab-grade health and performance testing in central Madrid, Churruca 5.") },
      { property: "og:title", content: "Join the Waitlist, Volumes Lab" },
      { property: "og:description", content: metaDescription("Join the Volumes Lab waitlist. Lab-grade health and performance testing in central Madrid.") },
    ],
    links: [canonical("/waitlist")],
  }),
});

function WaitlistPage() {
  return (
    <SiteChrome>
      <section className="flex min-h-0 flex-1 flex-col border-b border-border px-4 py-4 md:items-center md:justify-center md:px-12 md:py-6">
        <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col justify-center md:flex-none">
          <WaitlistForm />
        </div>
      </section>
    </SiteChrome>
  );
}
