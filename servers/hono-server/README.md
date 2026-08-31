# 🔥 `@nodeboot/hono-server` – Hono Server for Node-Boot

## Overview

`@nodeboot/hono-server` is the **Hono adapter for Node-Boot**. It provides the `HonoServer` runtime that you pass to `NodeBoot.run(...)`, plus a `HonoDriver` implementation of the `@nodeboot/engine` `NodeBootDriver` contract.

In practice, this package is the piece that:

-   creates the underlying `Hono` application (Hono acts as both framework and router),
-   boots an actual Node.js `http.Server` via `@hono/node-server`,
-   lets the Node-Boot engine register controllers, routes, and middleware,
-   maps Node-Boot request decorators onto Hono's Fetch-API-based `Context`, and
-   applies Hono-specific integrations such as CORS, sessions, cookies, and multipart uploads.

Hono is built directly on Web Standards (`Request`/`Response`/`Headers`), so this driver eagerly parses the request body once per request (JSON, text, or `multipart`/`urlencoded` form fields via `c.req.parseBody()`) and caches it on the Node-Boot `Action`, since a Fetch API request body can only be consumed once.

---

## ✨ Features

-   ✅ **Boot a Node-Boot app with Hono** using `NodeBoot.run(HonoServer)`
-   ✅ **Implements the Node-Boot engine driver contract** for route registration and request handling
-   ✅ **Creates and manages** a `Hono` app, served over Node.js via `@hono/node-server`
-   ✅ **Zero-dependency body parsing** — no `body-parser`/`multer` equivalent needed, `c.req.parseBody()` handles multipart/urlencoded forms natively
-   ✅ **Supports optional integrations** for CORS (`hono/cors`), cookies (`hono/cookie`), and sessions (`hono-sessions`)
-   ✅ **Works with Node-Boot authorization and middleware pipelines**
-   ✅ **Maps request data to Node-Boot decorators** such as body, params, query, session, headers, cookies, and uploaded files
-   ✅ **Exposes the underlying Hono objects** through `getFramework()`, `getRouter()`, and `getHttpServer()`

---

## 📦 Installation

Install the Hono server package together with Node-Boot core and the Hono peer dependencies used by this adapter:

```sh
pnpm add @nodeboot/core @nodeboot/hono-server @nodeboot/di @nodeboot/aot reflect-metadata typedi hono @hono/node-server
```

`hono-sessions` is only required if you enable session support:

```sh
pnpm add hono-sessions
```

### Peer dependencies

This package expects these Hono libraries to be available in your application:

-   `hono`
-   `@hono/node-server`
-   `hono-sessions` (optional, only needed for `session`/`session-param` support)

---

## 🚀 Usage

### 1️⃣ Bootstrap a Node-Boot app with `HonoServer`

A real example from `samples/sample-hono` looks like this:

```typescript
import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {HonoServer} from "@nodeboot/hono-server";
import {EnableDI} from "@nodeboot/di";
import {EnableComponentScan} from "@nodeboot/aot";

@EnableDI(Container)
@EnableComponentScan()
@NodeBootApplication()
export class SampleApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(HonoServer);
    }
}
```

`NodeBoot.run(HonoServer)` creates a `HonoServer`, loads Node-Boot configuration, binds the DI container and application adapters, registers controller routes through the engine, and then starts listening on `app.port` (default `3000`) using `@hono/node-server`.

### 2️⃣ Use normal Node-Boot controllers

Your controllers stay framework-agnostic. The Hono driver resolves request data for the usual Node-Boot HTTP decorators, including:

-   `@Body()` / `@BodyParam()`
-   `@Param()` / `@Params()`
-   `@QueryParam()` / `@QueryParams()`
-   `@Session()` / `@SessionParam()`
-   `@State()`
-   `@HeaderParam()` / `@HeaderParams()`
-   `@CookieParam()` / `@CookieParams()`
-   `@UploadedFile()` / `@UploadedFiles()`

---

## ⚙️ Hono middleware and server configuration

`HonoServer` looks for a `@Bean(SERVER_CONFIGURATIONS)` and passes the resulting `HonoServerConfigs` into the driver.

```typescript
import {Bean, Configuration, SERVER_CONFIGURATIONS, SERVER_CONFIGURATIONS_PROPERTY_PATH} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {HonoServerConfigProperties, HonoServerConfigs} from "@nodeboot/hono-server";

@Configuration()
export class ServerConfiguration {
    @Bean(SERVER_CONFIGURATIONS)
    public serverConfig({config}: BeansContext): HonoServerConfigs {
        const serverConfigs = config.getOptional<HonoServerConfigProperties>(SERVER_CONFIGURATIONS_PROPERTY_PATH);

        return {
            cors: {options: serverConfigs?.cors},
            session: {options: serverConfigs?.session},
            multipart: {options: serverConfigs?.multipart},
        };
    }
}
```

And the matching `app-config.yaml` can contain a `server` section like this:

```yaml
server:
    cors:
        origin: "*"
        credentials: true
    multipart:
        all: true
```

### What each option enables

-   **`cors`** → registers Hono's built-in `hono/cors` middleware
-   **`cookie`** → cookies are always readable/writable via `hono/cookie` (`getCookie`/`setCookie`), no global middleware needed
-   **`session`** → registers `hono-sessions`' `sessionMiddleware(options)` (requires a store, e.g. `CookieStore`)
-   **`multipart`** → options passed straight through to `c.req.parseBody(...)` when parsing `multipart/form-data`/`urlencoded` bodies
-   **`template`** → defined in the config type for parity with other adapters, but template rendering is not currently supported by this driver

---

## 🔐 Authorization and current user integration

The Hono driver exposes Hono's own `Context` as `action.response`/`action.context`, and a lightweight `HonoRequest` wrapper (`{raw, method, url, headers, params, query, body}`) as `action.request`:

```typescript
import {Action, AuthorizationChecker, CurrentUserChecker} from "@nodeboot/context";
import {HonoRequest, HonoResponse} from "@nodeboot/hono-server";

export class DefaultAuthorizationResolver implements AuthorizationChecker<HonoRequest, HonoResponse> {
    async check(action: Action<HonoRequest, HonoResponse>, roles: string[]): Promise<boolean> {
        const user = action.response.get("user" as never);
        if (!roles.length) return true;
        return !!user && roles.some(role => (user as any).roles.includes(role));
    }
}

export class LoggedInUserResolver implements CurrentUserChecker<HonoRequest, HonoResponse> {
    async check(action: Action<HonoRequest, HonoResponse>) {
        return action.response.get("user" as never) ?? null;
    }
}
```

The driver calls your configured authorization checker for any action decorated with `@Authorized(...)`, registering the check as the first handler in that route's chain. A failed check (or a missing checker) is converted into an `AuthorizationRequiredError`/`AccessDeniedError`, which the driver's `handleError()` turns into a `401`/`403` response.

---

## 🪝 Middleware behavior

Node-Boot middlewares (`MiddlewareInterface`) targeting Hono should be typed against `HonoRequest`/`HonoResponse`:

```typescript
import {Middleware} from "@nodeboot/core";
import {MiddlewareInterface} from "@nodeboot/context";
import {HonoRequest, HonoResponse} from "@nodeboot/hono-server";

@Middleware({type: "before"})
export class RequestLoggerMiddleware implements MiddlewareInterface<HonoRequest, HonoResponse> {
    async use({request}: {request: HonoRequest}): Promise<void> {
        console.log(`${request.method} ${request.url.pathname}`);
    }
}
```

-   Global middlewares (registered without controller-level scoping) are wrapped and mounted with `app.use(...)`, running for every request that reaches the Hono app.
-   Controller/action-level `@UseBefore(...)`/`@UseAfter(...)` middlewares are inserted directly into that route's handler chain, before/after the controller action respectively.
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

### `@nodeboot/hono-server`

This package supplies that implementation for Hono:

-   `HonoServer` extends `BaseServer<Hono, Hono>`
-   `HonoDriver` extends `NodeBootDriver<Hono, Action<HonoRequest, Context>>`
-   `NodeBootToolkit.createServer(...)` wires the engine to the Hono driver

That means your Node-Boot controllers remain portable, while this package handles the Hono-specific translation layer.

---

## 🔍 Hono-specific behavior

A few implementation details are useful to know:

-   Routes are registered directly on the `Hono` app instance (`app.on(method, path, ...handlers)`); there's no separate router to mount.
-   Unlike Express/Koa, Hono's router is **strict about trailing slashes** — a route declared with `@Get("/")` is only reachable at the exact `.../` path, and a route declared with `@Get()` (or any path without a trailing slash) is only reachable without it. Declare the exact path(s) you want to expose.
-   Request bodies are parsed once per request (based on `content-type`) and cached, since the underlying Fetch API `Request` only allows a single read of its body.
-   Calling `c.json()`/`c.text()`/`c.body()`/`c.redirect()` only **builds** a `Response` — it has no side effect on its own. A custom `ErrorHandlerInterface.onError(...)` must assign the built response back, e.g. `action.response.res = action.response.json({...}, status)`, otherwise Hono will fall through to its own default response for that request.
-   File uploads are extracted from the parsed `multipart/form-data` body — no `multer`-equivalent middleware is required.
-   Redirect responses are supported via `c.redirect(...)`.
-   Returning `null` responds with an empty body and (by default) a `204` status.
-   Returning `undefined` is treated as a not-found condition and goes through Node-Boot error handling.
-   `renderedTemplate` responses are **not supported yet** and currently throw an error in the Hono driver.

---

## 🛠 Accessing the underlying Hono server

If you need lower-level access, `HonoServer` exposes:

-   `getFramework()` → the `Hono` application instance
-   `getRouter()` → the same `Hono` application instance (Hono has no separate router object)
-   `getHttpServer()` → the underlying Node `http.Server` created by `@hono/node-server`

This is useful when integrating Hono-specific behavior alongside the standard Node-Boot abstractions.
