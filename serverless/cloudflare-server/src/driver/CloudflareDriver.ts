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
import {CloudflareContext, CloudflareEnv, CloudflareRequest, ExecutionContext} from "../types";
import {SimpleRouter} from "../router";

type CloudflareDriverOptions = {
    logger: LoggerService;
    router: SimpleRouter;
};

const NOOP_EXECUTION_CONTEXT: ExecutionContext = {
    waitUntil: () => undefined,
    passThroughOnException: () => undefined,
};

export class CloudflareDriver extends NodeBootDriver<void, Action<CloudflareRequest, CloudflareContext>> {
    private readonly logger: LoggerService;
    private readonly router: SimpleRouter;
    private middlewaresBefore: MiddlewareMetadata[] = [];
    private middlewaresAfter: MiddlewareMetadata[] = [];
    private readonly globalErrorHandler: GlobalErrorHandler;
    private customErrorHandler: ErrorHandlerInterface;

    constructor(options: CloudflareDriverOptions) {
        super();
        this.logger = options.logger;
        this.router = options.router;
        this.globalErrorHandler = new GlobalErrorHandler();
    }

    initialize() {
        // Cloudflare-specific initialization if needed
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
        executeAction: (action: Action<CloudflareRequest, CloudflareContext>) => Promise<any>,
    ) {
        const method = actionMetadata.type.toUpperCase();
        const route = ActionMetadata.appendBaseRoute(this.routePrefix, actionMetadata.fullRoute);

        this.router.on(method.toUpperCase(), route.toString(), async (req, res, params, store, searchParams) => {
            // In Cloudflare context, req and res are actually the parsed request and execution context
            const request = req as unknown as CloudflareRequest;
            const context = res as unknown as CloudflareContext;

            this.logger.debug(`==> Incoming Cloudflare request: ${request.method} ${request.url.pathname}`);

            const action: Action<CloudflareRequest, CloudflareContext> = {
                request,
                response: context,
                context: {
                    store,
                    params: params || {},
                    searchParams: searchParams || {},
                },
            };

            try {
                if (actionMetadata.isAuthorizedUsed) {
                    await this.checkAuthorization(request, context, actionMetadata);
                }

                // The engine already builds the final Response via handleSuccess/handleError
                return await executeAction(action);
            } catch (error) {
                return await this.handleError(error, action, actionMetadata);
            }
        });
    }

    /**
     * Main fetch handler for Cloudflare Workers
     */
    async handle(request: Request, env: CloudflareEnv = {}, ctx?: ExecutionContext): Promise<Response> {
        let result: Response;
        const url = new URL(request.url);
        const method = request.method?.toUpperCase() || "GET";
        const context: CloudflareContext = Object.assign(ctx ?? {...NOOP_EXECUTION_CONTEXT}, {env});

        try {
            // Parse request body, since the Fetch API only allows the body to be consumed once
            let body: any;
            if (request.body && method !== "GET" && method !== "HEAD") {
                const contentType = request.headers.get("content-type") ?? "";
                try {
                    if (contentType.includes("application/json")) {
                        const text = await request.clone().text();
                        body = text ? JSON.parse(text) : undefined;
                    } else if (contentType.includes("text/")) {
                        body = await request.clone().text();
                    }
                } catch (err) {
                    return new Response(JSON.stringify({error: "Invalid JSON body"}), {
                        status: 400,
                        headers: {"Content-Type": "application/json"},
                    });
                }
            }

            const cloudflareRequest: CloudflareRequest = {
                raw: request,
                url,
                method,
                headers: request.headers,
                body,
            };

            // Run before middlewares
            await this.runMiddlewares(cloudflareRequest, context, this.middlewaresBefore);

            // Match route using find-my-way router
            const route = this.router.find(method, url.pathname);

            if (!route || !route.handler) {
                result = new Response(JSON.stringify({error: "Not Found"}), {
                    status: 404,
                    headers: {"Content-Type": "application/json"},
                });
            } else {
                // Execute the route handler (which will call our registered action)
                result = await route.handler(
                    cloudflareRequest as any,
                    context as any,
                    route.params,
                    route.store,
                    route.searchParams,
                );

                // Run after middlewares
                await this.runMiddlewares(cloudflareRequest, context, this.middlewaresAfter);
            }
        } catch (error) {
            this.logger.error("Cloudflare handler error:", error as Error);
            result = new Response(JSON.stringify({error: "Internal Server Error"}), {
                status: 500,
                headers: {"Content-Type": "application/json"},
            });
        }
        return result;
    }

    private async runMiddlewares(
        request: CloudflareRequest,
        context: CloudflareContext,
        middlewares: MiddlewareMetadata[],
    ): Promise<void> {
        for (const middleware of middlewares) {
            await this.callGlobalMiddleware(request, context, middleware, {});
        }
    }

    private async callGlobalMiddleware(
        request: CloudflareRequest,
        context: CloudflareContext,
        middleware: MiddlewareMetadata,
        payload: any,
    ) {
        if (request.url.pathname.startsWith(this.routePrefix || "/")) {
            try {
                await (middleware.instance as MiddlewareInterface).use(
                    {
                        request,
                        response: context,
                    },
                    payload,
                );
            } catch (error: any) {
                await this.handleError(error, {
                    request,
                    response: context,
                });
            }
        }
    }

    async checkAuthorization(request: CloudflareRequest, context: CloudflareContext, actionMetadata: ActionMetadata) {
        if (!this.authorizationChecker) throw new AuthorizationCheckerNotDefinedError();

        const action = {request, response: context};
        const checkResult = await this.authorizationChecker.check(action, actionMetadata.authorizedRoles);

        if (!checkResult) {
            throw actionMetadata.authorizedRoles.length === 0
                ? new AuthorizationRequiredError(action.request.method ?? "GET", action.request.url.pathname ?? "/")
                : new AccessDeniedError(action.request.method ?? "GET", action.request.url.pathname ?? "/");
        }
    }

    private headersToObject(headers: Headers): Record<string, string> {
        const result: Record<string, string> = {};
        headers.forEach((value, key) => {
            result[key] = value;
        });
        return result;
    }

    getParamFromRequest(action: Action<CloudflareRequest, CloudflareContext>, param: ParamMetadata): any {
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
                return action.context.searchParams[param.name] ?? request.url.searchParams.get(param.name) ?? undefined;
            case "queries":
                return Object.keys(action.context.searchParams || {}).length
                    ? action.context.searchParams
                    : Object.fromEntries(request.url.searchParams.entries());

            case "header":
                return request.headers.get(param.name) ?? request.headers.get(param.name.toLowerCase()) ?? undefined;
            case "headers":
                return this.headersToObject(request.headers);

            case "cookie":
                return parseCookie(request.headers.get("cookie") ?? "")[param.name];
            case "cookies":
                return parseCookie(request.headers.get("cookie") ?? "");

            default:
                return undefined;
        }
    }

    async handleError(
        error: any,
        action: Action<CloudflareRequest, CloudflareContext>,
        actionMetadata?: ActionMetadata,
    ): Promise<Response> {
        this.logger.error("Cloudflare action error:", error);

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

        return new Response(JSON.stringify(errorResponse), {
            status: statusCode,
            headers,
        });
    }

    handleSuccess(
        result: any,
        _action: Action<CloudflareRequest, CloudflareContext>,
        actionMetadata: ActionMetadata,
    ): Response {
        const statusCode = actionMetadata.successHttpCode || 200;
        const headers: Record<string, string> = {"Content-Type": "application/json"};

        // Set headers from metadata
        Object.entries(actionMetadata.headers).forEach(([k, v]) => {
            headers[k] = String(v);
        });

        // Handle redirects
        if (actionMetadata.redirect) {
            return new Response(null, {
                status: 302,
                headers: {
                    ...headers,
                    Location: actionMetadata.redirect,
                },
            });
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

        return new Response(body, {
            status: statusCode,
            headers,
        });
    }
}
