# 🚀 `@nodeboot/core` – The Heart of Node-Boot

## Overview

`@nodeboot/core` is the central package of the **Node-Boot** framework.

It provides the application bootstrap flow, the `@NodeBootApplication()` entry-point decorator, the `NodeBoot.run(...)` startup API, the `BaseServer` abstraction used by server adapters, core controller/configuration decorators, lifecycle integration, logging setup, and shared models such as pagination helpers.

In the overall Node-Boot architecture, `@nodeboot/core` sits in the middle:

-   it coordinates **configuration loading** via `@nodeboot/config`
-   binds the **DI container** provided by `@nodeboot/di`
-   exposes the decorator model consumed by `@nodeboot/engine`
-   composes with server adapters like `@nodeboot/express-server`, `@nodeboot/fastify-server`, `@nodeboot/koa-server`, and `@nodeboot/http-server`
-   provides the lifecycle foundation used by starter packages such as persistence, scheduling, HTTP clients, validation, OpenAPI, and actuator

---

## ✨ Features

✅ **Application bootstrap** with `@NodeBootApplication()` and `NodeBoot.run(...)`  
✅ **Server abstraction** via `BaseServer` for Express, Fastify, Koa, and native HTTP  
✅ **Configuration classes and bean factories** with `@Configuration()` and `@Bean()`  
✅ **Controller and routing decorators** such as `@Controller`, `@Get`, `@Post`, `@Body`, `@Param`, and more  
✅ **Lifecycle support** with `@PostConstruct()` and lifecycle event publishing  
✅ **Graceful shutdown plumbing** through `BaseServer.cleanup()` and `ProcessSignalHandler`  
✅ **Error-handler and middleware integration** with `@ErrorHandler()`, `@Middleware()`, `@UseBefore()`, `@UseAfter()`  
✅ **Serialization/model helpers** with `@Model()`, `@Property()`, pagination request/response models, and class-transformer options  
✅ **Starter composition** with repositories, schedulers, HTTP clients, OpenAPI, actuator, validation, authorization, and more

---

## 📦 Installation

At minimum, install `@nodeboot/core` together with a server adapter and the packages commonly used to power Node-Boot applications:

```sh
pnpm add @nodeboot/core @nodeboot/di @nodeboot/aot typedi reflect-metadata winston
```

Then add the server package you want to run on:

```sh
pnpm add @nodeboot/express-server express
# or
pnpm add @nodeboot/fastify-server fastify
# or
pnpm add @nodeboot/koa-server koa
# or
pnpm add @nodeboot/http-server
```

If you use validation or transformation features, also install the peer dependencies:

```sh
pnpm add class-validator class-transformer
```

---

## 🧩 What `@nodeboot/core` Exports

### Bootstrap and server foundation

-   `NodeBoot`
-   `NodeBootApp`
-   `NodeBootAppView`
-   `BaseServer`
-   `ProcessSignalHandler`
-   `SERVER_CONFIGURATIONS`
-   `SERVER_CONFIGURATIONS_PROPERTY_PATH`

### Application, DI, and configuration decorators

-   `NodeBootApplication`
-   `Configuration`
-   `Configurations`
-   `Bean`
-   `Service`
-   `Component`
-   `PostConstruct`
-   `EnableClassTransformer`
-   `ClassToPlainTransform`
-   `PlainToClassTransform`

### Controller and web decorators

-   `Controller`, `Get`, `Post`, `Put`, `Patch`, `Delete`, `Head`, `All`, `Method`
-   `Body`, `BodyParam`, `Param`, `Params`, `QueryParam`, `QueryParams`
-   `CookieParam`, `CookieParams`, `HeaderParam`, `HeaderParams`
-   `Session`, `SessionParam`, `Req`, `Res`, `Ctx`, `State`
-   `UploadedFile`, `UploadedFiles`
-   `HttpCode`, `ContentType`, `Header`, `Location`, `Redirect`, `Render`
-   `OnNull`, `OnUndefined`, `ResponseClassTransformOptions`
-   `Middleware`, `ErrorHandler`, `UseBefore`, `UseAfter`, `Interceptor`, `Interceptors`, `UseInterceptor`, `GlobalMiddlewares`, `Controllers`

### Models and helpers

-   `Model`, `Property`
-   `PagingRequest`, `CursorRequest`, `Page<T>`, `CursorPage<T>`, `SortOrder`
-   `emptyPage()`

---

## 🔥 Usage

### 1️⃣ Bootstrap a Node-Boot application

This is the real startup pattern used in `samples/sample-express/src/app.ts`:

```typescript
import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableOpenApi, EnableSwaggerUI} from "@nodeboot/starter-openapi";
import {EnableAuthorization} from "@nodeboot/authorization";
import {LoggedInUserResolver} from "./auth/LoggedInUserResolver";
import {DefaultAuthorizationResolver} from "./auth/DefaultAuthorizationResolver";
import {ExpressServer} from "@nodeboot/express-server";
import {EnableRepositories} from "@nodeboot/starter-persistence";
import {EnableDI} from "@nodeboot/di";
import {EnableScheduling} from "@nodeboot/starter-scheduler";
import {EnableComponentScan} from "@nodeboot/aot";
import {EnableHttpClients} from "@nodeboot/starter-http";
import {EnableValidations} from "@nodeboot/starter-validation";
import {EnableActuator} from "@nodeboot/starter-actuator";

@EnableDI(Container)
@EnableOpenApi()
@EnableSwaggerUI()
@EnableAuthorization(LoggedInUserResolver, DefaultAuthorizationResolver)
@EnableActuator()
@EnableRepositories()
@EnableScheduling()
@EnableHttpClients()
@EnableValidations()
@EnableComponentScan()
@NodeBootApplication()
export class FactsServiceApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

The same pattern is used across the repository with different server adapters:

-   `NodeBoot.run(ExpressServer)`
-   `NodeBoot.run(FastifyServer)`
-   `NodeBoot.run(KoaServer)`
-   `NodeBoot.run(HttpServer)`

### 2️⃣ Understand the bootstrap contract

`NodeBoot.run(...)`:

1. creates the selected server adapter
2. calls `server.run(additionalConfig?)`
3. returns a `NodeBootAppView` containing:
    - `appOptions`
    - `logger`
    - `config`
    - `server`
4. starts listening by calling `server.listen()`

```typescript
const app = await NodeBoot.run(ExpressServer);

app.logger.info(`Running on port ${app.appOptions.port}`);
const server = app.server;
const config = app.config;
```

You can also inject runtime config overrides through the optional second argument:

```typescript
return NodeBoot.run(ExpressServer, {
    app: {
        port: 4000,
    },
});
```

Those overrides are merged into the loaded config as `runtime-configs`.

---

## 🏗️ Application bootstrap decorators

### `@NodeBootApplication(options?)`

`@NodeBootApplication()` is the main application decorator.

It does three important things in `packages/core/src/decorators/NodeBootApplication.ts`:

-   marks the class as the Node-Boot application entry point
-   registers a `BeansConfigurationAdapter` for the application class itself, so `@Bean()` methods declared there can be bound
-   creates the `ApplicationAdapter` consumed by `@nodeboot/engine` with route prefix, validation, class-transformer settings, controllers, middleware, and authorization/current-user hooks

### `NodeBootApp`

Your app class typically implements:

```typescript
export interface NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView>;
}
```

That keeps the entry point explicit and consistent across samples and starters.

---

## 🔍 Component scanning and DI composition

`@nodeboot/core` does **not** itself scan the filesystem. In Node-Boot applications, component discovery is usually enabled with `@EnableComponentScan()` from `@nodeboot/aot` plus `@EnableDI(Container)` from `@nodeboot/di`.

```typescript
import {EnableDI} from "@nodeboot/di";
import {EnableComponentScan} from "@nodeboot/aot";
import {Container} from "typedi";

@EnableDI(Container)
@EnableComponentScan()
@NodeBootApplication()
export class SampleApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

`@EnableComponentScan()` first looks for `dist/node-boot-beans.json` and, if it exists, imports the compiled bean modules listed there. Otherwise it falls back to recursively scanning compiled `.js` files in `dist/` for known decorators.

Once the DI container is available, `BaseServer.configure(...)` calls `useContainer(...)` so controllers, middleware, interceptors, configuration beans, and starter-provided features resolve through the selected IoC container.

> Without `@EnableDI(Container)`, Node-Boot still boots, but DI-dependent features such as auto-configuration, configuration properties, and some starters are skipped.

---

## ⚙️ Configuration and bean registration

### `@Configuration()` and `@Bean()`

This is the real pattern used by server configuration classes in the samples:

```typescript
import {Bean, Configuration, SERVER_CONFIGURATIONS, SERVER_CONFIGURATIONS_PROPERTY_PATH} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {ExpressServerConfigProperties, ExpressServerConfigs} from "@nodeboot/express-server";

@Configuration()
export class ServerConfiguration {
    @Bean(SERVER_CONFIGURATIONS)
    public serverConfig({config, logger}: BeansContext): ExpressServerConfigs {
        logger.debug(`Resolving express server configuration`);

        const serverConfigs = config.getOptional<ExpressServerConfigProperties>(SERVER_CONFIGURATIONS_PROPERTY_PATH);

        return {
            cookie: {
                options: serverConfigs?.cookie,
            },
            cors: {
                options: serverConfigs?.cors,
            },
            session: {
                options: serverConfigs?.session,
            },
            multipart: {
                options: serverConfigs?.multipart,
            },
            template: {},
        };
    }
}
```

`BeansConfigurationAdapter` is the class that makes this work. At runtime it:

-   checks whether the configuration is allowed to load
-   respects `@Profile(...)` metadata from `@nodeboot/context`
-   optionally requires a config path via `@Configuration({onConfig: "..."})`
-   executes `@Bean()` methods
-   registers the returned value in the IoC container

A real conditional configuration example exists in `starters/aws/src/config/S3ClientConfiguration.ts`:

```typescript
@Configuration({onConfig: "integrations.aws.s3.region"})
export class S3ClientConfiguration {
    @Bean()
    public async s3Client({logger, config, iocContainer}: BeansContext) {
        // ...
    }
}
```

### `@Configurations([...])`

For simple composition, `@Configurations([...])` instantiates several configuration classes together:

```typescript
import {Configurations} from "@nodeboot/core";
import {SecurityConfiguration} from "./SecurityConfiguration";
import {ClassTransformConfiguration} from "./ClassTransformConfiguration";
import {CustomNamingStrategy} from "../persistence";

@Configurations([SecurityConfiguration, ClassTransformConfiguration, CustomNamingStrategy])
export class MultipleConfigurations {}
```

---

## 🧠 Config resolution and runtime defaults

`BaseServer` calls `loadNodeBootConfig(...)` from `@nodeboot/config` during startup.

That loader:

-   reads config from the standard Node-Boot YAML conventions
-   supports `app-config.yaml` and local/remote config targets
-   supports environment placeholders such as `${AWS_REGION}`
-   merges `additionalConfig` passed to `NodeBoot.run(...)`
-   installs the resulting `ConfigService` into the DI container as both `ConfigService` and `"config"`

`BaseServer.setupAppConfigs(...)` then resolves `ApplicationOptions` from config:

-   `app.environment` → default `development`
-   `app.port` → default `3000`
-   `app.platform` → default `node-boot`
-   `app.name` → default `node-boot-app`
-   `api.*` → becomes `applicationOptions.apiOptions`

### Binding config sections into classes

This common pattern is provided by `@nodeboot/config`, but it is bound by core during startup:

```typescript
import {ConfigurationProperties} from "@nodeboot/config";

@ConfigurationProperties({
    configPath: "app",
    configName: "app-config",
})
export class AppConfigProperties {
    name: string;
    platform: string;
    environment: string;
    defaultErrorHandler: boolean;
    customErrorHandler?: boolean;
    port: number;
}
```

After startup, that class can be injected by name:

```typescript
constructor(
    @Inject("app-config")
    private readonly appConfigProperties: AppConfigProperties,
) {}
```

---

## 🌐 Controllers, routes, params, and responses

Core route decorators write metadata into `NodeBootToolkit` storage, which server adapters later translate into real framework routes.

A real controller example from `samples/sample-express/src/controllers/users.controller.ts`:

```typescript
import {Body, Controller, Delete, Get, HttpCode, Param, Post, Put} from "@nodeboot/core";

@Controller("/users", "v1")
export class UserController {
    @Get("/")
    async getUsers(): Promise<UserModel[]> {
        return this.user.findAllUser();
    }

    @Get("/:id")
    async getUserById(@Param("id") userId: number): Promise<UserModel> {
        return this.user.findUserById(userId);
    }

    @Post("/")
    @HttpCode(201)
    async createUser(@Body() userData: CreateUserDto): Promise<UserModel> {
        return this.user.createUser(userData);
    }

    @Put("/:id")
    async updateUser(@Param("id") userId: number, @Body() userData: UpdateUserDto): Promise<UserModel> {
        return this.user.updateUser(userId, userData);
    }

    @Delete("/:id")
    async deleteUser(@Param("id") userId: number) {
        await this.user.deleteUser(userId);
        return {message: `User ${userId} successfully deleted`};
    }
}
```

### Commonly used decorators

-   **Routing:** `@Get`, `@Post`, `@Put`, `@Patch`, `@Delete`, `@Head`, `@All`, `@Method`
-   **Request extraction:** `@Body`, `@BodyParam`, `@Param`, `@Params`, `@QueryParam`, `@QueryParams`
-   **Headers/cookies/session:** `@HeaderParam`, `@HeaderParams`, `@CookieParam`, `@CookieParams`, `@Session`, `@SessionParam`
-   **Framework-native objects:** `@Req`, `@Res`, `@Ctx`, `@State`
-   **Uploads:** `@UploadedFile`, `@UploadedFiles`
-   **Response metadata:** `@HttpCode`, `@ContentType`, `@Header`, `@Location`, `@Redirect`, `@Render`, `@OnNull`, `@OnUndefined`, `@ResponseClassTransformOptions`

`@Controller("/users", "v1")` prefixes the controller route with the version, resulting in a base route of `/v1/users`.

---

## 🛠️ Middleware, interceptors, and error handling

### `@ErrorHandler()`

A real error-handler implementation from `samples/sample-express/src/middlewares/ErrorMiddleware.ts`:

```typescript
import {Logger} from "winston";
import {ErrorHandler} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {Action, ErrorHandlerInterface} from "@nodeboot/context";
import {Request, Response} from "express";
import {HttpError} from "@nodeboot/error";

@ErrorHandler()
export class ErrorMiddleware implements ErrorHandlerInterface<HttpError, Request, Response> {
    @Inject()
    private logger: Logger;

    async onError(error: HttpError, action: Action<Request, Response, Function>): Promise<void> {
        const {request, response} = action;
        const status: number = error.httpCode || 500;
        const message: string = error.message || "Something went wrong";

        this.logger.error(`[${request.method}] ${request.path} >> StatusCode:: ${status}, Message:: ${message}`);
        response.status(status).json({
            message: error.message,
            statusCode: error.httpCode,
        });
    }
}
```

`@ErrorHandler()` is built on top of `@Middleware({type: "after"})`, so it plugs directly into the Node-Boot middleware chain.

### Other middleware hooks

-   `@Middleware({type: "before" | "after", priority?})` for global middleware classes
-   `@UseBefore(...)` and `@UseAfter(...)` for controller-level or action-level middleware
-   `@Interceptor(...)` and `@UseInterceptor(...)` for response/result interception

These decorators are thin metadata registrations into `@nodeboot/engine`; the selected server adapter applies them to Express/Fastify/Koa/native HTTP at runtime.

---

## 🔄 Lifecycle hooks and graceful shutdown

Node-Boot does **not** use Nest-style `OnApplicationBootstrap` / `OnApplicationShutdown` interfaces in this package. In practice, the lifecycle hooks around `@nodeboot/core` are:

-   `@PostConstruct()` for bean initialization after the container is ready
-   lifecycle events such as `application.initialized`, `application.started`, and `application.stopped`
-   `@ShutdownHook()` from `@nodeboot/context` for bean-level cleanup

### `@PostConstruct()`

`@PostConstruct()` registers a `PostConstructAdaptor`, which is bound on the `persistence.started` lifecycle.

That means post-construction methods run **after DI is ready** and after the application reaches the lifecycle phase used for persistence-driven initialization.

```typescript
@Service()
export class WarmupService {
    @PostConstruct()
    async warmup(): Promise<void> {
        // initialization logic after the container is ready
    }
}
```

If the target class is decorated with `@Profile(...)`, execution respects the active profile rules.

### Lifecycle events published by core

`BaseServer` publishes these lifecycle events through `ApplicationLifecycleBridge`:

-   `application.initialized`
-   `application.started`
-   `application.stopped`

Those events are what starter packages build on. For example:

-   HTTP clients bind on `application.started`
-   schedulers and some persistence-driven features bind on `persistence.started`
-   health/actuator state tracks startup and shutdown through the bridge

### Shutdown hooks

There are **two related shutdown mechanisms** in the Node-Boot ecosystem:

1. **Core server shutdown**  
   `BaseServer` instances register themselves with the exported `ProcessSignalHandler`, which listens for signals such as `SIGINT` and `SIGTERM`, closes registered servers, and runs `BaseServer.cleanup()`.

2. **Bean-level cleanup hooks**  
   For service/resource cleanup methods, use `@ShutdownHook()` from `@nodeboot/context`.

A real example from `starters/persistence/src/config/PersistenceConfiguration.ts`:

```typescript
import {ApplicationContext, ShutdownHook} from "@nodeboot/context";

export class PersistenceConfiguration {
    @ShutdownHook({priority: 200, timeout: 10000})
    async closePersistenceConnections(): Promise<void> {
        const iocContainer = ApplicationContext.get().diOptions?.iocContainer;
        // close DataSource / MongoClient here
    }
}
```

`@ShutdownHook()` supports:

-   priority-based execution
-   optional timeouts
-   DI-backed bean lookup during cleanup
-   automatic handling for `SIGINT`, `SIGTERM`, `SIGUSR2`, uncaught exceptions, and unhandled rejections

> See `packages/core/SHUTDOWN_HOOK_FEATURE.md` for more background on the shutdown-hook feature.

---

## 🧾 Models, serialization, and pagination helpers

### `@Model()`, `@Property()`

A real model example from `samples/sample-express/src/models/SampleModel.ts`:

```typescript
import {Model, Property} from "@nodeboot/core";
import {IsDateString, IsNotEmpty, IsObject} from "class-validator";
import {JsonObject} from "@nodeboot/context";
import {DateTime} from "luxon";

@Model()
export class SampleModel {
    @Property({required: true, description: "Entity reference that this fact relates to"})
    @IsNotEmpty()
    entityRef: string;

    @Property({required: false, description: "System reference that this fact relates to"})
    systemRef?: string;

    @Property({required: true, description: "A collection of fact values as key value pairs."})
    @IsObject()
    @IsNotEmpty()
    data: JsonObject;

    @Property({required: false, description: "Optional timestamp override"})
    @IsDateString()
    timestamp?: DateTime;
}
```

These decorators register model metadata for tools such as OpenAPI/schema generation.

### Pagination helpers

`@nodeboot/core` also exports reusable request/response models for common pagination patterns.

Real usage from `samples/sample-express/src/controllers/paging.controller.ts`:

```typescript
import {Controller, CursorPage, CursorRequest, Get, Page, PagingRequest, QueryParams} from "@nodeboot/core";

@Controller("/paging", "v1")
export class PagingUserController {
    @Get("/paginated")
    async getUsersPaginated(@QueryParams() paging: PagingRequest): Promise<Page<UserModel>> {
        return this.userRepository.findPaginated({}, paging);
    }

    @Get("/cursor")
    async getUsersCursorPaginated(@QueryParams() cursorRequest: CursorRequest): Promise<CursorPage<UserModel>> {
        return this.userRepository.findCursorPaginated({}, cursorRequest);
    }
}
```

Available helpers:

-   `PagingRequest`
-   `CursorRequest`
-   `Page<T>`
-   `CursorPage<T>`
-   `SortOrder`
-   `emptyPage()`

### Class-transformer integration

A real sample configuration from `samples/sample-express/src/config/ClassTransformConfiguration.ts`:

```typescript
import {ClassToPlainTransform, EnableClassTransformer, PlainToClassTransform} from "@nodeboot/core";

@EnableClassTransformer({enabled: false})
@ClassToPlainTransform({
    strategy: "exposeAll",
})
@PlainToClassTransform({
    strategy: "exposeAll",
})
export class ClassTransformConfiguration {}
```

These decorators populate application-wide transformation options used by the engine when deserializing request payloads and serializing controller results.

---

## 🔌 How `@nodeboot/core` composes with server packages

`@nodeboot/core` does not talk directly to Express/Fastify/Koa/native HTTP APIs at the decorator layer. Instead:

1. core decorators register metadata and application context
2. `NodeBoot.run(...)` boots a `BaseServer` subclass
3. the selected server package configures the underlying framework
4. the server package asks `@nodeboot/engine` to translate Node-Boot metadata into real routes/middleware/interceptors
5. `BaseServer` handles shared concerns: config loading, logger creation, DI binding, lifecycle bridge startup, banner output, and cleanup

This separation is why the same application class can be moved between:

-   `@nodeboot/express-server`
-   `@nodeboot/fastify-server`
-   `@nodeboot/koa-server`
-   `@nodeboot/http-server`

by changing only the server class passed to `NodeBoot.run(...)`.

---

## 🧪 How `@nodeboot/core` composes with starter packages

The sample applications show `@nodeboot/core` acting as the shared runtime foundation for starters such as:

-   `@nodeboot/starter-persistence`
-   `@nodeboot/starter-scheduler`
-   `@nodeboot/starter-http`
-   `@nodeboot/starter-validation`
-   `@nodeboot/starter-openapi`
-   `@nodeboot/starter-actuator`
-   `@nodeboot/authorization`

Why this works:

-   starters add decorators, adapters, or configuration classes
-   core owns the `ApplicationContext`, server boot sequence, and lifecycle bridge
-   `BaseServer.configure(...)` binds configuration adapters, configuration-properties adapters, and lifecycle-driven application features
-   server adapters then expose the result through the chosen web runtime

In practice, `@nodeboot/core` is the package that turns “a set of decorators and adapters” into a running application.

---

## 🛠️ How It Works Internally

### Bootstrap flow

1. **Decorators run at import time** and populate `ApplicationContext` / engine metadata.
2. **Component scanning imports your compiled application beans**.
3. **`NodeBoot.run(...)` creates the selected server**.
4. **`BaseServer.init(...)` loads config**, resolves app defaults, creates the logger, info service, and lifecycle bridge.
5. **Configuration adapters bind `@Configuration()` + `@Bean()` classes**.
6. **Configuration-properties adapters bind typed config classes** from `@nodeboot/config`.
7. **The DI container is handed to the engine** via `useContainer(...)`.
8. **Optional bridges** such as OpenAPI and actuator are bound if enabled.
9. **Lifecycle events are published** as the app initializes, starts, and stops.
10. **Shutdown cleanup** unregisters the server, closes logger transports, and publishes `application.stopped`.

### Core implementation notes

-   `NodeBoot.run(...)` is intentionally tiny; most of the orchestration lives in `BaseServer`
-   `BeansConfigurationAdapter` is the auto-configuration bridge for `@Bean()` factories
-   route/param/response decorators are mostly metadata builders over `NodeBootToolkit`
-   `Service()` and `Component()` delegate to `decorateDi(...)` from `@nodeboot/di`
-   `@ErrorHandler()` is a convenience wrapper around global after-middleware registration
-   `ProcessSignalHandler` is exported mainly for advanced/custom-server scenarios; normal apps get it automatically via `BaseServer`

---

## 📚 Related Packages

-   `@nodeboot/aot` – component scanning and AOT bean manifests
-   `@nodeboot/di` – DI container integration
-   `@nodeboot/config` – config loading and `@ConfigurationProperties()`
-   `@nodeboot/context` – shared types, lifecycle, profile, shutdown-hook infrastructure
-   `@nodeboot/engine` – route/action metadata execution engine
-   `@nodeboot/express-server` / `@nodeboot/fastify-server` / `@nodeboot/koa-server` / `@nodeboot/http-server` – runtime server adapters

---

## ✅ When to Reach for `@nodeboot/core`

Use this package whenever you need to:

-   define the main application class
-   bootstrap a Node-Boot service
-   create controllers, services, middleware, or configuration beans
-   expose server-specific configuration through `SERVER_CONFIGURATIONS`
-   work with shared pagination/model decorators
-   integrate starters into one coherent application lifecycle

If Node-Boot were split into “infrastructure packages” and “the thing that actually boots your app”, `@nodeboot/core` is the latter.
