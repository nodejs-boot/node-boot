# Node-Boot Google Cloud Functions Sample

A sample project that shows how to build, run locally and deploy a
[Node-Boot](https://github.com/nodejs-boot/node-boot) application as a **Google Cloud Function (2nd gen, HTTP
trigger)**, using the [`@nodeboot/google-cloud-functions-server`](../../serverless/google-cloud-functions-server) package.

It demonstrates:

-   Dependency Injection (`@EnableDI`) using explicit injection tokens
-   Request validation with `class-validator` (`@EnableValidations`)
-   Authorization (`@EnableAuthorization`, `@Authorized()`)
-   Controllers, services, middleware and a custom error handler
-   Runtime configuration without relying on filesystem discovery (`appConfig` object instead of
    `app-config.yaml`)
-   Local development with the `@google-cloud/functions-framework` CLI or a plain smoke test using the
    framework's own testing utilities
-   Deployment with `gcloud functions deploy`

## Project layout

```
src/
├── index.ts                  # Cloud Function entry point (`functions.http("api", ...)`)
├── app.ts                    # NodeBootApplication bootstrapped on GoogleCloudFunctionsServer
├── app-config.ts             # Runtime application config, as a plain object
├── local-invoke.ts           # Smoke-test script (functions-framework testing utils, no CLI needed)
├── controllers/               # HTTP controllers
├── services/                  # Business logic (in-memory user store)
├── models/                    # DTOs / validation models
├── middlewares/                # Logging middleware + custom error handler
└── auth/                        # Authorization/CurrentUser resolvers
```

## How it works

Unlike the Express/Koa/Fastify samples, this application never "listens" on a port. Google Cloud invokes
`src/index.ts`'s registered `api` function as an HTTP handler for every request routed to the Cloud Function.
`NodeBoot.run(GoogleCloudFunctionsServer, appConfig)` bootstraps the DI container, controllers, middleware and routes exactly once,
and `GoogleCloudFunctionsServer#getHandler()` returns a function of shape `(req: GoogleCloudFunctionsRequest, res: GoogleCloudFunctionsResponse) => Promise<void>` that
writes the response directly:

```typescript
// src/index.ts
let gcfHandler: GoogleCloudFunctionsHandler | null = null;

functions.http("api", async (req, res) => {
    if (!gcfHandler) {
        const app = await new GoogleCloudFunctionsSampleApp().start();
        gcfHandler = (app.server as GoogleCloudFunctionsServer).getHandler();
    }
    return gcfHandler(req, res);
});
```

`gcfHandler` is cached at module scope so the DI container, controllers and routes are only rebuilt on a cold start;
warm invocations of the same Function instance reuse the same instance.

Because NodeBoot's `routePrefix` is configured as `/api` (see `src/app-config.ts`), requests must be sent to
`<function-url>/api/hello`, `<function-url>/api/users`, etc.

## Running locally

### Option 1: Plain smoke test (no `functions-framework` CLI needed)

```bash
pnpm install
pnpm run build
pnpm run invoke:local
```

This uses `@google-cloud/functions-framework/testing`'s `getTestServer("api")` to spin up the exact same Express
server the functions-framework builds in production around the registered `api` function, and fires a few sample
requests against it:

```
GET  /api/hello -> 200 Hello, from Node-Boot running on Google Cloud Functions!
POST /api/users -> 201 {"id":"...","email":"ada@example.com","name":"Ada Lovelace"}
GET  /api/users -> 200 [{"id":"...","email":"ada@example.com","name":"Ada Lovelace"}]
```

### Option 2: `functions-framework` CLI (closer to production)

```bash
pnpm run dev
```

This builds the project and starts the actual `@google-cloud/functions-framework` HTTP server, mimicking Google
Cloud's production routing/runtime more closely (default port `8080`):

```bash
curl http://localhost:8080/api/hello
curl http://localhost:8080/api/users
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" -H "Authorization: Bearer token" \
  -d '{"name":"Ada Lovelace","email":"ada@example.com"}'
```

## Deploying

Requires the [`gcloud` CLI](https://cloud.google.com/sdk/docs/install) authenticated against a Google Cloud project
with the Cloud Functions, Cloud Build, Artifact Registry and Cloud Run APIs enabled.

```bash
gcloud auth login
gcloud config set project <your-gcp-project-id>
pnpm run deploy
```

`pnpm run deploy` runs:

```bash
gcloud functions deploy api \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=api \
  --trigger-http \
  --allow-unauthenticated
```

Google Cloud uploads the source directory (respecting `.gcloudignore`), then Cloud Build's Node.js buildpack runs
`npm install` followed by the `gcp-build` script (`tsc -p tsconfig.build.json`, see `package.json`) to compile
TypeScript into `dist/`, matching `package.json`'s `main` field (`dist/index.js`). No separate manual build step is
required before deploying — `pnpm run build` locally is only needed for local testing/type-checking.

`--entry-point=api` must match the name passed to `functions.http("api", ...)` in `src/index.ts`. Once deployed,
`gcloud functions deploy` prints the function's HTTPS trigger URL, e.g.:

```bash
curl https://us-central1-<project-id>.cloudfunctions.net/api/hello
```

To remove the deployed function:

```bash
pnpm run remove
```

## Google Cloud Functions vs. traditional Node.js servers: what's different, and why

Google Cloud Functions (2nd gen) HTTP functions run in a real Node.js runtime built on Express (via
`@google-cloud/functions-framework`), so most things "just work". A few points are still worth calling out:

1. **No long-lived process.** The function is bootstrapped once per Cloud Function instance (cold start) and reused
   across warm invocations, same as Vercel/Netlify Functions. `src/index.ts` caches the handler at module scope for
   this reason.

2. **No filesystem-based `app-config.yaml` discovery.** `@nodeboot/config` normally walks up the directory tree from
   `process.cwd()` looking for `app-config.yaml`. A Cloud Function's working directory at runtime is not guaranteed
   to match the project root, so this sample passes configuration as a plain object (`src/app-config.ts`) straight
   into `NodeBoot.run(GoogleCloudFunctionsServer, appConfig)` instead, guaranteeing identical configuration locally and once
   deployed.

3. **Routing is Express-based.** `@google-cloud/functions-framework` builds a real Express app around the registered
   function, parsing JSON/urlencoded bodies, query parameters and cookies before invoking the handler.
   `GoogleCloudFunctionsRequest`/`GoogleCloudFunctionsResponse` are the actual Express `Request`/`Response` objects (decorated with a couple of
   GCF-specific properties like `rawBody`), and `GoogleCloudFunctionsDriver` writes the response directly to `res`
   (`res.writeHead`/`res.end`) instead of building and returning an immutable response value.

4. **`find-my-way`'s trailing-slash routes.** Controller index routes build routes with a trailing slash (e.g.
   `@Controller("/hello")` + `@Get("/")` → `/hello/`), but real request URLs typically omit it (e.g. `/api/hello`).
   `@nodeboot/google-cloud-functions-server` configures its `find-my-way` router with `ignoreTrailingSlash: true` so both forms match.

None of the above are specific to this sample — they're general considerations for running any Node-Boot application
on Google Cloud Functions.
