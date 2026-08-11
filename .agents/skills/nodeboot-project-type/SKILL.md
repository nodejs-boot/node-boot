---
name: nodeboot-project-type
description: Use before scaffolding any brand-new Node-Boot project, or when asked whether a repo should be "a simple repo" vs "a monorepo"/"microservices" — decides between a single standalone app repo and a Turborepo/pnpm monorepo of multiple interconnected services, and points to a production-grade reference repo for each. Load this first, before nodeboot-servers-http/-serverless or nodeboot-starters, whenever there's no repo yet or the user is deciding overall project shape.
---

# Node-Boot project type: simple repo vs. monorepo

This is a **structural** decision, separate from (and prior to) picking a server adapter or
starters — make it first for any brand-new project. Node-Boot itself doesn't force either shape;
both are just conventions demonstrated by full, production-grade reference repos (not the minimal
`samples/*` in the node-boot monorepo, which only demonstrate one adapter/feature in isolation).

## Decide

Ask: **does this project deploy as one service, or several independently-deployable services that
talk to each other?**

-   **One deployable app** (a single API, regardless of how many features/starters it uses) →
    **simple repo**.
-   **Multiple services** that each have their own `app-config.yaml`, own database, own deploy
    pipeline, and call each other over HTTP (or need shared workspace tooling — lint/tsconfig/CI —
    across services) → **monorepo**.

Default to the simple repo unless the user has explicitly described more than one service/database
or inter-service communication — don't monorepo-ify a single-service app pre-emptively.

## Path A — Simple repo

Reference: [`nodejs-boot/sample-native-http`](https://github.com/nodejs-boot/sample-native-http) —
a single Node-Boot app (native `node:http` adapter) with the full standard toolchain: ESLint +
Prettier, Jest, TypeORM migrations, YAML config with local overrides, AOT compilation, and the
standard `pnpm` script set (`dev`, `build`, `lint`, `format`, `test`, `typecheck`,
`nodeboot:update`). Use this as the standards baseline for _any_ single-app repo, whichever server
adapter it actually needs (swap the adapter per `nodeboot-servers-http`/`nodeboot-servers-serverless`
— the toolchain/scripts/config conventions stay the same).

```sh
npx degit nodejs-boot/sample-native-http <new-app-name>
cd <new-app-name>
pnpm install
```

Then follow the target server/serverless adapter's own skill (`nodeboot-server-*`) to swap in the
right driver if it isn't native HTTP, and `nodeboot-starters` for any feature starters needed.

## Path B — Monorepo (multiple services)

Reference:
[`nodejs-boot/sample-microservices-monorepo`](https://github.com/nodejs-boot/sample-microservices-monorepo)
— three interconnected services (account/user/statistics) under `services/*`, each an independent
Node-Boot app with its own `app-config.yaml`, `Dockerfile`, and MongoDB database, wired together with
declarative `@HttpClient`s. Root-level Turborepo (`turbo.json`) + `pnpm-workspace.yaml` orchestrate
shared `build`/`test`/`lint`/`tsc` scripts across all services; Changesets manage versioning.

```sh
npx degit nodejs-boot/sample-microservices-monorepo <new-monorepo-name>
cd <new-monorepo-name>
pnpm install
```

Then, per service:

1. Copy `services/<template-service>/` as the starting point for each new service (rename its
   `app-config.yaml` `app.name`/`port`, `package.json` `name`, and `Dockerfile` as needed) rather
   than hand-rolling a new service from scratch.
2. Each service still follows `nodeboot-server-*`/`nodeboot-starters` skills individually — the
   monorepo only changes _where_ services live and how they share tooling, not how a single
   service is built.
3. Wire inter-service calls with `@HttpClient` (see `nodeboot-starter-http`), following the
   account→user/statistics pattern in the reference repo.

## Existing repo?

Don't guess — check for a root `turbo.json` **and** a `pnpm-workspace.yaml` with more than one
service-like package directory: that's a monorepo. A single `package.json` with its own `src/` and
no workspace config is a simple repo. Either way, see
[`../_shared/fresh-vs-existing.md`](../_shared/fresh-vs-existing.md) once you've identified which
service (or the one app) you're actually changing.

## Validate

After scaffolding, run the reference repo's own `pnpm install && pnpm dev` (simple repo) or
`pnpm install && pnpm build && pnpm dev` (monorepo, builds shared deps first) to confirm the
skeleton boots before adding real code.
