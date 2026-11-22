import type { ReactNode } from "react";
import { useMatches } from "@tanstack/react-router";
import { structuredData, serializeStructuredData, type SchemaData } from "@/lib/structured-data";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

export function SiteChrome({ children }: { children: ReactNode }) {
  const matches = useMatches();
  const match = matches[matches.length - 1];
  const schema =
    match?.status === "success" &&
    !matches.some(
      (item) => item.status !== "success" || ("globalNotFound" in item && item.globalNotFound),
    )
      ? structuredData(match.pathname, (match.loaderData ?? {}) as SchemaData)
      : null;
  return (
    <div className="flex min-h-dvh flex-col bg-background font-sans text-foreground selection:bg-primary selection:text-primary-foreground">
      {schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeStructuredData(schema) }}
        />
      )}
      <SiteHeader />
      <main className="flex min-w-0 flex-1 flex-col [&>:last-child]:border-b-0">{children}</main>
      <SiteFooter />
    </div>
  );
}
