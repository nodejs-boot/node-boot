# AGENTS.md

Instructions for AI coding agents (GitHub Copilot CLI, Claude, etc.) working in this repository.

## What this repo is

Node-Boot is a Spring Boot–style framework for Node.js: decorators, dependency injection,
auto-configuration, and a pluggable server engine. It's a **pnpm + Turborepo monorepo** with these
top-level layers:

-   `packages/*` — the framework core (`core`, `engine`, `context`, `di`, ...).
-   `starters/*` — opt-in feature starters (`persistence`, `validation`, `scheduler`, `openapi`,
    `actuator`, `aws`, `firebase`, `supabase`, `openai`, `backstage`, `http`, ...).
-   `servers/*` — long-lived HTTP server adapters (Express, Fastify, Koa, native `http`, Encore.ts)
    plus the no-HTTP `GhostServer`.
-   `serverless/*` — FaaS adapters (AWS Lambda, Cloudflare Workers, Vercel, Netlify Functions,
    Google Cloud Functions).
-   `samples/*` — one runnable sample app per server/serverless adapter (and a MongoDB persistence
    variant), used both as manual test beds and as scaffolds for new apps.
-   `tests/*` — cross-package integration tests.

## Setup & validation commands

```sh
pnpm install
pnpm dev            # builds & watches every package with Turborepo + Nodemon
```

Before finishing any change, run the same checks CI/PR review expects:

```sh
pnpm lint-format    # lint + format check
pnpm tsc            # type-check every package
pnpm test           # full test suite
```

Fix any failures before considering a task done — don't leave the tree red. Commit messages must
follow [Conventional Commits](https://www.conventionalcommits.org/).

## Where to find deeper guidance

This repo ships an [Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
family at [`.agents/skills/`](.agents/skills/README.md) — load it for anything task-specific:
writing controllers/decorators, adding a starter, choosing/scaffolding a server or serverless
adapter, persistence with SQL vs MongoDB, best practices, or extending the framework itself
(new starters, new server adapters). Start with
[`.agents/skills/README.md`](.agents/skills/README.md) for the full inventory and conventions.

The skill family is self-contained and portable — it's designed to also be copied into apps built
_with_ Node-Boot in other repos, so within it links to this monorepo use absolute GitHub URLs
rather than relative paths.

For human-oriented depth beyond the skills, see [`README.md`](README.md) (architecture, quick
start, samples) and [`CONTRIBUTING.md`](CONTRIBUTING.md) (contribution flavours, PR checklist).

## Conventions to respect

-   Don't duplicate documentation — link to the relevant package `README.md`, starter README, or
    sample instead of copy-pasting.
-   Keep changes scoped to the package(s) you're touching; most packages/starters/servers have their
    own `README.md` and tests — update them alongside code changes.
-   New starters/servers follow existing patterns in their category (see
    [`.agents/skills/nodeboot-extending-nodeboot/SKILL.md`](.agents/skills/nodeboot-extending-nodeboot/SKILL.md)).
