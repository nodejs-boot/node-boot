# Node-Boot Cloudflare Workers Sample

A sample project that shows how to build, run locally and deploy a
[Node-Boot](https://github.com/nodejs-boot/node-boot) application as a **Cloudflare Worker**, using
the [`@nodeboot/cloudflare-server`](../../serverless/cloudflare-server) package.

It demonstrates:

-   Dependency Injection (`@EnableDI`) using explicit injection tokens (required in Workers, see below)
-   Request validation with `class-validator` (`@EnableValidations`)
-   Authorization (`@EnableAuthorization`, `@Authorized()`)
-   Controllers, services, middleware and a custom error handler
-   Runtime configuration without a filesystem (`additionalConfigData` instead of `app-config.yaml`)
-   Local development with `wrangler dev` (runs the real `workerd` runtime, not just Node.js)
-   Deployment with `wrangler deploy`

## Project layout

```
src/
├── app.ts                 # NodeBootApplication bootstrapped on CloudflareServer
├── app-config.ts           # Runtime application config, as a plain object (no filesystem access)
├── worker.ts                # Cloudflare Worker entry point (exported default { fetch })
├── polyfills.ts              # __dirname/__filename shims required by some Node-Boot internals
├── local-invoke.ts            # Script to smoke-test the worker locally via ts-node (no wrangler needed)
├── controllers/                # HTTP controllers
├── services/                    # Business logic (in-memory user store)
├── models/                        # DTOs / validation models
├── middlewares/                     # Logging middleware + custom error handler
└── auth/                              # Authorization/CurrentUser resolvers
stubs/
└── glob-stub.js             # No-op stub for the `glob` module (see wrangler.toml)
wrangler.toml                # Wrangler configuration (dev + deploy)
```

## How it works

Unlike the Express/Koa/Fastify samples, this application never "listens" on a port.
`NodeBoot.run(CloudflareServer, appConfig)` bootstraps the DI container, controllers, middleware
and routes exactly once, and `CloudflareServer#getHandler()` returns a function of shape
`(request, env, ctx) => Promise<Response>` that Cloudflare invokes for every incoming request:

```typescript
// src/worker.ts
let fetchHandler: CloudflareHandler | null = null;

export default {
    async fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext): Promise<Response> {
        if (!fetchHandler) {
            const app = await new CloudflareSampleApp().start();
            fetchHandler = (app.server as CloudflareServer).getHandler();
        }
        return fetchHandler(request, env, ctx);
    },
};
```

`fetchHandler` is cached at module scope so the DI container, controllers and routes are only
rebuilt on a cold start; warm invocations of the same isolate reuse the same instance.

## Running locally

```bash
pnpm install
pnpm run dev
```

This runs `wrangler dev`, which starts the real, open-source `workerd` runtime locally (not a
Node.js emulation), so anything that works here is representative of the deployed behavior.

```bash
curl http://localhost:8787/api/hello
curl http://localhost:8787/api/users
curl -X POST http://localhost:8787/api/users \
  -H "Content-Type: application/json" -H "Authorization: Bearer token" \
  -d '{"name":"Ada Lovelace","email":"ada@example.com"}'
```

You can also smoke-test the worker's `fetch` handler directly in plain Node.js (no `wrangler`
needed) via `ts-node`:

```bash
pnpm run invoke:local
```

## Deploying

```bash
npx wrangler login
pnpm run deploy
```

`wrangler.toml`'s `main` points at `src/worker.ts`; Wrangler bundles it and everything it imports
with esbuild, so no separate build step is required for deployment (`pnpm run build` only runs
`tsc` for type-checking).

Add bindings (KV namespaces, D1, Durable Objects, secrets, service bindings, etc.) to
`wrangler.toml` as needed; they are reachable in controllers/services via the injected
`CloudflareContext` (`action.response.env`).

## Cloudflare Workers vs. Node.js: what's different, and why

The Workers runtime is a sandboxed V8 isolate, not Node.js. Getting a Node-Boot app to run there
surfaced a few incompatibilities, each with a corresponding fix baked into this sample and/or the
framework itself:

1. **No filesystem, no dynamic `require`, no `__dirname`/`__filename`.**
   `src/polyfills.ts` shims `globalThis.__dirname`/`__filename` (imported first in `worker.ts`),
   which is needed by some third-party dependencies. More fundamentally, `@nodeboot/config`'s
   file-based `app-config.yaml` discovery can never succeed in a real deployed Worker (no fs at
   all), so `@nodeboot/config` now falls back gracefully to `additionalConfigData` when file
   discovery fails. This sample has no `app-config.yaml` at all - configuration lives entirely
   in `src/app-config.ts` (a plain object) and is passed straight into
   `NodeBoot.run(CloudflareServer, appConfig)`, so the app is configured identically locally
   (`wrangler dev`, `pnpm run invoke:local`) and once deployed.

2. **No component-scanning.** `@EnableComponentScan()` reads compiled files from disk
   (`fs.readdirSync`/`require.cache`), which cannot work in Workers. Instead, `src/app.ts`
   explicitly imports every controller/service/middleware for their decorator side effects.
   Since Wrangler bundles the whole dependency graph with esbuild anyway, this is both simpler
   and correct.

3. **No `eval`/`new Function` (`find-my-way` doesn't work).** The router used by the other
   HTTP/serverless drivers (`find-my-way`) compiles its matcher with `new Function(...)` for
   performance, which throws `EvalError: Code generation from strings disallowed for this
context` inside a Worker isolate. `@nodeboot/cloudflare-server` ships its own dependency-free
   `SimpleRouter` (segment-by-segment matching, no codegen) instead.

4. **esbuild doesn't emit TypeScript decorator metadata.** Wrangler bundles source with esbuild,
   which does not emit `design:paramtypes`/`design:type` metadata even with
   `emitDecoratorMetadata: true` in `tsconfig.json`. This breaks two things:

    - Implicit, type-based `@Inject()` resolution — always use explicit tokens instead:
      `@Inject("logger")` or `@Inject(() => SomeService)`.
    - **Constructor** parameter injection specifically: without `design:paramtypes` metadata,
      TypeDI can't determine how many constructor parameters to build and falls back to passing
      _only_ its internal container instance as the sole argument, silently ignoring any
      `@Inject()` decorators on constructor parameters. **Property injection is required instead**
      of constructor injection for any class that needs its dependencies resolved in a
      Workers/esbuild-bundled environment:

        ```typescript
        // ❌ Breaks silently under esbuild bundling (no decorator metadata emitted)
        constructor(@Inject(() => UserService) private readonly userService: UserService) {}

        // ✅ Works regardless of decorator metadata availability
        @Inject(() => UserService)
        private readonly userService: UserService;
        ```

5. **Winston's `Console` transport doesn't work out of the box.** By default, winston's Console
   transport writes via `process.stdout`/`console._stdout` (real Node streams). The
   `nodejs_compat` polyfill exposes a stream-shaped `console._stdout` whose `_write` isn't
   implemented, causing `Error: The _write() method is not implemented`. Node-Boot's logger now
   always constructs the Console transport with `forceConsole: true`, which makes it call the
   global `console.log`/`warn`/`error` functions directly (natively supported by Workers, and a
   no-op behavior change in plain Node.js).

6. **`glob` gets bundled even though it's never called.** `@nodeboot/engine`'s (unused, since we
   don't scan directories) `ClassFiles.loadFromDirectories` statically imports `glob`, a
   Node fs-based package. esbuild's static analysis bundles it regardless of whether the code
   path actually runs, and it fails at import time in the Workers sandbox. `wrangler.toml`
   aliases `glob` to `stubs/glob-stub.js`, a no-op stub, since this code path is never invoked.

None of the above are specific to this sample — they're general requirements for running any
Node-Boot application on Cloudflare Workers (or, likely, other similarly sandboxed edge runtimes).
