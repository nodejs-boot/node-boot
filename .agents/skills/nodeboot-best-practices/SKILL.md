---
name: nodeboot-best-practices
description: Use when scaffolding a new Node-Boot application/package, structuring project files, writing app-config.yaml, adding error handling or logging, or setting up tests — to follow the conventions consistently used across every sample project (samples/*) and package in the Node-Boot monorepo rather than inventing new patterns.
---

# Node-Boot Best Practices

These conventions are distilled from cross-checking `samples/sample-express`,
`samples/sample-fastify`, and `samples/sample-lambda`. When in doubt, mirror the closest existing
sample rather than improvising a new structure.

## Project structure

```
src/
  app.ts                # @NodeBootApplication entry point — only @Enable...() + NodeBoot.run(...)
  config/                # @Configuration classes (server, security, class-transform, multi-config)
  auth/                   # authorization resolvers (LoggedInUserResolver, DefaultAuthorizationResolver)
  clients/                # @HttpClient-decorated classes (starter-http)
  middlewares/            # @Middleware / @ErrorHandler classes
  models/                 # DTOs (class-validator decorated) + persistence entities
  persistence/            # TypeORM-specific overrides (naming strategy, datasource overrides, seed data)
  <domain>/               # feature folders: Controller + Service (+ Repository if persistence)
app-config.yaml            # base config, committed
app-config.local.yaml      # local overrides, typically gitignored
jest.config.js              # @swc/jest transform — fast TS test runs without ts-jest
```

`app.ts` should stay a thin composition root: only `@Enable...()` decorators + `@NodeBootApplication()`

-   `NodeBoot.run(XxxServer)`. Never put business logic there.

## `app-config.yaml` conventions

-   Top-level `app:` (name, platform, environment, port, `defaultErrorHandler`), `api:` (routePrefix,
    param defaults, `validations:` block mirroring `class-validator`'s `ValidatorOptions`), and
    `server:` (cors, framework-specific options) sections.
    See `samples/sample-express/app-config.yaml` for the canonical shape.
-   Third-party integrations (OpenAI, AWS, Firebase, Supabase, ...) live under `integrations.<name>`
    and are read via `config.getOptional(...)`/`config.get(...)` inside a starter's `@Configuration`
    — see `nodeboot-extending-nodeboot` Flavour 1/5/6 for the pattern.
-   Use `app-config.<profile>.yaml` + `@Profile([...])` for environment-specific overrides instead of
    branching on `process.env.NODE_ENV` in code.

## Error handling

Implement a single app-level `@ErrorHandler()` class implementing `ErrorHandlerInterface` that logs
via the injected `winston` `Logger` and maps `HttpError.httpCode` (from `@nodeboot/error`) to a
consistent JSON error shape (`{message, statusCode}`). See
`samples/sample-express/src/middlewares/ErrorMiddleware.ts`. Throw `HttpError` subclasses (or
`class-validator` failures, which the validation starter already converts) from services/controllers
rather than raw `Error`s, so the status code carries through.

## Dependency injection

Always pair `@EnableDI(Container)` (from `@nodeboot/di`, backed by `typedi`) with
`@EnableComponentScan()` unless you have an explicit reason to use `@Controllers`/`@Configurations`
lists (tests, serverless bundles). Import `"reflect-metadata"` as the very first import in the
application entry point — DI decorators rely on it being loaded before any decorated class.

## Testing

-   Use `jest` with `@swc/jest` as the transform (`jest.config.js`: `transform: {"^.+\\.(t|j)sx?$":
"@swc/jest"}`) — fast, no separate compile step.
-   Package-level tests live under `tests/` or co-located `*.test.ts` (both patterns exist in the repo
    — follow whichever the package you're touching already uses).
-   Before opening a PR: `pnpm lint-format && pnpm tsc && pnpm test` from repo root (per
    `CONTRIBUTING.md`) — core/starter changes ripple into samples, so run the full workspace check,
    not just the touched package.

## Documentation hygiene

Every package (`packages/*`, `starters/*`, `servers/*`, `serverless/*`) ships its own `README.md`
(overview, features, usage, configuration) and `CHANGELOG.md`. When adding a decorator/API, update
the owning package's README **and** `USAGE_GUIDE.md` if it's user-facing.

## Validate

`pnpm lint-format && pnpm tsc && pnpm test` from repo root. For a quick smoke test of a single
sample: `cd samples/sample-express && pnpm dev` then hit its documented routes.
