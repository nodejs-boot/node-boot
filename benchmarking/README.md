# Node-Boot Benchmarking

A standalone benchmarking suite that answers two questions:

1. **What overhead does Node-Boot add** on top of the raw HTTP framework it wraps (Express,
   Fastify, Koa, native `http`)?
2. **How does the same Node-Boot application perform across different deployments** — long-lived
   HTTP server vs. serverless/edge platforms?

> This folder is a member of the root node-boot **pnpm + Turborepo monorepo** (see the root
> `pnpm-workspace.yaml`) and the `apps/nodeboot-*` apps depend on `@nodeboot/*` packages via the
> `workspace:*` protocol. That means every benchmark run always builds against the current,
> uncommitted `packages/*`/`servers/*` source — so this suite doubles as a **pre-release
> regression gate**: run it before publishing a `@nodeboot/core`/driver change to check whether
> throughput regressed vs. the last recorded run in `results/history/`. See
> [Extracting this into its own repo](#extracting-this-into-its-own-repo) for how to go back to
> published-version-only dependencies if this ever needs to be split out standalone.

## Methodology

### Why new minimal apps instead of `samples/*`?

The existing `samples/sample-express`, `sample-fastify`, `sample-koa`, `sample-native-http`, etc.
are great **feature** demos, but they aren't comparable to each other for load testing: they each
enable a different mix of starters (persistence, OpenAPI, actuator, validation, authorization...),
so any throughput difference between them would be dominated by _which starters are enabled_, not
by _which HTTP framework/adapter is used_. To isolate the two questions above, this suite instead
uses purpose-built minimal apps that mirror `samples/*` conventions exactly, but with a fixed,
matching feature set across the whole family:

-   **`apps/raw-*`** — the bare framework (Express/Fastify/Koa/native `http`), no Node-Boot at all,
    structured the way that framework's own community/docs recommend for a small REST API (see
    [Raw apps](#raw-apps-community-idiomatic) below).
-   **`apps/nodeboot-*`** — the same routes/behaviour, built by following the real Node-Boot
    conventions from the `nodeboot-core` and `nodeboot-starter-persistence-sql` skills (mirroring
    `samples/sample-express`'s persistence layer): `@Controller`/`@Get`/`@Post` decorators, the
    matching `@nodeboot/*-server` adapter, `@EnableDI` + `@EnableRepositories()`, a real
    `@DataRepository` + TypeORM entity, and `app-config.yaml`-driven configuration — **not** a
    hand-rolled shortcut.

**No code is shared between apps.** Each app under `apps/` is a fully independent, self-contained
package with its own copy of the entity/repository/service/controller/routing code. This is
intentional: it keeps each app representative of what a real project in that ecosystem looks like,
and avoids a shared abstraction layer quietly absorbing (or hiding) framework-specific overhead.

Every app exposes the same four routes, backed by a real PostgreSQL database via TypeORM (chosen
over SQLite because `better-sqlite3` is a synchronous, event-loop-blocking driver — under
concurrent load its write-lock contention dominates measured latency/throughput, drowning out the
very Node-Boot-vs-raw differences this suite exists to measure). Every app connects to the same
local Postgres instance (started via `docker compose`, see below) but each owns its own database,
so apps never share or leak state between runs:

| Route        | Method | Behaviour                                                                  |
| ------------ | ------ | -------------------------------------------------------------------------- |
| `/hello`     | GET    | No DB access — pure framework/routing overhead                             |
| `/todos`     | GET    | List (SELECT ... LIMIT 20, ORDER BY id DESC) from a 1,000-row `todo` table |
| `/todos/:id` | GET    | Single-row SELECT by primary key                                           |
| `/todos`     | POST   | Single-row INSERT                                                          |

### Raw apps (community-idiomatic)

Each `apps/raw-*` app uses **TypeORM directly** (same ORM/driver Node-Boot uses under the hood) so
that the raw-vs-nodeboot comparison isolates Node-Boot's own routing/DI/lifecycle overhead, rather
than mixing in a different ORM's overhead. Structure follows each ecosystem's own conventions:

| App           | Pattern                                                                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `raw-express` | `express.Router()` per resource, a `data-source.ts` TypeORM module, centralized 4-arg error-handling middleware (TypeORM's own Express quick-start pattern)  |
| `raw-fastify` | `fastify-plugin`-wrapped ORM decorator plugin (`fastify.orm`), one route plugin per resource, registered via `fastify.register(...)`                         |
| `raw-koa`     | `@koa/router` per resource with its own `prefix`, `koa-bodyparser`, try/catch error-handling middleware registered first (Koa has no built-in error handler) |
| `raw-http`    | Manual method + `URL` pathname matching in a single request handler — the standard zero-dependency Node.js pattern                                           |

### Node-Boot apps

Each `apps/nodeboot-*` app follows the exact same shape as `samples/sample-express`'s persistence
layer: a `Todo` TypeORM entity, a `TodoRepository` via `@DataRepository(Todo)`, a `TodoService`
that seeds 1,000 rows on boot if the table is empty, and `HelloController`/`TodoController` classes
using `@Controller`/`@Get`/`@Post`. `app.ts` uses `@EnableDI(Container)` + `@EnableRepositories()`
plus explicit side-effect imports of the repository (no `@nodeboot/aot`/`@EnableComponentScan()`,
since these are small single-file-per-concern apps — see `samples/sample-cloudflare` for the same
explicit-import pattern). Only the persistence starter is enabled, keeping the comparison to
"Node-Boot core + persistence overhead", not muddied by other starters (OpenAPI, actuator, etc).

### What this suite does NOT (yet) cover

-   **Ghost server** (no HTTP listener) and **Encore** (requires the Encore cloud runtime) are not
    part of the raw-throughput tier for that reason; they're better suited to the deployment tier
    below if/when needed.

## Layout

```
benchmarking/
  apps/raw-http/               Plain node:http + TypeORM baseline (own copy of entity/routes)
  apps/raw-express/             Plain Express + TypeORM baseline (own copy of entity/routes)
  apps/raw-fastify/             Plain Fastify + TypeORM baseline (own copy of entity/routes)
  apps/raw-koa/                 Plain Koa + TypeORM baseline (own copy of entity/routes)
  apps/nodeboot-http/           Node-Boot on @nodeboot/http-server + @nodeboot/starter-persistence
  apps/nodeboot-express/        Node-Boot on @nodeboot/express-server + @nodeboot/starter-persistence
  apps/nodeboot-fastify/        Node-Boot on @nodeboot/fastify-server + @nodeboot/starter-persistence
  apps/nodeboot-koa/            Node-Boot on @nodeboot/koa-server + @nodeboot/starter-persistence
  docker-compose.yaml           Single Postgres instance shared by every app (one DB per app)
  docker/init-databases.sh      Creates the 8 per-app databases on first container boot
  tools/runner/                autocannon-based CLI (bench.mjs) -> results/<app>__<endpoint>.json
  tools/report/                Aggregates results/*.json -> results/REPORT.md + results/REPORT.html,
                                archives every run into results/history/
  scripts/run-all.sh           Resets Postgres, builds + benchmarks every app serially, generates the report
  results/                     Latest run's JSON + REPORT.md/html (git-ignored, regenerated every run)
  results/history/             Archived reports, one folder per run (tracked in git for comparison)
```

Every app listens on its own **fixed port** (no shared `$PORT` env var) and its own **fixed
Postgres database** (same instance, different `database` name), so any app can be started
standalone for manual testing without colliding with another:

| App                | Port | Database           |
| ------------------ | ---- | ------------------ |
| `raw-http`         | 4001 | `raw_http`         |
| `raw-express`      | 4002 | `raw_express`      |
| `raw-fastify`      | 4003 | `raw_fastify`      |
| `raw-koa`          | 4004 | `raw_koa`          |
| `nodeboot-http`    | 4011 | `nodeboot_http`    |
| `nodeboot-express` | 4012 | `nodeboot_express` |
| `nodeboot-fastify` | 4013 | `nodeboot_fastify` |
| `nodeboot-koa`     | 4014 | `nodeboot_koa`     |

## Running the HTTP-server tier locally

Requires Node.js >= 18, pnpm >= 8, `curl` (used by the orchestrator to wait for readiness), and
Docker (for the shared benchmark Postgres instance — `docker compose` must be available; on macOS
this can be [Colima](https://github.com/abiosoft/colima) + `docker`/`docker-compose`, or Docker
Desktop).

Install/build from the **repo root** (this is now a regular workspace member, not a separate
install root):

```bash
pnpm install                # from the node-boot repo root
pnpm run bench:all          # root script: builds packages/servers deps + all benchmark apps, runs the suite
# or, equivalently, from this folder:
cd benchmarking && pnpm run bench:all
```

`pnpm run bench:all` (`scripts/run-all.sh`) automatically runs `docker compose down -v && docker
compose up -d --wait` before the first app starts, so every run begins from a completely fresh
Postgres instance (all 8 databases recreated empty), then truncates+reseeds each app's table right
before it starts — mirroring the old "delete the sqlite file" full-reset behaviour. If you'd rather
manage Postgres yourself, start it once with `docker compose up -d` from this folder and it'll be
reused (`down -v` in the script will still reset it on the next `bench:all` run).

Because `apps/nodeboot-*` depend on `@nodeboot/*` via `workspace:*`, `pnpm run bench:all` always
measures the current local source of `packages/*`/`servers/*` — including any uncommitted changes
— not the last published npm release.

Tune load with env vars: `BENCH_DURATION` (seconds, default 10), `BENCH_CONNECTIONS` (default 50).
Each app's port is fixed (see the table above), so there's no `BENCH_PORT` to configure.

To benchmark a single already-running app manually (make sure `docker compose up -d --wait` has
been run first):

```bash
cd apps/nodeboot-express && pnpm build && pnpm start   # starts on its fixed port, e.g. 4012
node tools/runner/bench.mjs --url http://localhost:4012/hello --app nodeboot-express --endpoint hello
node tools/report/aggregate.mjs
```

`results/REPORT.md`/`results/REPORT.html` include, per endpoint, a req/sec + latency (p50/p99)
table for every app, plus a **"Node-Boot overhead vs raw framework"** delta table pairing
`raw-<x>` with `nodeboot-<x>`. `REPORT.html` additionally renders inline SVG bar charts (no
internet/CDN required) for a quick visual comparison.

### Comparing runs over time

Every time `tools/report/aggregate.mjs` runs (via `pnpm run bench:all` or standalone), it archives
the run's raw JSON + both reports into `results/history/<nodeboot-version>__<timestamp>/`, and adds
a row to `results/history/index.md` linking to it. The Node-Boot version is resolved from the
actual installed `@nodeboot/core` package (not just the semver range in `package.json`), so
re-running after a `pnpm update` of `@nodeboot/*` produces a distinct, labeled entry you can diff
against previous runs — e.g. to check whether a Node-Boot release regressed or improved throughput.
Unlike `results/REPORT.*` (regenerated — and git-ignored — on every run), `results/history/` is
tracked in git so past runs stay available for comparison.

## Deployment / serverless comparison tier

Comparing **how Node-Boot behaves across deployments** (long-lived server vs. Lambda vs.
Cloudflare Workers vs. Vercel vs. Netlify vs. Google Cloud Functions) is a different kind of
benchmark — it's dominated by cold starts, cloud region, and platform-specific cost/latency
characteristics, not by code in this repo. Rather than duplicating each adapter here, **reuse the
existing production-grade samples**, since they already implement every adapter correctly:

| Deployment                                        | Sample to deploy as-is                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------------------ |
| Long-lived HTTP (Express/Fastify/Koa/native http) | `samples/sample-express`, `sample-fastify`, `sample-koa`, `sample-native-http` |
| AWS Lambda                                        | `samples/sample-lambda`                                                        |
| Cloudflare Workers                                | `samples/sample-cloudflare`                                                    |
| Vercel                                            | `samples/sample-vercel`                                                        |
| Netlify Functions                                 | `samples/sample-netlify`                                                       |
| Google Cloud Functions                            | `samples/sample-google-cloud-functions`                                        |
| Encore.ts                                         | `samples/sample-encore`                                                        |

Workflow:

1. Deploy each sample to its target platform following that sample's own README.
2. Point `tools/runner/bench.mjs` at the deployed URL instead of `localhost`:
    ```bash
    node tools/runner/bench.mjs --url https://<your-lambda-url>/api/hello --app deploy-lambda --endpoint hello
    ```
3. Run `node tools/report/aggregate.mjs` to fold the deployment results into the same
   `results/REPORT.md` alongside the local HTTP-server tier (use distinct `--app` names, e.g.
   `deploy-lambda`, `deploy-cloudflare`, so they don't collide with the local raw/nodeboot pairs).
4. For cold-start specifically (serverless platforms only), run a single request after a period of
   inactivity and record wall-clock time separately — `autocannon`'s steady-state req/sec is not a
   meaningful cold-start metric.

## Extracting this into its own repo

This folder now lives in the root pnpm workspace and `apps/nodeboot-*` depend on `@nodeboot/*` via
`workspace:*`, which is what lets `pnpm run bench:all` measure local/uncommitted core changes
before a release. If this ever needs to become a standalone repo again, that trade-off has to be
reversed first:

1. Rewrite every `workspace:*` dependency in `apps/nodeboot-*/package.json` back to a published
   semver range (e.g. `"@nodeboot/core": "^1.16.3"`, matching the version you want to pin against).
2. Add back a scoped `pnpm-workspace.yaml` (`packages: [apps/*, tools/*]`) and `turbo.json` inside
   `benchmarking/`, and remove the `benchmarking`/`benchmarking/apps/*`/`benchmarking/tools/*`
   entries from the root `pnpm-workspace.yaml`.
3. Split the folder out:
    ```bash
    git subtree split --prefix=benchmarking -b nodeboot-benchmarking
    # push that branch to a new, empty repository
    ```

After step 1, `pnpm install` in the extracted repo will pull the pinned published versions from
the npm registry instead of linking local source.
