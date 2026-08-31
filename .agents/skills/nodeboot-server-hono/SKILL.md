---
name: nodeboot-server-hono
description: Use when the user wants to run a Node-Boot app on Hono, needs HonoServer or HonoDriver specifically, wants a Web Standards (Fetch API) based, ultrafast runtime, or needs Hono-native cookies, CORS, secure headers, and native multipart body parsing while keeping Node-Boot controllers and decorators.
---

# Node-Boot on Hono

Use this when Hono is the desired runtime style: a small, Fetch-API-native framework with no bundled body-parser/multipart dependency, running on Node via `@hono/node-server`.

## Fresh start or existing app?

Read [`../_shared/fresh-vs-existing.md`](../_shared/fresh-vs-existing.md) first, then apply it here:

-   **Fresh start:** `npx degit nodejs-boot/node-boot/samples/sample-hono my-app`.
-   **Existing app:** look for `NodeBoot.run(` in `src/app.ts` and for `@nodeboot/hono-server` in `package.json` to confirm this adapter is (or isn't) already wired.

## Minimal setup

From [`samples/sample-hono/src/app.ts`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-hono/src/app.ts):

```ts
@EnableDI(Container)
@EnableComponentScan()
@NodeBootApplication()
export class FactsServiceApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(HonoServer);
    }
}
```

The real sample adds authorization, persistence, schedulers, HTTP clients, validation, OpenAPI, Swagger UI, and actuator.

## Hono-specific notes

-   `HonoServer` is the class you pass to `NodeBoot.run(...)`; `HonoDriver` bridges Node-Boot onto `hono` + `@hono/node-server`.
-   No `body-parser`/`multer` equivalent is needed — `c.req.parseBody()` handles `multipart/form-data` and urlencoded bodies natively; JSON/text bodies are parsed once per request based on `content-type`.
-   `cors` comes from Hono's built-in `hono/cors`; cookies are read/written per-request via `hono/cookie` (no global middleware needed); sessions require the optional `hono-sessions` peer dependency.
-   Hono's router is **strict about trailing slashes** — `@Get("/")` and `@Get()` on the same controller stay distinct routes, unlike Express/Koa's lenient matching.
-   Important gotcha: `c.json()`/`c.text()`/`c.body()` only _build_ a `Response` — they have no side effect on their own. A custom `ErrorHandlerInterface.onError(...)` must assign it back, e.g. `action.response.res = action.response.json({...}, status)`.
-   Authorization resolvers and Node-Boot middleware should be typed against `HonoRequest`/`HonoResponse` from `@nodeboot/hono-server` (the latter is the Hono `Context` itself).
-   Template metadata exists, but rendered-template responses are not supported by this driver yet.

See [`servers/hono-server/README.md`](https://github.com/nodejs-boot/node-boot/blob/main/servers/hono-server/README.md) for the adapter contract and [`samples/sample-hono/README.md`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-hono/README.md) for the working sample.

## Validate

Run `cd samples/sample-hono && pnpm dev`, then hit `GET http://localhost:3000/api/v1/hello/`.
