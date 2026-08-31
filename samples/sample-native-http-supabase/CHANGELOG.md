# Changelog

## 1.4.0

### Minor Changes

-   9d7981e: Enabling serverless and other features

### Patch Changes

-   Updated dependencies
    -   @nodeboot/aot@1.5.0
    -   @nodeboot/authorization@1.4.0
    -   @nodeboot/config@1.4.0
    -   @nodeboot/context@2.5.0
    -   @nodeboot/core@1.17.0
    -   @nodeboot/di@1.5.0
    -   @nodeboot/error@1.4.0
    -   @nodeboot/http-server@1.6.0
    -   @nodeboot/starter-actuator@1.8.0
    -   @nodeboot/starter-http@3.6.0
    -   @nodeboot/starter-openapi@2.5.0
    -   @nodeboot/starter-supabase@1.2.0
    -   @nodeboot/starter-validation@1.3.0

## 1.3.17

### Patch Changes

-   066f8ea: Nodeboot official release from github actions. Several improvements and documentation
-   Updated dependencies
    -   @nodeboot/aot@1.4.1
    -   @nodeboot/authorization@1.3.8
    -   @nodeboot/config@1.3.8
    -   @nodeboot/context@2.4.0
    -   @nodeboot/core@1.16.4
    -   @nodeboot/di@1.4.8
    -   @nodeboot/error@1.3.1
    -   @nodeboot/http-server@1.5.0
    -   @nodeboot/starter-actuator@1.7.8
    -   @nodeboot/starter-http@3.5.8
    -   @nodeboot/starter-openapi@2.4.9
    -   @nodeboot/starter-supabase@1.1.0
    -   @nodeboot/starter-validation@1.2.9

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.16] - 2024-01

### Added

-   Initial release of Native HTTP Server with Supabase Persistence sample
-   Complete CRUD operations for items using Supabase database
-   Health check endpoints with Supabase integration verification
-   OpenAPI/Swagger documentation support
-   Request validation using class-validator
-   TypeScript full type safety support
-   Node-Boot framework integration with all standard starters
-   Dependency injection with TypeDI
-   Logging with Winston
-   Authorization and authentication resolvers

### Features

-   Native Node.js HTTP server using `node:http` module
-   Supabase integration for database operations
-   Full CRUD endpoints for items management
-   Health check and readiness probe endpoints
-   Automatic component scanning
-   Swagger UI for API documentation
-   Environment-based configuration
-   Error handling and logging

## Prior versions

See the main Node-Boot project changelog for prior version history.
