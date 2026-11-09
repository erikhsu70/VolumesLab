/** Refresh static hydration data through the same route loaders as navigation.
 * No polling: one refresh on entry, then when the visitor returns to the tab.
 * In-flight focus/visibility events share a request; failure keeps the snapshot.
 */
export function startCmsRefresh(
  refresh: () => Promise<unknown>,
  page: EventTarget & { readonly visibilityState: string },
  browser: EventTarget,
): () => void {
  let active = true;
  let pending = false;

  const run = async () => {
    if (!active || pending || page.visibilityState === "hidden") return;
    pending = true;
    try {
      await refresh();
    } catch {
      // The existing page stays usable if a refresh fails. Retry on next visit.
    } finally {
      pending = false;
    }
  };

  page.addEventListener("visibilitychange", run);
  browser.addEventListener("focus", run);
  browser.addEventListener("pageshow", run);
  browser.addEventListener("online", run);
  void run();

  return () => {
    active = false;
    page.removeEventListener("visibilitychange", run);
    browser.removeEventListener("focus", run);
    browser.removeEventListener("pageshow", run);
    browser.removeEventListener("online", run);
  };
}
