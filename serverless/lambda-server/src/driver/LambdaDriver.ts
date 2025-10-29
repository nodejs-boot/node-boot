import {HTTPMethod, HTTPVersion, Instance} from "find-my-way";
import {
    Action,
    ActionMetadata,
    ErrorHandlerInterface,
    LoggerService,
    MiddlewareInterface,
    MiddlewareMetadata,
    NodeBootEngineOptions,
    ParamMetadata,
} from "@nodeboot/context";
import {GlobalErrorHandler, NodeBootDriver} from "@nodeboot/engine";
import {AccessDeniedError, AuthorizationCheckerNotDefinedError, AuthorizationRequiredError} from "@nodeboot/error";
import {parse as parseCookie} from "cookie";
// eslint-disable-next-line import/no-unresolved
import {APIGatewayProxyEvent, APIGatewayProxyResult, Context} from "aws-lambda";

type LambdaDriverOptions = {
    logger: LoggerService;
    router: Instance<HTTPVersion.V1>;
};

export class LambdaDriver extends NodeBootDriver<void, Action<APIGatewayProxyEvent, Context>> {
    private readonly logger: LoggerService;
    private readonly router: Instance<HTTPVersion.V1>;
    private middlewaresBefore: MiddlewareMetadata[] = [];
    private middlewaresAfter: MiddlewareMetadata[] = [];
    private readonly globalErrorHandler: GlobalErrorHandler;
    private customErrorHandler: ErrorHandlerInterface;

    constructor(options: LambdaDriverOptions) {
        super();
        this.logger = options.logger;
        this.router = options.router;
        this.globalErrorHandler = new GlobalErrorHandler();
    }

    initialize() {
        // Lambda-specific initialization if needed
    }

    registerRoutes() {
        // Routes registered dynamically via `registerAction` method
    }

    /**
     * Registers middleware that run before/after controller actions.
     */
    registerMiddleware(middleware: MiddlewareMetadata, _: NodeBootEngineOptions): void {
        // Register a custom error Handler
        if ((middleware.instance as ErrorHandlerInterface).onError) {
            this.customErrorHandler = middleware.instance as ErrorHandlerInterface;
        }
        // if its a regular middleware then register it
        else if ((middleware.instance as MiddlewareInterface).use) {
            if (middleware.type === "before") {
                this.middlewaresBefore.push(middleware);
            } else {
                this.middlewaresAfter.push(middleware);
            }
        }
    }

    registerAction(
        actionMetadata: ActionMetadata,
        executeAction: (action: Action<APIGatewayProxyEvent, Context>) => Promise<any>,
    ) {
        const method = actionMetadata.type.toUpperCase();
        const route = ActionMetadata.appendBaseRoute(this.routePrefix, actionMetadata.fullRoute);

        this.router.on(
            method.toUpperCase() as HTTPMethod,
            route.toString(),
            async (req, res, params, store, searchParams) => {
                // In Lambda context, req and res are actually event and context
                const event = req as unknown as APIGatewayProxyEvent;
                const context = res as unknown as Context;

                this.logger.debug(
                    `==> Incoming Lambda request: ${event.httpMethod} ${event.path} | ${event.requestContext.identity.sourceIp} | ${event.headers["User-Agent"]}`,
                );

                const action: Action<APIGatewayProxyEvent, Context> = {
                    request: event,
                    response: context,
                    context: {
                        store,
                        params: params || {},
                        searchParams: searchParams || {},
                    },
                };

                try {
                    if (actionMetadata.isAuthorizedUsed) {
                        await this.checkAuthorization(event, context, actionMetadata);
                    }

                    const result = await executeAction(action);
                    return this.handleSuccess(result, action, actionMetadata);
                } catch (error) {
                    return await this.handleError(error, action, actionMetadata);
                }
            },
        );
    }

    /**
     * Main handler function for AWS Lambda
     */
    async handle(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
        let result: APIGatewayProxyResult;

        try {
            // Parse request body
            let body = undefined;
            if (event.body) {
                try {
                    body = event.isBase64Encoded
                        ? JSON.parse(Buffer.from(event.body, "base64").toString())
                        : JSON.parse(event.body);
                } catch (err) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({error: "Invalid JSON body"}),
                        headers: {"Content-Type": "application/json"},
                    };
                }
            }

            // Enhance event with parsed body
            (event as any).body = body;

            // Run before middlewares
            await this.runMiddlewares(event, context, this.middlewaresBefore);

            // Match route using find-my-way router
            const route = this.router.find((event.httpMethod?.toUpperCase() as HTTPMethod) || "GET", event.path || "");

            if (!route || !route.handler) {
                result = {
                    statusCode: 404,
                    body: JSON.stringify({error: "Not Found"}),
                    headers: {"Content-Type": "application/json"},
                };
            } else {
                // Execute the route handler (which will call our registered action)
                result = await route.handler(
                    event as any,
                    context as any,
                    route.params,
                    route.store,
                    route.searchParams,
                );

                // Run after middlewares
                await this.runMiddlewares(event, context, this.middlewaresAfter);
            }
        } catch (error) {
            this.logger.error("Lambda handler error:", error as Error);
            result = {
                statusCode: 500,
                body: JSON.stringify({error: "Internal Server Error"}),
                headers: {"Content-Type": "application/json"},
            };
        }
        return result;
    }

    private async runMiddlewares(
        event: APIGatewayProxyEvent,
        context: Context,
        middlewares: MiddlewareMetadata[],
    ): Promise<void> {
        for (const middleware of middlewares) {
            await this.callGlobalMiddleware(event, context, middleware, {});
        }
    }

    private async callGlobalMiddleware(
        event: APIGatewayProxyEvent,
        context: Context,
        middleware: MiddlewareMetadata,
        payload: any,
    ) {
        if (event.path?.startsWith(this.routePrefix || "/")) {
            try {
                await (middleware.instance as MiddlewareInterface).use(
                    {
                        request: event,
                        response: context,
                    },
                    payload,
                );
            } catch (error: any) {
                await this.handleError(error, {
                    request: event,
                    response: context,
                });
            }
        }
    }

    async checkAuthorization(event: APIGatewayProxyEvent, context: Context, actionMetadata: ActionMetadata) {
        if (!this.authorizationChecker) throw new AuthorizationCheckerNotDefinedError();

        const action = {request: event, response: context};
        const checkResult = await this.authorizationChecker.check(action, actionMetadata.authorizedRoles);

        if (!checkResult) {
            throw actionMetadata.authorizedRoles.length === 0
                ? new AuthorizationRequiredError(action.request.httpMethod ?? "GET", action.request.path ?? "/")
                : new AccessDeniedError(action.request.httpMethod ?? "GET", action.request.path ?? "/");
        }
    }

    getParamFromRequest(action: Action<APIGatewayProxyEvent, Context>, param: ParamMetadata): any {
        const event = action.request;

        switch (param.type) {
            case "body":
                return event.body;
            case "body-param":
                return event.body?.[param.name];

            case "param":
                return action.context.params[param.name];
            case "params":
                return action.context.params;

            case "query":
                return event.queryStringParameters?.[param.name];
            case "queries":
                return event.queryStringParameters || {};

            case "header":
                return event.headers[param.name] || event.headers[param.name.toLowerCase()];
            case "headers":
                return event.headers;

            case "cookie":
                // Parse cookies from Cookie header
                return parseCookie(event.headers["Cookie"] || event.headers["cookie"] || "");
            case "cookies":
                return parseCookie(event.headers["Cookie"] || event.headers["cookie"] || "");

            default:
                return undefined;
        }
    }

    async handleError(
        error: any,
        action: Action<APIGatewayProxyEvent, Context>,
        actionMetadata?: ActionMetadata,
    ): Promise<APIGatewayProxyResult> {
        this.logger.error("Lambda action error:", error);

        const statusCode = error.httpCode || 500;
        const headers: Record<string, string> = {"Content-Type": "application/json"};

        // Add custom headers from metadata
        if (actionMetadata) {
            Object.entries(actionMetadata.headers).forEach(([k, v]) => {
                headers[k] = String(v);
            });
        }

        let errorResponse: any;
        if (!error.handled && this.customErrorHandler) {
            try {
                await this.customErrorHandler.onError(error, action, actionMetadata);
                // If custom handler doesn't throw, return a generic error
                errorResponse = {error: "Error handled by custom handler"};
            } catch (handlerError) {
                errorResponse = this.globalErrorHandler.handleError(handlerError);
            }
        } else {
            delete error.handled;
            errorResponse = this.globalErrorHandler.handleError(error);
        }

        return {
            statusCode,
            body: JSON.stringify(errorResponse),
            headers,
        };
    }

    handleSuccess(
        result: any,
        _action: Action<APIGatewayProxyEvent, Context>,
        actionMetadata: ActionMetadata,
    ): APIGatewayProxyResult {
        const statusCode = actionMetadata.successHttpCode || 200;
        const headers: Record<string, string> = {"Content-Type": "application/json"};

        // Set headers from metadata
        Object.entries(actionMetadata.headers).forEach(([k, v]) => {
            headers[k] = String(v);
        });

        // Handle redirects
        if (actionMetadata.redirect) {
            return {
                statusCode: 302,
                body: "",
                headers: {
                    ...headers,
                    Location: actionMetadata.redirect,
                },
            };
        }

        // Handle different result types
        let body: string;
        if (result === undefined || result === null) {
            body = "";
        } else if (typeof result === "string") {
            body = result;
            headers["Content-Type"] = "text/plain";
        } else {
            body = JSON.stringify(result);
        }

        return {
            statusCode,
            body,
            headers,
        };
    }
}
