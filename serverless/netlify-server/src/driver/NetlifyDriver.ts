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
import {HandlerContext, HandlerEvent, HandlerResponse} from "../types";

type NetlifyDriverOptions = {
    logger: LoggerService;
    router: Instance<HTTPVersion.V1>;
};

export class NetlifyDriver extends NodeBootDriver<void, Action<HandlerEvent, HandlerContext>> {
    private readonly logger: LoggerService;
    private readonly router: Instance<HTTPVersion.V1>;
    private middlewaresBefore: MiddlewareMetadata[] = [];
    private middlewaresAfter: MiddlewareMetadata[] = [];
    private readonly globalErrorHandler: GlobalErrorHandler;
    private customErrorHandler: ErrorHandlerInterface;

    constructor(options: NetlifyDriverOptions) {
        super();
        this.logger = options.logger;
        this.router = options.router;
        this.globalErrorHandler = new GlobalErrorHandler();
    }

    initialize() {
        // Netlify-specific initialization if needed
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
        executeAction: (action: Action<HandlerEvent, HandlerContext>) => Promise<any>,
    ) {
        const method = actionMetadata.type.toUpperCase();
        const route = ActionMetadata.appendBaseRoute(this.routePrefix, actionMetadata.fullRoute);

        this.router.on(
            method.toUpperCase() as HTTPMethod,
            route.toString(),
            async (req, res, params, store, searchParams) => {
                // In Netlify Functions context, req and res are actually event and context
                const event = req as unknown as HandlerEvent;
                const context = res as unknown as HandlerContext;

                this.logger.debug(
                    `==> Incoming Netlify request: ${event.httpMethod} ${event.path} | ${event.headers["user-agent"]}`,
                );

                const action: Action<HandlerEvent, HandlerContext> = {
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

                    // The engine already builds the final HandlerResponse via handleSuccess/handleError
                    return await executeAction(action);
                } catch (error) {
                    return await this.handleError(error, action, actionMetadata);
                }
            },
        );
    }

    /**
     * Main handler function for Netlify Functions
     */
    async handle(event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> {
        let result: HandlerResponse;

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
            this.logger.error("Netlify handler error:", error as Error);
            result = {
                statusCode: 500,
                body: JSON.stringify({error: "Internal Server Error"}),
                headers: {"Content-Type": "application/json"},
            };
        }
        return result;
    }

    private async runMiddlewares(
        event: HandlerEvent,
        context: HandlerContext,
        middlewares: MiddlewareMetadata[],
    ): Promise<void> {
        for (const middleware of middlewares) {
            await this.callGlobalMiddleware(event, context, middleware, {});
        }
    }

    private async callGlobalMiddleware(
        event: HandlerEvent,
        context: HandlerContext,
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

    async checkAuthorization(event: HandlerEvent, context: HandlerContext, actionMetadata: ActionMetadata) {
        if (!this.authorizationChecker) throw new AuthorizationCheckerNotDefinedError();

        const action = {request: event, response: context};
        const checkResult = await this.authorizationChecker.check(action, actionMetadata.authorizedRoles);

        if (!checkResult) {
            throw actionMetadata.authorizedRoles.length === 0
                ? new AuthorizationRequiredError(action.request.httpMethod ?? "GET", action.request.path ?? "/")
                : new AccessDeniedError(action.request.httpMethod ?? "GET", action.request.path ?? "/");
        }
    }

    getParamFromRequest(action: Action<HandlerEvent, HandlerContext>, param: ParamMetadata): any {
        const event = action.request;

        switch (param.type) {
            case "body":
                return event.body;
            case "body-param":
                return (event.body as any)?.[param.name];

            case "param":
                return action.context.params[param.name];
            case "params":
                return action.context.params;

            case "query":
                return action.context.searchParams[param.name] ?? event.queryStringParameters?.[param.name];
            case "queries":
                return Object.keys(action.context.searchParams || {}).length
                    ? action.context.searchParams
                    : event.queryStringParameters || {};

            case "header":
                return event.headers[param.name] || event.headers[param.name.toLowerCase()];
            case "headers":
                return event.headers;

            case "cookie":
                return parseCookie(event.headers["cookie"] || event.headers["Cookie"] || "")[param.name];
            case "cookies":
                return parseCookie(event.headers["cookie"] || event.headers["Cookie"] || "");

            default:
                return undefined;
        }
    }

    async handleError(
        error: any,
        action: Action<HandlerEvent, HandlerContext>,
        actionMetadata?: ActionMetadata,
    ): Promise<HandlerResponse> {
        this.logger.error("Netlify action error:", error);

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
        _action: Action<HandlerEvent, HandlerContext>,
        actionMetadata: ActionMetadata,
    ): HandlerResponse {
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
