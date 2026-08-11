# 🌿 Sample Koa Application — Node-Boot

## Overview

This sample is the Koa-flavored reference application for the Node-Boot monorepo. It demonstrates the same broad feature set as the other server samples, but boots on [`@nodeboot/koa-server`](../../servers/koa-server/README.md) by calling `NodeBoot.run(KoaServer)` from `src/app.ts`.

The app exposes versioned REST controllers under `/api`, enables OpenAPI + Swagger UI, wires authorization and current-user resolution, uses TypeORM repositories and migrations with SQLite, registers schedulers and an HTTP client, and shows custom Koa middleware/error handling.

## ✨ What This Sample Demonstrates

-   [x] Bootstrapping a Node-Boot app on [`@nodeboot/koa-server`](../../servers/koa-server/README.md)
-   [x] Authorization + current-user hooks with [`@nodeboot/authorization`](../../packages/authorization/README.md)
-   [x] Repositories, migrations, subscribers, transactions, and naming strategies with [`@nodeboot/starter-persistence`](../../starters/persistence/README.md)
-   [x] Cron-style scheduled jobs with [`@nodeboot/starter-scheduler`](../../starters/scheduler/README.md)
-   [x] Declarative outbound HTTP clients with [`@nodeboot/starter-http`](../../starters/http/README.md)
-   [x] OpenAPI generation + Swagger UI with [`@nodeboot/starter-openapi`](../../starters/openapi/README.md)
-   [x] DTO validation with [`@nodeboot/starter-validation`](../../starters/validation/README.md)
-   [x] Operational endpoints with [`@nodeboot/starter-actuator`](../../starters/actuator/README.md)

It also shows these application-level decorators in `src/app.ts`:

-   `@EnableDI(Container)` — enables TypeDI-backed dependency injection.
-   `@EnableOpenApi()` — generates an OpenAPI spec for the controllers.
-   `@EnableSwaggerUI()` — serves Swagger UI.
-   `@EnableAuthorization(LoggedInUserResolver, DefaultAuthorizationChecker)` — plugs in current-user resolution and route authorization.
-   `@EnableActuator()` — exposes actuator endpoints.
-   `@EnableRepositories()` — enables persistence repositories, migrations, and subscribers.
-   `@EnableScheduling()` — enables cron-based scheduled methods.
-   `@EnableHttpClients()` — enables the declarative HTTP client stub.
-   `@EnableValidations()` — enables request-body validation.
-   `@EnableComponentScan()` — enables AOT component scanning.
-   `@NodeBootApplication()` — marks the application bootstrap class.

## 📦 Prerequisites

-   Node.js
-   `pnpm`
-   No external database is required; the sample uses `better-sqlite3` with a local `koa-sample.db` file

## 🚀 Getting Started

From the monorepo root:

```bash
pnpm install
pnpm --filter @nodeboot/koa-sample dev
```

Other useful commands:

-   `pnpm --filter @nodeboot/koa-sample start` — clean build, AOT postbuild, then run `dist/server.js`
-   `pnpm --filter @nodeboot/koa-sample start:prod` — production start
-   `pnpm --filter @nodeboot/koa-sample rebuild:sqlite` — rebuild `better-sqlite3` if your local environment needs it

Runtime/configuration highlights from `app-config.yaml`:

```yaml
app:
    name: facts-service
    platform: tech-insights
    environment: development
    defaultErrorHandler: false
    port: 3000

api:
    routePrefix: /api
    validations:
        enableDebugMessages: true

server:
    cors: ...
    multipart: ...

openapi:
    info: ...
    servers:
        - url: http://localhost:3000
    securitySchemes:
        basicAuth:
            scheme: basic
            type: http

persistence:
    type: better-sqlite3
    synchronize: false
    migrationsRun: true
    better-sqlite3:
        database: koa-sample.db
```

With OpenAPI enabled, the starter docs indicate these docs endpoints are available:

-   `GET /api-docs/swagger.json`
-   `GET /api-docs/`
-   `GET /docs` → redirect to Swagger UI

With the actuator starter enabled, operational routes are exposed under `/actuator/*`.

## 🗂️ Project Structure

-   `src/app.ts` — application bootstrap and feature-enabling decorators
-   `src/server.ts` — creates `FactsServiceApp` and starts the Koa server
-   `src/controllers/`
    -   `hello.controller.ts` — simple hello route
    -   `paging.controller.ts` — paginated and cursor-paginated user queries
    -   `users.controller.ts` — CRUD-style user endpoints plus external/custom-query demos
-   `src/exceptions/httpException.ts` — simple `HttpError` subclass for custom HTTP exceptions
-   `src/interfaces/users.interface.ts` — minimal user shape used by the auth resolver
-   `src/auth/`
    -   `DefaultAuthorizationChecker.ts` — authorization checker implementation
    -   `LoggedInUserResolver.ts` — current-user resolver implementation
-   `src/middlewares/`
    -   `LoggingMiddleware.ts` — before-request logging middleware
    -   `CustomErrorHandler.ts` — JSON error handler
-   `src/config/`
    -   `AppConfigProperties.ts` — binds `app.*` config into `app-config`
    -   `ServerConfiguration.ts` — maps Koa server options from config
    -   `SecurityConfiguration.ts` — registers `koa-helmet` and `@koa/cors`
    -   `ClassTransformConfiguration.ts` — configures class-transform behavior
    -   `MultipleConfigurations.ts` — groups configuration classes
-   `src/persistence/`
    -   `entities/User.ts` — TypeORM user entity
    -   `repositories/` — standard and paging repositories
    -   `migrations/` — creates `nb-user` and later adds `name`
    -   `listeners/` — entity lifecycle and transaction subscribers
    -   `CustomNamingStrategy.ts` — prefixes table names with `nb-`
    -   `DatasourceOverridesConfiguration.ts` — annotation-based datasource override
    -   `users.init.ts` — seed data used when the database is empty
-   `src/models/` — DTOs and OpenAPI response model
-   `src/clients/MicroserviceHttpClient.ts` — external HTTP client stub
-   `src/services/` — user service, greeting service, and schedulers

## 📡 API Endpoints

All controller routes are versioned with `v1` and prefixed by `/api`.

### `HelloController` (`src/controllers/hello.controller.ts`)

| Method | Path             | Notes                     |
| ------ | ---------------- | ------------------------- |
| `GET`  | `/api/v1/hello/` | Returns `"Hello, World!"` |

### `PagingUserController` (`src/controllers/paging.controller.ts`)

| Method | Path                              | Notes                                                                     |
| ------ | --------------------------------- | ------------------------------------------------------------------------- |
| `GET`  | `/api/v1/paging/paginated`        | Returns `Page<UserModel>` using `PagingRequest` query params              |
| `GET`  | `/api/v1/paging/cursor`           | Returns `CursorPage<UserModel>` using `CursorRequest` query params        |
| `GET`  | `/api/v1/paging/paginated/filter` | Same as paginated, but filtered to `email = "example3@email.com"`         |
| `GET`  | `/api/v1/paging/cursor/filter`    | Same as cursor pagination, but filtered to `email = "example3@email.com"` |

### `UserController` (`src/controllers/users.controller.ts`)

| Method   | Path                      | Notes                                                                                            |
| -------- | ------------------------- | ------------------------------------------------------------------------------------------------ |
| `GET`    | `/api/v1/users/`          | Returns all users from SQLite                                                                    |
| `GET`    | `/api/v1/users/external/` | Calls the external JSONPlaceholder `/users` API through `MicroserviceHttpClient`                 |
| `GET`    | `/api/v1/users/query/`    | Runs the repository custom query (`id IN (1, 2)`)                                                |
| `GET`    | `/api/v1/users/:id`       | Returns one user by id                                                                           |
| `POST`   | `/api/v1/users/`          | Creates a user, returns `201`, and is protected with `@Authorized("ADMIN")`                      |
| `PUT`    | `/api/v1/users/:id`       | Updates a user using `UpdateUserDto`                                                             |
| `DELETE` | `/api/v1/users/:id`       | Demonstrates transactional rollback: the service deletes, then throws an error to force rollback |

Validation rules used by the DTOs:

-   `CreateUserDto`: `email` must be an email; `name` must be a string; `password` must be a non-empty string with length `9..32`
-   `UpdateUserDto`: `password` must be a non-empty string with length `9..32`
-   `UserModel`: OpenAPI response model with `id`, `email`, and optional `name`

## 🔐 Authorization

Authorization is enabled in `src/app.ts` with:

-   `LoggedInUserResolver`
-   `DefaultAuthorizationChecker`

In this Koa sample, both classes are typed against Koa request/response types from `koa`:

-   `LoggedInUserResolver implements CurrentUserChecker<Request, Response>`
-   `DefaultAuthorizationChecker implements AuthorizationChecker<Request, Response>`

The real filename in this sample is `src/auth/DefaultAuthorizationChecker.ts`.

The demo authorization flow is intentionally simple:

-   `LoggedInUserResolver` logs and returns a hard-coded current user object
-   `DefaultAuthorizationChecker` logs and evaluates requested roles against a hard-coded `["USER", "ADMIN"]` role set
-   `@Authorized("ADMIN")` is applied to `POST /api/v1/users/`

For the framework-specific integration details, see the `Authorization and current user integration` section in [`../../servers/koa-server/README.md`](../../servers/koa-server/README.md) and the package docs in [`../../packages/authorization/README.md`](../../packages/authorization/README.md).

## 🧩 Middlewares

-   `LoggingMiddleware` is decorated with `@Middleware({type: "before"})` and logs every incoming request before controller execution.
-   `CustomErrorHandler` is decorated with `@ErrorHandler()` and returns JSON `{message}` responses using the `HttpError` status code. This matters because `app-config.yaml` sets `app.defaultErrorHandler: false`.
-   `SecurityConfiguration` registers:
    -   `koa-helmet` with `contentSecurityPolicy: false` (the code comments that this is needed when Swagger UI is enabled)
    -   `@koa/cors`

## 💾 Persistence

The sample uses the persistence starter with SQLite (`better-sqlite3`) and migrations enabled.

-   `DatasourceOverridesConfiguration.ts` hard-codes the datasource as:
    -   `type: "better-sqlite3"`
    -   `database: "koa-sample.db"`
    -   `synchronize: false`
    -   `migrationsRun: true`
-   `CustomNamingStrategy.ts` prefixes table names with `nb-`, so the `User` entity maps to `nb-user`
-   Migrations:
    -   `1701774002463-migration.ts` creates `nb-user` with `id`, `email`, and `password`
    -   `1701786331338-migration.ts` adds the nullable `name` column
-   `users.init.ts` contains four seed users; `UserService` inserts them when the repository is empty
-   `UserRepository` demonstrates a custom query builder method: `findByQueryIn()`
-   `PagingUserRepository` extends `PagingAndSortingRepository<User>` for page/cursor APIs
-   Entity subscribers:
    -   `UserEntityEventListener` logs before/after user insertions and calls `GreetingService.sayHello(...)`
    -   `GlobalEntityEventListener` logs entity lifecycle events and transaction start/commit/rollback hooks
-   `UserService` also demonstrates `@Transactional()`, `runOnTransactionCommit(...)`, and `runOnTransactionRollback(...)`

## ⏰ Scheduling / 🌐 HTTP Clients

### Scheduling

`src/services/schedulers.component.ts` registers three scheduled methods:

-   `@Scheduler("*/1 * * * *")` — every minute
-   `@Scheduler("*/5 * * * *")` — every 5 minutes
-   `@Scheduler("0 9 * * *")` — every day at 9:00 AM

### HTTP client

`src/clients/MicroserviceHttpClient.ts` demonstrates the HTTP starter with:

-   `baseURL: "https://jsonplaceholder.typicode.com"`
-   `timeout: 5000`
-   `httpLogging: true`

`UserService.findExternalUsers()` uses that client to call `GET /users`.

## 📚 Available Scripts

| Script                  | Purpose                                                                           |
| ----------------------- | --------------------------------------------------------------------------------- |
| `pnpm start`            | Clean build, run TypeScript build + AOT postbuild, then start the compiled server |
| `pnpm start:prod`       | Build and start with `NODE_ENV=production`                                        |
| `pnpm dev`              | Run with `nodemon` in development mode                                            |
| `pnpm nodeboot:update`  | Update `@nodeboot/*` dependencies                                                 |
| `pnpm build`            | Compile with `tsc -p tsconfig.build.json`                                         |
| `pnpm postbuild`        | Run `npx @nodeboot/aot node-boot-aot`                                             |
| `pnpm clean:build`      | Remove `dist/`                                                                    |
| `pnpm lint`             | Run ESLint                                                                        |
| `pnpm lint:fix`         | Run ESLint with `--fix`                                                           |
| `pnpm format`           | Check formatting with Prettier                                                    |
| `pnpm format:fix`       | Rewrite formatting with Prettier                                                  |
| `pnpm pretest`          | Clean + build before tests                                                        |
| `pnpm test`             | Run Node test runner tests through `ts-node/register`                             |
| `pnpm test:coverage`    | Run tests with experimental coverage                                              |
| `pnpm tsc`              | Run plain TypeScript compilation                                                  |
| `pnpm rebuild:sqlite`   | Rebuild `better-sqlite3`                                                          |
| `pnpm create:migration` | Create a TypeORM migration file under `src/persistence/migrations/`               |

## 📄 License

MIT. See [`LICENSE`](./LICENSE).
