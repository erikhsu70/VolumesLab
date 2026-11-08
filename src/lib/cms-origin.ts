const LEGACY_CMS_ORIGIN = "https://volumes-cms.vercel.app";

/** Public build-time setting; never put credentials in VITE_CMS_URL. */
export function resolveCmsOrigin(value?: string): string {
  const configured = value?.trim();
  if (!configured) return LEGACY_CMS_ORIGIN;

  const url = new URL(configured);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error(
      "VITE_CMS_URL must be an HTTP(S) origin without credentials, path, query or fragment",
    );
  }
  return url.origin;
}

export const CMS_URL = resolveCmsOrigin(import.meta.env?.VITE_CMS_URL);
