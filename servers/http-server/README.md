# 🧵 `@nodeboot/http-server` – Native HTTP Server for Node-Boot

## Overview

`@nodeboot/http-server` is the **native Node.js `http` adapter** for Node-Boot. Unlike the Express, Fastify, and Koa
adapters, it doesn't depend on a third-party web framework at all — routing is handled by the lightweight
[`find-my-way`](https://github.com/delvedor/find-my-way) router directly on top of Node's built-in `http.Server`.

Use this adapter when you want the smallest possible dependency footprint, full control over the request/response
lifecycle, or you're building a service where every extra layer of abstraction matters (e.g. latency-sensitive
internal services, sidecars, or minimal container images) — while still keeping the full Node-Boot programming
model: decorators, DI, configuration beans, middleware, authorization, and validation.

## ✨ Features

-   ✅ **Boot a Node-Boot app with zero framework dependencies** using `NodeBoot.run(HttpServer)`
-   ✅ **Implements the `@nodeboot/engine` driver contract** via `HttpDriver`
-   ✅ **Routing powered by `find-my-way`** — a fast, radix-tree based router
-   ✅ **Built-in JSON body parsing** for `POST`/`PUT`/`PATCH` requests
-   ✅ **Optional CORS handling** through server configuration, including preflight (`OPTIONS`) requests
-   ✅ **Cookie parsing** for `@CookieParam()`/`@CookieParams()` decorators
-   ✅ **Works with Node-Boot authorization and middleware pipelines**, typed against native `IncomingMessage`/`ServerResponse`
-   ✅ **Request/response logging** with timing, out of the box

## 🚀 Installation

```sh
pnpm add @nodeboot/core @nodeboot/context @nodeboot/http-server @nodeboot/aot @nodeboot/di typedi reflect-metadata
```

Unlike the other server adapters, there are no web-framework peer dependencies to install — `find-my-way` and
`cookie` are bundled as direct dependencies of `@nodeboot/http-server`.

## 🔥 Usage

### 1️⃣ Bootstrap a Node-Boot app with `HttpServer`

```typescript
import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {HttpServer} from "@nodeboot/http-server";
import {EnableDI} from "@nodeboot/di";
import {EnableComponentScan} from "@nodeboot/aot";

@EnableDI(Container)
@EnableComponentScan()
@NodeBootApplication()
export class SampleApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(HttpServer);
    }
}
```

`HttpServer` creates a plain `node:http` server and a `find-my-way` router, binds Node-Boot's engine driver,
registers discovered controllers/middleware, and starts listening on `0.0.0.0` using your configured `app.port`.

### 2️⃣ Add controllers normally

Controllers remain completely framework-agnostic — the same controller code runs unchanged whether you're using
Express, Fastify, Koa, or this native HTTP adapter:

```typescript
import {Controller, Get} from "@nodeboot/core";

@Controller("/hello", "v1")
export class HelloController {
    @Get("/")
    async hello(): Promise<string> {
        return "Hello, World!";
    }
}
```

## ⚙️ Server configuration

This package exports `HttpServerConfigs`/`HttpServerConfigProperties`. Currently, only `cors` is actively used by the
driver (`cookie`, `session`, `multipart`, and `template` are part of the shared config shape but are not
implemented by this adapter yet):

```typescript
import {Bean, Configuration, SERVER_CONFIGURATIONS, SERVER_CONFIGURATIONS_PROPERTY_PATH} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {HttpServerConfigProperties, HttpServerConfigs} from "@nodeboot/http-server";

@Configuration()
export class ServerConfiguration {
    @Bean(SERVER_CONFIGURATIONS)
    public serverConfig({config}: BeansContext): HttpServerConfigs {
        const serverConfigs = config.getOptional<HttpServerConfigProperties>(SERVER_CONFIGURATIONS_PROPERTY_PATH);

        return {
            cors: {options: serverConfigs?.cors},
        };
    }
}
```

```yaml
server:
    cors:
        origin: "*"
        credentials: true
```

If no `SERVER_CONFIGURATIONS` bean is provided at all, the driver logs a warning and runs without CORS handling.

## 🔐 Authorization and current user integration

Because the native HTTP driver works directly with Node's `IncomingMessage`/`ServerResponse`, authorization checkers
and current-user resolvers registered through `@nodeboot/authorization` must be typed against those native types:

```typescript
import {Action, AuthorizationChecker} from "@nodeboot/context";
import {Component} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {Logger} from "winston";
import {IncomingMessage, ServerResponse} from "node:http";

@Component()
export class DefaultAuthorizationResolver implements AuthorizationChecker<IncomingMessage, ServerResponse> {
    @Inject()
    private logger: Logger;

    async check(_: Action<IncomingMessage, ServerResponse>, roles: string[]): Promise<boolean> {
        this.logger.info(`Checking authorization`);
        const user = {roles: ["USER", "ADMIN"]};
        if (user && !roles.length) return true;
        return user && roles.find(role => user.roles.indexOf(role) !== -1) !== undefined;
    }
}
```

```typescript
import {Action, CurrentUserChecker} from "@nodeboot/context";
import {Component} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {Logger} from "winston";
import {IncomingMessage, ServerResponse} from "node:http";

@Component()
export class LoggedInUserResolver implements CurrentUserChecker<IncomingMessage, ServerResponse> {
    @Inject()
    private logger: Logger;

    async check(_action: Action<IncomingMessage, ServerResponse>): Promise<any> {
        this.logger.info(`Checking current logged in user`);
        return {id: 1, username: "exampleUser"};
    }
}
```

Wire both resolvers with `@EnableAuthorization(LoggedInUserResolver, DefaultAuthorizationResolver)` on your
application class, exactly as with any other Node-Boot server adapter. The driver runs the authorization check for
any action decorated with `@Authorized(...)`, converting a failed check into an `AuthorizationRequiredError`
(`401`) or `AccessDeniedError` (`403`).

## 🪝 Middleware behavior

Node-Boot middlewares (`MiddlewareInterface`) targeting this adapter should be typed against `IncomingMessage`/`ServerResponse`:

```typescript
import {Middleware} from "@nodeboot/core";
import {MiddlewareInterface} from "@nodeboot/context";
import {IncomingMessage, ServerResponse} from "node:http";

@Middleware({type: "before"})
export class RequestLoggerMiddleware implements MiddlewareInterface<IncomingMessage, ServerResponse> {
    async use({request}: {request: IncomingMessage; response: ServerResponse}): Promise<void> {
        console.log(`${request.method} ${request.url}`);
    }
}
```

-   **Global `{type: "before"}` middlewares** run for every request whose URL starts with your configured route
    prefix, before route matching happens.
-   **Global `{type: "after"}` middlewares** run once the matched route handler has completed, unless the response
    was already ended (`res.writableEnded`/`res.headersSent`).
-   A custom `ErrorHandlerInterface` (an `onError(error, action, actionMetadata)` method) is detected automatically
    and used instead of the built-in global error handler for errors not already marked as `handled`.
-   Unlike Express/Fastify/Koa, this driver does not yet support controller/action-level `@UseBefore`/`@UseAfter`
    the same way — global middlewares are the primary mechanism.

## 📨 Supported request parameter sources

The native HTTP driver resolves Node-Boot action parameters, including:

-   `@Body()` / `@BodyParam()` — parsed from the raw request stream as JSON for `POST`/`PUT`/`PATCH`
-   `@Param()` / `@Params()` — from `find-my-way` route params
-   `@QueryParam()` / `@QueryParams()` — from parsed search params
-   `@HeaderParam()` / `@HeaderParams()`
-   `@CookieParam()` / `@CookieParams()` — parsed from the `Cookie` header via the `cookie` package

> Session (`@Session()`/`@SessionParam()`) and file upload (`@UploadedFile()`/`@UploadedFiles()`) decorators are
> **not yet implemented** by this driver — use Express, Fastify, or Koa if your application needs those features.

## 🛠️ Runtime behavior

-   Requests are logged on entry and exit, including method, URL, remote address, user agent, and duration in
    milliseconds.
-   Responses support plain strings, JSON-serializable objects, `Buffer`, redirects, and custom status codes.
    -   `@Render(...)` (template rendering) is accepted by the metadata but **not implemented** — it currently ends
        the response with a placeholder string instead of rendering a view.
-   `HttpServer` exposes `getHttpServer()`, `getFramework()` (both return the underlying `http.Server`), and
    `getRouter()` (the `find-my-way` router instance) for lower-level access.

## 🔌 How this package relates to `@nodeboot/core` and `@nodeboot/engine`

`HttpServer` extends Node-Boot's base server abstraction and is the class you pass to `NodeBoot.run(HttpServer)`.
Under the hood, it provides `HttpDriver`, which implements the `NodeBootDriver` contract from `@nodeboot/engine` —
handling route registration, parameter resolution, authorization, middleware execution, and error handling — the
same responsibilities every other Node-Boot server driver fulfills, just without an intermediate web framework.

## ✅ Summary

Use `@nodeboot/http-server` when you want to run a Node-Boot application directly on Node's native `http` module —
minimal dependencies, full control, and the same Node-Boot programming model (decorators, DI, authorization,
middleware) as the framework-backed adapters, with the trade-off that sessions, multipart uploads, and template
rendering aren't supported yet.

## 📄 License

MIT
