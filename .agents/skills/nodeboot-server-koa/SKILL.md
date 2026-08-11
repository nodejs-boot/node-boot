---
name: nodeboot-server-koa
description: Use when the user wants to run a Node-Boot app on Koa, needs KoaServer or KoaDriver specifically, prefers Koa's async-first middleware style, or needs Koa-native cookies, sessions, CORS, multipart handling, and Koa Context access while keeping Node-Boot controllers and decorators.
---

# Node-Boot on Koa

Use this when Koa is the desired runtime style: thin framework, explicit async middleware, and the same Node-Boot controller model.

## Fresh start or existing app?

Read [`../_shared/fresh-vs-existing.md`](../_shared/fresh-vs-existing.md) first, then apply it here:

-   **Fresh start:** `npx degit nodejs-boot/node-boot/samples/sample-koa my-app`.
-   **Existing app:** look for `NodeBoot.run(` in `src/app.ts` and for `@nodeboot/koa-server` in `package.json` to confirm this adapter is (or isn't) already wired.

## Minimal setup

From [`samples/sample-koa/src/app.ts`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-koa/src/app.ts):

```ts
@EnableDI(Container)
@EnableComponentScan()
@NodeBootApplication()
export class FactsServiceApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(KoaServer);
    }
}
```

The real sample adds authorization, persistence, schedulers, HTTP clients, validation, OpenAPI, Swagger UI, and actuator.

## Koa-specific notes

-   `KoaServer` is the class you pass to `NodeBoot.run(...)`; `KoaDriver` bridges Node-Boot onto `koa` + `@koa/router`.
-   `koa-bodyparser` is always registered; `cors`, cookies, sessions, and multipart come from `KoaServerConfigs`.
-   Koa-only escape hatch: `@Ctx()` is available when a controller really needs raw Koa `Context`.
-   Authorization resolvers and Node-Boot middleware should be typed against Koa `Request`/`Response`.
-   Template metadata exists, but rendered-template responses are not supported by this driver yet.

See [`servers/koa-server/README.md`](https://github.com/nodejs-boot/node-boot/blob/main/servers/koa-server/README.md) for the adapter contract and [`samples/sample-koa/README.md`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-koa/README.md) for the working sample.

## Validate

Run `cd samples/sample-koa && pnpm dev`, then hit `GET http://localhost:3000/api/v1/hello/`.
