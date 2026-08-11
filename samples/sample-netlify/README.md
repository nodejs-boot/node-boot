# Node-Boot Netlify Sample

A sample project that shows how to build, run locally and deploy a
[Node-Boot](https://github.com/nodejs-boot/node-boot) application as a **Netlify Function**, using
the [`@nodeboot/netlify-server`](../../serverless/netlify-server) package.

It demonstrates:

-   Dependency Injection (`@EnableDI`) using explicit injection tokens
-   Request validation with `class-validator` (`@EnableValidations`)
-   Authorization (`@EnableAuthorization`, `@Authorized()`)
-   Controllers, services, middleware and a custom error handler
-   Runtime configuration without relying on filesystem discovery (`appConfig` object instead of
    `app-config.yaml`)
-   Local development with the Netlify CLI (`netlify dev`) or a plain Node.js smoke test
    (`pnpm run invoke:local`)
-   Deployment with `netlify deploy`

## Project layout

```
netlify/
└── functions/
    └── api.ts             # Netlify Function entry point (catch-all handling everything under /api/*)
netlify.toml                 # Redirect rule routing /api/* to the function above
src/
├── app.ts                     # NodeBootApplication bootstrapped on NetlifyServer
├── app-config.ts                # Runtime application config, as a plain object
├── local-invoke.ts                # Smoke-test script (calls the handler directly, no Netlify CLI needed)
├── controllers/                     # HTTP controllers
├── services/                          # Business logic (in-memory user store)
├── models/                              # DTOs / validation models
├── middlewares/                           # Logging middleware + custom error handler
└── auth/                                    # Authorization/CurrentUser resolvers
```

## How it works

Unlike the Express/Koa/Fastify samples, this application never "listens" on a port. Netlify
invokes `netlify/functions/api.ts` as a Function for every request routed to it.
`NodeBoot.run(NetlifyServer, appConfig)` bootstraps the DI container, controllers, middleware and
routes exactly once, and `NetlifyServer#getHandler()` returns a function of shape
`(event: HandlerEvent, context: HandlerContext) => Promise<HandlerResponse>`:

```typescript
// netlify/functions/api.ts
let netlifyHandler: NetlifyHandler | null = null;

export const handler: NetlifyHandler = async (event, context) => {
    if (!netlifyHandler) {
        const app = await new NetlifySampleApp().start();
        netlifyHandler = (app.server as NetlifyServer).getHandler();
    }
    return netlifyHandler(event, context);
};
```

`netlifyHandler` is cached at module scope so the DI container, controllers and routes are only
rebuilt on a cold start; warm invocations of the same Function instance reuse the same instance.

Because NodeBoot's `routePrefix` is configured as `/api` (see `src/app-config.ts`), the redirect
rule in `netlify.toml` rewrites every request under `/api/*` to `/.netlify/functions/api`, lining
up Netlify's routing with NodeBoot's internal router:

```toml
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api"
  status = 200
```

## Running locally

### Option 1: Plain Node.js smoke test (no Netlify CLI/account needed)

```bash
pnpm install
pnpm run build
pnpm run invoke:local
```

This calls the exact same handler function deployed to Netlify directly, building
`HandlerEvent`/`HandlerContext` objects by hand, and fires a few sample requests against it:

```
GET  /api/hello -> 200 Hello, from Node-Boot running on Netlify!
POST /api/users -> 201 {"id":"...","email":"ada@example.com","name":"Ada Lovelace"}
GET  /api/users -> 200 [{"id":"...","email":"ada@example.com","name":"Ada Lovelace"}]
```

### Option 2: `netlify dev` (requires the Netlify CLI)

```bash
pnpm run dev
```

This runs the actual `netlify dev` local server, which mimics Netlify's production routing/runtime
more closely than the plain smoke test above (redirects, headers, etc.).

```bash
curl http://localhost:8888/api/hello
curl http://localhost:8888/api/users
curl -X POST http://localhost:8888/api/users \
  -H "Content-Type: application/json" -H "Authorization: Bearer token" \
  -d '{"name":"Ada Lovelace","email":"ada@example.com"}'
```

## Deploying

```bash
npx netlify login
pnpm run deploy
```

`pnpm run deploy` runs `netlify deploy --prod`, which uploads the project and lets Netlify's
`esbuild`-based function bundler compile and bundle `netlify/functions/api.ts` (and everything it
statically imports) automatically.

The first deploy will prompt you to link the directory to a new or existing Netlify site.
Subsequent deploys reuse that link (stored in the git-ignored `.netlify/` directory).

## Netlify vs. traditional Node.js servers: what's different, and why

Netlify Functions run in a real Node.js runtime (AWS Lambda under the hood), so most things "just
work". A few points are still worth calling out:

1. **No long-lived process / no component-scanning.** `@EnableComponentScan()` reads compiled
   files from `dist/` at runtime (`fs.readdirSync`). Netlify Functions only ship the subset of
   files statically traced from the function's entry point (via esbuild), so relying on directory
   scanning for beans not reachable through static imports is unreliable. This sample explicitly
   imports every controller/service/middleware in `src/app.ts` for their decorator side effects
   instead, guaranteeing they're always included in the bundled function.

2. **No filesystem-based `app-config.yaml` discovery.** `@nodeboot/config` normally walks up the
   directory tree from `process.cwd()` looking for `app-config.yaml`. A Function's working
   directory is not guaranteed to match the project root, so this sample passes configuration as a
   plain object (`src/app-config.ts`) straight into `NodeBoot.run(NetlifyServer, appConfig)`
   instead, guaranteeing identical configuration locally and once deployed.

3. **Routing is event-based, not request/response based.** Like AWS Lambda's
   `APIGatewayProxyEvent`/`APIGatewayProxyResult`, Netlify's Node.js runtime hands the handler an
   immutable `HandlerEvent` and expects an immutable `HandlerResponse` value back.
   `NetlifyDriver` builds and returns the final response value instead of writing directly to a
   mutable response object.

4. **`find-my-way`'s trailing-slash routes.** Controller index routes build routes with a
   trailing slash (e.g. `@Controller("/hello")` + `@Get("/")` → `/hello/`), but real request URLs
   typically omit it (e.g. `/api/hello`). `@nodeboot/netlify-server` configures its `find-my-way`
   router with `ignoreTrailingSlash: true` so both forms match.

None of the above are specific to this sample — they're general considerations for running any
Node-Boot application on Netlify Functions.
