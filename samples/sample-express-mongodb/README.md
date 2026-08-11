# 🍃 Sample Express + MongoDB + Firebase Application — Node-Boot

## Overview

This sample is the MongoDB + Firebase variant of the Node-Boot Express sample. It keeps the same core Express features as the plain sample—OpenAPI, Swagger UI, validation, scheduling, middleware hooks, authorization hooks, and typed HTTP clients—but swaps SQL persistence for **MongoDB via TypeORM's MongoDB driver** and enables **Firebase Admin integration via `@nodeboot/starter-firebase`**.

In this codebase, the Firebase-specific example is intentionally small: it wires the Firebase starter and injects **Remote Config** to list configuration versions. It does **not** currently verify Firebase Auth tokens, read/write Firestore, use Cloud Storage, or send FCM messages.

## ✨ What This Sample Demonstrates

-   [x] Express app bootstrap with Node-Boot decorators in `src/app.ts`
-   [x] MongoDB persistence with [`@nodeboot/starter-persistence`](../../starters/persistence/README.md) and TypeORM's `mongodb` driver
-   [x] Firebase Admin auto-configuration with [`@nodeboot/starter-firebase`](../../starters/firebase/README.md)
-   [x] Authorization hooks with [`@nodeboot/authorization`](../../packages/authorization/README.md)
-   [x] OpenAPI/Swagger support with [`@nodeboot/starter-openapi`](../../starters/openapi/README.md)
-   [x] Request validation with [`@nodeboot/starter-validation`](../../starters/validation/README.md)
-   [x] Scheduled jobs with [`@nodeboot/starter-scheduler`](../../starters/scheduler/README.md)
-   [x] Typed outbound HTTP clients with [`@nodeboot/starter-http`](../../starters/http/README.md)
-   [x] Actuator endpoints with [`@nodeboot/starter-actuator`](../../starters/actuator/README.md)

### Application decorators in `src/app.ts`

-   `@EnableDI(Container)` — uses TypeDI as the application container.
-   `@EnableOpenApi()` — generates OpenAPI metadata from controllers/models.
-   `@EnableSwaggerUI()` — enables Swagger UI for the generated spec.
-   `@EnableAuthorization(LoggedInUserResolver, DefaultAuthorizationResolver)` — registers the sample current-user and authorization resolvers.
-   `@EnableActuator()` — enables actuator-style operational endpoints.
-   `@EnableRepositories()` — auto-configures TypeORM repositories and MongoDB access.
-   `@EnableScheduling()` — enables `@Scheduler(...)` jobs.
-   `@EnableHttpClients()` — enables declarative HTTP clients such as `MicroserviceHttpClient`.
-   `@EnableFirebase()` — initializes the Firebase Admin starter and exposes Firebase beans for injection.
-   `@EnableValidations()` — enables DTO/query validation.
-   `@EnableComponentScan()` — scans and registers components/controllers/services/configurations.
-   `@NodeBootApplication()` — marks the main Node-Boot application class.

## 📦 Prerequisites

-   Node.js **>= 18**
-   pnpm **>= 7.5.1**
-   A MongoDB database (local MongoDB or MongoDB Atlas)
-   A Firebase project plus a service account JSON file

## 🚀 Getting Started

1. Install dependencies from the monorepo root:

```sh
pnpm install
```

2. Configure local overrides in `samples/sample-express-mongodb/app-config.local.yaml` (or the included `app-credentials.local.yaml` if you prefer to keep secrets separate). Use placeholder values like this:

```yaml
persistence:
    mongodb:
        database: "facts"
        url: "mongodb+srv://<username>:<password>@<cluster>/<database>?retryWrites=true&w=majority"

integrations:
    firebase:
        serviceAccount: ./firebase.service-account.json
        realtimeDatabaseUrl: https://<project-id>.europe-west1.firebasedatabase.app
```

3. Place your Firebase service account JSON at the path referenced by `integrations.firebase.serviceAccount`.

4. Start the sample:

```sh
pnpm dev
```

`src/server.ts` is the bootstrap entrypoint. It instantiates `FactsServiceApp` and starts the Express server through `NodeBoot.run(ExpressServer)`.

## 🗂️ Project Structure

```text
samples/sample-express-mongodb/
├── app-config.yaml
├── app-config.local.yaml
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── auth/
│   ├── clients/
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── models/
│   ├── persistence/
│   └── services/
└── package.json
```

Highlights:

-   `src/controllers/` — user, paging, and Firebase demo endpoints.
-   `src/services/` — MongoDB-backed user logic, scheduler tasks, greeting hooks, and Firebase Remote Config access.
-   `src/persistence/` — MongoDB entity, repositories, entity listeners, and demo data bootstrap.
-   `src/config/` — app property binding, Express server config resolution, security middleware, and class-transform settings.
-   `src/auth/` — sample authorization/current-user resolvers used by `@EnableAuthorization(...)`.
-   `src/middlewares/` — custom request logging and error handling.

## 📡 API Endpoints

The app config sets `api.routePrefix: "/api"`, and each controller uses version `"v1"`, so the routes below are exposed under `/api/v1/...`.

### `UserController` (`/api/v1/users`)

-   `GET /` — returns all MongoDB users through `UserRepository.find()`.
-   `GET /external/` — calls `https://jsonplaceholder.typicode.com/users` through `MicroserviceHttpClient`.
-   `GET /v2/` — returns users by calling the injected `MongoClient` directly.
-   `GET /v3/` — returns users through `UserRepository.findAllUsingCollection()`.
-   `GET /v4/` — returns users through `UserRepository.findAllUsingClient()`.
-   `GET /:id` — declares a lookup route for a numeric `:id` parameter.
-   `POST /` — creates a user from `CreateUserDto`; protected with `@Authorized()`.
-   `PUT /:id` — updates a user password from `UpdateUserDto`.
-   `DELETE /:id` — deletes a user and returns `{message: "User <id> successfully deleted"}`.

### `PagingUserController` (`/api/v1/paging`)

-   `GET /paginated` — returns `UserPage` using `PagingRequest` query parameters: `page`, `pageSize`, `sortOrder`, `sortField`.
-   `GET /cursor` — returns `CursorUserPage` using `CursorRequest` query parameters: `pageSize`, `lastId`, `cursor`, `sortOrder`, `sortField`.
-   `GET /paginated/filter` — same as `/paginated`, but with a hard-coded filter of `email = "example3@email.com"`.
-   `GET /cursor/filter` — same as `/cursor`, but with the same hard-coded email filter.

### `FirebaseController` (`/api/v1/firebase`)

-   `POST /auth` — logs a message and calls `FirebaseService.callFirebase()`.

This endpoint does **not** verify a Firebase ID token, read Firestore, or return Firebase user data. It simply triggers a Remote Config API call and returns no body.

## 🔥 Firebase Integration

Firebase is enabled at application level with `@EnableFirebase()` in `src/app.ts`.

What the sample actually wires up:

-   `src/services/firebase.service.ts` injects `FIREBASE_REMOTE_CONFIG_BEAN` as `remoteConfig.RemoteConfig`.
-   `FirebaseService.callFirebase()` logs `Calling Firebase`, then calls `firebaseRemoteConfig.listVersions()` and logs how many Remote Config versions were returned.
-   `src/controllers/firebase.controller.ts` exposes `POST /api/v1/firebase/auth`, which only delegates to that service method.

What it does **not** do:

-   No Firebase Auth token verification
-   No `verifyIdToken(...)`
-   No Firestore collections/documents
-   No Cloud Storage usage
-   No Cloud Messaging / FCM usage
-   No Realtime Database access in application code

The underlying starter can expose all of those services as injectable beans; see [`../../starters/firebase/README.md`](../../starters/firebase/README.md). In this sample's checked-in config, `integrations.firebase` contains:

```yaml
integrations:
    firebase:
        serviceAccount: ./firebase.service-account.json
        realtimeDatabaseUrl: https://<your-project>.europe-west1.firebasedatabase.app
```

## 💾 MongoDB Persistence

This sample uses `@nodeboot/starter-persistence` with:

```yaml
persistence:
    type: "mongodb"
    cache: false
    mongodb:
        database: "facts"
        url: "mongodb+srv://<username>:<password>@<cluster>/?retryWrites=true&w=majority"
```

Key pieces:

-   `src/persistence/entities/User.ts` defines a MongoDB-backed TypeORM entity with `@Entity("users")`, `@ObjectIdColumn() _id`, and `@Column()` fields for `email`, `password`, and optional `name`.
-   `src/persistence/repositories/UserRepository.ts` extends `MongoRepository<User>` and demonstrates both `useMongoCollection(...)` and `useMongoClient(...)` helpers.
-   `src/persistence/repositories/PagingUserRepository.ts` extends `MongoPagingAndSortingRepository<User>` for page/cursor pagination.
-   `src/persistence/users.init.ts` provides demo seed data loaded by `UserService` when the collection is empty.
-   `src/persistence/listeners/GlobalEntityEventListener.ts` logs entity and transaction lifecycle events.
-   `src/persistence/listeners/UserEntityEventListener.ts` logs user inserts and calls `GreetingService.sayHello(...)` after insertion.

Unlike the plain SQL-backed Express sample, this directory has **no `migrations/` folder**, no custom naming strategy, and no datasource-override configuration under `src/persistence/`. That matches this MongoDB setup: the sample demonstrates a schemaless/document flow instead of SQL migrations.

## 🔐 Authorization

Authorization is enabled with `@EnableAuthorization(LoggedInUserResolver, DefaultAuthorizationResolver)`.

-   `src/auth/LoggedInUserResolver.ts` is a demo `CurrentUserChecker` that logs access and returns a hard-coded user object.
-   `src/auth/DefaultAuthorizationResolver.ts` is a demo `AuthorizationChecker` that logs checks and authorizes against a hard-coded `roles: ["USER", "ADMIN"]` user.
-   `POST /api/v1/users/` uses `@Authorized()`.

This authorization flow is **sample-only** and is **not** connected to Firebase Auth.

## 🧩 Middlewares

-   `src/middlewares/LoggingMiddleware.ts` uses `@Middleware({type: "before"})` to log every incoming request.
-   `src/middlewares/ErrorMiddleware.ts` uses `@ErrorHandler()` to return JSON errors shaped as `{message, statusCode}`.
-   `app.defaultErrorHandler` is set to `false`, so the custom error middleware is the intended handler.
-   `src/config/SecurityConfiguration.ts` adds `hpp()`, `helmet()`, and disables Express' `x-powered-by` header.
-   `src/config/ServerConfiguration.ts` maps configured `cookie`, `cors`, `session`, and `multipart` settings into Express server options.
-   `src/config/ClassTransformConfiguration.ts` shows class-transform configuration with `exposeAll` strategies while globally disabling the transformer.
-   `src/config/AppConfigProperties.ts` binds the `app` section from `app-config.yaml` into a typed configuration object.

## ⏰ Scheduling

`src/services/schedulers.component.ts` defines three scheduled jobs:

-   `@Scheduler("*/1 * * * *")` — every minute
-   `@Scheduler("*/5 * * * *")` — every five minutes
-   `@Scheduler("0 9 * * *")` — every day at 09:00

Each job only logs its execution time.

## 🌐 HTTP Clients

`src/clients/MicroserviceHttpClient.ts` demonstrates the HTTP starter with:

-   `@HttpClient({ baseURL: "https://jsonplaceholder.typicode.com", timeout: 5000, httpLogging: true })`
-   `UserService.findExternalUsers()` calling `GET /users` on that upstream service

## 📚 Available Scripts

From `package.json`:

-   `pnpm dev` — run the app with `NODE_ENV=development` and `nodemon`
-   `pnpm start` — clean, build, then run `dist/server.js`
-   `pnpm start:prod` — build, then run in production mode
-   `pnpm build` — compile with `tsc -p tsconfig.build.json`
-   `pnpm postbuild` — run Node-Boot AOT generation
-   `pnpm clean:build` — remove `dist/`
-   `pnpm lint` / `pnpm lint:fix` — run ESLint
-   `pnpm format` / `pnpm format:fix` — run Prettier
-   `pnpm test` / `pnpm test:coverage` — run the test suite
-   `pnpm gen:schema:test` — run the Node-Boot model schema generator script
-   `pnpm nodeboot:update` — update `@nodeboot/*` workspace dependencies

Compared with `samples/sample-express`, this variant adds `@nodeboot/starter-firebase`, `firebase-admin`, and `mongodb`, and replaces the SQL/SQLite-oriented setup used there.

## 📄 License

MIT
