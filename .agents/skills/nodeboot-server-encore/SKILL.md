---
name: nodeboot-server-encore
description: Use when the user wants to run a Node-Boot app on Encore.ts, needs EncoreServer or EncoreDriver specifically, wants Encore cloud infrastructure and observability, or must expose Node-Boot controllers through a single api.raw catch-all handler instead of calling listen() directly.
---

# Node-Boot on Encore.ts

Use this when the deployment target is Encore.ts rather than a self-owned HTTP listener.

## Fresh start or existing app?

Read [`../_shared/fresh-vs-existing.md`](../_shared/fresh-vs-existing.md) first, then apply it here:

-   **Fresh start:** `npx degit nodejs-boot/node-boot/samples/sample-encore my-app`. Encore's own tooling (`encore app create`/`encore run`) still applies on top — this just gives you the Node-Boot wiring.
-   **Existing app:** look for `NodeBoot.run(EncoreServer` in `src/app.ts` and for `@nodeboot/encore-server` in `package.json` to confirm this adapter is (or isn't) already wired. Remember Encore apps favor explicit imports over `@EnableComponentScan()`.

## Minimal setup

From [`samples/sample-encore/src/app.ts`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-encore/src/app.ts):

```ts
@EnableDI(Container)
@EnableAuthorization(LoggedInUserResolver, DefaultAuthorizationResolver)
@EnableValidations()
@NodeBootApplication()
export class EncoreSampleApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(EncoreServer, appConfig);
    }
}
```

Then wire the started server into Encore's raw endpoint layer as shown in [`samples/sample-encore/api/index.ts`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-encore/api/index.ts): cache `getHandler()` and forward `api.raw({expose: true, method: "*", path: "/!path"}, ...)` into it.

## Encore-specific notes

-   `EncoreServer` boots Node-Boot's router but does not open a socket; Encore owns the HTTP server.
-   The required transport pattern is one catch-all `api.raw` endpoint plus `EncoreServer#getHandler()`.
-   `samples/sample-encore` deliberately uses explicit imports instead of `@EnableComponentScan()` because Encore's bundling model favors a statically discoverable graph.
-   Encore's esbuild bundler drops decorator metadata, so prefer property injection with explicit `@Inject(() => Service)`/tokens instead of constructor injection.
-   For DTO validation, pass explicit body types such as `@Body({type: CreateUserDto})`.
-   Like the native HTTP adapter, sessions, multipart decorators, and real template rendering are not implemented here.

See [`servers/encore-server/README.md`](https://github.com/nodejs-boot/node-boot/blob/main/servers/encore-server/README.md) for the full adapter caveats and [`samples/sample-encore/README.md`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-encore/README.md) for the complete sample.

## Validate

Run `cd samples/sample-encore && pnpm dev`, then hit `GET http://localhost:4000/api/hello`.
