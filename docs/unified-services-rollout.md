# Unified service sections

Deploy after the companion volumes-cms branch and its external database migration. That change adds free-text section IDs, starred items, price periods, and collapsible sections while retaining existing service documents and IDs.

This branch reads arbitrary CMS sections independently of internal service storage categories. Every homepage/related-service card uses ProductCard. Starred items in the first configured section span two desktop columns. CMS section order and service order are respected. Collapsible sections use native details/summary; their HTML content is rendered before interaction.

Price periods are CMS-owned free text and replace the hardcoded membership `/mo` suffix. They appear on cards, detail pages, and the mobile booking bar. Existing service paths, canonical metadata, legacy redirects, and visibility rules are retained. Blank section titles stay blank and do not produce category-based navigation labels.

No browser, local test run, or deployment verification was performed, per user preference. User will check responsive appearance and behavior after the coordinated rollout. Do not deploy this branch ahead of the CMS migration: the starred field does not exist in the old CMS response.
