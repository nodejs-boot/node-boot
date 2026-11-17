# @nodeboot/hono-server

## 1.0.3

### Patch Changes

-   f8fb926: An action that answers through `@Res()` itself and returns nothing now keeps its response, instead of the server answering again with a 404.

    -   Express, native HTTP and Encore: an action that sends the response itself (for example `res.writeHead(...)` and `res.end(...)`, or a stream of Server-Sent Events) keeps it. Before, the second answer failed with "Cannot set headers after they are sent". An error thrown after the action already answered is now logged instead of being sent as a second response.
    -   Koa: an action that sets `response.status` and `response.body` itself, or takes over the raw response with `ctx.respond = false`, keeps its answer.
    -   Hono: an action that sets `c.res` itself (for example a streaming `Response`) keeps its answer.

-   Updated dependencies
    -   @nodeboot/engine@1.9.2
    -   @nodeboot/core@2.0.1

## 1.0.2

### Patch Changes

-   33e53cc: Documentation and examples now reflect that Nonna is Node-Boot's default dependency injection container.

    -   Examples no longer decorate the application class with `@EnableDI(Container)` or depend on `typedi`; `@EnableDI(container)` remains available for plugging in another container.
    -   The unused `typedi` dev dependency was removed. There is no runtime change.

-   Updated dependencies
    -   @nodeboot/context@2.6.0
    -   @nodeboot/engine@1.9.1
    -   @nodeboot/error@1.4.2
    -   @nodeboot/core@2.0.0

## 1.0.1

### Patch Changes

-   239b1ab: prepareng for release
-   Updated dependencies
    -   @nodeboot/context@2.5.1
    -   @nodeboot/core@1.17.1
    -   @nodeboot/engine@1.9.0
    -   @nodeboot/error@1.4.1
