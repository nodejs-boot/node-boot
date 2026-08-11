---
name: nodeboot-server-fastify
description: Use when the user wants to run a Node-Boot app on Fastify, needs FastifyServer or FastifyDriver specifically, prefers Fastify plugins and hook-based middleware, or is optimizing for throughput while still using Node-Boot controllers, validation, authorization, cookies, sessions, CORS, multipart, and request.locals support.
---

# Node-Boot on Fastify

Use this when the app should stay in Node-Boot but the transport should be Fastify rather than Express.

## Fresh start or existing app?

Read [`../_shared/fresh-vs-existing.md`](../_shared/fresh-vs-existing.md) first, then apply it here:

-   **Fresh start:** `npx degit nodejs-boot/node-boot/samples/sample-fastify my-app`.
-   **Existing app:** look for `NodeBoot.run(` in `src/app.ts` and for `@nodeboot/fastify-server` in `package.json` to confirm this adapter is (or isn't) already wired.

## Minimal setup

From [`samples/sample-fastify/src/app.ts`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-fastify/src/app.ts):

```ts
@EnableDI(Container)
@EnableComponentScan()
@NodeBootApplication()
export class FactsServiceApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(FastifyServer);
    }
}
```

The sample layers OpenAPI, authorization, persistence, schedulers, HTTP clients, validation, and actuator around that bootstrap.

## Fastify-specific notes

-   `FastifyServer` is the public server class; `FastifyDriver` maps Node-Boot routes and middleware onto Fastify.
-   Plugin support is opt-in: configure `cookie`, `cors`, `session`, `multipart`, or `template` in `FastifyServerConfigs`, and install the matching `@fastify/*` package or startup will fail.
-   Node-Boot middleware maps to Fastify hooks: before → `preHandler`, after → `onSend`, error → `onError`.
-   The adapter decorates each request with `request.locals` for per-request state.
-   Authorization resolvers and custom middleware should use Fastify `FastifyRequest`/`FastifyReply` types.

See [`servers/fastify-server/README.md`](https://github.com/nodejs-boot/node-boot/blob/main/servers/fastify-server/README.md) for plugin/config details and [`samples/sample-fastify/README.md`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-fastify/README.md) for the full reference app.

## Validate

Run `cd samples/sample-fastify && pnpm dev`, then hit `GET http://localhost:3000/api/v1/hello/`.
