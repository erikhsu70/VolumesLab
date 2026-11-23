const publicData = /^\/api\/(tests|assessments|medical|training|memberships|posts|faqs|team|globals\/(site-settings|home-page|product-labels|about-page|legal-page|page-meta|page-visibility|faq-page|blog-page|contact-page))$/;
const publicMedia = /^\/api\/media\/file\/[^/]+$/;

/** Only anonymous public reads; never forward credentials or CMS writes. */
export async function publicCmsProxy(request: Request, origin: string, transport = fetch): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.slice("/_cms".length);
  if (!["GET", "HEAD"].includes(request.method)) return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
  let decoded: string;
  try { decoded = decodeURIComponent(path); } catch { return new Response(null, { status: 400 }); }
  if ((!publicData.test(decoded) && !publicMedia.test(decoded)) || decoded.split("/").includes("..")) return new Response(null, { status: 404 });
  const target = new URL(path + url.search, origin);
  if (target.origin !== new URL(origin).origin) return new Response(null, { status: 400 });
  try {
    const response = await transport(target, {
      method: request.method, redirect: "manual", signal: AbortSignal.timeout(15_000),
      headers: { Accept: publicMedia.test(decoded) ? "*/*" : "application/json" },
    });
    if (response.status >= 300 && response.status < 400) return new Response(null, { status: 502 });
    const headers = new Headers({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    headers.set("Content-Type", response.headers.get("content-type") || "application/octet-stream");
    return new Response(request.method === "HEAD" ? null : response.body, { status: response.status, headers });
  } catch { return new Response(null, { status: 502 }); }
}
