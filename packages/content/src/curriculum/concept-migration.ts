import { canonicalLocationForConcept } from "./concept-location";
import type { CanonicalLocation } from "./types";

export interface LegacyConceptV1Shape {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly domain: string;
  readonly subject: string;
}

export type MigratedConceptV2<T extends LegacyConceptV1Shape> = Omit<T, "schemaVersion"> & {
  readonly schemaVersion: 2;
  readonly canonicalLocation: CanonicalLocation;
};

export function migrateConceptV1ToV2<T extends LegacyConceptV1Shape>(
  legacy: T,
): MigratedConceptV2<T> {
  const { schemaVersion: _legacyVersion, ...fields } = legacy;
  return {
    ...fields,
    schemaVersion: 2,
    canonicalLocation: canonicalLocationForConcept(legacy.id, legacy.domain, legacy.subject),
  };
}
