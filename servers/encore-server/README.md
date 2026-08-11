# 🧭 `@nodeboot/encore-server` – Encore.ts Server for Node-Boot

## Overview

`@nodeboot/encore-server` lets you run a full Node-Boot application (controllers, DI, middleware, authorization,
validation, OpenAPI, actuator, ...) as an [Encore.ts](https://encore.dev/docs/ts) service.

Encore.ts owns the actual HTTP listening socket and its own request lifecycle - it doesn't let a third-party
framework `listen()` on a port. Instead, it exposes ["raw endpoints"](https://encore.dev/docs/ts/primitives/raw-endpoints)
(`api.raw`), which behave just like a plain `node:http` request handler: `(req: IncomingMessage, resp: ServerResponse) => void`.

`EncoreServer` takes advantage of this: it boots Node-Boot against an internal
[`find-my-way`](https://github.com/delvedor/find-my-way) router (the same approach used by
`@nodeboot/http-server`) and exposes a single `getHandler()` method with exactly that signature. You register it
once as a catch-all `api.raw` endpoint, and every request handled by Encore.ts is routed into Node-Boot's engine -
controllers, middlewares, authorization checks and all.

## ✨ Features

-   ✅ **Boot a Node-Boot app inside an Encore.ts service** using `NodeBoot.run(EncoreServer)`
-   ✅ **Implements the `@nodeboot/engine` driver contract** via `EncoreDriver`
-   ✅ **Routing powered by `find-my-way`** - a fast, radix-tree based router
-   ✅ **Single catch-all raw endpoint** forwards every request into Node-Boot, so all of your `@Controller`s keep
    working unchanged
-   ✅ **Built-in JSON body parsing** for `POST`/`PUT`/`PATCH` requests
-   ✅ **Optional CORS handling** through server configuration, including preflight (`OPTIONS`) requests
-   ✅ **Cookie parsing** for `@CookieParam()`/`@CookieParams()` decorators
-   ✅ **Works with Node-Boot authorization and middleware pipelines**, typed against native
    `IncomingMessage`/`ServerResponse` (the types Encore.ts passes to raw endpoints)
-   ✅ **Request/response logging** with timing, out of the box

## 🚀 Installation

```sh
pnpm add @nodeboot/core @nodeboot/context @nodeboot/encore-server @nodeboot/di typedi reflect-metadata encore.dev
```

`find-my-way` and `cookie` are bundled as direct dependencies of `@nodeboot/encore-server`. `encore.dev` is a peer
dependency - install it as part of setting up your Encore.ts app (`encore app create` / `encore run`).

## 🔥 Usage

### 1️⃣ Bootstrap a Node-Boot app with `EncoreServer`

```typescript
// app.ts
import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EncoreServer} from "@nodeboot/encore-server";
import {EnableDI} from "@nodeboot/di";
import {EnableComponentScan} from "@nodeboot/aot";

@EnableDI(Container)
@EnableComponentScan()
@NodeBootApplication()
export class SampleApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(EncoreServer);
    }
}
```

Unlike the other adapters, `EncoreServer.listen()` doesn't open a socket - Encore.ts's runtime already does that.
It simply finishes wiring up Node-Boot's engine (controllers, middlewares, DI, OpenAPI, actuator, ...) against the
internal router and publishes the usual `application.started` lifecycle event.

### 2️⃣ Define an `encore.service.ts` and a catch-all raw endpoint

Encore.ts requires every service directory to declare itself via `encore.service.ts`:

```typescript
// encore.service.ts
import {Service} from "encore.dev/service";

export default new Service("api");
```

Then expose Node-Boot through a single catch-all raw endpoint using the fallback route syntax (`/!path`), so every
request - regardless of path or method - is routed into Node-Boot's own router:

```typescript
// api.ts
import {api} from "encore.dev/api";
import {EncoreServer} from "@nodeboot/encore-server";
import {SampleApp} from "./app";

// Reused across invocations of the same process. Only re-initialized on cold start.
let handler: ReturnType<EncoreServer["getHandler"]> | null = null;

export const apiHandler = api.raw({expose: true, method: "*", path: "/!path"}, async (req, resp) => {
    if (!handler) {
        const app = await new SampleApp().start();
        handler = (app.server as EncoreServer).getHandler();
    }
    return handler(req, resp);
});
```

### 3️⃣ Add controllers normally

Controllers remain completely framework-agnostic - the same controller code runs unchanged whether you're using
Express, Fastify, Koa, the native HTTP adapter, or Encore.ts:

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

Run it locally with `encore run` - requests to any path/method reach the `apiHandler` raw endpoint, which
delegates to Node-Boot's router to find and execute the matching controller action.

## ⚙️ Server configuration

This package exports `EncoreServerConfigs`/`EncoreServerConfigProperties`. Currently, only `cors` is actively used
by the driver (`cookie`, `session`, `multipart`, and `template` are part of the shared config shape but are not
implemented by this adapter yet):

```typescript
import {Bean, Configuration, SERVER_CONFIGURATIONS, SERVER_CONFIGURATIONS_PROPERTY_PATH} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {EncoreServerConfigProperties, EncoreServerConfigs} from "@nodeboot/encore-server";

@Configuration()
export class ServerConfiguration {
    @Bean(SERVER_CONFIGURATIONS)
    public serverConfig({config}: BeansContext): EncoreServerConfigs {
        const serverConfigs = config.getOptional<EncoreServerConfigProperties>(SERVER_CONFIGURATIONS_PROPERTY_PATH);

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

Because the raw endpoint handler works directly with Node's `IncomingMessage`/`ServerResponse` (the types
Encore.ts passes to `api.raw` handlers), authorization checkers and current-user resolvers registered through
`@nodeboot/authorization` must be typed against those native types:

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

Node-Boot middlewares (`MiddlewareInterface`) targeting this adapter should be typed against
`IncomingMessage`/`ServerResponse`:

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
-   Like the native HTTP adapter, this driver does not yet support controller/action-level `@UseBefore`/`@UseAfter`
    -   global middlewares are the primary mechanism.

## 📨 Supported request parameter sources

The Encore.ts driver resolves Node-Boot action parameters, including:

-   `@Body()` / `@BodyParam()` - parsed from the raw request stream as JSON for `POST`/`PUT`/`PATCH`
-   `@Param()` / `@Params()` - from `find-my-way` route params
-   `@QueryParam()` / `@QueryParams()` - from parsed search params
-   `@HeaderParam()` / `@HeaderParams()`
-   `@CookieParam()` / `@CookieParams()` - parsed from the `Cookie` header via the `cookie` package

> Session (`@Session()`/`@SessionParam()`) and file upload (`@UploadedFile()`/`@UploadedFiles()`) decorators are
> **not yet implemented** by this driver - use Express, Fastify, or Koa if your application needs those features.

## ⚠️ Important: Dependency Injection under Encore.ts's bundler

Encore.ts bundles your application with **esbuild**, which does **not** emit TypeScript's
`emitDecoratorMetadata` reflection data (`design:type`, `design:paramtypes`, `design:returntype`) even when
`emitDecoratorMetadata: true` is set in `tsconfig.json`. Since `typedi` (Node-Boot's default DI container) and
Node-Boot's own parameter metadata rely on this reflection data to auto-infer types, a few patterns are required
when running under Encore.ts:

1. **Always pass an explicit token/type to `@Inject()` for property injection.**

    ```ts
    // ❌ Breaks under esbuild - throws CannotInjectValueError
    @Inject() private logger: Logger;

    // ✅ Works - explicit token bypasses type reflection
    @Inject("logger") private logger: Logger;
    @Inject(() => UserService) private userService: UserService;
    ```

2. **Avoid constructor injection - use property injection instead.** Without `design:paramtypes`, typedi invokes
   constructors with no real arguments (regardless of per-parameter `@Inject()` decorators) and silently appends
   its internal container instance as an extra argument, producing confusing runtime errors such as
   `this.userService.findAll is not a function`.

    ```ts
    // ❌ Breaks under esbuild
    constructor(@Inject("logger") private logger: Logger) {}

    // ✅ Works
    @Inject("logger") private logger: Logger;
    ```

3. **Pass an explicit `type` to `@Body()` when you need validation/transformation.** Node-Boot infers a body
   parameter's target type via the same reflection metadata to decide whether to run `class-transformer`/
   `class-validator`; without it, validation is silently skipped.

    ```ts
    // ❌ Validation silently skipped under esbuild
    createUser(@Body() userData: CreateUserDto) {}

    // ✅ Works - explicit type restores validation
    createUser(@Body({type: CreateUserDto}) userData: CreateUserDto) {}
    ```

These caveats are specific to Encore.ts's esbuild-based bundler and do not apply to other Node-Boot server
adapters (Express, Fastify, Koa, `http`) which run under `ts-node`/`tsc` and preserve full reflection metadata.
See `samples/sample-encore` for a complete working example that follows these patterns.

## 🛠️ Runtime behavior

-   Requests are logged on entry and exit, including method, URL, remote address, user agent, and duration in
    milliseconds.
-   Responses support plain strings, JSON-serializable objects, `Buffer`, redirects, and custom status codes.
    -   `@Render(...)` (template rendering) is accepted by the metadata but **not implemented**.
-   `EncoreServer` exposes `getHttpServer()` and `getFramework()` returning `undefined` (Encore.ts owns the HTTP
    server, not Node-Boot), and `getRouter()` returning the `find-my-way` router instance for lower-level access.
-   `getHandler()` returns the `(req, resp) => Promise<void>` function to register as your `api.raw` endpoint.

## 🔌 How this package relates to `@nodeboot/core` and `@nodeboot/engine`

`EncoreServer` extends Node-Boot's base server abstraction and is the class you pass to `NodeBoot.run(EncoreServer)`.
Under the hood, it provides `EncoreDriver`, which implements the `NodeBootDriver` contract from `@nodeboot/engine` -
handling route registration, parameter resolution, authorization, middleware execution, and error handling - the
same responsibilities every other Node-Boot server driver fulfills, adapted to Encore.ts's raw endpoint model
instead of an owned HTTP listening socket.

## ✅ Summary

Use `@nodeboot/encore-server` when you want to build your service's business logic with the full Node-Boot
programming model (decorators, DI, authorization, middleware, validation, OpenAPI) while deploying it on
Encore.ts's infrastructure-as-code platform - local dev environment, tracing, and cloud provisioning included.

## 📄 License

MIT
