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
import {GoogleCloudFunctionsRequest, GoogleCloudFunctionsResponse} from "../types";

type GoogleCloudFunctionsDriverOptions = {
    logger: LoggerService;
    router: Instance<HTTPVersion.V1>;
};

export class GoogleCloudFunctionsDriver extends NodeBootDriver<
    void,
    Action<GoogleCloudFunctionsRequest, GoogleCloudFunctionsResponse>
> {
    private readonly logger: LoggerService;
    private readonly router: Instance<HTTPVersion.V1>;
    private middlewaresBefore: MiddlewareMetadata[] = [];
    private middlewaresAfter: MiddlewareMetadata[] = [];
    private readonly globalErrorHandler: GlobalErrorHandler;
    private customErrorHandler: ErrorHandlerInterface;

    constructor(options: GoogleCloudFunctionsDriverOptions) {
        super();
        this.logger = options.logger;
        this.router = options.router;
        this.globalErrorHandler = new GlobalErrorHandler();
    }

    initialize() {
        // Google Cloud Functions-specific initialization if needed
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
        executeAction: (action: Action<GoogleCloudFunctionsRequest, GoogleCloudFunctionsResponse>) => Promise<any>,
    ) {
        const method = actionMetadata.type.toUpperCase();
        const route = ActionMetadata.appendBaseRoute(this.routePrefix, actionMetadata.fullRoute);

        this.router.on(
            method.toUpperCase() as HTTPMethod,
            route.toString(),
            async (req, res, params, store, searchParams) => {
                // In Google Cloud Functions context, req and res are Express-like GoogleCloudFunctionsRequest/GoogleCloudFunctionsResponse objects
                const request = req as unknown as GoogleCloudFunctionsRequest;
                const response = res as unknown as GoogleCloudFunctionsResponse;

                this.logger.debug(`==> Incoming Google Cloud Function request: ${request.method} ${request.path}`);

                const action: Action<GoogleCloudFunctionsRequest, GoogleCloudFunctionsResponse> = {
                    request,
                    response,
                    context: {
                        store,
                        params: params || {},
                        searchParams: searchParams || {},
                    },
                };

                try {
                    if (actionMetadata.isAuthorizedUsed) {
                        await this.checkAuthorization(request, response, actionMetadata);
                    }

                    // The driver writes the response directly to `res`, nothing to return here
                    return await executeAction(action);
                } catch (error) {
                    return await this.handleError(error, action, actionMetadata);
                }
            },
        );
    }

    /**
     * Main handler function for Google Cloud Functions HTTP functions
     */
    async handle(request: GoogleCloudFunctionsRequest, response: GoogleCloudFunctionsResponse): Promise<void> {
        try {
            const method = (request.method?.toUpperCase() as HTTPMethod) || "GET";
            // `req.path` is populated by Express with the pathname (no query string)
            const pathname = request.path || new URL(request.url ?? "/", "http://localhost").pathname;

            // Run before middlewares
            await this.runMiddlewares(request, response, this.middlewaresBefore);

            // Match route using find-my-way router
            const route = this.router.find(method, pathname);

            if (!route || !route.handler) {
                response.writeHead(404, {"Content-Type": "application/json"});
                response.end(JSON.stringify({error: "Not Found"}));
                return;
            }

            // Execute the route handler (which will call our registered action)
            await route.handler(request as any, response as any, route.params, route.store, route.searchParams);

            // Run after middlewares
            await this.runMiddlewares(request, response, this.middlewaresAfter);
        } catch (error) {
            this.logger.error("Google Cloud Function handler error:", error as Error);
            if (!response.headersSent) {
                response.writeHead(500, {"Content-Type": "application/json"});
                response.end(JSON.stringify({error: "Internal Server Error"}));
            }
        }
    }

    private async runMiddlewares(
        request: GoogleCloudFunctionsRequest,
        response: GoogleCloudFunctionsResponse,
        middlewares: MiddlewareMetadata[],
    ): Promise<void> {
        for (const middleware of middlewares) {
            await this.callGlobalMiddleware(request, response, middleware, {});
        }
    }

    private async callGlobalMiddleware(
        request: GoogleCloudFunctionsRequest,
        response: GoogleCloudFunctionsResponse,
        middleware: MiddlewareMetadata,
        payload: any,
    ) {
        const pathname = request.path || new URL(request.url ?? "/", "http://localhost").pathname;
        if (pathname.startsWith(this.routePrefix || "/")) {
            try {
                await (middleware.instance as MiddlewareInterface).use(
                    {
                        request,
                        response,
                    },
                    payload,
                );
            } catch (error: any) {
                await this.handleError(error, {
                    request,
                    response,
                });
            }
        }
    }

    async checkAuthorization(
        request: GoogleCloudFunctionsRequest,
        response: GoogleCloudFunctionsResponse,
        actionMetadata: ActionMetadata,
    ) {
        if (!this.authorizationChecker) throw new AuthorizationCheckerNotDefinedError();

        const action = {request, response};
        const checkResult = await this.authorizationChecker.check(action, actionMetadata.authorizedRoles);

        if (!checkResult) {
            const pathname = action.request.path || new URL(action.request.url ?? "/", "http://localhost").pathname;
            throw actionMetadata.authorizedRoles.length === 0
                ? new AuthorizationRequiredError(action.request.method ?? "GET", pathname)
                : new AccessDeniedError(action.request.method ?? "GET", pathname);
        }
    }

    getParamFromRequest(
        action: Action<GoogleCloudFunctionsRequest, GoogleCloudFunctionsResponse>,
        param: ParamMetadata,
    ): any {
        const request = action.request;

        switch (param.type) {
            case "body":
                return request.body;
            case "body-param":
                return request.body?.[param.name];

            case "param":
                return action.context.params[param.name];
            case "params":
                return action.context.params;

            case "query":
                return action.context.searchParams[param.name] ?? request.query?.[param.name];
            case "queries":
                return Object.keys(action.context.searchParams || {}).length
                    ? action.context.searchParams
                    : request.query;

            case "header":
                return request.headers[param.name] ?? request.headers[param.name.toLowerCase()];
            case "headers":
                return request.headers;

            case "cookie":
                return request.cookies?.[param.name] ?? parseCookie(request.headers["cookie"] ?? "")[param.name];
            case "cookies":
                return request.cookies ?? parseCookie(request.headers["cookie"] ?? "");

            default:
                return undefined;
        }
    }

    async handleError(
        error: any,
        action: Action<GoogleCloudFunctionsRequest, GoogleCloudFunctionsResponse>,
        actionMetadata?: ActionMetadata,
    ): Promise<void> {
        this.logger.error("Google Cloud Function action error:", error);

        const response = action.response;
        if (response.headersSent) {
            return;
        }

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

        response.writeHead(statusCode, headers);
        response.end(JSON.stringify(errorResponse));
    }

    handleSuccess(
        result: any,
        action: Action<GoogleCloudFunctionsRequest, GoogleCloudFunctionsResponse>,
        actionMetadata: ActionMetadata,
    ): void {
        const response = action.response;
        if (response.headersSent) {
            return;
        }

        const statusCode = actionMetadata.successHttpCode || 200;
        const headers: Record<string, string> = {"Content-Type": "application/json"};

        // Set headers from metadata
        Object.entries(actionMetadata.headers).forEach(([k, v]) => {
            headers[k] = String(v);
        });

        // Handle redirects
        if (actionMetadata.redirect) {
            response.writeHead(302, {
                ...headers,
                Location: actionMetadata.redirect,
            });
            response.end();
            return;
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

        response.writeHead(statusCode, headers);
        response.end(body);
    }
}
