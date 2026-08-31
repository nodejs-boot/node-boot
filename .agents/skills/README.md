# Node-Boot Agent Skills

This directory contains an [Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)-compatible
skill family for developing with (and extending) the
[Node-Boot](https://github.com/nodejs-boot/node-boot) framework. Skills are auto-discovered by
agents (GitHub Copilot CLI, Claude, etc.) by scanning every `SKILL.md`'s YAML frontmatter — the
`description` field is what gets matched against the user's request, so read it before loading a
skill's full body.

**This skill family is meant to be copied into other repositories** — apps built _with_ Node-Boot,
not just this monorepo — so every skill treats the node-boot repo as an external reference, not a
local checkout (see the link convention below).

## Conventions

These conventions keep the family token-efficient and consistent. Follow them when adding a new
skill or editing an existing one.

1. **One directory per skill**, flat under `.agents/skills/<skill-name>/`, containing:
    - `SKILL.md` — required. YAML frontmatter (`name`, `description`) + a short Markdown body.
    - `resources/*.md` — optional. Anything long (full API tables, extended code samples,
      step-by-step authoring guides) that isn't needed to _decide_ whether the skill applies, only
      to _execute_ it. Linked from the body by relative path, not inlined.
2. **Frontmatter rules:**
    - `name` matches the directory name exactly.
    - `description` is written in the **third person**, states **when to use this skill**
      concretely (trigger phrases/keywords a user or agent would naturally use), and is a single
      dense paragraph — this is the only part of the skill loaded during discovery, so it carries
      the most weight per token.
3. **Progressive disclosure / token savings:**
    - Keep `SKILL.md` bodies short — a working target is **under ~150 lines**. If a topic needs more,
      split the extra depth into `resources/` and link it.
    - **Never duplicate** content that already lives in a package `README.md`, `USAGE_GUIDE.md`
      section, or a sample project. Link to it instead of copy-pasting (see link convention below).
      The skill body is a distilled _recipe_ (a minimal example + the decision points), not a copy
      of the docs.
4. **Link convention — two tiers.** A link's correct form depends on what it points at, because
   this skill family gets copied into other repos while the node-boot monorepo does not:
    - **Within the skill family** — one `SKILL.md` linking to another skill's `SKILL.md`, or to its
      _own_ `resources/*.md` — use a **relative path**, e.g.
      `../nodeboot-starter-persistence/SKILL.md` or `resources/authoring-a-starter-skill.md`. The
      whole `.agents/skills/` directory always travels together, so these keep resolving wherever
      it's copied.
    - **Into the node-boot monorepo itself** — a package/starter/server `README.md`,
      `CONTRIBUTING.md`, `USAGE_GUIDE.md`, or any sample project source file — use an **absolute
      GitHub blob URL pinned to `main`**, e.g.
      `https://github.com/nodejs-boot/node-boot/blob/main/starters/persistence/README.md`. A
      relative path like `../../../starters/persistence/README.md` only resolves while the skill
      lives inside the node-boot monorepo checkout; it 404s once copied into a consumer app's own
      repo, which is the primary intended use case for this skill family.
5. **Orchestrator → concrete pattern:** families with several members (starters, HTTP servers,
   serverless servers) have a parent "router" skill (e.g. `nodeboot-starters`,
   `nodeboot-servers-http`, `nodeboot-servers-serverless`) whose entire job is:
    - understand intent (which starter / which framework / which cloud),
    - state a one-line "use when" for each concrete option,
    - tell the agent exactly which concrete skill directory to open next.
      Orchestrators **never** inline framework-specific detail — that belongs in the concrete skill.
      This keeps the always-scanned frontmatter (and the router body itself) tiny, so an agent only
      ever loads the one concrete skill it actually needs.
6. **Close the loop:** every concrete (non-orchestrator) skill ends with a short **Validate**
   section naming the exact command (usually a `pnpm` script) and/or sample project an agent can
   use to confirm a change actually works.
7. **Adding a new skill:** if it's a new starter package, follow
   [`nodeboot-starters/resources/authoring-a-starter-skill.md`](nodeboot-starters/resources/authoring-a-starter-skill.md)
   and register it in `nodeboot-starters/SKILL.md`'s routing table. If it's a new server/serverless
   adapter, mirror the closest existing concrete server skill and register it in the matching
   orchestrator (`nodeboot-servers-http` or `nodeboot-servers-serverless`).

## Inventory

The tables below list every skill currently in this family, grouped the same way the skills
themselves are organized (foundational, then each orchestrator with its concrete children). Router
("orchestrator") skills are marked accordingly.

### Foundational

| Skill                         | Role                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| `nodeboot-project-type`       | Simple repo vs. monorepo — decide overall project shape before scaffolding anything else |
| `nodeboot-core`               | `@nodeboot/core` decorator model — the entry point every app starts from                 |
| `nodeboot-best-practices`     | Project conventions distilled across sample apps                                         |
| `nodeboot-extending-nodeboot` | Contributing to/extending Node-Boot itself (mirrors `CONTRIBUTING.md`)                   |

### Starters (`nodeboot-starters` orchestrator)

| Skill                                  | Role                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| `nodeboot-starters` (orchestrator)     | Router → picks the right concrete `@nodeboot/starter-*` skill                  |
| `nodeboot-starter-actuator`            | Spring-Boot-style health checks, readiness/liveness probes, Prometheus metrics |
| `nodeboot-starter-aws`                 | Conditional AWS SDK v3 clients (S3, SQS, SNS, DynamoDB, Secrets Manager)       |
| `nodeboot-starter-backstage`           | Backstage `CatalogClient`/`PluginDiscoveryService` integration                 |
| `nodeboot-starter-firebase`            | Firebase Admin (auth, Firestore, storage, messaging, ML, remote config)        |
| `nodeboot-starter-http`                | Outbound Axios-backed HTTP clients via `@EnableHttpClients()`/`@HttpClient`    |
| `nodeboot-starter-openai`              | Injectable OpenAI/compatible client via `@EnableOpenAI()`                      |
| `nodeboot-starter-openapi`             | OpenAPI 3 spec generation + optional Swagger UI                                |
| `nodeboot-starter-persistence`         | TypeORM-backed persistence, datasources, `@DataRepository`, `@Transactional`   |
| `nodeboot-starter-persistence-sql`     | SQL flavour (Postgres/MySQL/MariaDB/SQLite/MSSQL/Oracle/CockroachDB/Aurora)    |
| `nodeboot-starter-persistence-mongodb` | MongoDB flavour (`@ObjectIdColumn`, `MongoRepository`, cursor paging)          |
| `nodeboot-starter-scheduler`           | Cron-based background jobs via `@EnableScheduling()`/`@Scheduler`              |
| `nodeboot-starter-supabase`            | Injectable `SupabaseClient` via `@EnableSupabase()`                            |
| `nodeboot-starter-validation`          | Request DTO validation with `class-validator` via `@EnableValidations()`       |

### HTTP servers (`nodeboot-servers-http` orchestrator)

| Skill                                  | Role                                                                        |
| -------------------------------------- | --------------------------------------------------------------------------- |
| `nodeboot-servers-http` (orchestrator) | Router → picks the right long-lived HTTP framework adapter                  |
| `nodeboot-server-express`              | `ExpressServer`/`ExpressDriver` — broadest middleware ecosystem             |
| `nodeboot-server-fastify`              | `FastifyServer`/`FastifyDriver` — plugins, hooks, high throughput           |
| `nodeboot-server-koa`                  | `KoaServer`/`KoaDriver` — async-first middleware style                      |
| `nodeboot-server-hono`                 | `HonoServer`/`HonoDriver` — Web Standards (Fetch API) based, ultrafast      |
| `nodeboot-server-native-http`          | `HttpServer`/`HttpDriver` — zero framework dependency, find-my-way routing  |
| `nodeboot-server-encore`               | `EncoreServer`/`EncoreDriver` — Encore.ts cloud infra & observability       |
| `nodeboot-server-ghost`                | `GhostServer`/`GhostDriver` — no real HTTP transport (CLI/worker/embedding) |

### Serverless servers (`nodeboot-servers-serverless` orchestrator)

| Skill                                        | Role                                                                          |
| -------------------------------------------- | ----------------------------------------------------------------------------- |
| `nodeboot-servers-serverless` (orchestrator) | Router → picks the right cloud/FaaS adapter                                   |
| `nodeboot-server-lambda`                     | AWS Lambda behind API Gateway or a Function URL (`LambdaServer.getHandler()`) |
| `nodeboot-server-cloudflare`                 | Cloudflare Workers Fetch API adapter (`CloudflareServer.getHandler()`)        |
| `nodeboot-server-vercel`                     | Vercel Node.js Serverless Function (`api/[...path].ts`)                       |
| `nodeboot-server-netlify`                    | Netlify Functions catch-all (`netlify/functions/api.ts`)                      |
| `nodeboot-server-google-cloud-functions`     | Google Cloud Functions gen2 HTTP function                                     |

### Desktop servers

| Skill                      | Role                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------- |
| `nodeboot-servers-desktop` | Placeholder/pioneering guide for Electron/Tauri embedding (no adapters published yet) |

### Runtimes (`nodeboot-runtimes` orchestrator)

| Skill                              | Role                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------- |
| `nodeboot-runtimes` (orchestrator) | Router → picks the right process runtime/manager                          |
| `nodeboot-runtime-pm2`             | PM2 clustering, zero-downtime reload, log management, pm2.io monitoring   |
| `nodeboot-runtime-platformatic`    | Platformatic Watt hot reload, management API, multi-service orchestration |

### Testing (`nodeboot-test-framework` base + router)

| Skill                                   | Role                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------- |
| `nodeboot-test-framework` (base/router) | `@nodeboot/node-test` base — `useNodeBoot()`, mocks, config/env overrides, HTTP calls |
| `nodeboot-test-sql`                     | SQL persistence testing — in-memory sqlite vs. real DB via testcontainers, migrations |
| `nodeboot-test-mongodb`                 | MongoDB testing — `useMongoMemoryServer`/`useMongoMemoryReplSet`/`useMongoContainer`  |
| `nodeboot-test-containers`              | Generic Docker containers via `useGenericContainer` (Redis, sidecars, Postgres/MySQL) |
| `nodeboot-test-network-resilience`      | Network-fault injection (latency, jitter, bandwidth, breaks) via `useToxiproxy`       |
| `nodeboot-test-performance`             | Time-budget assertions via `usePerformanceBudget`                                     |

## Publishing and installing with the skills CLI

This skill family is also distributable through [skills.sh](https://www.skills.sh/), the open
agent-skills ecosystem, using the [`skills` CLI](https://github.com/vercel-labs/skills)
(`vercel-labs/skills`). It works with any Git host (GitHub, GitLab, or a local path) and over 70
supported agents, including GitHub Copilot CLI.

### Installing this skill family

From a consumer app repo (not this monorepo), install directly from GitHub:

```bash
# Install every skill in this family into the current project
npx skills add nodejs-boot/node-boot --skill '*' -a copilot-cli

# Or point at the skills subdirectory directly
npx skills add https://github.com/nodejs-boot/node-boot/tree/main/.agents/skills --all

# Install just a few skills
npx skills add nodejs-boot/node-boot --skill nodeboot-core --skill nodeboot-starters -a copilot-cli

# Install globally (user directory) instead of per-project
npx skills add nodejs-boot/node-boot --skill '*' -g -a copilot-cli

# List what's available without installing
npx skills add nodejs-boot/node-boot --list
```

Use a skill one-off without installing it (generates a prompt, or drives an agent interactively):

```bash
npx skills use nodejs-boot/node-boot@nodeboot-core | copilot
npx skills use nodejs-boot/node-boot --skill nodeboot-core --agent copilot-cli
```

### Publishing updates

There is no separate "publish" step — `skills.sh` and the CLI resolve skills straight from this
Git repository. To ship an update to consumers:

1. Edit the relevant `SKILL.md`/`resources/*.md` under `.agents/skills/` following the
   [Conventions](#conventions) above, and update this README's inventory if you added, removed, or
   renamed a skill.
2. Merge to `main` — `npx skills add nodejs-boot/node-boot ...` always resolves the latest commit
   on the default branch (or a specific ref if the consumer pinned one).
3. Consumers re-run `npx skills add nodejs-boot/node-boot --skill '*' -y` (or their original
   install command) to pull the update; `skills` diffs and re-links/copies changed files.
4. Optionally add an install-count badge to this README or the top-level project README:
    ```md
    [![skills.sh](https://skills.sh/b/nodejs-boot/node-boot)](https://skills.sh/nodejs-boot/node-boot)
    ```

See the CLI's own docs for private-repo auth, `--copy` vs. symlink installs, and the full list of
supported agents/options: [github.com/vercel-labs/skills](https://github.com/vercel-labs/skills).
