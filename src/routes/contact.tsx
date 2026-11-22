import { createFileRoute } from "@tanstack/react-router";
import { pageGate } from "@/lib/pages";
import { SiteChrome } from "@/components/site/SiteChrome";
import { metaTags } from "@/data/meta";
import { ADDRESS, CONTACT, HOURS, MAP_LINK } from "@/data/site";
import { contactPage as C } from "@/data/pages";
import { Eyebrow } from "@/components/site/blocks";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  beforeLoad: pageGate("contact"),
  component: Contact,
  head: () => ({
    meta: metaTags("contact"),
  }),
});

function Contact() {
  const [sent, setSent] = useState(false);
  return (
    <SiteChrome>
      {(C.eyebrow || C.headline || C.intro) && (
        <section className="border-b border-border px-page py-24">
          <div className="mx-auto max-w-7xl">
            {C.eyebrow && <Eyebrow>{C.eyebrow}</Eyebrow>}
            {C.headline && (
              <h1 className="mt-6 font-display text-5xl font-extrabold tracking-tight md:text-7xl">
                {C.headline}
              </h1>
            )}
            {C.intro && <p className="mt-6 max-w-2xl whitespace-pre-line text-lg text-muted">{C.intro}</p>}
          </div>
        </section>
      )}

      <section className="px-page py-24">
        <div className="mx-auto max-w-7xl">
          <div className="space-y-10">
            {ADDRESS.full && <InfoRow label="Address" value={<a href={MAP_LINK} target="_blank" rel="noreferrer" className="hover:underline"><Lines text={addressLines(ADDRESS.full)} /></a>} />}
            {C.gettingHere && <InfoRow label="Getting here" value={<Lines text={C.gettingHere} />} />}
            <InfoRow label="Email" value={<a className="hover:opacity-70" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>} />
{/* Phone and WhatsApp removed site-wide (30/08) until a real number exists. */}
            {(HOURS.weekdays.value || HOURS.weekend.value || HOURS.walkIns) && (
              <InfoRow
                label="Hours"
                value={
                  <>
                    {HOURS.weekdays.value && <>Mon–Fri · {HOURS.weekdays.value}<br /></>}
                    {HOURS.weekend.value && <>Sat–Sun · {HOURS.weekend.value}<br /></>}
                    {HOURS.walkIns}
                  </>
                }
              />
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
                toast.success("Message sent. We'll be in touch shortly.");
                (e.target as HTMLFormElement).reset();
              }}
              className="space-y-4 border-t border-border pt-10"
            >
              {C.form.title && (
                <p className="font-mono text-xs uppercase tracking-widest text-foreground">[ {C.form.title} ]</p>
              )}
              {C.form.intro && <p className="text-sm text-muted">{C.form.intro}</p>}
              <input required name="name" placeholder="Your name" className="w-full border border-border bg-transparent px-4 py-3 text-sm focus:border-foreground focus:outline-none" />
              <input required name="email" type="email" placeholder="Email" className="w-full border border-border bg-transparent px-4 py-3 text-sm focus:border-foreground focus:outline-none" />
              <textarea required name="message" placeholder="Tell us what you're trying to change, we'll point you to the right test" rows={5} className="w-full border border-border bg-transparent px-4 py-3 text-sm focus:border-foreground focus:outline-none" />
              <button className="bg-foreground px-6 py-3 font-mono text-xs uppercase tracking-widest text-primary-foreground hover:opacity-80">
                {sent ? "Sent ✓" : "Send message"}
              </button>
            </form>
          </div>


        </div>
      </section>
    </SiteChrome>
  );
}

// "Calle Churruca 5, 28004 Madrid, Spain" → street on its own line, the rest below.
function addressLines(full: string) {
  const [street, ...rest] = full.split(/,\s*/);
  return rest.length ? `${street}\n${rest.join(", ")}` : street;
}

// Multi-line CMS text: one line per row.
function Lines({ text }: { text: string }) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  return (
    <>
      {lines.map((line, i) => (
        <span key={i}>
          {line}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-t border-border pt-6">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">{label}</p>
      <p className="text-lg leading-relaxed">{value}</p>
    </div>
  );
}
