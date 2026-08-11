# 👻 Sample Ghost Server Application — Node-Boot

## Overview

This sample shows how to run a full Node-Boot application with **dependency injection, configuration, persistence, scheduling, and HTTP clients** without opening any HTTP port or registering any routes. It boots with `NodeBoot.run(GhostServer)`, using [`@nodeboot/ghost-server`](../../servers/ghost-server/README.md) as a **no-HTTP adapter**.

That makes it a useful reference for:

-   background workers
-   CLI-style applications
-   auto-configuration checks
-   integration tests that need the full application context without a web server

Unlike the Express, Fastify, Koa, or native HTTP samples, this one has **no `src/controllers/` folder at all**.

## ✨ What This Sample Demonstrates

-   [x] Booting a Node-Boot app with [`@nodeboot/ghost-server`](../../servers/ghost-server/README.md)
-   [x] Using DI with `@EnableDI(Container)` and `@EnableComponentScan()`
-   [x] Using TypeORM repositories, migrations, subscribers, and transactions via [`@nodeboot/starter-persistence`](../../starters/persistence/README.md)
-   [x] Running cron-based scheduled tasks via [`@nodeboot/starter-scheduler`](../../starters/scheduler/README.md)
-   [x] Defining outbound HTTP clients with [`@nodeboot/starter-http`](../../starters/http/README.md)
-   [x] Binding configuration from `app-config.yaml` with `@ConfigurationProperties`
-   [x] Starting successfully even though no HTTP server is listening

This sample does **not** include controllers, OpenAPI, authorization, actuator, or validation starters.

## 📦 Prerequisites

-   Node.js
-   pnpm
-   From the monorepo root, installed workspace dependencies (`pnpm install`)

No external database is required by default. The sample is configured for `better-sqlite3` and creates a local SQLite database file named `express-sample.db` in this sample directory.

## 🚀 Getting Started

From the repository root:

```sh
pnpm install
pnpm --filter @nodeboot/express-ghost-server dev
```

Or from `samples/sample-ghost-server`:

```sh
pnpm dev
```

### What happens when it starts?

-   `src/server.ts` creates `new GhostApp()` and calls `app.start()`.
-   `GhostApp.start()` returns `NodeBoot.run(GhostServer)`.
-   The app context boots normally: DI, configuration, repositories, migrations, subscribers, schedulers, and HTTP clients are registered.
-   **No network port is opened.** Even though `app-config.yaml` contains `app.port: 3000`, `GhostServer` does not bind that port.
-   The process stays alive so scheduled jobs can continue running.

Default application settings in `app-config.yaml`:

```yaml
app:
    name: ghost-service
    platform: tech-insights
    environment: development
    defaultErrorHandler: false
    port: 3000

persistence:
    type: better-sqlite3
    synchronize: false
    cache: true
    migrationsRun: true
    better-sqlite3:
        database: express-sample.db
```

## 🗂️ Project Structure

```text
src/
├── app.ts
├── server.ts
├── clients/
├── config/
├── models/
├── persistence/
└── services/
```

Notably absent: **`src/controllers/`**.

That is intentional. This sample is about using Node-Boot as an application runtime for non-HTTP workloads.

Key files and folders:

-   `src/app.ts` enables:
    -   `@EnableDI(Container)`
    -   `@EnableRepositories()`
    -   `@EnableScheduling()`
    -   `@EnableHttpClients()`
    -   `@EnableComponentScan()`
    -   `@NodeBootApplication()`
-   `src/server.ts` starts the app and logs when startup completes.
-   `src/config/AppConfigProperties.ts` binds the `app` section from `app-config.yaml`.
-   `src/config/ClassTransformConfiguration.ts` disables class transformer support by default and sets both transform strategies to `exposeAll`.
-   `src/config/MultipleConfigurations.ts` groups `ClassTransformConfiguration` and the custom persistence naming strategy.
-   `src/models/` contains `CreateUserDto` and `UpdateUserDto`, which use `class-validator` decorators even though there is no HTTP validation pipeline in this sample.

## ⏰ Scheduled Jobs

`src/services/schedulers.component.ts` is the clearest proof that the app is doing useful work without HTTP.

It registers three cron-based tasks:

-   `fastTask()` → `*/1 * * * *` → every minute
-   `cleanUp()` → `*/5 * * * *` → every five minutes
-   `morningRoutine()` → `0 9 * * *` → every day at 9:00 AM

Each job logs a message through the injected Winston logger. Since there are no controllers or routes to hit, these scheduler logs are the most visible runtime activity after startup.

## 💾 Persistence

This sample uses the same persistence stack you would use in an HTTP app, just without an HTTP layer.

### Entity and repositories

-   `src/persistence/entities/User.ts`
    -   `User` has `id`, `email`, `password`, and optional `name`
-   `src/persistence/repositories/UserRepository.ts`
    -   extends TypeORM `Repository<User>`
    -   adds `findByQueryIn()` using a query builder and `WHERE user.id IN (:...ids)`
-   `src/persistence/repositories/PagingUserRepository.ts`
    -   extends `PagingAndSortingRepository<User>`

### Migrations and naming strategy

-   `1701774002463-migration.ts` creates table `nb-user`
-   `1701786331338-migration.ts` adds the `name` column
-   `CustomNamingStrategy` prefixes generated table names with `nb-`
-   `DatasourceOverridesConfiguration` sets:
    -   `type: better-sqlite3`
    -   `database: express-sample.db`
    -   `synchronize: false`
    -   `migrationsRun: true`

### Entity subscribers

-   `GlobalEntityEventListener`
    -   logs load/insert/update/remove/soft-remove/recover events
    -   logs transaction lifecycle events, including commit and rollback
-   `UserEntityEventListener`
    -   listens only to `User`
    -   logs before/after inserts
    -   calls `GreetingService.sayHello()` after a user is inserted

### Seed data and service layer

-   `src/persistence/users.init.ts` defines four initial users.
-   `UserService` seeds those users when the repository is empty.
-   `UserService.createUser()`, `updateUser()`, and `deleteUser()` are marked `@Transactional()`.
-   `createUser()` registers a transaction commit hook.
-   `deleteUser()` registers a rollback hook and then throws deliberately after deletion, demonstrating rollback behavior.

## 🌐 HTTP Clients

`src/clients/MicroserviceHttpClient.ts` shows that outbound HTTP support still works in a Ghost server application.

It is declared with:

-   `baseURL: https://jsonplaceholder.typicode.com`
-   `timeout: 5000`
-   `httpLogging: true`

`UserService.findExternalUsers()` uses that client to call `GET /users`, then logs how many users were returned.

There is no controller exposing this method. In this sample, the client primarily demonstrates that Node-Boot can wire HTTP clients into services even when the application itself is not an HTTP server.

## 🧩 Manually Exercising Business Logic

Because this sample has no controllers, the main way to exercise business logic is to resolve services from the started application context and call them directly.

`@nodeboot/ghost-server` also exposes `getDriver()` and `executeAction(...)`, as documented in [`../../servers/ghost-server/README.md`](../../servers/ghost-server/README.md). That API is useful in tests or CLI code when you want to manually execute controller-style actions without a real HTTP server.

For this sample specifically:

-   use the running app context for service-level testing (`UserService`, schedulers, repositories, subscribers)
-   use `GhostServer`'s driver API when you later add controller actions and still want no-HTTP execution

## 📚 Available Scripts

-   `pnpm dev` — run the sample in development mode with `nodemon`
-   `pnpm start` — clean, build, then run `dist/server.js`
-   `pnpm start:prod` — build, then run with `NODE_ENV=production`
-   `pnpm build` — compile TypeScript with `tsc -p tsconfig.build.json`
-   `pnpm postbuild` — run Node-Boot AOT generation
-   `pnpm clean:build` — remove `dist/`
-   `pnpm lint` / `pnpm lint:fix` — lint the project
-   `pnpm format` / `pnpm format:fix` — check or rewrite formatting
-   `pnpm test` / `pnpm test:coverage` — run tests
-   `pnpm tsc` — run TypeScript directly
-   `pnpm rebuild:sqlite` — rebuild `better-sqlite3`
-   `pnpm create:migration` — create a new TypeORM migration under `src/persistence/migrations/`
-   `pnpm nodeboot:update` — update `@nodeboot/*` packages

## 📄 License

MIT
