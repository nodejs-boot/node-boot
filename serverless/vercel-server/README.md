# NodeBoot Vercel Server

Vercel Serverless Functions server package for NodeBoot framework. Provides seamless integration with Vercel's
Node.js runtime while maintaining all NodeBoot features including dependency injection, middleware, routing, and
error handling.

## Features

-   **Multi-route Serverless Functions**: Handle multiple HTTP routes in a single Vercel Serverless Function
-   **Full NodeBoot Integration**: Complete support for controllers, services, middleware, and dependency injection
-   **Native Node.js Runtime**: Works directly with Vercel's Node.js `VercelRequest`/`VercelResponse` objects
-   **Request/Response Handling**: Automatic parsing of JSON bodies, query parameters, headers, and cookies
-   **Error Handling**: Integrated error handling with proper HTTP status codes
-   **Authorization**: Built-in authorization support using NodeBoot's authorization system

## Installation

```bash
npm install @nodeboot/vercel-server
```

## Basic Usage

### 1. Create your Vercel application

```typescript
import {VercelServer} from "@nodeboot/vercel-server";
import {NodeBootApplication} from "@nodeboot/core";

@EnableDI(Container)
@EnableValidations()
@EnableComponentScan()
@NodeBootApplication()
export class VercelSampleApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(VercelServer);
    }
}
```

### 2. Create the Serverless Function entry point

Vercel automatically maps files under the `api/` directory to routes. Use a catch-all route so that a single
Serverless Function can handle every path processed by NodeBoot's internal router:

```typescript
// api/[...path].ts
import {VercelHandler, VercelServer} from "@nodeboot/vercel-server";
import {VercelSampleApp} from "../src/app";

// Reused across warm invocations of the same execution environment.
// Only re-initialized when Vercel spins up a brand-new instance (cold start).
let vercelHandler: VercelHandler | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!vercelHandler) {
        const app = await new VercelSampleApp().start();
        const vercelServer = app.server as VercelServer;
        vercelHandler = vercelServer.getHandler();
    }

    return vercelHandler(req, res);
}
```

### 3. Create Controllers

```typescript
import {Controller, Get, Post, Param, Body} from "@nodeboot/core";

@Controller("/api")
export class UserController {
    @Get("/users/:id")
    getUser(@Param("id") id: string) {
        return {id, name: `User ${id}`};
    }

    @Post("/users")
    createUser(@Body() userData: any) {
        return {success: true, user: userData};
    }
}
```

### 4. Deploy to Vercel

The exported `handler` function can be deployed directly as a Vercel Node.js Serverless Function - no additional
configuration is required beyond routing every request to the catch-all `api/[...path].ts` entry point.

## Middleware Support

All NodeBoot middleware is supported:

```typescript
import {Middleware, MiddlewareInterface, Action} from "@nodeboot/core";

@Middleware({type: "before"})
export class LoggingMiddleware implements MiddlewareInterface {
    @Inject()
    private logger: Logger;

    use(action: Action, payload: any): void {
        this.logger.info(`${action.request.method} ${action.request.url}`);
    }
}
```

## Error Handling

Custom error handlers work seamlessly:

```typescript
import {ErrorHandler, ErrorHandlerInterface} from "@nodeboot/core";

@ErrorHandler()
export class CustomErrorHandler implements ErrorHandlerInterface {
    onError(error: any, action: Action): void {
        // Custom error handling logic
    }
}
```

## Authorization

NodeBoot's authorization system is fully supported. Use decorators like `@Authorize()` in your controllers to protect
routes.

```typescript
import {Authorize, Controller, Get} from "@nodeboot/core";

@Controller("/secure")
export class SecureController {
    @Get("/data")
    @Authorize("admin")
    getSecureData() {
        return {secret: "This is secure data"};
    }
}
```

## Conclusion

The NodeBoot Vercel Server package provides a powerful way to build serverless applications using the familiar
NodeBoot framework. With full support for routing, middleware, error handling, and authorization, you can create
robust APIs that run on Vercel's Node.js Serverless Functions with ease.

## License

This project is licensed under the MIT License.
