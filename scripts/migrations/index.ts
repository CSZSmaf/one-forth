import { migrateContentV1ToV2 } from "./v1-to-v2.ts";
import { migrateContentV2ToV3 } from "./v2-to-v3.ts";

export interface ContentMigration {
  readonly from: number;
  readonly to: number;
  readonly description: string;
  migrate(frontmatter: Readonly<Record<string, unknown>>): Record<string, unknown>;
}

/**
 * Append migrations in ascending version order. A migration changes frontmatter
 * only; migrate-content.ts preserves the MDX body and validates the final
 * document before writing.
 */
export const contentMigrations: readonly ContentMigration[] = [
  migrateContentV1ToV2,
  migrateContentV2ToV3,
];
