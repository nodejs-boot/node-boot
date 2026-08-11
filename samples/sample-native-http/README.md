# 🧵 Sample Native HTTP Application — Node-Boot

## Overview

This sample boots Node-Boot with `NodeBoot.run(HttpServer)`, using [`@nodeboot/http-server`](../../servers/http-server/README.md): the zero-framework-dependency server adapter built directly on Node's native `http` module and the `find-my-way` router.

It shows that a Node-Boot application can keep the same decorator-driven programming model without Express, Fastify, or Koa while still using persistence, authorization, scheduling, HTTP clients, OpenAPI/Swagger, validation, and actuator endpoints.

The application starts on port `3000`, serves its API under `/api`, and defines versioned controllers under `/v1/...`.

## ✨ What This Sample Demonstrates

-   [x] Native HTTP bootstrapping with [`@nodeboot/http-server`](../../servers/http-server/README.md)
-   [x] Authorization and current-user resolvers with [`@nodeboot/authorization`](../../packages/authorization/README.md)
-   [x] SQLite persistence, repositories, transactions, migrations, and entity listeners with [`@nodeboot/starter-persistence`](../../starters/persistence/README.md)
-   [x] Cron-style scheduled jobs with [`@nodeboot/starter-scheduler`](../../starters/scheduler/README.md)
-   [x] Outbound HTTP clients with [`@nodeboot/starter-http`](../../starters/http/README.md)
-   [x] OpenAPI generation and Swagger UI with [`@nodeboot/starter-openapi`](../../starters/openapi/README.md)
-   [x] DTO/model validation with [`@nodeboot/starter-validation`](../../starters/validation/README.md)
-   [x] Operational endpoints with [`@nodeboot/starter-actuator`](../../starters/actuator/README.md)

### Application decorators in `src/app.ts`

`FactsServiceApp` combines these decorators to enable the sample's features:

-   `@EnableDI(Container)` — enables dependency injection with TypeDI.
-   `@EnableOpenApi()` — generates the OpenAPI spec.
-   `@EnableSwaggerUI()` — serves the interactive Swagger UI.
-   `@EnableAuthorization(LoggedInUserResolver, DefaultAuthorizationResolver)` — wires the demo current-user and authorization checkers.
-   `@EnableActuator()` — exposes `/actuator/*` operational endpoints.
-   `@EnableRepositories()` — enables repository discovery for TypeORM-backed persistence.
-   `@EnableScheduling()` — enables cron-based scheduled methods.
-   `@EnableHttpClients()` — enables decorated outbound HTTP clients.
-   `@EnableValidations()` — enables request DTO validation.
-   `@EnableComponentScan()` — enables AOT/component scanning.
-   `@NodeBootApplication()` — marks the class as the application entry point.

## 📦 Prerequisites

-   Node.js
-   `pnpm`
-   Monorepo dependencies installed from the repository root (`pnpm install`)
-   A runtime able to build `better-sqlite3` if needed

## 🚀 Getting Started

From the repository root:

```bash
pnpm install
pnpm --filter @nodeboot/native-http-sample run start
```

Useful alternatives:

```bash
pnpm --filter @nodeboot/native-http-sample run dev
pnpm --filter @nodeboot/native-http-sample run start:prod
```

Once running:

-   API base URL: `http://localhost:3000/api`
-   Swagger UI: `http://localhost:3000/api-docs/`
-   OpenAPI JSON: `http://localhost:3000/api-docs/swagger.json`
-   Actuator root: `http://localhost:3000/actuator`

### Runtime configuration

`app-config.yaml` defines these committed settings:

-   `app.port: 3000`
-   `api.routePrefix: /api`
-   validation options under `api.validations`
-   CORS options under `server.cors`
-   multipart-related limits under `server.multipart`
-   OpenAPI metadata under `openapi`
-   SQLite persistence under `persistence` using `better-sqlite3`

No secrets are present in the committed sample config.

### Configuration classes present in this sample

-   `AppConfigProperties` binds the `app` section from `app-config.yaml`
-   `ClassTransformConfiguration` sets class-transform options and disables the class transformer via `@EnableClassTransformer({enabled: false})`
-   `ServerConfiguration` exposes `HttpServerConfigs` from config, including cookie/cors/session/multipart/template option slots

## 🗂️ Project Structure

```text
src/
├── app.ts                          # Application class; boots Node-Boot with HttpServer
├── server.ts                       # Process entry point
├── auth/
│   ├── DefaultAuthorizationResolver.ts
│   └── LoggedInUserResolver.ts
├── clients/
│   └── MicroserviceHttpClient.ts   # Outbound HTTP client for jsonplaceholder.typicode.com
├── config/
│   ├── AppConfigProperties.ts
│   ├── ClassTransformConfiguration.ts
│   └── ServerConfiguration.ts
├── controllers/
│   ├── hello.controller.ts
│   ├── paging.controller.ts
│   └── users.controller.ts
├── exceptions/
│   └── httpException.ts
├── interfaces/
│   └── users.interface.ts
├── middlewares/
│   ├── CustomErrorHandler.ts
│   └── LoggingMiddleware.ts
├── models/
│   ├── CreateUserDto.ts
│   ├── UpdateUserDto.ts
│   ├── UserModel.ts
│   └── index.ts
├── persistence/
│   ├── entities/User.ts
│   ├── repositories/
│   ├── listeners/
│   ├── migrations/
│   ├── CustomNamingStrategy.ts
│   ├── DatasourceOverridesConfiguration.ts
│   └── users.init.ts
└── services/
    ├── greeting.service.ts
    ├── schedulers.component.ts
    └── users.service.ts
```

## 📡 API Endpoints

Base prefix from configuration: `/api`

### HelloController

Controller decorator: `@Controller("/hello", "v1")`

-   `GET /api/v1/hello/` — returns `"Hello, World!"`

### PagingUserController

Controller decorator: `@Controller("/paging", "v1")`

-   `GET /api/v1/paging/paginated` — returns a `Page<UserModel>` using `PagingRequest` query params
-   `GET /api/v1/paging/cursor` — returns a `CursorPage<UserModel>` using `CursorRequest` query params
-   `GET /api/v1/paging/paginated/filter` — paginated results filtered to `email = "example3@email.com"`
-   `GET /api/v1/paging/cursor/filter` — cursor-paginated results filtered to `email = "example3@email.com"`

### UserController

Controller decorator: `@Controller("/users", "v1")`

-   `GET /api/v1/users/` — lists persisted users
-   `GET /api/v1/users/external/` — fetches users from `https://jsonplaceholder.typicode.com/users`
-   `GET /api/v1/users/query/` — returns users from a custom repository query (`id IN (1, 2)`)
-   `GET /api/v1/users/:id` — fetches one user by id
-   `POST /api/v1/users/` — creates a user, returns `201`, and is decorated with `@Authorized()`
-   `PUT /api/v1/users/:id` — updates a user using `UpdateUserDto`
-   `DELETE /api/v1/users/:id` — deletes a user, then intentionally throws to demonstrate transaction rollback behavior

### Request/response models

-   `CreateUserDto`
    -   `email`: `@IsEmail()`
    -   `name`: `@IsString()`
    -   `password`: `@IsString()`, `@IsNotEmpty()`, `@MinLength(9)`, `@MaxLength(32)`
-   `UpdateUserDto`
    -   `password`: `@IsString()`, `@IsNotEmpty()`, `@MinLength(9)`, `@MaxLength(32)`
-   `UserModel`
    -   OpenAPI model with `id`, `email`, and optional `name`

## 🔐 Authorization

This sample uses [`@EnableAuthorization`](../../packages/authorization/README.md) with two demo resolvers:

-   `LoggedInUserResolver` implements `CurrentUserChecker<IncomingMessage, ServerResponse>`
-   `DefaultAuthorizationResolver` implements `AuthorizationChecker<IncomingMessage, ServerResponse>`

Both are explicitly typed against Node's native `IncomingMessage` and `ServerResponse`, matching the native HTTP adapter.

Behavior shown here:

-   `LoggedInUserResolver` logs and returns a hard-coded current user object
-   `DefaultAuthorizationResolver` logs and authorizes a hard-coded user with roles `USER` and `ADMIN`
-   `POST /api/v1/users/` is the only route protected with `@Authorized()` in this sample

For adapter details, see the authorization section in the [`@nodeboot/http-server` README](../../servers/http-server/README.md). That README also documents current native-adapter limitations relevant here: session-based decorators and multipart/file-upload decorators are not implemented.

## 🧩 Middlewares

-   `LoggingMiddleware`
    -   Decorated with `@Middleware({type: "before"})`
    -   Runs before requests and logs `Logging Middleware: Incoming request`
-   `CustomErrorHandler`
    -   Decorated with `@ErrorHandler()`
    -   Implements `ErrorHandlerInterface<HttpError, IncomingMessage, ServerResponse>`
    -   Writes a JSON error response with `message` and `statusCode`

The sample config sets `app.defaultErrorHandler: false`, so the custom handler is intended to replace the default global handler.

## 💾 Persistence

Persistence is enabled with [`@EnableRepositories()`](../../starters/persistence/README.md) and uses TypeORM plus `better-sqlite3`.

### What is included

-   `User` entity with `id`, `email`, `password`, and nullable `name`
-   `UserRepository` with a custom `findByQueryIn()` query builder example
-   `PagingUserRepository` extending `PagingAndSortingRepository<User>`
-   `CustomNamingStrategy` that prefixes table names with `nb-`
-   `DatasourceOverridesConfiguration` showing programmatic datasource configuration
-   `users.init.ts` seeding four users when the table is empty
-   two migrations:
    -   `1701774002463-migration.ts` creates table `nb-user`
    -   `1701786331338-migration.ts` adds nullable `name`

### Transactions and listeners

`UserService` demonstrates transactional helpers:

-   `@Transactional()` on create, update, and delete methods
-   `runOnTransactionCommit(...)` during user creation
-   `runOnTransactionRollback(...)` during user deletion

Entity listeners demonstrate lifecycle hooks:

-   `UserEntityEventListener` logs before/after inserting `User` and calls `GreetingService.sayHello(...)`
-   `GlobalEntityEventListener` logs load, insert, update, remove, soft-remove, recover, and transaction events globally

### Config notes

In `app-config.yaml`, persistence is configured with:

-   `type: better-sqlite3`
-   `synchronize: false`
-   `migrationsRun: true`
-   database file `sample-database.db`

The sample also includes `DatasourceOverridesConfiguration`, which hardcodes a `better-sqlite3` datasource as an additional programmatic configuration example.

## ⏰ Scheduling / 🌐 HTTP Clients

### Scheduling

`SchedulersComponent` contains three scheduled methods enabled by [`@EnableScheduling()`](../../starters/scheduler/README.md):

-   `@Scheduler("*/1 * * * *")` — every minute
-   `@Scheduler("*/5 * * * *")` — every five minutes
-   `@Scheduler("0 9 * * *")` — every day at 9 AM

Each logs when it runs.

### HTTP client

`MicroserviceHttpClient` extends `HttpClientStub` and is decorated with:

-   `@HttpClient({ baseURL: "https://jsonplaceholder.typicode.com", timeout: 5000, httpLogging: true })`

`UserService.findExternalUsers()` uses it to call `GET /users` on that external API.

## 📚 Available Scripts

From `package.json`:

-   `pnpm run start` — clean, build, then run `dist/server.js`
-   `pnpm run start:prod` — build and run in production mode
-   `pnpm run dev` — run with `nodemon` in development mode
-   `pnpm run nodeboot:update` — update `@nodeboot/*` packages
-   `pnpm run build` — compile TypeScript with `tsconfig.build.json`
-   `pnpm run postbuild` — run Node-Boot AOT generation (`npx @nodeboot/aot node-boot-aot`)
-   `pnpm run clean:build` — remove `dist/`
-   `pnpm run lint` — run ESLint
-   `pnpm run lint:fix` — run ESLint with `--fix`
-   `pnpm run format` — check Prettier formatting
-   `pnpm run format:fix` — apply Prettier formatting
-   `pnpm run test` — run Jest (`--passWithNoTests`)
-   `pnpm run tsc` — run TypeScript compiler
-   `pnpm run rebuild:sqlite` — rebuild `better-sqlite3`
-   `pnpm run create:migration` — create a TypeORM migration under `src/persistence/migrations/`

## 📄 License

MIT
