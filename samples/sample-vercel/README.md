# Node-Boot Vercel Sample

A sample project that shows how to build, run locally and deploy a
[Node-Boot](https://github.com/nodejs-boot/node-boot) application as a **Vercel Node.js Serverless
Function**, using the [`@nodeboot/vercel-server`](../../serverless/vercel-server) package.

It demonstrates:

-   Dependency Injection (`@EnableDI`) using explicit injection tokens
-   Request validation with `class-validator` (`@EnableValidations`)
-   Authorization (`@EnableAuthorization`, `@Authorized()`)
-   Controllers, services, middleware and a custom error handler
-   Runtime configuration without relying on filesystem discovery (`appConfig` object instead of
    `app-config.yaml`)
-   Local development with the Vercel CLI (`vercel dev`) or a plain Node.js smoke test
    (`pnpm run invoke:local`)
-   Deployment with `vercel deploy`

## Project layout

```
api/
└── [...path].ts          # Vercel Serverless Function entry point (catch-all under /api/*)
src/
├── app.ts                 # NodeBootApplication bootstrapped on VercelServer
├── app-config.ts           # Runtime application config, as a plain object
├── local-invoke.ts           # Smoke-test script (plain http server, no `vercel` CLI needed)
├── controllers/                # HTTP controllers
├── services/                    # Business logic (in-memory user store)
├── models/                        # DTOs / validation models
├── middlewares/                     # Logging middleware + custom error handler
└── auth/                              # Authorization/CurrentUser resolvers
```

## How it works

Unlike the Express/Koa/Fastify samples, this application never "listens" on a port. Vercel
invokes `api/[...path].ts` as a Serverless Function for every request under `/api/*`.
`NodeBoot.run(VercelServer, appConfig)` bootstraps the DI container, controllers, middleware and
routes exactly once, and `VercelServer#getHandler()` returns a function of shape
`(req: VercelRequest, res: VercelResponse) => Promise<void>` that writes the response directly:

```typescript
// api/[...path].ts
let vercelHandler: VercelHandler | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    if (!vercelHandler) {
        const app = await new VercelSampleApp().start();
        vercelHandler = (app.server as VercelServer).getHandler();
    }
    return vercelHandler(req, res);
}
```

`vercelHandler` is cached at module scope so the DI container, controllers and routes are only
rebuilt on a cold start; warm invocations of the same Function instance reuse the same instance.

Because NodeBoot's `routePrefix` is configured as `/api` (see `src/app-config.ts`), and
`api/[...path].ts` is a catch-all matching every request under `/api/*`, Vercel's file-system
routing lines up with NodeBoot's internal router without needing any custom rewrites in a
`vercel.json` file.

## Running locally

### Option 1: Plain Node.js smoke test (no Vercel CLI/account needed)

```bash
pnpm install
pnpm run build
pnpm run invoke:local
```

This spins up a plain `http.createServer` that delegates straight to the same handler function
deployed to Vercel (`VercelRequest`/`VercelResponse` are just `http`'s
`IncomingMessage`/`ServerResponse` under the hood), and fires a few sample requests against it:

```
GET  /api/hello -> 200 Hello, from Node-Boot running on Vercel!
POST /api/users -> 201 {"id":"...","email":"ada@example.com","name":"Ada Lovelace"}
GET  /api/users -> 200 [{"id":"...","email":"ada@example.com","name":"Ada Lovelace"}]
```

### Option 2: `vercel dev` (requires a Vercel account)

```bash
npx vercel login
pnpm run dev
```

This runs the actual `vercel dev` local server, which mimics Vercel's production routing/runtime
more closely than the plain smoke test above (path rewrites, headers, etc.). It requires being
logged in to a Vercel account (`vercel login`) since the CLI links the local directory to a
project.

```bash
curl http://localhost:3000/api/hello
curl http://localhost:3000/api/users
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" -H "Authorization: Bearer token" \
  -d '{"name":"Ada Lovelace","email":"ada@example.com"}'
```

## Deploying

```bash
npx vercel login
pnpm run deploy
```

`pnpm run deploy` runs `vercel deploy --prod`, which uploads the project and lets Vercel's
`@vercel/node` builder compile and bundle `api/[...path].ts` (and everything it statically
imports) automatically — no separate build step is required for deployment (`pnpm run build` only
runs `tsc` for type-checking/local tooling).

The first deploy will prompt you to link the directory to a new or existing Vercel project.
Subsequent deploys reuse that link (stored in the git-ignored `.vercel/` directory).

## Vercel vs. traditional Node.js servers: what's different, and why

Vercel Node.js Serverless Functions run in a real Node.js runtime (unlike Cloudflare Workers'
sandboxed V8 isolate), so most things "just work". A few points are still worth calling out:

1. **No long-lived process / no component-scanning.** `@EnableComponentScan()` reads compiled
   files from `dist/` at runtime (`fs.readdirSync`). Vercel Functions only ship the subset of
   files statically traced from the function's entry point (via `@vercel/nft`), so relying on
   directory scanning for beans not reachable through static imports is unreliable. This sample
   explicitly imports every controller/service/middleware in `src/app.ts` for their decorator side
   effects instead, guaranteeing they're always included in the traced bundle.

2. **No filesystem-based `app-config.yaml` discovery.** `@nodeboot/config` normally walks up the
   directory tree from `process.cwd()` looking for `app-config.yaml`. A Serverless Function's
   working directory is not guaranteed to match the project root, so this sample passes
   configuration as a plain object (`src/app-config.ts`) straight into
   `NodeBoot.run(VercelServer, appConfig)` instead, guaranteeing identical configuration locally
   and once deployed.

3. **Routing is request/response based, not event-based.** Unlike AWS Lambda's
   `APIGatewayProxyEvent`/`APIGatewayProxyResult` or Cloudflare's Fetch API `Request`/`Response`,
   Vercel's Node.js runtime hands the handler the actual mutable `http.IncomingMessage`/
   `http.ServerResponse` objects (decorated with a few convenience properties). `VercelDriver`
   writes the response directly to `res` (`res.writeHead`/`res.end`) instead of building and
   returning an immutable response value.

4. **`find-my-way`'s trailing-slash routes.** Controller index routes build routes with a
   trailing slash (e.g. `@Controller("/hello")` + `@Get("/")` → `/hello/`), but real request URLs
   typically omit it (e.g. `/api/hello`). `@nodeboot/vercel-server` configures its `find-my-way`
   router with `ignoreTrailingSlash: true` so both forms match.

None of the above are specific to this sample — they're general considerations for running any
Node-Boot application on Vercel's Node.js Serverless Functions.
