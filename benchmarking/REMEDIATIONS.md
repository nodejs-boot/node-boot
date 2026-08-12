# Node-Boot HTTP overhead — findings & remediations

This document captures the results of a source-level performance investigation triggered by the
benchmarking suite (`benchmarking/results/REPORT.md`), which showed Node-Boot adding ~25–70%
throughput overhead vs. the raw framework it wraps, worst on routing-only endpoints (`/hello`) and
on the native `http` adapter under DB load. It records **what was found**, **what we're fixing**,
and **how we're changing the benchmarking setup** so this class of regression is caught
automatically before a `@nodeboot/*` release instead of after.

Status legend: 🔲 not started · 🟡 in progress · ✅ done · 🚫 won't fix (documented reason)

## 1. Findings (root causes, ordered by impact)

### 1.1 Deep async call-chain per request — affects all adapters, dominates `/hello`

`NodeBootEngine.executeAction → handleCallMethodResult → handleResult → driver.handleSuccess`,
plus `ActionParameterHandler.handle → normalizeParamValue → handleValue` per parameter, is a chain
of separate `async` functions each with their own `try/catch` and `await`. Even a zero-DB `/hello`
request pays for several microtask ticks and Promise allocations a raw handler doesn't. This is a
mostly-fixed per-request tax, which is why the overhead is worst on `/hello` (routing/DI only) and
shrinks once real I/O dominates (e.g. Express: -71.8% → +9.6% from `hello` to `todos-create`).

-   Files: `packages/engine/src/core/NodeBootEngine.ts`, `packages/engine/src/handler/ActionParameterHandler.ts`
-   Status: 🚫 **Won't fix in this pass** — flattening this safely (without breaking interceptor/error
    semantics) is a bigger refactor with real regression risk. Documented here for future work;
    revisit once the cheaper fixes below are measured.

### 1.2 Param metadata re-sorted on every single request

```ts
// packages/engine/src/core/NodeBootEngine.ts — executeAction()
const paramsPromises = actionMetadata.params
    .sort((param1, param2) => param1.index - param2.index)
    .map(param => this.parameterHandler.handle(action, param));
```

`.sort()` runs on **every request** instead of once at route-registration time. The array is
static after boot — this is pure wasted work (comparator calls + potential re-ordering) on the hot
path of every single controller action.

-   Files: `packages/context/src/metadata/ActionMetadata.ts` (`build()`), `packages/engine/src/core/NodeBootEngine.ts` (`executeAction()`)
-   Fix: sort `params` once inside `ActionMetadata.build()` and store the sorted array; drop the
    `.sort()` call from `executeAction()` (keep `.map()` only).
-   Status: ✅ **Implemented**. Zero-behavior-change; too small to isolate its own delta in the
    noisy benchmark numbers, but removes wasted work from the hot path of every request.

### 1.3 Express adapter doubles Express's own routing cost

`ExpressDriver.registerAction` always registers an extra `routeGuard` middleware **layer** in front
of every route handler, purely to dedupe the Express HEAD→GET double-dispatch / multi-route-match
edge case:

```ts
this.app[actionMetadata.type.toLowerCase()](
    ...[route, routeGuard, ...beforeMiddlewares, ...defaultMiddlewares, routeHandler, ...afterMiddlewares],
);
```

Express's own middleware/layer matching is already the most expensive part of its request
lifecycle, and this unconditionally **doubles** that specific cost for every route on every
request — explaining why Express shows the worst `/hello` delta (-71.8%) of the four adapters,
much worse than Fastify/Koa/native `http` (-25% to -37%), none of which add an equivalent extra
layer.

-   Files: `servers/express-server/src/driver/ExpressDriver.ts` (`registerAction()`)
-   Fix: fold the dedupe check into the `routeHandler` function itself (single layer) instead of a
    separate middleware, e.g. check-and-set `request.routingControllersStarted` at the top of
    `routeHandler` before calling `executeCallback`.
-   Status: ✅ **Implemented**. Removed the standalone `routeGuard` middleware; the dedupe check now
    runs inline at the top of `routeHandler`, so the common case (a request matches exactly once)
    no longer pays for an extra Express layer dispatch. Trade-off: on the rare double-dispatch edge
    cases (HEAD→GET, multiple matching routes), `beforeMiddlewares`/body-parser may now run twice
    before being short-circuited, but the controller action itself still only ever executes once —
    preserving the original "no double response" guarantee.
    **Validated**: `nodeboot-express` `/hello` overhead vs `raw-express` improved consistently across
    3 runs: -71.8% → -24.9%, -24.8%, -25.3% (roughly a 3x reduction in relative overhead on the
    routing-only endpoint).

### 1.4 `class-transformer`/`class-validator` cost on the response/param path

`ResultTransformer.transformResult` (`instanceToPlain`) and `ActionParameterHandler.transformValue` /
`validateValue` (`plainToInstance` / `validateOrReject`) run reflection-heavy work whenever
`useClassTransformer` / `enableValidation` are on and the payload is a TypeORM entity (true for all
`/todos*` routes in the benchmark). This is shared engine cost — not adapter-specific — which is
why the DB-route overhead is _consistently_ ~15–35% across **all four** adapters, unlike the wildly
adapter-dependent `/hello` overhead.

-   Files: `packages/engine/src/handler/ResultTransformer.ts`, `packages/engine/src/handler/ActionParameterHandler.ts`
-   Fix (future): allow opting out per-route more cheaply, and/or skip `instanceToPlain` when the
    result is already a plain object (no class prototype), avoiding `class-transformer`'s reflection
    path entirely for the common "return a plain DTO" case.
-   Status: 🚫 **Won't fix in this pass** — behavior-sensitive (affects serialization semantics for
    every app using class-transformer); needs its own test coverage pass first.

### 1.5 `http-server` adapter: eager debug-log string construction on every request

`HttpDriver.registerAction`'s route handler calls `this.logger.debug(...)` **twice** per request
(before/after), building a full template literal (`req.socket.remoteAddress`,
`req.headers["user-agent"]`, method, url) plus two `process.hrtime()` calls — **unconditionally**,
even when the configured log level (`warn` in the benchmark apps) means the message is discarded
inside `debug()`. This is the only adapter with this pattern (verified against
express/fastify/koa/encore drivers — encore has the same issue, the others don't), and it lines up
with `http-server` being the _only_ adapter whose relative overhead **grows** with DB load (-33% →
-54%) instead of shrinking like the other three.

-   Files: `servers/http-server/src/driver/HttpDriver.ts` (`registerAction()`), and the same pattern
    in `servers/encore-server/src/driver/EncoreDriver.ts`
-   Fix: guard the string construction behind a cheap `logger` level check (add
    `isLevelEnabled(level)` or equivalent to `LoggerService`, or make the call lazy) so the
    interpolation/`hrtime()` cost is only paid when debug logging is actually enabled.
-   Status: ✅ **Implemented**. Added optional `isLevelEnabled?(level: string): boolean` to the
    `LoggerService` interface (`packages/context/src/services/LoggerService.ts`); winston's
    `Logger` already implements this structurally, so no change was needed at the logger
    construction site. Both `HttpDriver.registerAction()` and `EncoreDriver.registerAction()` now
    check `isLevelEnabled("debug")` once per request and skip all string interpolation/`hrtime()`
    calls entirely when debug logging is off.
    **Validated**: across 3 repeated benchmark runs (`BENCH_DURATION` 10s/10s/20s) after the fix,
    `nodeboot-http`'s overhead vs `raw-http` improved consistently:
    -   `/hello`: -33.1% → -7.2%, -7.5%, -3.1%
    -   `/todos/:id`: -41.1% → -5.9%, -6.5%, -7.0%
    -   `/todos` (list): -19.9% → +5.2%, +2.7%, +27.8%
    -   `/todos` (POST): -54.1% → +1.4%, +1.1%, -5.9% (previously the _worst_ delta of the 4 adapters,
        now roughly on par with raw `http`)

## 2. Fix implementation order

1. ✅ `1.5` http-server (and encore-server) eager debug logging — cheapest, highest expected payoff
   given it's the outlier adapter. **Implemented and validated** (see §4).
2. ✅ `1.2` param sort caching — trivial, zero behavior change, applies to all adapters. **Implemented**.
3. ✅ `1.3` Express routeGuard merge — removes one full Express middleware layer per request.
   **Implemented and validated** (see §4).
4. 🚫 `1.1`, `1.4` — documented, deferred (larger refactors, need dedicated test coverage first).

After each fix: rebuild the affected `@nodeboot/*` packages and re-run
`pnpm run bench:all` in `benchmarking/`, then diff `results/REPORT.md` against
`results/history/` to confirm the overhead delta improved with zero new errors/regressions.

## 3. Validation checklist

-   [x] `pnpm run bench:all` runs clean (0 errors on `hello`/`todos-get`/`todos-list`) after the
        monorepo migration, proving `workspace:*` linking works end-to-end.
-   [x] Re-ran benchmark 3x after fixes `1.5`, `1.2`, `1.3`; confirmed:
    -   `http-server` `/hello`, `/todos/:id`, `/todos` (list) overhead no longer _grows_ with DB load
        and shrank dramatically in absolute terms (see numbers in §1.5).
    -   Express `/hello` overhead shrank ~3x (single middleware layer instead of two, see §1.3).
    -   No throughput regression on any of the 8 apps for `/hello`, `/todos/:id`, `/todos` (list) — the
        three endpoints with high enough req/sec on this shared dev machine to give a stable signal.
    -   `/todos` (POST, `todos-create`) results were too noisy run-to-run on this shared dev machine to
        draw conclusions either way — even the **unmodified** `raw-express`/`raw-koa` apps saw
        transient errors and 5-7x throughput swings between runs on this endpoint, confirming the noise
        is machine contention, not a regression from these changes. Re-run on a dedicated/isolated host
        before treating any single `todos-create` data point as conclusive.
-   [x] Archived all 3 new runs into `results/history/` for future comparison.

## 4. `todos-create` noise — root cause found and fixed (Postgres migration)

The `/todos` (POST) noise flagged in §4 was tracked down: `better-sqlite3` is a **synchronous,
event-loop-blocking** driver, so under 50 concurrent connections every INSERT serializes on the
event loop, and write-lock/fsync variance (not framework/driver overhead) dominates latency —
re-running the _identical_ `raw-koa` code back-to-back produced 303 req/s and 1684 req/s. This
made single-run `todos-create` deltas meaningless and, in one archived run, produced a false
"Koa overhead grows with I/O" signal purely from this noise.

**Fix**: all 8 apps (`raw-*` and `nodeboot-*`) now use a real, non-blocking PostgreSQL database
instead of `better-sqlite3` (one shared local instance via `docker-compose.yaml`, one database per
app for isolation — see the "Running the HTTP-server tier locally" section of `README.md`).
`scripts/run-all.sh` resets Postgres (`docker compose down -v && up -d --wait`) and
truncates+reseeds each app's table before it starts, preserving the old "fresh 1,000-row state per
run" guarantee that `rm -f *.sqlite*` used to provide.

While migrating, also found and fixed a real, unrelated concurrency bug this surfaced: in
`@nodeboot/starter-persistence`'s `PersistenceConfiguration`, the `persistence.started` lifecycle
event was published as soon as `dataSource.initialize()` resolved, **without awaiting** the
`synchronize`/migration promises kicked off inside that same `.then()` — meaning anything relying
on `persistence.started` (e.g. `@PostConstruct()`) could run before the schema existed. Fixed by
awaiting those promises before the `.finally()` that publishes the event
(`starters/persistence/src/config/PersistenceConfiguration.ts`). All 4 `nodeboot-*` apps' seed
logic was also moved from a fire-and-forget constructor call into a proper `@PostConstruct()`
method to rely on this fixed lifecycle guarantee instead of a `count().then(...)` race.

-   [x] Re-ran `pnpm run bench:all` against Postgres: 0 errors/timeouts/non-2xx across all 8 apps ×
        4 endpoints. `todos-create` throughput jumped from ~250 req/s (SQLite, write-lock bound) to
        ~3,500-3,800 req/s for every app, with single-digit-ms p50/p99 latency and no more of the
        wild run-to-run swings seen with `better-sqlite3`.
    -   Koa's `todos-create` overhead vs raw: **-7.1%** (was -86.0% in the SQLite run that triggered
        this investigation) — now shrinks from `hello` to `todos-create` the same way every other
        adapter's overhead does, confirming there was never a real per-request Koa/transaction-path
        regression, only SQLite-induced measurement noise.
