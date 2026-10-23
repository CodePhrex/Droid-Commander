import type { CatalogSnapshot, CatalogStorage } from "./vulnerability-catalog";

/** A packaged, dated reference is not a successful live synchronization or a signed feed. */
export function withBundledCatalogReference(storage: CatalogStorage, bundled: CatalogSnapshot): CatalogStorage {
  return {
    read: async () => {
      const raw = await storage.read();
      if (raw) {
        try {
          const cached = JSON.parse(raw);
          if (cached?.schemaVersion === 1 && Array.isArray(cached.records) && Array.isArray(cached.patches) && Array.isArray(cached.sources) && cached.integrity?.transport === "https" && (cached.records.length || cached.patches.length)) return raw;
        } catch {
          // Return the real packaged reference, never seeded host observations.
        }
      }
      return JSON.stringify(bundled);
    },
    write: (value) => storage.write(value),
  };
}
