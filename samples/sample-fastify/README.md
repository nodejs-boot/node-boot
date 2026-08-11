# ⚡ Sample Fastify Application — Node-Boot

## Overview

This sample is the Fastify-flavored reference application for the Node-Boot monorepo. It demonstrates the same broad feature set as the Express sample—persistence, authorization, scheduling, HTTP clients, OpenAPI, validation, and actuator support—but boots with `@nodeboot/fastify-server` by calling `NodeBoot.run(FastifyServer)`.

The application entrypoint is `FactsServiceApp` in `src/app.ts`, and `src/server.ts` starts it and logs the configured port on success.

### Application decorators used in `src/app.ts`

| Decorator                                                                  | What it demonstrates                                                                                                         |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `@EnableDI(Container)`                                                     | Uses `typedi` as the dependency injection container.                                                                         |
| `@EnableOpenApi()`                                                         | Enables generated OpenAPI documentation for the controllers.                                                                 |
| `@EnableSwaggerUI()`                                                       | Enables the Swagger UI alongside the generated OpenAPI spec.                                                                 |
| `@EnableAuthorization(LoggedInUserResolver, DefaultAuthorizationResolver)` | Wires Fastify-typed current-user and authorization checkers into Node-Boot authorization.                                    |
| `@EnableActuator()`                                                        | Enables actuator/management support in the sample.                                                                           |
| `@EnableRepositories()`                                                    | Enables TypeORM-backed repositories, entities, migrations, and subscribers.                                                  |
| `@EnableScheduling()`                                                      | Enables cron-style scheduled tasks.                                                                                          |
| `@EnableHttpClients()`                                                     | Enables declarative HTTP clients such as `MicroserviceHttpClient`.                                                           |
| `@EnableValidations()`                                                     | Enables request DTO validation with `class-validator`.                                                                       |
| `@EnableComponentScan()`                                                   | Enables AOT/component scanning so controllers, services, middleware, and configuration classes are discovered automatically. |
| `@NodeBootApplication()`                                                   | Marks the class as the Node-Boot application bootstrap class.                                                                |

## ✨ What This Sample Demonstrates

-   [x] Running a Node-Boot app on Fastify with `FastifyServer` ([`../../servers/fastify-server/README.md`](../../servers/fastify-server/README.md))
-   [x] Authorization with `@Authorized()` plus Fastify-typed resolvers ([`../../packages/authorization/README.md`](../../packages/authorization/README.md))
-   [x] TypeORM persistence, migrations, repositories, naming strategies, and entity subscribers ([`../../starters/persistence/README.md`](../../starters/persistence/README.md))
-   [x] Scheduled jobs with `@Scheduler(...)` ([`../../starters/scheduler/README.md`](../../starters/scheduler/README.md))
-   [x] Declarative outbound HTTP clients with `@HttpClient(...)` ([`../../starters/http/README.md`](../../starters/http/README.md))
-   [x] OpenAPI generation and Swagger UI ([`../../starters/openapi/README.md`](../../starters/openapi/README.md))
-   [x] DTO validation with `class-validator` and `@EnableValidations()` ([`../../starters/validation/README.md`](../../starters/validation/README.md))
-   [x] Actuator support enabled in the application bootstrap ([`../../starters/actuator/README.md`](../../starters/actuator/README.md))

## 📦 Prerequisites

-   Node.js `>=18`
-   pnpm `>=7.5.1` (the repo declares `pnpm@10.17.1`)
-   Install dependencies from the monorepo root
-   No external database is required; the sample uses `better-sqlite3`

## 🚀 Getting Started

From the monorepo root:

```sh
pnpm install
pnpm --filter @nodeboot/fastify-sample dev
```

Useful alternatives:

```sh
pnpm --filter @nodeboot/fastify-sample start
pnpm --filter @nodeboot/fastify-sample start:prod
```

The checked-in `app-config.yaml` contains no secrets. Its real structure includes:

```yaml
app:
    name: "facts-service"
    platform: "tech-insights"
    environment: "development"
    defaultErrorHandler: false
    port: 3000

api:
    routePrefix: "/api"
    validations:
        enableDebugMessages: true

server:
    cors:
        origin: "*"
    multipart:
        throwFileSizeLimit: true

persistence:
    type: "better-sqlite3"
    synchronize: false
    migrationsRun: true
    better-sqlite3:
        database: "fastify-sample.db"
```

Notes:

-   Controller routes are prefixed by `/api` from `app-config.yaml`.
-   Controllers in this sample use API version `v1`.
-   `@EnableOpenApi()` and `@EnableSwaggerUI()` are enabled; see the OpenAPI starter docs for the generated documentation routes.

## 🗂️ Project Structure

```text
samples/sample-fastify/
├── app-config.yaml
├── src/
│   ├── app.ts                          # Node-Boot bootstrap using NodeBoot.run(FastifyServer)
│   ├── server.ts                       # Starts FactsServiceApp
│   ├── auth/
│   │   ├── DefaultAuthorizationResolver.ts
│   │   └── LoggedInUserResolver.ts
│   ├── clients/
│   │   └── MicroserviceHttpClient.ts
│   ├── config/
│   │   ├── AppConfigProperties.ts
│   │   ├── ClassTransformConfiguration.ts
│   │   ├── MultipleConfigurations.ts
│   │   ├── SecurityConfiguration.ts
│   │   └── ServerConfiguration.ts
│   ├── controllers/
│   │   ├── hello.controller.ts
│   │   ├── paging.controller.ts
│   │   └── users.controller.ts
│   ├── exceptions/
│   │   └── httpException.ts
│   ├── interfaces/
│   │   └── users.interface.ts
│   ├── middlewares/
│   │   ├── CustomErrorHandler.ts
│   │   └── LoggingMiddleware.ts
│   ├── models/
│   │   ├── CreateUserDto.ts
│   │   ├── UpdateUserDto.ts
│   │   └── UserModel.ts
│   ├── persistence/
│   │   ├── entities/User.ts
│   │   ├── repositories/{UserRepository,PagingUserRepository}.ts
│   │   ├── migrations/*.ts
│   │   ├── listeners/*.ts
│   │   ├── CustomNamingStrategy.ts
│   │   ├── DatasourceOverridesConfiguration.ts
│   │   └── users.init.ts
│   └── services/
│       ├── greeting.service.ts
│       ├── schedulers.component.ts
│       └── users.service.ts
└── package.json
```

## 📡 API Endpoints

All controller routes below are under the `/api/v1` base path.

### `HelloController` (`/hello`)

| Method | Path             | Purpose                                              |
| ------ | ---------------- | ---------------------------------------------------- |
| `GET`  | `/api/v1/hello/` | Returns the sample greeting string: `Hello, World!`. |

### `PagingUserController` (`/paging`)

| Method | Path                              | Purpose                                                                         |
| ------ | --------------------------------- | ------------------------------------------------------------------------------- |
| `GET`  | `/api/v1/paging/paginated`        | Returns a page of users using Node-Boot `PagingRequest` query parameters.       |
| `GET`  | `/api/v1/paging/cursor`           | Returns cursor-based pagination results using `CursorRequest` query parameters. |
| `GET`  | `/api/v1/paging/paginated/filter` | Returns a paginated result filtered to `email = "example3@email.com"`.          |
| `GET`  | `/api/v1/paging/cursor/filter`    | Returns cursor-based results filtered to `email = "example3@email.com"`.        |

### `UserController` (`/users`)

| Method   | Path                      | Purpose                                                                       |
| -------- | ------------------------- | ----------------------------------------------------------------------------- |
| `GET`    | `/api/v1/users/`          | Returns all local users from the SQLite-backed repository.                    |
| `GET`    | `/api/v1/users/external/` | Returns users fetched from the external JSONPlaceholder API.                  |
| `GET`    | `/api/v1/users/query/`    | Returns users loaded through the repository's custom query builder example.   |
| `GET`    | `/api/v1/users/:id`       | Returns a single user by numeric id.                                          |
| `POST`   | `/api/v1/users/`          | Creates a user from `CreateUserDto`; protected with `@Authorized()`.          |
| `PUT`    | `/api/v1/users/:id`       | Updates a user password using `UpdateUserDto`.                                |
| `DELETE` | `/api/v1/users/:id`       | Demonstrates transactional delete and rollback behavior in the service layer. |

## 🔐 Authorization

Authorization is enabled with:

-   `LoggedInUserResolver implements CurrentUserChecker<FastifyRequest, FastifyReply>`
-   `DefaultAuthorizationResolver implements AuthorizationChecker<FastifyRequest, FastifyReply>`

That Fastify typing is important in this sample: both resolvers are explicitly written against Fastify's `FastifyRequest` and `FastifyReply`, matching the Fastify server adapter. See `../../servers/fastify-server/README.md` → `## 🔐 Authorization and current user integration` for the framework-level explanation.

How the demo works:

-   `LoggedInUserResolver` logs the lookup and returns a stub current user object (`id: 1`, `username: "exampleUser"`).
-   `DefaultAuthorizationResolver` logs the check and uses a stub user with roles `USER` and `ADMIN`.
-   `POST /api/v1/users/` is the only controller action decorated with `@Authorized()`.
-   Because that action does not pass explicit roles, the resolver allows the request when a user is present.

## 🧩 Middlewares

### `LoggingMiddleware`

-   Registered with `@Middleware({type: "before"})`
-   Implements `MiddlewareInterface<FastifyRequest, FastifyReply, HookHandlerDoneFunction>`
-   Logs each incoming request before controller handling

### `CustomErrorHandler`

-   Registered with `@ErrorHandler()`
-   Implements `ErrorHandlerInterface<FastifyError, FastifyRequest, FastifyReply>`
-   If Fastify raises `FST_ERR_BAD_STATUS_CODE`, it logs the error and returns `500` with `{ok: false}`
-   Otherwise it delegates back to Fastify by calling `response.send(error)`

## 💾 Persistence

The persistence layer is enabled with `@EnableRepositories()` and uses TypeORM plus `better-sqlite3`.

Highlights:

-   `DatasourceOverridesConfiguration` sets `type: "better-sqlite3"`, `database: "fastify-sample.db"`, `synchronize: false`, and `migrationsRun: true`.
-   `User` is the main entity with `id`, `email`, `password`, and optional `name` fields.
-   `CustomNamingStrategy` prefixes table names with `nb-`, so the user table becomes `nb-user`.
-   `Migration1701774002463` creates `nb-user` with `id`, `email`, and `password`.
-   `Migration1701786331338` adds the nullable `name` column.
-   `users.init.ts` seeds four demo users when the repository is empty.
-   `UserRepository` adds a custom `findByQueryIn()` query-builder example.
-   `PagingUserRepository` extends `PagingAndSortingRepository<User>` for paginated access.
-   `GlobalEntityEventListener` logs entity lifecycle and transaction lifecycle events.
-   `UserEntityEventListener` listens only to `User` inserts and calls `GreetingService.sayHello(...)` after insertion.
-   `UserService` uses `@Transactional()` on create, update, and delete operations; the delete path intentionally throws after deletion to demonstrate rollback hooks.

Related source files outside `src/persistence/`:

-   `models/CreateUserDto.ts` validates `email`, `name`, and `password`
-   `models/UpdateUserDto.ts` validates `password`
-   `models/UserModel.ts` provides the OpenAPI-facing response model
-   `exceptions/httpException.ts` defines a simple `HttpError` subclass
-   `interfaces/users.interface.ts` defines a basic user shape (`id`, `email`, `password`)

## ⏰ Scheduling / 🌐 HTTP Clients as applicable

### Scheduling

`src/services/schedulers.component.ts` defines three scheduled jobs:

-   `@Scheduler("*/1 * * * *")` → `fastTask()` logs every minute
-   `@Scheduler("*/5 * * * *")` → `cleanUp()` logs every five minutes
-   `@Scheduler("0 9 * * *")` → `morningRoutine()` logs every day at 9 AM

### HTTP Clients

`src/clients/MicroserviceHttpClient.ts` demonstrates the HTTP starter with:

-   `@HttpClient({ baseURL: "https://jsonplaceholder.typicode.com", timeout: 5000, httpLogging: true })`
-   a typed client stub used by `UserService.findExternalUsers()` to call `GET /users`

## 📚 Available Scripts

| Script                                                    | Purpose                                                                 |
| --------------------------------------------------------- | ----------------------------------------------------------------------- |
| `pnpm --filter @nodeboot/fastify-sample dev`              | Runs the sample in development mode through `nodemon`.                  |
| `pnpm --filter @nodeboot/fastify-sample start`            | Cleans, builds, and runs `dist/server.js`.                              |
| `pnpm --filter @nodeboot/fastify-sample start:prod`       | Builds and runs the production entrypoint with `NODE_ENV=production`.   |
| `pnpm --filter @nodeboot/fastify-sample build`            | Compiles TypeScript using `tsconfig.build.json`.                        |
| `pnpm --filter @nodeboot/fastify-sample postbuild`        | Runs Node-Boot AOT generation with `@nodeboot/aot`.                     |
| `pnpm --filter @nodeboot/fastify-sample clean:build`      | Removes `dist/`.                                                        |
| `pnpm --filter @nodeboot/fastify-sample lint`             | Runs ESLint on `.js` and `.ts` files.                                   |
| `pnpm --filter @nodeboot/fastify-sample lint:fix`         | Runs ESLint with `--fix`.                                               |
| `pnpm --filter @nodeboot/fastify-sample format`           | Checks formatting with Prettier.                                        |
| `pnpm --filter @nodeboot/fastify-sample format:fix`       | Writes formatting fixes with Prettier.                                  |
| `pnpm --filter @nodeboot/fastify-sample test`             | Builds first, then runs the Node test suite through `ts-node/register`. |
| `pnpm --filter @nodeboot/fastify-sample test:coverage`    | Runs the test suite with Node's experimental coverage mode.             |
| `pnpm --filter @nodeboot/fastify-sample tsc`              | Runs the TypeScript compiler.                                           |
| `pnpm --filter @nodeboot/fastify-sample rebuild:sqlite`   | Rebuilds `better-sqlite3`.                                              |
| `pnpm --filter @nodeboot/fastify-sample create:migration` | Creates a new TypeORM migration under `src/persistence/migrations/`.    |
| `pnpm --filter @nodeboot/fastify-sample nodeboot:update`  | Updates `@nodeboot/*` dependencies to the latest versions.              |

## 📄 License

MIT
