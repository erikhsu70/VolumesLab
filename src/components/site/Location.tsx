import { ADDRESS, MAP_LINK } from "@/data/site";

/** Compact linked location detail; no embedded map. */
export function Location() {
  if (!ADDRESS.short) return null;
  return (
    <section id="location" className="border-b border-border px-page py-8">
      <div className="mx-auto max-w-7xl">
        <a href={MAP_LINK} target="_blank" rel="noreferrer" className="text-sm text-foreground/85 hover:underline">
          {ADDRESS.short}
        </a>
      </div>
    </section>
  );
}
