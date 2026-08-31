# 🔥 Sample Hono Application — Node-Boot

## Overview

`@nodeboot/hono-sample` is the Hono reference app in the Node-Boot monorepo. It boots `HonoServer` from `src/server.ts`, wires the application in `src/app.ts`, and demonstrates how to assemble a production-style Node-Boot service with SQLite/TypeORM persistence, OpenAPI + Swagger UI, request validation, authorization hooks, scheduled jobs, HTTP clients, actuator support, and custom configuration classes. The sample also seeds demo data on startup, runs TypeORM migrations automatically, and includes custom middleware, listeners, and configuration beans.

## ✨ What This Sample Demonstrates

> In `app-config.yaml`, `api.routePrefix` is `/api`, and every controller in this sample is declared with version `"v1"`, so the controller routes resolve under `/api/v1`.

-   [x] **`@NodeBootApplication()`** — defines the application entrypoint and boots the framework with `NodeBoot.run(HonoServer)`. See [Core](../../packages/core/README.md).
-   [x] **`@EnableDI(Container)`** — enables dependency injection with TypeDI for controllers, services, listeners, and resolvers. See [DI](../../packages/di/README.md).
-   [x] **`@EnableComponentScan()`** — enables AOT/component scanning so decorated classes are discovered automatically. See [AOT](../../packages/aot/README.md).
-   [x] **`@EnableOpenApi()`** — generates OpenAPI metadata from controllers, DTOs, and response schemas. See [OpenAPI starter](../../starters/openapi/README.md).
-   [x] **`@EnableSwaggerUI()`** — exposes interactive Swagger UI for the generated OpenAPI spec. See [OpenAPI starter](../../starters/openapi/README.md).
-   [x] **`@EnableAuthorization(LoggedInUserResolver, DefaultAuthorizationResolver)`** — wires custom current-user and authorization checkers into controller security. See [Authorization](../../packages/authorization/README.md).
-   [x] **`@EnableActuator()`** — enables actuator/observability endpoints for runtime inspection. See [Actuator starter](../../starters/actuator/README.md).
-   [x] **`@EnableRepositories()`** — enables TypeORM-backed repositories, migrations, transactions, and entity subscribers. See [Persistence starter](../../starters/persistence/README.md).
-   [x] **`@EnableScheduling()`** — enables cron-style scheduled jobs via `@Scheduler(...)`. See [Scheduler starter](../../starters/scheduler/README.md).
-   [x] **`@EnableHttpClients()`** — enables typed outbound HTTP clients built with `@HttpClient(...)`. See [HTTP starter](../../starters/http/README.md).
-   [x] **`@EnableValidations()`** — enables request validation using `class-validator` DTOs. See [Validation starter](../../starters/validation/README.md).
-   [x] **Hono server adapter** — uses `@nodeboot/hono-server` with route prefixing, middleware integration, native multipart support, and CORS. See [Hono server](../../servers/hono-server/README.md).
-   [x] **Typed configuration properties** — `AppConfigProperties` binds `app.*` into a class, and `ConfigService` is used from application code. See [Config](../../packages/config/README.md).
-   [x] **Custom configuration classes and beans** — the sample registers Hono middleware with `@Configuration()` + `@Bean()`, groups config classes with `@Configurations(...)`, and overrides datasource settings with annotations.
-   [x] **DTO/model metadata** — DTOs use `class-validator`, while response models use `@Model()` / `@Property()` metadata for schema generation.

## 📦 Prerequisites

-   Node.js **18+**
-   pnpm (**10.x recommended**; the repo is pinned to `pnpm@10.17.1`)
-   No external database required — this sample uses local SQLite through `better-sqlite3`

## 🚀 Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Review configuration

The sample reads `app-config.yaml` and can layer local overrides from `app-config.local.yaml`.

Current configuration structure:

```yaml
app:
    name: facts-service
    platform: tech-insights
    environment: development
    defaultErrorHandler: false
    port: 3000
api:
    routePrefix: /api
    nullResultCode: 200
    undefinedResultCode: 200
    paramOptions:
        required: false
    validations:
        enableDebugMessages: false
        skipUndefinedProperties: false
        skipNullProperties: false
        skipMissingProperties: false
        whitelist: false
        forbidNonWhitelisted: false
        forbidUnknownValues: true
        stopAtFirstError: false
server:
    cors: ...
    multipart: ...
openapi:
    info: ...
    servers: ...
    externalDocs: ...
    securitySchemes:
        basicAuth: ...
persistence:
    type: better-sqlite3
    synchronize: false
    cache: true
    migrationsRun: true
    better-sqlite3:
        database: hono-sample.db
```

`app-config.local.yaml` currently demonstrates a local-secret include pattern:

```yaml
credentials:
    $include: app-credentials.local.yaml
```

Keep any real credentials in the included local file instead of committing them to `app-config.yaml`.

### 3. Start the sample in development mode

```bash
pnpm dev
```

`pnpm dev` runs `nodemon`, watches `src/**`, recompiles, rebuilds, and restarts the server using the real bootstrap entrypoint in `src/server.ts`.

### 4. Run tests

```bash
pnpm test
```

### 5. Build or run production-style commands

```bash
pnpm build
pnpm start
pnpm start:prod
```

## 🗂️ Project Structure

```text
src/
├── app.ts                  # Main application class and feature-enabling decorators
├── server.ts               # Real bootstrap entrypoint that creates and starts FactsServiceApp
├── auth/                   # Demo CurrentUserChecker and AuthorizationChecker implementations
├── clients/                # Outbound HTTP client definitions
├── config/                 # Typed config properties and @Configuration/@Bean examples
├── controllers/            # Versioned HTTP controllers and route handlers
├── http/                   # Example HTTP request file for manual testing
├── middlewares/            # Before-request logging and custom error handling
├── models/                 # DTOs and OpenAPI/validation models
├── persistence/            # Entities, repositories, migrations, listeners, datasource config, seed data
└── services/                # Business logic, scheduled jobs, and persistence/http integration
```

### Configuration classes

-   `AppConfigProperties` — binds `app.*` from configuration into a typed class.
-   `ServerConfiguration` — exposes a server configuration bean that maps optional `cors` and `multipart` settings from config (the sample YAML currently configures both).
-   `SecurityConfiguration` — registers Hono's built-in `secureHeaders()` middleware on the Hono application.
-   `ClassTransformConfiguration` — demonstrates class-transformer configuration with `exposeAll` strategies while the transformer feature is currently marked `enabled: false`.
-   `MultipleConfigurations` — demonstrates grouping multiple configuration classes with `@Configurations(...)`.
-   `DatasourceOverridesConfiguration` — demonstrates annotation-based datasource overrides for SQLite (`better-sqlite3`, migrations on, sync off).

## 📡 API Endpoints

### HelloController (`@Controller("/hello", "v1")`)

-   `GET /api/v1/hello/` — returns the plain string `Hello, World!`.
-   `GET /api/v1/hello` — returns a simple object payload with arbitrary properties.
-   `GET /api/v1/hello/complex` — returns a `SampleModel`-shaped response and demonstrates OpenAPI model metadata.

### UserController (`@Controller("/users", "v1")`)

-   `GET /api/v1/users/` — list all persisted users.
-   `GET /api/v1/users/external/` — fetch users from the external demo API via `MicroserviceHttpClient`.
-   `GET /api/v1/users/query/` — run the repository's custom query-builder example (`id IN (1, 2)`).
-   `GET /api/v1/users/:id` — fetch a user by id.
-   `POST /api/v1/users/` — create a user from `CreateUserDto` (**guarded with `@Authorized()`**).
-   `PUT /api/v1/users/:id` — update a user from `UpdateUserDto`.
-   `DELETE /api/v1/users/:id` — delete a user; the service intentionally throws afterward to demonstrate transaction rollback hooks.

### PagingUserController (`@Controller("/paging", "v1")`)

-   `GET /api/v1/paging/paginated` — return a page of users from `PagingUserRepository.findPaginated(...)` using `@QueryParams() PagingRequest`.
-   `GET /api/v1/paging/cursor` — return a cursor page of users using `@QueryParams() CursorRequest`.
-   `GET /api/v1/paging/paginated/filter` — paginated users filtered to `email = "example3@email.com"`.
-   `GET /api/v1/paging/cursor/filter` — cursor-paginated users filtered to `email = "example3@email.com"`.

## 🔐 Authorization

This sample uses `@nodeboot/authorization`, but the implementation is intentionally **demo-only** and does **not** use JWTs, sessions, or a database-backed identity provider.

-   `LoggedInUserResolver` implements `CurrentUserChecker`, logs the check, and returns a hard-coded current user object:
    -   `id: 1`
    -   `username: "exampleUser"`
-   `DefaultAuthorizationResolver` implements `AuthorizationChecker`, logs the check, creates a mock user with roles `USER` and `ADMIN`, and authorizes:
    -   any request when `@Authorized()` is present without role arguments
    -   any request whose required role matches one of the mock roles

In this sample, `@Authorized()` is applied to `POST /api/v1/users/`. For production-ready patterns (including JWT/Firebase-style resolvers and richer role checks), see the [Authorization README](../../packages/authorization/README.md).

## 🧩 Middlewares

-   `LoggingMiddleware` — a global `@Middleware({ type: "before" })` example that logs each incoming request before controller execution.
-   `ErrorMiddleware` — a custom `@ErrorHandler()` that logs `[METHOD] path`, resolves the HTTP status from `HttpError`, and returns a JSON response shaped like:

```json
{
    "message": "...",
    "statusCode": 400
}
```

The sample configuration sets `app.defaultErrorHandler: false`, which makes this custom error-handling path especially relevant.

## 💾 Persistence

The persistence layer is built on `@nodeboot/starter-persistence`, TypeORM, and local SQLite.

-   `User` entity fields: `id`, `email`, `password`, and nullable `name`
-   `CustomNamingStrategy` prefixes table names with `nb-`, so the user table becomes `nb-user`
-   Migrations:
    -   `1701774002463-migration.ts` creates `nb-user` with `id`, `email`, and `password`
    -   `1701786331338-migration.ts` adds the `name` column
-   `DatasourceOverridesConfiguration` also declares SQLite datasource settings in code (`better-sqlite3`, `hono-sample.db`, `synchronize: false`, `migrationsRun: true`)
-   `UserRepository` demonstrates a custom query-builder repository method: `findByQueryIn()`
-   `PagingUserRepository` extends `PagingAndSortingRepository<User>` for page/cursor examples
-   `users.init.ts` seeds four demo users when the table is empty
-   `UserService` demonstrates `@Transactional()` methods plus `runOnTransactionCommit(...)` and `runOnTransactionRollback(...)`
-   Entity subscribers:
    -   `GlobalEntityEventListener` logs load, insert, update, remove, recover, and transaction lifecycle events
    -   `UserEntityEventListener` listens specifically to `User` inserts and calls `GreetingService.sayHello(...)`

Because `persistence.migrationsRun` is enabled, the sample applies migrations automatically on startup.

## ⏰ Scheduling

`SchedulersComponent` demonstrates cron-style scheduled work with `@nodeboot/starter-scheduler`:

-   `*/1 * * * *` — `fastTask()` every minute
-   `*/5 * * * *` — `cleanUp()` every five minutes
-   `0 9 * * *` — `morningRoutine()` every day at 9:00 AM

## 🌐 HTTP Clients

`MicroserviceHttpClient` demonstrates `@nodeboot/starter-http` integration:

-   base URL: `https://jsonplaceholder.typicode.com`
-   timeout: `5000`
-   HTTP logging: enabled

`UserService.findExternalUsers()` uses this client to call `GET /users` on the external service and return the remote payload through `GET /api/v1/users/external/`.

## 📚 Available Scripts

| Script                  | Purpose                                                             |
| ----------------------- | ------------------------------------------------------------------- |
| `pnpm start`            | Clean, build, and run `dist/server.js`.                             |
| `pnpm start:prod`       | Build and run `dist/server.js` with `NODE_ENV=production`.          |
| `pnpm dev`              | Run the nodemon-based development loop.                             |
| `pnpm aot-script`       | Run the AOT cycle-detector script.                                  |
| `pnpm model-gen`        | Run the AOT model-schema generator script.                          |
| `pnpm nodeboot:update`  | Update `@nodeboot/*` dependencies to latest.                        |
| `pnpm build`            | Compile TypeScript with `tsconfig.build.json`.                      |
| `pnpm postbuild`        | Generate AOT artifacts after build.                                 |
| `pnpm clean:build`      | Remove `dist/`.                                                     |
| `pnpm lint`             | Run ESLint.                                                         |
| `pnpm lint:fix`         | Run ESLint with `--fix`.                                            |
| `pnpm format`           | Check formatting with Prettier.                                     |
| `pnpm format:fix`       | Rewrite formatting with Prettier.                                   |
| `pnpm pretest`          | Clean and build before tests.                                       |
| `pnpm test`             | Run the Node test suite with `ts-node/register`.                    |
| `pnpm test:coverage`    | Run tests with experimental coverage output.                        |
| `pnpm tsc`              | Run `tsc`.                                                          |
| `pnpm rebuild:sqlite`   | Rebuild the native `better-sqlite3` dependency.                     |
| `pnpm create:migration` | Create a new TypeORM migration under `src/persistence/migrations/`. |

## 📄 License

MIT
