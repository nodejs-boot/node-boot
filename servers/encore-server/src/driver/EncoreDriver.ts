import {IncomingMessage, ServerResponse} from "node:http";
import {HTTPMethod, HTTPVersion, Instance} from "find-my-way";
import {parse as parseCookie} from "cookie";
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
import {
    AccessDeniedError,
    AuthorizationCheckerNotDefinedError,
    AuthorizationRequiredError,
    NotFoundError,
} from "@nodeboot/error";
import {applyCorsHeaders} from "../cors";
import {EncoreServerConfigs} from "../types";

type EncoreDriverOptions = {
    logger: LoggerService;
    router: Instance<HTTPVersion.V1>;
    serverConfigs?: EncoreServerConfigs;
};

/**
 * Integration with Encore.ts, through a raw endpoint (`api.raw`). Encore.ts passes plain Node.js
 * `IncomingMessage`/`ServerResponse` objects to raw endpoint handlers, so this driver works the
 * same way the `@nodeboot/http-server` native driver does, except that it doesn't own the HTTP
 * server or its listening socket - Encore.ts's own runtime is responsible for that. Instead,
 * `handle()` is exposed to be wired up as the body of a single catch-all `api.raw` endpoint.
 */
export class EncoreDriver extends NodeBootDriver<void, Action<IncomingMessage, ServerResponse>> {
    private readonly logger: LoggerService;
    private readonly router: Instance<HTTPVersion.V1>;
    private middlewaresBefore: MiddlewareMetadata[] = [];
    private middlewaresAfter: MiddlewareMetadata[] = [];
    private readonly globalErrorHandler: GlobalErrorHandler;
    private customErrorHandler: ErrorHandlerInterface;
    private readonly serverOptions: EncoreServerConfigs;

    constructor(options: EncoreDriverOptions) {
        super();
        this.logger = options.logger;
        this.router = options.router;
        this.serverOptions = options.serverConfigs || {};
        this.globalErrorHandler = new GlobalErrorHandler();
    }

    override initialize() {
        // Init if needed, e.g. register global middleware for cookies, CORS, etc.
    }

    override registerRoutes() {
        // routes registered dynamically via `registerAction` method
    }

    /**
     * Registers middleware that run before controller actions.
     */
    override registerMiddleware(middleware: MiddlewareMetadata, _: NodeBootEngineOptions): void {
        // Register a custom error Handler
        if ((middleware.instance as ErrorHandlerInterface).onError) {
            this.customErrorHandler = middleware.instance as ErrorHandlerInterface;
        }
        // if its a regular middleware then register it as a before/after middleware
        else if ((middleware.instance as MiddlewareInterface).use) {
            if (middleware.type === "before") {
                this.middlewaresBefore.push(middleware);
            } else {
                this.middlewaresAfter.push(middleware);
            }
        }
    }

    override registerAction(
        actionMetadata: ActionMetadata,
        executeAction: (action: Action<IncomingMessage, ServerResponse>) => Promise<any>,
    ) {
        const method = actionMetadata.type.toUpperCase();
        const route = ActionMetadata.appendBaseRoute(this.routePrefix, actionMetadata.fullRoute);

        this.router.on(
            method.toUpperCase() as HTTPMethod,
            route.toString(),
            async (req, res, params, store, searchParams) => {
                // Guard eager message construction (string interpolation, socket/header access,
                // hrtime timing) behind a cheap level check so it's not paid on every request
                // when debug logging is disabled (the common case in production).
                const debugEnabled = this.logger.isLevelEnabled ? this.logger.isLevelEnabled("debug") : true;
                const start = debugEnabled ? process.hrtime() : undefined;
                if (debugEnabled) {
                    this.logger.debug(
                        `==> Incoming Encore request: ${req.method} ${req.url} | ${req.socket?.remoteAddress} | ${req.headers["user-agent"]}`,
                    );
                }

                const action: Action<IncomingMessage, ServerResponse> = {
                    request: req,
                    response: res,
                    context: {
                        store,
                        params: params || {},
                        searchParams: searchParams || {},
                    },
                };

                try {
                    if (actionMetadata.isAuthorizedUsed) {
                        const isAuthorized = await this.checkAuthorization(req, res, actionMetadata);
                        if (!isAuthorized) return;
                    }

                    await executeAction(action);
                } catch (error) {
                    await this.handleError(error, action, actionMetadata);
                }

                if (debugEnabled) {
                    const [sec, nano] = process.hrtime(start);
                    const ms = (sec * 1e3 + nano / 1e6).toFixed(2);
                    this.logger.debug(
                        `<== Outgoing Encore response: ${req.method} ${req.url} ${res.statusCode} - ${ms}ms | ${req.socket?.remoteAddress} | ${req.headers["user-agent"]}`,
                    );
                }
            },
        );
    }

    /**
     * Main handler function to be registered as an Encore.ts raw endpoint, e.g.:
     *
     * ```ts
     * export const api = api.raw({expose: true, method: "*", path: "/!path"}, server.getHandler());
     * ```
     */
    async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
        try {
            // handle CORS preflight requests if configured
            if (this.serverOptions.cors) {
                const shouldContinue = await applyCorsHeaders(req, res, this.serverOptions.cors.options);
                if (!shouldContinue) return;
            }

            // Parse JSON body if applicable
            if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
                try {
                    (req as any).body = await this.parseJsonBody(req);
                } catch (err) {
                    res.statusCode = 400;
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({error: "Invalid JSON body"}));
                    return;
                }
            }

            // Run before middlewares
            await this.runMiddlewares(req, res, this.middlewaresBefore);
            if (res.writableEnded || res.headersSent) return;

            // Match route
            const route = this.router.find((req.method?.toUpperCase() as HTTPMethod) || "GET", req.url || "");
            if (!route || !route.handler) {
                res.statusCode = 404;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({error: "Not Found"}));
                return;
            }

            // Prepare params and searchParams and run the route handler
            await route.handler(req, res, route.params, route.store, route.searchParams);

            // Run after middlewares
            await this.runMiddlewares(req, res, this.middlewaresAfter);
        } catch (error) {
            await this.handleError(error, {
                request: req,
                response: res,
                context: {
                    store: {},
                    params: {},
                    searchParams: {},
                },
            });
        }
    }

    private async runMiddlewares(
        req: IncomingMessage,
        res: ServerResponse,
        middlewares: MiddlewareMetadata[],
    ): Promise<void> {
        for (const middleware of middlewares) {
            // If response is already sent (e.g. res.end() was called), break
            if (res.writableEnded || res.headersSent) return;
            // Call the middleware
            await this.callGlobalMiddleware(req, res, middleware, {});
        }
    }

    private async callGlobalMiddleware(
        request: IncomingMessage,
        response: ServerResponse,
        middleware: MiddlewareMetadata,
        payload: any,
    ) {
        if (request.url?.startsWith(this.routePrefix || "/")) {
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

    /**
     * Checks authorization for the given action.
     *
     * @returns `true` if the request is authorized and processing should continue, `false` if the
     * request has already been rejected (response written) and the caller must stop processing.
     */
    async checkAuthorization(
        request: IncomingMessage,
        response: ServerResponse,
        actionMetadata: ActionMetadata,
    ): Promise<boolean> {
        if (!this.authorizationChecker) throw new AuthorizationCheckerNotDefinedError();

        const action = {request, response};
        try {
            const checkResult = await this.authorizationChecker.check(action, actionMetadata.authorizedRoles);

            if (!checkResult) {
                const error =
                    actionMetadata.authorizedRoles.length === 0
                        ? new AuthorizationRequiredError(action.request.method ?? "GET", action.request.url ?? "/")
                        : new AccessDeniedError(action.request.method ?? "GET", action.request.url ?? "/");

                await this.handleError(error, action, actionMetadata);
                return false;
            }
            return true;
        } catch (error: any) {
            await this.handleError(error, action, actionMetadata);
            return false;
        }
    }

    override getParamFromRequest(action: Action<IncomingMessage, ServerResponse>, param: ParamMetadata): any {
        const req = action.request;

        switch (param.type) {
            case "body":
                return (req as any).body;
            case "body-param":
                return (req as any).body[param.name];

            case "param":
                return action.context.params[param.name];
            case "params":
                return action.context.params;

            case "query":
                return action.context.searchParams[param.name];
            case "queries":
                return action.context.searchParams;

            case "header":
                return req.headers[param.name.toLowerCase()];
            case "headers":
                return req.headers;

            case "cookie":
                return parseCookie(req.headers.cookie || "")[param.name];
            case "cookies":
                return parseCookie(req.headers.cookie || "");

            // TODO: Add more cases for session, files, etc.
            default:
                return undefined;
        }
    }

    override async handleError(
        error: any,
        action: Action<IncomingMessage, ServerResponse<IncomingMessage>, Function>,
        actionMetadata?: ActionMetadata,
    ) {
        if (actionMetadata) {
            Object.keys(actionMetadata.headers).forEach(name => {
                action.response.setHeader(name, actionMetadata.headers[name]);
            });
        }

        this.logger.error(error);
        action.response.statusCode = error.httpCode || 500;

        if (!error.handled && this.customErrorHandler) {
            await this.customErrorHandler.onError(error, action, actionMetadata);
        } else {
            delete error.handled;
            const parsedError = this.globalErrorHandler.handleError(error);
            action.response.setHeader("Content-Type", "application/json");
            action.response.end(JSON.stringify(parsedError));
        }
    }

    override handleSuccess(
        result: any,
        action: Action<IncomingMessage, ServerResponse>,
        actionMetadata: ActionMetadata,
    ) {
        const res = action.response;

        // Set status code from metadata or default 200
        res.statusCode = actionMetadata.successHttpCode || 200;

        // Set headers if any
        Object.entries(actionMetadata.headers).forEach(([k, v]) => res.setHeader(k, v));

        // Handle redirects
        if (actionMetadata.redirect) {
            res.statusCode = 302;
            res.setHeader("Location", actionMetadata.redirect);
            res.end();
            return;
        }

        // Handle templates (implement with a templating lib)
        if (actionMetadata.renderedTemplate) {
            // For example, use eta or nunjucks here
            res.end("Template rendering not implemented");
            return;
        }

        this.applyResponseStatus(result, action, actionMetadata);

        // Handle undefined, null, buffers, streams, etc.
        if (result === undefined) {
            // throw NotFoundError on undefined response, consistent with every other adapter,
            // so it's routed through the custom error handler (if any) with the correct 404 status
            // instead of writing a plain-text "Not Found" body with whatever status was just applied.
            throw new NotFoundError();
        }

        if (result === null) {
            res.end();
            return;
        }

        if (Buffer.isBuffer(result)) {
            res.end(result);
            return;
        }

        if (typeof result === "string") {
            res.setHeader("Content-Type", "text/plain");
            res.end(result);
            return;
        }

        if (typeof result === "object") {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(result));
            return;
        }

        res.end(String(result));
    }

    async parseJsonBody(req: IncomingMessage): Promise<any> {
        return new Promise((resolve, reject) => {
            let data = "";
            req.on("data", chunk => (data += chunk));
            req.on("end", () => {
                try {
                    resolve(JSON.parse(data || "{}"));
                } catch (err) {
                    reject(new Error("Invalid JSON body"));
                }
            });
            req.on("error", reject);
        });
    }

    private applyResponseStatus(
        result: any,
        action: Action<IncomingMessage, ServerResponse<IncomingMessage>>,
        actionMetadata: ActionMetadata,
    ) {
        if (actionMetadata.successHttpCode) {
            action.response.statusCode = actionMetadata.successHttpCode;
        } else if (result === undefined && actionMetadata.undefinedResultCode) {
            action.response.statusCode = actionMetadata.undefinedResultCode;
        } else if (result === null && actionMetadata.nullResultCode) {
            action.response.statusCode = actionMetadata.nullResultCode;
        } else {
            action.response.statusCode = result === null || result === undefined ? 204 : 200;
        }
    }
}
