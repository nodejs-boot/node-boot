---
name: nodeboot-server-express
description: Use when the user wants to run a Node-Boot app on Express or Express.js, needs ExpressServer or ExpressDriver specifically, wants the broadest middleware ecosystem, or needs compatibility with Express middleware, multer uploads, cookies, CORS, and express-session in a long-lived HTTP server.
---

# Node-Boot on Express

Use this when Express is the safest default: the sample app keeps the normal Node-Boot model and simply boots with `ExpressServer`.

## Fresh start or existing app?

Read [`../_shared/fresh-vs-existing.md`](../_shared/fresh-vs-existing.md) first, then apply it here:

-   **Fresh start:** `npx degit nodejs-boot/node-boot/samples/sample-express my-app`.
-   **Existing app:** look for `NodeBoot.run(` in `src/app.ts` and for `@nodeboot/express-server` in `package.json` to confirm this adapter is (or isn't) already wired.

## Minimal setup

From [`samples/sample-express/src/app.ts`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-express/src/app.ts):

```ts
@EnableDI(Container)
@EnableComponentScan()
@NodeBootApplication()
export class FactsServiceApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

The real sample adds OpenAPI, authorization, persistence, schedulers, HTTP clients, validation, and actuator on top of that same `NodeBoot.run(ExpressServer)` line.

## Express-specific notes

-   `ExpressServer` is the class passed to `NodeBoot.run(...)`; `ExpressDriver` is the request/route adapter underneath.
-   The adapter installs JSON/urlencoded parsing and supports text, buffers, streams, redirects, and rendered templates.
-   Express-only middleware belongs in a `@Configuration()` bean that uses the injected Express `application` (`helmet`, `hpp`, static assets, view engine setup, etc.).
-   Optional `cors`, `session`, `multipart`, and `cookie` behavior comes from a `SERVER_CONFIGURATIONS` bean returning `ExpressServerConfigs`.
-   Authorization resolvers and Node-Boot middleware should be typed against Express `Request`/`Response`.

See the full adapter docs in [`servers/express-server/README.md`](https://github.com/nodejs-boot/node-boot/blob/main/servers/express-server/README.md) and the runnable reference app in [`samples/sample-express/README.md`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-express/README.md).

## Validate

Run `cd samples/sample-express && pnpm dev`, then hit `GET http://localhost:3000/api/v1/hello/`.
