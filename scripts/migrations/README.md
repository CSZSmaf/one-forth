# Content schema migrations

`content/**/*.mdx` uses versioned YAML frontmatter. Schema changes must not be
handled with an ad-hoc search/replace.

## Workflow

1. Add a `ContentMigration` implementation in this directory.
2. Export it from `index.ts` in ascending version order.
3. Update the Zod schema only after the migration has a fixture or representative
   content sample.
4. Preview without writing:

   ```bash
   pnpm migrate:content
   ```

5. Apply the migration explicitly:

   ```bash
   pnpm migrate:content -- --write
   ```

6. Review the Git diff, then run `pnpm validate:content`, `pnpm check:links`,
   `pnpm generate:content`, and the relevant rendering tests.

CI can use `pnpm migrate:content -- --check` to fail when an older document is
still present. The command never fetches remote data, never changes an ID unless
the registered migration says so, and does not write unless `--write` is given.

## Migration contract

```ts
const example: ContentMigration = {
  from: 1,
  to: 2,
  description: "Describe the semantic change",
  migrate(frontmatter) {
    return { ...frontmatter, schemaVersion: 2 };
  },
};
```

Keep each step deterministic and side-effect free. Do not invent authors,
reviewers, resource metadata, DOI values, or review dates during migration. If a
new required field cannot be derived truthfully, stop with a diagnostic and let
an editor supply it.

## v1 to v2

The registered v1 to v2 migration removes the ambiguous `lastReviewed` and
`reviewers` fields, keeps document maturity at `draft`, initializes scientific
checks as pending and the editorial state as draft, and records a
`metadata-migration` revision with `humanReviewer: null`. It maps the legacy
`used-in` relation to `applied-to`. A legacy `depends-on` relation becomes an
actual prerequisite edge because that direction can be preserved without
inventing a new semantic label.

## v2 to v3

The v2 to v3 migration separates `publicationStatus` from `editorialStatus`.
It never promotes content to `published`: authored v2 documents become
`preview`, while `planned` and `outline` metadata becomes `hidden`. The nested
`review.editorialStatus` is moved to the top level and the scientific checks
and `humanReviewer` are preserved exactly. A metadata-only revision records the
schema change without claiming a content or human-review update.
The legacy `translationStatus` field is renamed to the explicitly internal
`translationEditorialStatus`.
