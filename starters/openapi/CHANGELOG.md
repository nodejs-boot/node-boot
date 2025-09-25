# @nodeboot/starter-openapi

## 2.4.1

### Patch Changes

-   Add support for time related objects (luxon DateTime and Timestamp)

## 2.4.0

### Minor Changes

-   Upgrade typescript, fix eslint and fix aot openapi model generation

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.12.0
    -   @nodeboot/engine@1.5.0

## 2.3.0

### Minor Changes

-   Fix fastify dependency compatibility

## 2.2.2

### Patch Changes

-   Small fix to support primitive response types

## 2.2.1

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.11.1
    -   @nodeboot/engine@1.4.1

## 2.2.0

### Minor Changes

-   Add support for Application profiles

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.11.0
    -   @nodeboot/engine@1.4.0

## 2.1.1

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.10.0
    -   @nodeboot/engine@1.3.1

## 2.1.0

### Minor Changes

-   Fix Swagger UI paths

## 2.0.1

### Patch Changes

-   Updated dependencies
    -   @nodeboot/engine@1.3.0

## 2.0.0

### Major Changes

-   OpenAPI refactor to use custom/unique swagger UI. Usage of AOT to generate OpenAPI specs at compile time

### Patch Changes

-   Updated dependencies
    -   @nodeboot/engine@1.2.4

## 1.13.0

### Minor Changes

-   Exclude controller name from OpenAPI operation ID

## 1.12.0

### Minor Changes

-   Combine dataClass, validation and precompiled schemas to create the final API schema

## 1.11.0

### Minor Changes

-   Integrate pre-compiled schemas into openAPI spec

## 1.10.0

### Minor Changes

-   Add support for union types through anyof, oneOf and allOf

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.9.0
    -   @nodeboot/engine@1.2.3

## 1.9.0

### Minor Changes

-   Extend OpenAPI model resolution feature to support raw types and inheritance

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.8.0
    -   @nodeboot/engine@1.2.2

## 1.8.1

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.7.1
    -   @nodeboot/engine@1.2.1

## 1.8.0

### Minor Changes

-   Upgrade typescript to latest version 5.8.3

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.7.0
    -   @nodeboot/engine@1.2.0

## 1.7.6

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.6.0
    -   @nodeboot/engine@1.1.10

## 1.7.5

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.5.0
    -   @nodeboot/engine@1.1.9

## 1.7.4

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.4.1
    -   @nodeboot/engine@1.1.8

## 1.7.3

### Patch Changes

-   Updated dependencies
    -   @nodeboot/engine@1.1.7

## 1.7.2

### Patch Changes

-   Updated dependencies
    -   @nodeboot/engine@1.1.6

## 1.7.1

### Patch Changes

-   Fix issue in regards to item types in arrays

## 1.7.0

### Minor Changes

-   Cleanup OpenAPI decorators like Model and Property to improve type resolution

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.4.0
    -   @nodeboot/engine@1.1.5

## 1.6.2

### Patch Changes

-   Updated dependencies
    -   @nodeboot/engine@1.1.4
    -   @nodeboot/context@1.3.1

## 1.6.1

### Patch Changes

-   Fix issue resolving Array type for the schema deffinitions

## 1.6.0

### Minor Changes

-   Fixing OpenAPI schema resolutions

## 1.5.0

### Minor Changes

-   Move Model decorator from core to open-api package and apply Model decorator to response Classes when using ResponseSchema decorator

## 1.4.0

### Minor Changes

-   Externalize OpenAPI configurations to configration properties

### Patch Changes

-   Updated dependencies
    -   @nodeboot/context@1.3.0
    -   @nodeboot/engine@1.1.3

## 1.3.2

### Patch Changes

-   Change Model property options to include type as string instead of string or Function

## 1.3.1

### Patch Changes

-   Adding changesets
-   Updated dependencies
    -   @nodeboot/context@1.2.1
    -   @nodeboot/engine@1.1.2
