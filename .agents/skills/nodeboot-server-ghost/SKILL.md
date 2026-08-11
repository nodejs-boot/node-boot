---
name: nodeboot-server-ghost
description: Use when the user wants a Node-Boot app with no real HTTP transport, needs GhostServer or GhostDriver specifically, or is building a CLI tool, background worker, embedding scenario, controller-style test harness, or application-context boot that should keep DI, scheduling, persistence, and HTTP clients without binding a port.
---

# Node-Boot with GhostServer

Use this when the app should boot all of Node-Boot except the network listener.

## Fresh start or existing app?

Read [`../_shared/fresh-vs-existing.md`](../_shared/fresh-vs-existing.md) first, then apply it here:

-   **Fresh start:** `npx degit nodejs-boot/node-boot/samples/sample-ghost-server my-app`.
-   **Existing app:** look for `NodeBoot.run(` in `src/app.ts` and for `@nodeboot/ghost-server` in `package.json` to confirm this adapter is (or isn't) already wired.

## Minimal setup

From [`samples/sample-ghost-server/src/app.ts`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-ghost-server/src/app.ts):

```ts
@EnableDI(Container)
@EnableRepositories()
@EnableScheduling()
@EnableHttpClients()
@EnableComponentScan()
@NodeBootApplication()
export class GhostApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(GhostServer);
    }
}
```

That sample proves a Node-Boot app can start DI, config, persistence, schedulers, and HTTP clients with no `src/controllers/` folder and no bound port.

## Ghost-specific notes

-   `GhostServer` is the no-HTTP runtime; `GhostDriver` uses `GhostServerRequest`/`GhostServerResponse` instead of a real web framework.
-   Best fits: CLI tools, background workers, boot-time integration tests, or embedding controller/business logic without a transport.
-   `listen()` resolves immediately and does not open the configured `app.port`; the process can still stay alive for schedulers.
-   There is no real route registration. For controller-style execution in tests or tooling, use `getDriver().executeAction(...)` manually.
-   Plain HTTP middleware pipelines are not the point here; the driver mainly keeps error-handling and action execution semantics available.

See [`servers/ghost-server/README.md`](https://github.com/nodejs-boot/node-boot/blob/main/servers/ghost-server/README.md) for the driver API and [`samples/sample-ghost-server/README.md`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-ghost-server/README.md) for the working non-HTTP sample.

## Validate

Run `cd samples/sample-ghost-server && pnpm dev`, then confirm startup completes and scheduler logs continue without any HTTP route or listening socket to hit.
