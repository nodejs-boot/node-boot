# NodeBoot Lambda Server

AWS Lambda server package for NodeBoot framework. Provides seamless integration with AWS Lambda while maintaining all
NodeBoot features including dependency injection, middleware, routing, and error handling.

## Features

-   **Multi-route Lambda Functions**: Handle multiple HTTP routes in a single Lambda function
-   **Full NodeBoot Integration**: Complete support for controllers, services, middleware, and dependency injection
-   **AWS API Gateway Integration**: Native support for API Gateway proxy events
-   **Request/Response Handling**: Automatic parsing of JSON bodies, query parameters, headers, and cookies
-   **Error Handling**: Integrated error handling with proper HTTP status codes
-   **Authorization**: Built-in authorization support using NodeBoot's authorization system

## Installation

```bash
npm install @nodeboot/lambda-server
```

## Basic Usage

### 1. Create your Lambda handler

```typescript
import {LambdaServer} from "@nodeboot/lambda-server";
import {NodeBootApplication} from "@nodeboot/core";

@EnableDI(Container)
@EnableValidations()
@EnableComponentScan()
@NodeBootApplication()
export class LambdaSampleApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(LambdaServer);
    }
}
```

```typescript
import {LambdaSampleApp} from './LambdaSampleApp';
import {LambdaHandler, LambdaServer} from "@nodeboot/lambda-server";

...

let lambdaHandler: LambdaHandler | null = null;

/**
 * AWS Lambda handler function
 * This function is called by AWS Lambda for each request
 */
export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {

    // Initialize the handler only once
    if (!lambdaHandler) {
        const app = await new LambdaSampleApp()
            .start();
        const lambdaServer = app.server as LambdaServer;
        lambdaHandler = lambdaServer.getHandler();
    }

    // Handle the request
    return await lambdaHandler(event, context);
};
```

### 2. Create Controllers

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

### 3. Deploy to AWS Lambda

The exported `handler` function can be deployed directly to AWS Lambda and integrated with API Gateway.

## API Gateway Integration

Configure API Gateway to proxy all requests to your Lambda function:

-   **Integration Type**: Lambda Proxy Integration
-   **Resource**: `{proxy+}`
-   **Method**: `ANY`

This allows the Lambda function to handle all HTTP methods and paths using NodeBoot's internal routing.

## Middleware Support

All NodeBoot middleware is supported:

```typescript
import {Middleware, MiddlewareInterface, Action} from "@nodeboot/core";

@Middleware({type: "before"})
export class LoggingMiddleware implements MiddlewareInterface {
    @Inject()
    private logger: Logger;

    use(action: Action, payload: any): void {
        this.logger.info(`${action.request.httpMethod} ${action.request.path}`);
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

The NodeBoot Lambda Server package provides a powerful way to build serverless applications using the familiar NodeBoot
framework. With full support for routing, middleware, error handling, and authorization, you can create robust APIs
that run on AWS Lambda with ease.

## License

This project is licensed under the MIT License.
