# @nodeboot/engine

## 1.9.1

### Patch Changes

-   33e53cc: Fixed two bugs affecting controllers and custom errors.

    -   Controller methods now receive their parameters in the right positions. Previously, an absent optional parameter or a falsy value (`undefined`, `null`, `0`, `false`, `""`) was dropped, so every parameter after it shifted one position left and received the wrong value.
    -   Custom classes that extend `HttpError` (or any built-in HTTP error) now pass `instanceof` checks for their own class without having to reset the prototype by hand.

-   Updated dependencies
    -   @nodeboot/context@2.6.0
    -   @nodeboot/error@1.4.2

## 1.9.0

### Minor Changes

-   38d3d9e: Several server bugfixes + integration tests for all servers

### Patch Changes

-   239b1ab: prepareng for release
-   Updated dependencies
    -   @nodeboot/context@2.5.1
    -   @nodeboot/error@1.4.1

## 1.8.0

### Minor Changes

-   9d7981e: Enabling serverless and other features

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@2.5.0
    -   @nodeboot/error@1.4.0

## 1.7.0

### Minor Changes

-   7a74fda: Performance improvements

### Patch Changes

-   066f8ea: Nodeboot official release from github actions. Several improvements and documentation
-   Updated dependencies
    -   @nodeboot/context@2.4.0
    -   @nodeboot/error@1.3.1

## 1.6.6

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@2.3.0

## 1.6.5

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@2.2.1

## 1.6.4

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@2.2.0

## 1.6.3

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@2.1.0

## 1.6.2

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@2.0.0

## 1.6.1

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.13.1

## 1.6.0

### Minor Changes

-   237ead1: fixing potential memory leands and improve codebase

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.13.0

## 1.5.0

### Minor Changes

-   Upgrade typescript, fix eslint and fix aot openapi model generation

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.12.0
    -   @nodeboot/error@1.3.0

## 1.4.1

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.11.1

## 1.4.0

### Minor Changes

-   Add support for Application profiles

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.11.0

## 1.3.1

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.10.0

## 1.3.0

### Minor Changes

-   Update Katxupa lib

## 1.2.4

### Patch Changes

-   Several improvements and cleanups

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
    -   @nodeboot/error@1.2.0

## 1.1.10

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.6.0

## 1.1.9

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.5.0

## 1.1.8

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.4.1

## 1.1.7

### Patch Changes

-   Remove target object from validation response

## 1.1.6

### Patch Changes

-   Remove target object from validation result

## 1.1.5

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.4.0

## 1.1.4

### Patch Changes

-   Integrate validations into core decorators
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
    -   @nodeboot/error@1.1.2
