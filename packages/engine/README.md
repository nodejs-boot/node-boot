# ⚙️ `@nodeboot/engine` – Node-Boot Driver Engine

## Overview

`@nodeboot/engine` is the package that turns **Node-Boot controller metadata** into real runtime behavior.

It provides the driver abstraction used by server integrations such as:

-   `@nodeboot/express-server`
-   `@nodeboot/fastify-server`
-   `@nodeboot/koa-server`
-   `@nodeboot/http-server`
-   `@nodeboot/ghost-server`

In practice, the engine sits between Node-Boot's decorator metadata and a concrete server runtime. It imports controllers, middlewares, and interceptors, builds `ActionMetadata`, resolves action parameters, runs interceptors, and delegates request/response handling to a framework-specific `NodeBootDriver`.

---

## ✨ Features

✅ **Driver-based architecture** – One controller model, many server implementations.  
✅ **Framework-agnostic action execution** – `NodeBootEngine` works through `NodeBootDriver`.  
✅ **Automatic controller registration** – Loads controllers, middlewares, and interceptors through `ComponentImporter`.  
✅ **Typed parameter resolution** – `ActionParameterHandler` extracts params from the request and normalizes them.  
✅ **Class transformation and validation** – Integrates with `class-transformer` and `class-validator`.  
✅ **Interceptor pipeline** – Runs global, controller, and action interceptors in sequence via `runInSequence`.  
✅ **Reusable response/error helpers** – `ResultTransformer` and `GlobalErrorHandler` reduce driver boilerplate.  
✅ **Works beyond HTTP** – `GhostDriver` shows that the contract also supports non-network execution.

---

## 🧱 What This Package Exports

Main exports from `@nodeboot/engine`:

-   `NodeBootDriver`
-   `NodeBootEngine`
-   `NodeBootToolkit`
-   `GlobalErrorHandler`
-   `ResultTransformer`
-   `MetadataArgsStorage`
-   `MetadataBuilder`
-   `ServerConfig`
-   `Param`
-   `runInSequence`
-   `isPromiseLike`

These are the building blocks used by Node-Boot server packages and custom framework adapters.

---

## 🚀 Installation

### For most Node-Boot applications

Most application developers do **not** install `@nodeboot/engine` directly. Instead, install a server package that already depends on it:

```sh
pnpm add @nodeboot/express-server
```

or:

```sh
pnpm add @nodeboot/fastify-server
pnpm add @nodeboot/koa-server
pnpm add @nodeboot/http-server
pnpm add @nodeboot/ghost-server
```

### For framework/driver authors

If you are implementing a custom Node-Boot server integration, install the engine directly together with its peer dependencies:

```sh
pnpm add @nodeboot/engine class-transformer class-validator
```

> `@nodeboot/engine` depends on `@nodeboot/context` and `@nodeboot/error`, and uses `class-transformer` / `class-validator` for request normalization and DTO validation.

---

## 🔥 Usage

### 1️⃣ Typical application usage

Applications usually use the engine indirectly through a server package. This is the real pattern used in the repository samples:

```typescript
import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableDI} from "@nodeboot/di";
import {EnableComponentScan} from "@nodeboot/aot";
import {ExpressServer} from "@nodeboot/express-server";

@EnableDI(Container)
@EnableComponentScan()
@NodeBootApplication()
export class FactsServiceApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

In this flow, `ExpressServer` eventually creates an `ExpressDriver` and calls:

```typescript
NodeBootToolkit.createServer(driver, engineOptions);
```

The same pattern is used by `FastifyServer`, `KoaServer`, `HttpServer`, and `GhostServer`.

---

### 2️⃣ Creating a custom parameter decorator

`NodeBootToolkit.createParamDecorator` lets you create framework-aware parameter decorators backed by the current `Action`:

```typescript
import {NodeBootToolkit} from "@nodeboot/engine";

export const TenantId = () =>
    NodeBootToolkit.createParamDecorator({
        required: true,
        value: action => action.request.headers["x-tenant-id"],
    });
```

Internally, this adds metadata into `MetadataArgsStorage.params`, and `ActionParameterHandler` resolves it before the controller method is invoked.

---

### 3️⃣ Implementing a custom driver

If you are integrating Node-Boot with a new server framework, extend `NodeBootDriver` and pass your driver to `NodeBootToolkit.createServer`.

```typescript
import {GlobalErrorHandler, NodeBootDriver, NodeBootToolkit, ResultTransformer, ServerConfig} from "@nodeboot/engine";
import {Action, ActionMetadata, MiddlewareMetadata, NodeBootEngineOptions, ParamMetadata} from "@nodeboot/context";

type ExampleRequest = {
    method: string;
    url: string;
    body?: any;
    params?: Record<string, string>;
    query?: Record<string, string>;
    headers: Record<string, string>;
};

type ExampleResponse = {
    statusCode?: number;
    headers: Record<string, string>;
    body?: any;
};

type ExampleApp = {
    use: (handler: Function) => void;
    route: (method: string, path: string, handler: Function) => void;
};

class ExampleDriver extends NodeBootDriver<ExampleApp, Action<ExampleRequest, ExampleResponse>> {
    private readonly errors = new GlobalErrorHandler();
    private readonly results = new ResultTransformer(this);

    constructor(app: ExampleApp) {
        super();
        this.app = app;
    }

    initialize(): void {
        ServerConfig.of(undefined);
    }

    registerMiddleware(middleware: MiddlewareMetadata, _options: NodeBootEngineOptions): void {
        if ((middleware.instance as any).use) {
            this.app.use(async (request: ExampleRequest, response: ExampleResponse) => {
                await (middleware.instance as any).use({request, response});
            });
        }
    }

    registerAction(
        actionMetadata: ActionMetadata,
        executeCallback: (action: Action<ExampleRequest, ExampleResponse>) => Promise<any>,
    ): void {
        const route = ActionMetadata.appendBaseRoute(this.routePrefix, actionMetadata.fullRoute);

        this.app.route(actionMetadata.type.toUpperCase(), route.toString(), async (request, response) => {
            await executeCallback({request, response});
        });
    }

    registerRoutes(): void {}

    getParamFromRequest(action: Action<ExampleRequest, ExampleResponse>, param: ParamMetadata): any {
        switch (param.type) {
            case "body":
                return action.request.body;
            case "param":
                return action.request.params?.[param.name];
            case "params":
                return action.request.params;
            case "query":
                return action.request.query?.[param.name];
            case "queries":
                return action.request.query;
            case "header":
                return action.request.headers[param.name.toLowerCase()];
            case "headers":
                return action.request.headers;
            default:
                return undefined;
        }
    }

    async handleError(error: any, action: Action<ExampleRequest, ExampleResponse>): Promise<any> {
        action.response.statusCode = error.httpCode || 500;
        action.response.body = this.errors.handleError(error);
    }

    handleSuccess(result: any, action: Action<ExampleRequest, ExampleResponse>, actionMetadata: ActionMetadata): void {
        action.response.statusCode = actionMetadata.successHttpCode || 200;
        action.response.body = this.results.transformResult(result, actionMetadata);
    }
}

const app: ExampleApp = {
    use: () => {},
    route: () => {},
};

const driver = new ExampleDriver(app);

NodeBootToolkit.createServer(driver, {
    routePrefix: "/api",
    controllers: [],
    middlewares: [],
    interceptors: [],
});
```

The abstract contract you must implement is defined by `NodeBootDriver`:

-   `initialize()`
-   `registerMiddleware()`
-   `registerAction()`
-   `registerRoutes()`
-   `getParamFromRequest()`
-   `handleError()`
-   `handleSuccess()`

---

## 🧭 Real Driver Examples In This Monorepo

The server packages in this repository are concrete examples of the engine contract in action.

### `ExpressDriver`

`servers/express-server/src/driver/ExpressDriver.ts`

-   Extends `NodeBootDriver<Application>`
-   Calls `this.app[actionMetadata.type.toLowerCase()](...)` to register routes
-   Adds body parsing with `body-parser`
-   Adds file upload handling with `multer`
-   Uses `ResultTransformer` before sending JSON/text/binary responses
-   Uses `GlobalErrorHandler` plus optional custom `ErrorHandlerInterface`

### `FastifyDriver`

`servers/fastify-server/src/driver/FastifyDriver.ts`

-   Extends `NodeBootDriver<FastifyInstance, Action<FastifyRequest, FastifyReply>>`
-   Uses `this.app.route({...})` to register each action
-   Maps Node-Boot action types to Fastify `HTTPMethods`
-   Registers global hooks and plugins through `ServerConfig`
-   Runs after-middlewares with `onSend` and error middlewares with `onError`

### `KoaDriver`

`servers/koa-server/src/driver/KoaDriver.ts`

-   Extends `NodeBootDriver<Koa, Action<Request, Response>>`
-   Registers actions on `@koa/router`
-   Finalizes route setup in `registerRoutes()` via `router.routes()` and `router.allowedMethods()`
-   Exposes Koa-specific state through `getParamFromRequest()` (`state`, `session`, `cookies`, etc.)

### `HttpDriver`

`servers/http-server/src/driver/HttpDriver.ts`

-   Adapts plain Node.js `http.Server`
-   Uses `find-my-way` for route matching
-   Stores before/after middleware lists and runs them manually
-   Parses JSON bodies itself in `parseJsonBody()`
-   Converts results/errors directly into `ServerResponse`

### `GhostDriver`

`servers/ghost-server/src/driver/GhostDriver.ts`

-   A non-HTTP driver used for CLI/test/auto-configuration scenarios
-   Does **not** register routes or listen on a socket
-   Exposes `executeAction(...)` to run a controller action in memory
-   Proves the engine contract is broader than HTTP frameworks

---

## 🔬 How It Works Internally

### 1. `NodeBootToolkit.createServer()` bootstraps the driver

`createServer(driver, options)` calls `createEngine(driver, options)` and returns `driver.app`.

Before registration starts, `NodeBootToolkit.configureDriver(...)` pushes engine options into the driver instance:

-   `routePrefix`
-   `authorizationChecker`
-   `currentUserChecker`
-   `classTransformer`
-   `classToPlainTransformOptions`
-   `plainToClassTransformOptions`
-   `validation`
-   `development`

`NodeBootToolkit` also imports:

-   controllers via `ComponentImporter.importControllers(...)`
-   middlewares via `ComponentImporter.importMiddlewares(...)`
-   interceptors via `ComponentImporter.importInterceptors(...)`

If those values are provided as directory globs, `ClassFiles.loadFromDirectories(...)` requires the matching files and collects exported classes.

---

### 2. `MetadataBuilder` turns decorator metadata into runtime metadata

`MetadataArgsStorage` is the global metadata registry used by the engine.

`MetadataBuilder` reads from it and creates:

-   `ControllerMetadata`
-   `ActionMetadata`
-   `MiddlewareMetadata`
-   `InterceptorMetadata`
-   `ParamMetadata`
-   `ResponseHandlerMetadata`

This is where controller-level and action-level `uses`, interceptors, params, and response handler metadata are assembled.

---

### 3. `NodeBootEngine` registers controllers, middleware, and interceptors

`NodeBootEngine` orchestrates the boot order:

1. `initialize()`
2. `registerInterceptors(...)`
3. `registerMiddlewares("before", ...)`
4. `registerControllers(...)`
5. `registerMiddlewares("after", ...)`

For each controller action, `NodeBootEngine.registerControllers(...)` calls `driver.registerAction(...)` with an execution callback that eventually reaches `executeAction(...)`.

---

### 4. `ActionParameterHandler` resolves controller method arguments

Before a controller method is called, `ActionParameterHandler.handle(...)` resolves all declared parameters.

It can:

-   inject raw `request`, `response`, or `context`
-   resolve `body`, `body-param`, `param`, `params`, `query`, `queries`, `header`, `headers`, `cookie`, `cookies`, `session`, `session-param`, `file`, and `files`
-   run custom transforms attached to parameter metadata
-   resolve `current-user` using `driver.currentUserChecker`
-   normalize primitive values with `Param`
-   parse JSON strings for object-like values
-   run `plainToInstance(...)` when transformation is enabled
-   run `validateOrReject(...)` when validation is enabled

This is the layer that makes controller method signatures feel declarative while still remaining framework-agnostic.

---

### 5. Interceptors run in sequence

Once the controller method returns, `NodeBootEngine.handleResult(...)` runs interceptor functions with `runInSequence(...)`.

The interceptor chain includes:

-   global interceptors registered through `registerInterceptors(...)`
-   controller interceptors
-   action interceptors

If an interceptor class implements `intercept(...)`, it is resolved from the DI container through `getFromContainer(...)`.

---

### 6. The driver owns the final response

After interceptors complete, the engine delegates the final output to the driver:

-   `handleSuccess(result, action, actionMetadata)` for successful execution
-   `handleError(error, action, actionMetadata)` for failures

`ResultTransformer` helps drivers serialize class instances with `instanceToPlain(...)`, while `GlobalErrorHandler` converts `Error` objects into safe JSON-friendly payloads.

This separation is the core idea of the package:

> The engine understands **Node-Boot metadata and execution flow**; the driver understands **the target server runtime**.

---

## 🛠️ Helper Utilities For Driver Authors

### `ServerConfig`

`ServerConfig` is a small helper used by the official drivers to activate optional server features in a consistent way.

It supports:

-   `ifCors(...)`
-   `ifCookies(...)`
-   `ifSession(...)`
-   `ifMultipart(...)`
-   `ifTemplate(...)`

This is why `ExpressDriver`, `FastifyDriver`, and `KoaDriver` can conditionally enable framework-specific plugins or middleware without duplicating option parsing logic.

### `GlobalErrorHandler`

Use it to normalize `Error` and `HttpError` instances before sending them to the client.

### `ResultTransformer`

Use it when your driver needs to serialize class instances while respecting Node-Boot response transformation settings.

### `NodeBootToolkit.reset()`

Useful in tests or hot-reload scenarios. It resets `MetadataArgsStorage` and internal bootstrap state so metadata does not accumulate across runs.

---

## 🧩 When To Use `createServer()` vs `createEngine()`

Use `NodeBootToolkit.createServer(driver, options)` when you want the standard bootstrap flow and want the framework app returned as `driver.app`.

Use `NodeBootToolkit.createEngine(driver, options)` when you already own the app instance and only need Node-Boot registration side effects.

---

## ✅ Summary

`@nodeboot/engine` is the execution core behind Node-Boot server integrations.

It:

-   reads global metadata from `MetadataArgsStorage`
-   builds controller/action/middleware/interceptor metadata through `MetadataBuilder`
-   resolves action parameters through `ActionParameterHandler`
-   runs interceptors through `NodeBootEngine`
-   delegates transport-specific behavior to a `NodeBootDriver`

If you want Node-Boot to work with a new framework, this is the package you build on.
