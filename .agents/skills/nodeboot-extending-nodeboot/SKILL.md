---
name: nodeboot-extending-nodeboot
description: Use when contributing to Node-Boot itself rather than just consuming it — adding a new HTTP/serverless/desktop server adapter, changing core framework packages, adding an infra/runtime integration guide (Kubernetes, PM2, Platformatic), or building a new starter package (any of its 6 "flavours" SDK/client auto-configuration, method-decorator-with-lifecycle-adapter, class-decorator-with-lifecycle-adapter, AOT/component-scan decorator registration, application-level custom decorators, conditional beans, or multi-bean factories). This is the extension flavours skill mirroring CONTRIBUTING.md.
---

# Extending Node-Boot

Full source of truth: [`CONTRIBUTING.md`](https://github.com/nodejs-boot/node-boot/blob/main/CONTRIBUTING.md). This skill is a map
of _which section to read_ for a given kind of contribution — read the linked section before
writing code, don't rely on this summary alone for exact code.

## 1. Server integrations (`CONTRIBUTING.md` §1)

Every adapter implements `NodeBootDriver` (from `@nodeboot/engine`) and extends `BaseServer` (from
`@nodeboot/core`). Two classes: `XxxServer` (creates the framework app, exposed to `NodeBoot.run`)
and `XxxDriver` (implements `initialize`, `registerMiddleware`, `registerAction`, `registerRoutes`,
`getParamFromRequest`, `handleError`/`handleSuccess`).

-   **HTTP adapters** (`servers/*`) — copy `servers/koa-server` as a compact template. Must support
    the full param surface (path/query/headers/body/files) + authorization/`@CurrentUser` hooks.
    Add a `samples/sample-your-framework` mirroring `samples/sample-express`. See §1.1.
-   **Serverless adapters** (`serverless/*`) — build the app once outside the handler (warm-invocation
    reuse), export a `createHandler(AppClass)` factory, watch cold-start cost. Use
    `serverless/lambda-server` or `serverless/vercel-server` as references. See §1.2.
-   **Desktop adapters** (none published yet) — open an issue first proposing Electron (Node-native,
    recommended first target) vs Tauri, and whether it binds directly (IPC-based driver) or wraps an
    existing HTTP adapter embedded in the main process. See §1.3 and the `nodeboot-servers-desktop`
    skill.

Route framework-specific questions to `nodeboot-servers-http` / `nodeboot-servers-serverless` /
`nodeboot-servers-desktop` — this skill is only about _how to add a new adapter_, not how to use an
existing one.

## 2. Core feature contributions (`CONTRIBUTING.md` §2)

Touches `packages/{core,context,di,engine,config,aot,authorization,error,tools}` rather than an
integration point: new core decorators, application lifecycle phases, DI/AOT/config improvements,
bug fixes. Open an issue first for anything beyond a small fix; add/update tests in the affected
package; update that package's README; run `pnpm tsc && pnpm test` for the whole workspace since
core changes ripple into starters/samples.

## 3. Runtime contributions (`CONTRIBUTING.md` §3)

Docs/examples/infra templates for _how a built app is deployed/operated_ (Kubernetes, Platformatic
Watt, PM2, Docker Compose, ...) — no framework code changes. Add a `samples/sample-<runtime>`
folder with the runtime config + a README, and wire up `@nodeboot/starter-actuator` health/metrics
endpoints where relevant (liveness/readiness probes). For the consumer-side "run my app under PM2
or Platformatic Watt" workflow (as opposed to contributing a new runtime integration), see
[`nodeboot-runtimes`](../nodeboot-runtimes/SKILL.md).

## 4. Starter package flavours (`CONTRIBUTING.md` §4) — pick the flavour(s) that match your integration

| Flavour                                  | When to use                                                                                       | Reference starter                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1 — SDK/Client Auto-Configuration        | Wrap a 3rd-party SDK, register it as a bean from `app-config.yaml`                                | `starter-openai`                                                                              |
| 2 — Method Decorator + Lifecycle Adapter | New method decorator (e.g. `@Scheduler(...)`) needs wiring once the app lifecycle reaches a phase | `starter-scheduler`                                                                           |
| 3 — Class Decorator + Lifecycle Adapter  | New class decorator (e.g. `@HttpClient(...)`) registers a whole class instance                    | `starter-http`                                                                                |
| 4 — AOT / Component Scan Registration    | Any new framework decorator must be discoverable by `@EnableComponentScan()`                      | `packages/aot/src/decorators.main.js` (core) or `customDecorators: [...]` (starter/app-level) |
| App-level custom decorators              | Same decorator+adapter+`@Lifecycle` pattern, but project-specific, not upstreamed                 | n/a — see §"Application-Level Custom Decorators"                                              |
| 5 — Conditional Clients via Config       | Register a bean only if a config path exists (`@Configuration({onConfig: "..."})`)                | `starter-aws` (`S3ClientConfiguration`)                                                       |
| 6 — Multiple Beans via Factory           | One `@Configuration` exposes several independently-injectable beans                               | `starter-firebase` (`FirebaseAdminConfiguration`)                                             |

Flavours 2/3 are the same core pattern as writing an app-level custom decorator — an
`ApplicationFeatureAdapter` registered via `ApplicationContext.get().applicationFeatureAdapters.push(...)`
and tagged with `@Lifecycle(phase)`. Read `CONTRIBUTING.md` §4 for the full code for each flavour
before implementing — don't guess the adapter shape.

For "how do I add a _skill_ for a new starter package" (as opposed to the starter package itself),
see `nodeboot-starters/resources/authoring-a-starter-skill.md`.

## Testing a starter package (required, not optional)

Unit tests against the starter's own adapter/decorator/`@Bean` factory (mocking `logger`,
`iocContainer`, `config`) prove the internal logic is correct in isolation, but they do **not**
prove the starter actually autowires into Node-Boot core — that its `@EnableXxx()` decorator, once
applied to a real `@NodeBootApplication`, produces the advertised effect end-to-end. Only booting a
real app proves that. Every new (or newly-tested) starter package must therefore also have an
integration test using `@nodeboot/node-test`'s `useNodeBoot()` — see `nodeboot-test-framework` for
the hook API — with both:

-   a **positive** case: a fixture app with the starter enabled (and, where relevant, configured)
    exercised over real HTTP/DI, asserting the behavior the starter claims to add;
-   a **negative** case: an otherwise-identical fixture app with the starter left disabled (or
    default-configured), asserting that behavior is absent. Without this contrast, a positive-only
    test can't tell the starter's effect apart from a framework default that would happen anyway.

Reference implementations, each under `test/fixtures/` (or `tests/fixtures/` for persistence) with
a `NodeBootApp` fixture per scenario:

-   **Positive/negative pairs, DI-only on `@nodeboot/ghost-server`** (no HTTP transport needed):
    `starters/scheduler` (`scheduling-enabled` / `scheduling-disabled` — a real `node-cron` tick
    invoking a `@Service` method), `starters/http` (`http-client-enabled` / `http-client-disabled`
    — an outbound `@HttpClient` axios instance doing a real round trip against a local mock server),
    `starters/aws` (`aws-s3-enabled` / `aws-s3-disabled` — a real `S3Client` bean, conditional on
    `integrations.aws.s3.region`), `starters/backstage` (`backstage-enabled` / `backstage-disabled`
    — `CatalogClient`/`PluginDiscoveryService`), `starters/openai` (`openai-enabled` /
    `openai-disabled` — a real `OpenAI` SDK client bean).
-   **Positive/negative pair, real HTTP required**: `starters/validation`
    (`validation-enabled` / `validation-disabled.it.test.ts` on `@nodeboot/http-server` — unlike the
    DI-only ones above, this starter's whole effect is on how request bodies get validated, so it
    needs a real request/response cycle to observe).
-   **Positive-only** (no graceful disabled path to contrast against — the `@Bean` is
    unconditionally registered on import and either hard-requires its config node or throws
    synchronously without it, so "disabled" is a boot-time crash, not a toggle):
    `starters/persistence` (`persistence-auto-configuration.it.test.ts` and friends — see that
    skill's own "Validate" section for the full breakdown across all six persistence decorators),
    `starters/supabase` (`supabase-enabled.it.test.ts`), `starters/firebase`
    (`firebase-enabled.it.test.ts` — uses a synthetic, non-Google-issued RSA key pair, since
    `admin.credential.cert()` only validates the key is well-formed PEM, never contacts Google).
-   **Real HTTP server required** (the starter's whole point is exposing routes, not just
    registering a DI bean): `starters/openapi` (`openapi-enabled.it.test.ts` — hits the real
    generated `/api-docs/swagger.json` and asserts a fixture controller is documented in it) and
    `starters/actuator` (`actuator-enabled.it.test.ts` — hits `/actuator/health`, `/actuator/info`,
    `/actuator/prometheus`), both on `@nodeboot/http-server`.

A recurring, load-bearing fact across the SDK-wrapper starters (AWS, OpenAI, Supabase, Firebase,
Backstage): constructing the underlying SDK client (`new S3Client(...)`, `new OpenAI(...)`,
`createClient(...)`, `admin.initializeApp(...)`, `new CatalogClient(...)`) never makes a network
call or validates credentials by itself — only actually _calling_ a method on the client does. That
is what makes it safe to boot these in a test with fake credentials/URLs, as long as the test never
calls out. Firebase is the one exception worth knowing about up front: `admin.database()`'s `@Bean`
runs unconditionally at boot (not lazily on first use) and throws immediately without a resolvable
`realtimeDatabaseUrl` in config — supply one even if the test doesn't touch Realtime Database.

Several sharp edges were discovered building these, all silent failure modes — see
`nodeboot-test-framework` for the full detail on each:

1. **One `useNodeBoot()` app per test file, no exceptions.** Booting a second app in the same file
   (even in a separate `describe` block) causes the second app's lifecycle hooks to silently fail
   to complete — the test file reports fewer tests than were written, with no error. Put each app
   variant in its own `*.it.test.ts` file instead; `@nodeboot/node-test` tolerates multiple such
   files running in the same process (the framework's `test` script always runs them together).
2. **Keep every `*.test.ts`/`*.it.test.ts` file directly under `test/`, never in a subfolder**
   (fixtures/DTOs/controllers _can_ go in `test/fixtures/`, since those don't match the test-file
   glob). The standard `"test": "node --test ... test/**/*.{test,it.test}.ts"` script runs via
   `sh`, not bash, and plain `sh`'s `**` does not recurse — it matches exactly one directory level.
   So once any test file exists one level deep (e.g. `test/integration/foo.it.test.ts`), the shell
   successfully expands the glob to just that nested file and stops there, silently dropping every
   top-level `test/*.test.ts` file from the run. (With zero nested matches, the unexpanded literal
   pattern is passed straight through to `node --test`, which resolves it correctly on its own —
   which is the only reason the flat layout has been working across this repo's packages so far.)
   Verify with `pnpm --filter <pkg> test` and check the reported test count matches what you wrote.
3. **Resolving beans in tests (`useService` vs `Container.get`)**: In standard applications outside
   this monorepo, always use `useNodeBoot` return hooks (`useService`, `useRepository`, etc.).
   Inside this monorepo only, local workspace packages diverge from the published packages bundled
   with `@nodeboot/node-test`, creating an `ApplicationContext` singleton mismatch; resolve beans
   via `Container.get()` / `Container.set()` (from `typedi`) instead.
4. **`useTimer()`'s fake clock can't fast-forward a timer already scheduled during app boot**
   (its `beforeTests` installation runs after the app starts). A real (short) wait is the only thing
   that works for e.g. a `node-cron` tick wired up by a `@Lifecycle`-phase adapter.

## Validate

`pnpm lint-format && pnpm tsc && pnpm test` from repo root. New server adapters/starters should also
have a runnable `samples/sample-*` proving the integration end-to-end.
