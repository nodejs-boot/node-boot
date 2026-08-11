# NodeBoot Google Cloud Functions Server

Google Cloud Functions (2nd gen) server package for NodeBoot framework. Provides seamless integration with Google
Cloud Functions' Node.js runtime (built on Express via `@google-cloud/functions-framework`) while maintaining all
NodeBoot features including dependency injection, middleware, routing, and error handling.

## Features

-   **Multi-route Cloud Function**: Handle multiple HTTP routes in a single Google Cloud Function
-   **Full NodeBoot Integration**: Complete support for controllers, services, middleware, and dependency injection
-   **Native Functions Framework Runtime**: Works directly with the `Request`/`Response` objects provided by
    `@google-cloud/functions-framework`
-   **Request/Response Handling**: Automatic parsing of JSON bodies, query parameters, headers, and cookies
-   **Error Handling**: Integrated error handling with proper HTTP status codes
-   **Authorization**: Built-in authorization support using NodeBoot's authorization system

## Installation

```bash
npm install @nodeboot/google-cloud-functions-server @google-cloud/functions-framework
```

## Basic Usage

### 1. Create your Google Cloud Functions application

```typescript
import {GoogleCloudFunctionsServer} from "@nodeboot/google-cloud-functions-server";
import {NodeBootApplication} from "@nodeboot/core";

@EnableDI(Container)
@EnableValidations()
@EnableComponentScan()
@NodeBootApplication()
export class GoogleCloudFunctionsSampleApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(GoogleCloudFunctionsServer);
    }
}
```

### 2. Create the Cloud Function entry point

Google Cloud Functions (2nd gen) route every request for a given function to a single handler. Use a catch-all
NodeBoot router internally so a single Cloud Function can serve every route:

```typescript
// index.ts
import * as functions from "@google-cloud/functions-framework";
import {GoogleCloudFunctionsHandler, GoogleCloudFunctionsServer} from "@nodeboot/google-cloud-functions-server";
import {GoogleCloudFunctionsSampleApp} from "./src/app";

// Reused across warm invocations of the same instance. Only re-initialized on cold start.
let gcfHandler: GoogleCloudFunctionsHandler | null = null;

functions.http("api", async (req, res) => {
    if (!gcfHandler) {
        const app = await new GoogleCloudFunctionsSampleApp().start();
        const gcfServer = app.server as GoogleCloudFunctionsServer;
        gcfHandler = gcfServer.getHandler();
    }

    return gcfHandler(req, res);
});
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

### 4. Deploy to Google Cloud Functions

Deploy with the `gcloud` CLI, pointing at the exported `api` HTTP function:

```bash
gcloud functions deploy api \
  --gen2 \
  --runtime=nodejs20 \
  --trigger-http \
  --entry-point=api \
  --allow-unauthenticated
```

## Middleware Support

All NodeBoot middleware is supported:

```typescript
import {Middleware, MiddlewareInterface, Action} from "@nodeboot/core";

@Middleware({type: "before"})
export class LoggingMiddleware implements MiddlewareInterface {
    @Inject()
    private logger: Logger;

    use(action: Action, payload: any): void {
        this.logger.info(`${action.request.method} ${action.request.path}`);
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

The NodeBoot Google Cloud Functions Server package provides a powerful way to build serverless applications using
the familiar NodeBoot framework. With full support for routing, middleware, error handling, and authorization, you
can create robust APIs that run on Google Cloud Functions with ease.

## License

This project is licensed under the MIT License.
