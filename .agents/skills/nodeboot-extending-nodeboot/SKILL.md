---
name: nodeboot-extending-nodeboot
description: Use when contributing to Node-Boot itself rather than just consuming it — adding a new HTTP/serverless/desktop server adapter, changing core framework packages, adding an infra/runtime integration guide (Kubernetes, PM2, Platformatic), or building a new starter package (any of its 6 "flavours": SDK/client auto-configuration, method-decorator-with-lifecycle-adapter, class-decorator-with-lifecycle-adapter, AOT/component-scan decorator registration, application-level custom decorators, conditional beans, or multi-bean factories). This is the "extension flavours" skill mirroring CONTRIBUTING.md.
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

## Validate

`pnpm lint-format && pnpm tsc && pnpm test` from repo root. New server adapters/starters should also
have a runnable `samples/sample-*` proving the integration end-to-end.
