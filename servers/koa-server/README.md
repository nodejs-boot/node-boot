# 🌿 `@nodeboot/koa-server` – Koa Server for Node-Boot

## Overview

`@nodeboot/koa-server` is the **Koa adapter for Node-Boot**. It provides the `KoaServer` runtime that you pass to `NodeBoot.run(...)`, plus a `KoaDriver` implementation of the `@nodeboot/engine` `NodeBootDriver` contract.

In practice, this package is the piece that:

-   creates the underlying `Koa` application and `@koa/router` router,
-   lets the Node-Boot engine register controllers, routes, and middleware,
-   maps Node-Boot request decorators onto Koa's `Context`, `Request`, and `Response`, and
-   applies Koa-specific integrations such as body parsing, CORS, sessions, cookies, and multipart uploads.

---

## ✨ Features

-   ✅ **Boot a Node-Boot app with Koa** using `NodeBoot.run(KoaServer)`
-   ✅ **Implements the Node-Boot engine driver contract** for route registration and request handling
-   ✅ **Creates and manages** a `Koa` app plus `@koa/router` instance
-   ✅ **Automatically enables `koa-bodyparser`** during driver initialization
-   ✅ **Supports optional Koa middleware integration** for CORS, cookies, sessions, and multipart uploads
-   ✅ **Works with Node-Boot authorization and middleware pipelines**
-   ✅ **Maps request data to Node-Boot decorators** such as body, params, query, session, headers, cookies, and uploaded files
-   ✅ **Exposes the underlying Koa objects** through `getFramework()`, `getRouter()`, and `getHttpServer()`

---

## 📦 Installation

Install the Koa server package together with Node-Boot core and the Koa peer dependencies used by this adapter:

```sh
pnpm add @nodeboot/core @nodeboot/koa-server @nodeboot/di @nodeboot/aot reflect-metadata typedi koa @koa/router koa-bodyparser @koa/multer @koa/cors koa-session koa-cookies
```

### Peer dependencies

This package expects these Koa libraries to be available in your application:

-   `koa`
-   `@koa/router`
-   `koa-bodyparser`
-   `@koa/multer`
-   `@koa/cors`
-   `koa-session`
-   `koa-cookies`

---

## 🚀 Usage

### 1️⃣ Bootstrap a Node-Boot app with `KoaServer`

A real example from `samples/sample-koa` looks like this:

```typescript
import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {KoaServer} from "@nodeboot/koa-server";
import {EnableDI} from "@nodeboot/di";
import {EnableComponentScan} from "@nodeboot/aot";

@EnableDI(Container)
@EnableComponentScan()
@NodeBootApplication()
export class SampleApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(KoaServer);
    }
}
```

`NodeBoot.run(KoaServer)` creates a `KoaServer`, loads Node-Boot configuration, binds the DI container and application adapters, registers controller routes through the engine, and then starts listening on `app.port` (default `3000`).

### 2️⃣ Use normal Node-Boot controllers

Your controllers stay framework-agnostic. For example, the Koa sample uses `@QueryParams()` exactly the same way as other Node-Boot HTTP servers:

```typescript
import {Controller, CursorPage, CursorRequest, Get, Page, PagingRequest, QueryParams} from "@nodeboot/core";
import {UserModel} from "../models";

@Controller("/paging", "v1")
export class PagingUserController {
    @Get("/paginated")
    async getUsersPaginated(@QueryParams() paging: PagingRequest): Promise<Page<UserModel>> {
        // ...
    }

    @Get("/cursor")
    async getUsersCursorPaginated(@QueryParams() cursorRequest: CursorRequest): Promise<CursorPage<UserModel>> {
        // ...
    }
}
```

The Koa driver resolves request data for the usual Node-Boot HTTP decorators, including:

-   `@Body()` / `@BodyParam()`
-   `@Param()` / `@Params()`
-   `@QueryParam()` / `@QueryParams()`
-   `@Session()` / `@SessionParam()`
-   `@State()`
-   `@HeaderParam()` / `@HeaderParams()`
-   `@CookieParam()` / `@CookieParams()`
-   `@UploadedFile()` / `@UploadedFiles()`

---

## ⚙️ Koa middleware and server configuration

`KoaServer` looks for a `@Bean(SERVER_CONFIGURATIONS)` and passes the resulting `KoaServerConfigs` into the driver.

A practical configuration bean is:

```typescript
import {Bean, Configuration, SERVER_CONFIGURATIONS, SERVER_CONFIGURATIONS_PROPERTY_PATH} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {KoaServerConfigProperties, KoaServerConfigs} from "@nodeboot/koa-server";

@Configuration()
export class ServerConfiguration {
    @Bean(SERVER_CONFIGURATIONS)
    public serverConfig({config}: BeansContext): KoaServerConfigs {
        const serverConfigs = config.getOptional<KoaServerConfigProperties>(SERVER_CONFIGURATIONS_PROPERTY_PATH);

        return {
            cookie: {enabled: true},
            cors: {options: serverConfigs?.cors},
            session: {options: serverConfigs?.session},
            multipart: {options: serverConfigs?.multipart},
            template: {options: serverConfigs?.template},
        };
    }
}
```

And the matching `app-config.yaml` can contain a `server` section like this:

```yaml
server:
    cors:
        origin: "*"
        methods:
            - GET
            - POST
            - DELETE
            - PUT
        credentials: true
    session:
        key: "nodeboot:sess"
    multipart:
        throwFileSizeLimit: true
        limits:
            fileSize: 4096
            files: 5
```

### What each option enables

-   **`cors`** → registers `@koa/cors`
-   **`cookie`** → registers `parseCookie()` so cookies are available from Koa context
-   **`session`** → registers `koa-session`
-   **`multipart`** → used when an action uses `@UploadedFile()` or `@UploadedFiles()`
-   **`template`** → defined in the config type, but template rendering is not currently supported by this Koa driver

> `koa-bodyparser` is always registered by the driver, even without extra configuration.

---

## 🔐 Authorization and current user integration

The Koa driver works with Koa's own `Request`/`Response` objects (accessible via `context.request`/`context.response`), so authorization checkers and current-user resolvers registered through `@nodeboot/authorization` should be typed against those concrete Koa types:

```typescript
import {Action, AuthorizationChecker, CurrentUserChecker} from "@nodeboot/context";
import {Request, Response} from "koa";

export class DefaultAuthorizationResolver implements AuthorizationChecker<Request, Response> {
    async check(action: Action<Request, Response>, roles: string[]): Promise<boolean> {
        const user = (action.request as any).user;
        if (!roles.length) return true;
        return !!user && roles.some(role => user.roles.includes(role));
    }
}

export class LoggedInUserResolver implements CurrentUserChecker<Request, Response> {
    async check(action: Action<Request, Response>) {
        return (action.request as any).user ?? null;
    }
}
```

The driver calls your configured authorization checker for any action decorated with `@Authorized(...)`, registering the check as the first middleware in that route's chain. A failed check (or a missing checker) is converted into an `AuthorizationRequiredError`/`AccessDeniedError`, which the driver's `handleError()` turns into a `401`/`403` response.

---

## 🪝 Middleware behavior

Node-Boot middlewares (`MiddlewareInterface`) targeting Koa should be typed against Koa's `Request`/`Response`, and receive the Koa `Context` and `next()` callback as part of the `Action`:

```typescript
import {Middleware} from "@nodeboot/core";
import {MiddlewareInterface} from "@nodeboot/context";
import {Request, Response} from "koa";

@Middleware({type: "before"})
export class RequestLoggerMiddleware implements MiddlewareInterface<Request, Response> {
    async use({request}: {request: Request; response: Response}): Promise<void> {
        console.log(`${request.method} ${request.url}`);
    }
}
```

-   Global middlewares (registered without controller-level scoping) are wrapped and mounted with `app.use(...)`, running for every request that reaches the Koa app.
-   Controller/action-level `@UseBefore(...)`/`@UseAfter(...)` middlewares are inserted directly into the `@koa/router` handler chain for that specific route, before/after the controller action respectively.
-   A custom `ErrorHandlerInterface` implementation (an `onError(error, action, actionMetadata)` method) is detected automatically and used instead of the built-in global error handler for errors not already marked as `handled`.
-   Errors thrown inside a middleware's `use()` are caught and routed through the same `handleError()` path as controller errors, so they still produce a proper Node-Boot error response instead of an unhandled rejection.

---

## 🧠 How this package fits into Node-Boot

### `@nodeboot/core`

`@nodeboot/core` gives you the application model: `NodeBoot`, `BaseServer`, app decorators, controllers, and the `SERVER_CONFIGURATIONS` bean contract.

### `@nodeboot/engine`

`@nodeboot/engine` owns the HTTP execution pipeline. Its `NodeBootDriver` abstraction expects each server integration to provide methods like:

-   `initialize()`
-   `registerMiddleware()`
-   `registerAction()`
-   `registerRoutes()`
-   `getParamFromRequest()`
-   `handleSuccess()`
-   `handleError()`

### `@nodeboot/koa-server`

This package supplies that implementation for Koa:

-   `KoaServer` extends `BaseServer<Koa, Router>`
-   `KoaDriver` extends `NodeBootDriver<Koa, Action<Request, Response>>`
-   `NodeBootToolkit.createServer(...)` wires the engine to the Koa driver

That means your Node-Boot controllers remain portable, while this package handles the Koa-specific translation layer.

---

## 🔍 Koa-specific behavior

A few implementation details are useful to know:

-   Routes are registered with `@koa/router`, and `router.allowedMethods()` is enabled automatically.
-   Trailing slashes are normalized for registered routes, so a Node-Boot route ending with `/` is exposed without the trailing slash.
-   A guard prevents multiple matching Koa routes from executing the same request more than once.
-   Redirect responses are supported.
-   Returning `null` writes `null` to the response body.
-   Returning a `Uint8Array` is converted to a `Buffer` before sending.
-   Returning `undefined` is treated as a not-found condition and goes through Node-Boot error handling.
-   `renderedTemplate` responses are **not supported yet** and currently throw an error in the Koa driver.

---

## 🛠 Accessing the underlying Koa server

If you need lower-level access, `KoaServer` exposes:

-   `getFramework()` → the `Koa` application instance
-   `getRouter()` → the `@koa/router` instance
-   `getHttpServer()` → the underlying Node `http.Server`

This is useful when integrating Koa-specific behavior alongside the standard Node-Boot abstractions.
