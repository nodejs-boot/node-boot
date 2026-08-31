# Changelog

## 1.2.0

### Minor Changes

-   9d7981e: Enabling serverless and other features

### Patch Changes

-   Updated dependencies
    -   @nodeboot/config@1.4.0
    -   @nodeboot/context@2.5.0
    -   @nodeboot/core@1.17.0
    -   @nodeboot/engine@1.8.0

## 1.1.0

### Minor Changes

-   066f8ea: Supabase starter package implementation

### Patch Changes

-   066f8ea: Nodeboot official release from github actions. Several improvements and documentation
-   Updated dependencies
    -   @nodeboot/config@1.3.8
    -   @nodeboot/context@2.4.0
    -   @nodeboot/core@1.16.4
    -   @nodeboot/engine@1.7.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-14

### Added

-   Initial release of @nodeboot/starter-supabase
-   `@EnableSupabase()` decorator for easy integration
-   Auto-configuration of Supabase client with dependency injection support
-   Support for both service role key and anon key authentication
-   Comprehensive configuration options for auth, database, realtime, and global settings
-   Full TypeScript support with type definitions
-   Detailed documentation and usage examples
