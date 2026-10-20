# @nodeboot/error

## 1.4.2

### Patch Changes

-   33e53cc: Fixed two bugs affecting controllers and custom errors.

    -   Controller methods now receive their parameters in the right positions. Previously, an absent optional parameter or a falsy value (`undefined`, `null`, `0`, `false`, `""`) was dropped, so every parameter after it shifted one position left and received the wrong value.
    -   Custom classes that extend `HttpError` (or any built-in HTTP error) now pass `instanceof` checks for their own class without having to reset the prototype by hand.

## 1.4.1

### Patch Changes

-   239b1ab: prepareng for release

## 1.4.0

### Minor Changes

-   9d7981e: Enabling serverless and other features

## 1.3.1

### Patch Changes

-   066f8ea: Nodeboot official release from github actions. Several improvements and documentation

## 1.3.0

### Minor Changes

-   Upgrade typescript, fix eslint and fix aot openapi model generation

## 1.2.0

### Minor Changes

-   Upgrade typescript to latest version 5.8.3

## 1.1.2

### Patch Changes

-   Adding changesets
