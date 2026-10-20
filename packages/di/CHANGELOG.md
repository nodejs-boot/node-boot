# @nodeboot/di

## 2.0.0

### Major Changes

-   33e53cc: Dependency injection is now powered by Nonna by default. TypeDI and Inversify remain available as a plugin.

    -   Nonna is set up automatically: `@EnableDI(...)` is no longer required, and an application without it uses the Nonna container.
    -   `@EnableDI(container)` is kept for plugging in your own container (TypeDI's `Container`, Inversify, ...). `typedi` and `inversify` stay optional dependencies of `@nodeboot/di` and are never required. Beans are only decorated for TypeDI/Inversify once `@EnableDI(...)` is used.
    -   A plain constructor parameter with no `@Inject(...)` is only resolved by Nonna if you run the `nonna-compile` build step (see the `@nodeboot/di` README). Otherwise add an explicit `@Inject(...)` to each constructor parameter.
    -   In tests, resolve beans with `ApplicationContext.getIocContainer()!.get(...)` from `@nodeboot/context`.

### Minor Changes

-   33e53cc: Apps can now use Nonna's AOT compiler with no per-app configuration.

    -   `@nodeboot/core` and `@nodeboot/di` ship a `.nonna.json` that teaches `nonna-compile` about Node-Boot's decorators (`@Component`, `@Service`, `@Controller`, `@Middleware`, `@Interceptor`, `@Inject`). Add `@nonnajs/compiler` as a dev dependency and run `nonna-compile` before the build.
    -   `@nodeboot/di` re-exports `defineDependencies`, and the generated file imports it from there, so apps don't need a direct `@nonnajs/di` dependency.
    -   `@HttpClient(...)` classes are registered as late-bound tokens, so a service injecting one no longer fails startup validation with "Missing required provider(s)". `@nodeboot/di` is now a runtime dependency of `@nodeboot/starter-http`.

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@2.6.0

## 1.5.1

### Patch Changes

-   239b1ab: prepareng for release
-   Updated dependencies
    -   @nodeboot/context@2.5.1

## 1.5.0

### Minor Changes

-   9d7981e: Enabling serverless and other features

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@2.5.0

## 1.4.8

### Patch Changes

-   066f8ea: Nodeboot official release from github actions. Several improvements and documentation
-   Updated dependencies
    -   @nodeboot/context@2.4.0

## 1.4.7

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@2.3.0

## 1.4.6

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@2.2.1

## 1.4.5

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@2.2.0

## 1.4.4

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@2.1.0

## 1.4.3

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@2.0.0

## 1.4.2

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.13.1

## 1.4.1

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.13.0

## 1.4.0

### Minor Changes

-   Upgrade typescript, fix eslint and fix aot openapi model generation

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.12.0

## 1.3.1

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.11.1

## 1.3.0

### Minor Changes

-   Add support for Application profiles

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.11.0

## 1.2.4

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.10.0

## 1.2.3

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.9.0

## 1.2.2

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.8.0

## 1.2.1

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.7.1

## 1.2.0

### Minor Changes

-   Upgrade typescript to latest version 5.8.3

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.7.0

## 1.1.8

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.6.0

## 1.1.7

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.5.0

## 1.1.6

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.4.1

## 1.1.5

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.4.0

## 1.1.4

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.3.1

## 1.1.3

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.3.0

## 1.1.2

### Patch Changes

-   Adding changesets
-   Updated dependencies
    -   @nodeboot/context@1.2.1
