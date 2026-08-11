# Authoring a starter skill

Use this checklist when a new `@nodeboot/starter-*` package is added to the framework.

## 1. Gather the real source material

1. Read `starters/<name>/README.md` first.
2. Cross-check the starter's section in [`USAGE_GUIDE.md`](https://github.com/nodejs-boot/node-boot/blob/main/USAGE_GUIDE.md) for the canonical decorator list and wording.
3. Skim [`CONTRIBUTING.md`](https://github.com/nodejs-boot/node-boot/blob/main/CONTRIBUTING.md) §4 to understand the starter's flavour (SDK auto-config, lifecycle adapter, conditional beans, multi-bean factory, and so on).
4. If the README is thin, skim `src/decorator/`, `src/index.ts`, and any `src/config*` or `src/configuration*` files to confirm real decorator names, bean tokens, and config paths. Do not invent APIs.

## 2. Create the concrete skill file

Create `.agents/skills/nodeboot-starter-<name>/SKILL.md` with:

-   YAML frontmatter:
    -   `name`: exactly `nodeboot-starter-<name>`
    -   `description`: one dense third-person paragraph for discovery, explicitly naming the package and the main `@Enable...()` decorator, plus the feature keywords a user would ask for
-   A short body with these sections:
    1. what the starter is for in 1-2 sentences
    2. one `@Enable...()` snippet grounded in the package README
    3. one minimal follow-on example if the starter revolves around another API (`@HttpClient`, `@Scheduler`, `CatalogClient`, `FIREBASE_*_BEAN`, etc.)
    4. key config keys in `app-config.yaml` (`integrations.<name>` if applicable; otherwise the real config node such as `openapi`, `persistence`, or `api.validations`)
    5. a relative link to the package README for exhaustive detail
    6. a `## Validate` section with an exact command or sample app

## 3. Keep it small

-   Target a short `SKILL.md` body; link instead of duplicating package docs.
-   Prefer a minimal recipe over full API tables.
-   If something truly needs long-form content, add it under that skill's `resources/` directory and link to it.

## 4. Register the starter in the orchestrator

Add one row to [`../SKILL.md`](../SKILL.md)'s routing table with:

-   the package name
-   a one-line "use when" description
-   a relative link to `../nodeboot-starter-<name>/SKILL.md`

The orchestrator should stay generic: no deep starter-specific detail there.

## 5. Final review

Before finishing, verify:

-   the frontmatter follows `.agents/skills/README.md`
-   decorator names and config paths match the package README/source
-   the body ends with `## Validate`
-   links are relative and point to the repo docs instead of copied content
