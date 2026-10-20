# @nodeboot/hono-server

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
