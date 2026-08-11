---
name: nodeboot-server-native-http
description: Use when the user wants a Node-Boot app on native Node.js http with HttpServer or HttpDriver, wants zero framework dependency and a small runtime surface, or is willing to trade built-in sessions, multipart uploads, and real template rendering for a direct find-my-way plus IncomingMessage/ServerResponse adapter.
---

# Node-Boot on native `http`

Use this when the goal is "just Node's HTTP server" without Express, Fastify, or Koa.

## Fresh start or existing app?

Read [`../_shared/fresh-vs-existing.md`](../_shared/fresh-vs-existing.md) first, then apply it here:

-   **Fresh start:** `npx degit nodejs-boot/node-boot/samples/sample-native-http my-app` (or `samples/sample-native-http-supabase` for a persistence-combined starting point).
-   **Existing app:** look for `NodeBoot.run(` in `src/app.ts` and for `@nodeboot/http-server` in `package.json` to confirm this adapter is (or isn't) already wired.

## Minimal setup

From [`samples/sample-native-http/src/app.ts`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-native-http/src/app.ts):

```ts
@EnableDI(Container)
@EnableComponentScan()
@NodeBootApplication()
export class FactsServiceApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(HttpServer);
    }
}
```

The sample then adds OpenAPI, authorization, persistence, schedulers, HTTP clients, validation, and actuator exactly as it would on a framework-backed adapter.

## Native-HTTP-specific notes

-   `HttpServer` is the runtime class; `HttpDriver` sits directly on Node's `http.Server` with `find-my-way` routing.
-   Built-in body parsing is JSON-only for `POST`/`PUT`/`PATCH`; there is no Express/Fastify/Koa middleware layer to lean on.
-   CORS is the only actively used `SERVER_CONFIGURATIONS` feature today; cookies are parsed, but session decorators, multipart upload decorators, and real template rendering are not implemented.
-   Authorization resolvers and middlewares should use native `IncomingMessage`/`ServerResponse` types.
-   For a persistence-combined example, [`samples/sample-native-http-supabase/src/app.ts`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-native-http-supabase/src/app.ts) shows the same `NodeBoot.run(HttpServer)` pattern with `@EnableSupabase()`.

See [`servers/http-server/README.md`](https://github.com/nodejs-boot/node-boot/blob/main/servers/http-server/README.md) for adapter details, [`samples/sample-native-http/README.md`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-native-http/README.md) for the main sample, and [`samples/sample-native-http-supabase/README.md`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-native-http-supabase/README.md) for the Supabase variant.

## Validate

Run `cd samples/sample-native-http && pnpm dev`, then hit `GET http://localhost:3000/api/v1/hello/`.
