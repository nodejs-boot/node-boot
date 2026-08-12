# Node-Boot on Encore.ts Sample

This sample runs a full Node-Boot application (controllers, dependency injection, middleware,
authorization, validation) as an [Encore.ts](https://encore.dev/docs/ts) service, using
[`@nodeboot/encore-server`](../../servers/encore-server).

## How it works

Encore.ts owns the HTTP listening socket itself; the only way to plug a request handler into it is
through a ["raw endpoint"](https://encore.dev/docs/ts/primitives/raw-endpoints) (`api.raw`), which
receives plain Node.js `IncomingMessage`/`ServerResponse` objects - just like `node:http`.

-   [`api/encore.service.ts`](./api/encore.service.ts) declares the `api` Encore service.
-   [`api/index.ts`](./api/index.ts) registers a single catch-all raw endpoint
    (`path: "/!path"`, `method: "*"`) that boots the Node-Boot application on cold start and
    forwards every request into `EncoreServer`'s handler, which routes it through Node-Boot's own
    controllers.
-   [`src/app.ts`](./src/app.ts) is the actual Node-Boot application: `@NodeBootApplication`,
    dependency injection (`@EnableDI`), validation (`@EnableValidations`), and authorization
    (`@EnableAuthorization`) wired up exactly like any other Node-Boot server adapter.
-   [`src/controllers`](./src/controllers), [`src/services`](./src/services),
    [`src/middlewares`](./src/middlewares), and [`src/auth`](./src/auth) contain the same kind of
    framework-agnostic Node-Boot code you'd write for Express/Koa/Fastify - it runs unchanged here.

## Prerequisites

-   [Encore CLI](https://encore.dev/docs/ts/install) (`brew install encoredev/tap/encore`, or see the
    docs for other platforms)
-   Node.js and `pnpm` (this sample is part of the Node-Boot pnpm workspace)

## Running locally

From the repository root, build the workspace packages this sample depends on, then start Encore:

```sh
pnpm install
pnpm --filter @nodeboot/encore-sample... run build
cd samples/sample-encore
encore run
```

`encore run` starts Encore's local runtime and development dashboard at
<http://localhost:9400>. Once running, call the API:

```sh
curl http://localhost:4000/api/hello
# "Hello, from Node-Boot running on Encore.ts!"

curl http://localhost:4000/api/hello/info

curl -X POST http://localhost:4000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer local-test-token" \
  -d '{"name": "Ada Lovelace", "email": "ada@example.com"}'

curl http://localhost:4000/api/users
```

## Deploying

### Option 1: Self-hosted Docker image

Encore.ts apps are fully open source and can be built into a standard Docker image and deployed
anywhere:

```sh
encore build docker nodeboot-encore-sample:latest
docker run -p 4000:8080 nodeboot-encore-sample:latest
```

See the [self-hosting guide](https://encore.dev/docs/ts/self-host/build) for configuring
infrastructure (env vars, secrets, etc.) for a self-hosted deployment.

### Option 2: Encore Cloud

Link the app to Encore Cloud (creates a free account/app on first run) and push to deploy:

```sh
encore app link
git add -A .
git commit -m "Initial commit"
git push encore
```

Then open the [Cloud Dashboard](https://app.encore.dev) to monitor the deployment and get your
production URL.

## Notes

-   The `UserService` uses an in-memory `Map` purely to keep the sample self-contained. Swap it for
    an Encore.ts SQL database (`encore.dev/storage/sqldb`) or `@nodeboot/starter-persistence` for a
    real application.
-   `EncoreDriver` always writes the final HTTP response itself via Node-Boot's `GlobalErrorHandler`;
    `ErrorMiddleware` is only invoked for observability side effects (logging, alerting, etc.).
