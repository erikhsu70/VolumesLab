// Public addresses only. Never put API keys in VITE_* variables.
export const CMS_ORIGIN = import.meta.env.VITE_CMS_ORIGIN || "https://cms.volumeslab.com";
export const CMS_PUBLIC_URL = import.meta.env.VITE_CMS_PUBLIC_URL || CMS_ORIGIN;
export const CMS_FETCH_URL = import.meta.env.SSR ? CMS_ORIGIN : CMS_PUBLIC_URL;
