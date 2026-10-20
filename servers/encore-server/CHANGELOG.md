# @nodeboot/encore-server

## 1.3.1

### Patch Changes

-   33e53cc: Documentation and examples now reflect that Nonna is Node-Boot's default dependency injection container.

    -   Examples no longer decorate the application class with `@EnableDI(Container)` or depend on `typedi`; `@EnableDI(container)` remains available for plugging in another container.
    -   The unused `typedi` dev dependency was removed. There is no runtime change.

-   Updated dependencies
    -   @nodeboot/context@2.6.0
    -   @nodeboot/engine@1.9.1
    -   @nodeboot/error@1.4.2
    -   @nodeboot/core@2.0.0

## 1.3.0

### Minor Changes

-   38d3d9e: Several server bugfixes + integration tests for all servers

### Patch Changes

-   239b1ab: prepareng for release
-   Updated dependencies
    -   @nodeboot/context@2.5.1
    -   @nodeboot/core@1.17.1
    -   @nodeboot/engine@1.9.0
    -   @nodeboot/error@1.4.1

## 1.2.0

### Minor Changes

-   9d7981e: Enabling serverless and other features

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@2.5.0
    -   @nodeboot/core@1.17.0
    -   @nodeboot/engine@1.8.0
    -   @nodeboot/error@1.4.0

## 1.1.0

### Minor Changes

-   066f8ea: Encore node-boot server implementation
-   e605339: Add first version of Encore.ts server adapter for Node-Boot, exposing a raw endpoint handler that routes requests through Node-Boot's engine (controllers, DI, middleware, authorization, validation) via a `find-my-way` router.

### Patch Changes

-   066f8ea: Nodeboot official release from github actions. Several improvements and documentation
-   7a74fda: Improve encore server
-   Updated dependencies
    -   @nodeboot/context@2.4.0
    -   @nodeboot/core@1.16.4
    -   @nodeboot/engine@1.7.0
    -   @nodeboot/error@1.3.1
