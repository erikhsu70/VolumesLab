/** A snapshot belongs to one router, never to other visitors or server requests. */
export function createCmsNavigation<T>(
  fetchContent: () => Promise<T | null>,
  merge: (previous: T | null, fresh: T) => T,
  minimumInterval = 5_000,
) {
  let snapshot: string | undefined;
  let pending: Promise<void> | undefined;
  let nextRead = 0;

  return {
    read: () => snapshot,
    seed(value: string) {
      snapshot ??= value;
    },
    refresh(publish: () => Promise<unknown>): Promise<void> {
      if (pending) return pending;
      pending = Promise.resolve().then(async () => {
        const delay = nextRead - Date.now();
        if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
        nextRead = Date.now() + minimumInterval;
        const fresh = await fetchContent();
        if (fresh === null) return;
        const previous = snapshot === undefined ? null : (JSON.parse(snapshot) as T | null);
        const updated = JSON.stringify(merge(previous, fresh));
        if (updated === snapshot) return;
        snapshot = updated;
        await publish();
      }).finally(() => { pending = undefined; });
      return pending;
    },
  };
}
