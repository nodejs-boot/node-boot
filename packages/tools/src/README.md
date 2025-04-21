## Backstage Scripts

| Script                         | Description                                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `check-docs-quality.ts`        | Script that extracts all markdown files from the project and validate their content.                                      |
| `check-type-dependencies.ts`   | Script that scan index.d.ts for imports and return errors for any dependency that's missing or incorrect in package.json. |
| `verify-local-dependencies.ts` | Script that validates local dependency versions.                                                                          |
