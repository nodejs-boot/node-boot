import {GlobalErrorHandler, NodeBootDriver, ResultTransformer, ServerConfig} from "@nodeboot/engine";
import {
    Action,
    ActionMetadata,
    ErrorHandlerInterface,
    getFromContainer,
    LoggerService,
    MiddlewareInterface,
    MiddlewareMetadata,
    ParamMetadata,
    UseMetadata,
} from "@nodeboot/context";
import {
    AccessDeniedError,
    AuthorizationCheckerNotDefinedError,
    AuthorizationRequiredError,
    HttpError,
    NotFoundError,
} from "@nodeboot/error";
import {Context, Hono, MiddlewareHandler} from "hono";
import {cors} from "hono/cors";
import {deleteCookie, getCookie, getSignedCookie, setCookie, setSignedCookie} from "hono/cookie";
import {sessionMiddleware} from "hono-sessions";

import {HonoRequest, HonoServerConfigs} from "../types";

const templateUrl = require("template-url");

type HonoServerOptions = {
    logger: LoggerService;
    hono: Hono;
    configs?: HonoServerConfigs;
};

type HonoAction = Action<HonoRequest, Context>;

/**
 * Integration with the Hono framework.
 */
export class HonoDriver extends NodeBootDriver<Hono, HonoAction> {
    private readonly logger: LoggerService;
    private readonly configs?: HonoServerConfigs;
    private readonly globalErrorHandler: GlobalErrorHandler;
    private readonly resultTransformer: ResultTransformer;
    private customErrorHandler: ErrorHandlerInterface;

    constructor(serverOptions: HonoServerOptions) {
        super();
        this.logger = serverOptions.logger;
        this.configs = serverOptions.configs;
        this.app = serverOptions.hono;
        this.globalErrorHandler = new GlobalErrorHandler();
        this.resultTransformer = new ResultTransformer(this);
    }

    /**
     * Initializes the things driver needs before routes and middleware registration.
     */
    initialize() {
        ServerConfig.of(this.configs)
            .ifCors(
                options => this.app.use(cors(options)),
                () => this.logger.warn(`CORS is not configured`),
            )
            .ifCookies(
                () => {}, // Hono cookies are read/written per-request via hono/cookie, no global middleware needed
                () => this.logger.warn(`Cookies is not configured`),
            )
            .ifSession(
                options => {
                    if (options) {
                        this.app.use(sessionMiddleware(options));
                    } else {
                        this.logger.warn(
                            `Session is enabled but no "hono-sessions" options were provided. Skipping session middleware`,
                        );
                    }
                },
                () => this.logger.warn(`Session is not configured`),
            );
    }

    /**
     * Registers middleware that run before/after controller actions.
     */
    registerMiddleware(middleware: MiddlewareMetadata): void {
        // if its an error handler then register it with proper signature
        if ((middleware.instance as ErrorHandlerInterface).onError) {
            this.customErrorHandler = middleware.instance as ErrorHandlerInterface;
        }
        // if its a regular middleware then register it as a Hono middleware
        else if ((middleware.instance as MiddlewareInterface).use) {
            const middlewareWrapper: MiddlewareHandler = async (c, next) => {
                try {
                    await (middleware.instance as MiddlewareInterface).use({
                        request: await this.buildRequest(c),
                        response: c,
                        context: c,
                        next,
                    });
                    return next();
                } catch (error) {
                    return this.handleError(error, {
                        request: await this.buildRequest(c),
                        response: c,
                        context: c,
                        next,
                    });
                }
            };
            this.nameMiddleware(middlewareWrapper, middleware);
        }
    }

    private nameMiddleware(middlewareWrapper: MiddlewareHandler, middleware: MiddlewareMetadata) {
        // Name the function for better debugging
        Object.defineProperty(middlewareWrapper, "name", {
            value: middleware.instance.constructor.name,
            writable: true,
        });

        this.app.use(middlewareWrapper);
    }

    /**
     * Registers action in the driver.
     */
    registerAction(actionMetadata: ActionMetadata, executeCallback: (options: HonoAction) => Promise<any>): void {
        // middlewares required for this action
        const defaultMiddlewares: MiddlewareHandler[] = [];

        if (actionMetadata.isAuthorizedUsed) {
            defaultMiddlewares.push(async (c, next) => {
                if (!this.authorizationChecker) throw new AuthorizationCheckerNotDefinedError();

                const request = await this.buildRequest(c);
                const action: HonoAction = {request, response: c, context: c, next};
                try {
                    const checkResult = await this.authorizationChecker.check(action, actionMetadata.authorizedRoles);
                    if (!checkResult) {
                        const error =
                            actionMetadata.authorizedRoles.length === 0
                                ? new AuthorizationRequiredError(request.method, request.url.pathname)
                                : new AccessDeniedError(request.method, request.url.pathname);
                        return this.handleError(error, action, actionMetadata);
                    }
                    return next();
                } catch (error) {
                    return this.handleError(error, action, actionMetadata);
                }
            });
        }

        // user used middlewares
        const uses = actionMetadata.controllerMetadata.uses.concat(actionMetadata.uses);
        const beforeMiddlewares = this.prepareMiddlewares(uses.filter(use => !use.afterAction));
        const afterMiddlewares = this.prepareMiddlewares(uses.filter(use => use.afterAction));

        // prepare route and route handler function
        // Unlike Express/Koa, Hono's router is strict about trailing slashes, so the route is registered
        // exactly as declared (e.g. `@Get("/")` and `@Get()` on the same controller stay distinct routes).
        const route = ActionMetadata.appendBaseRoute(this.routePrefix, actionMetadata.fullRoute).toString();

        const routeHandler: MiddlewareHandler = async (c, next) => {
            const request = await this.buildRequest(c);
            const options: HonoAction = {request, response: c, context: c, next};
            // Hono only sends a response if a handler's *return value* is a Response (or `c.res` was
            // explicitly assigned, which finalizes the context) - calling `c.json()`/`c.body()` etc. builds
            // a Response but has no side effect on its own, so the result must be applied to `c.res` here.
            const result = await executeCallback(options);
            if (result instanceof Response) {
                c.res = result;
            }
            return next();
        };

        const method = actionMetadata.type.toLowerCase();
        const handlers = [...beforeMiddlewares, ...defaultMiddlewares, routeHandler, ...afterMiddlewares];

        // Routes are registered dynamically from decorator metadata (variable path + handler count),
        // which doesn't fit Hono's statically-typed, fixed-arity `on`/`all` overloads.
        const app = this.app as any;
        if (method === "all") {
            app.all(route, ...handlers);
        } else {
            app.on(method.toUpperCase(), route, ...handlers);
        }
    }

    /**
     * Registers all routes in the framework.
     * Hono registers routes directly on the app instance as they're added in `registerAction`,
     * so there's no separate router to mount.
     */
    registerRoutes() {
        // no-op
    }

    /**
     * Builds the Node-Boot request object from the Hono context.
     *
     * Only the parsed body is cached (in a `{value}` wrapper, to tell "not parsed yet" apart from
     * "parsed to undefined") since the underlying Fetch API Request stream can only be read once.
     * `params`/`query` are recomputed on every call instead of being cached alongside it: Hono only
     * resolves path params correctly from within the specific handler whose own route pattern matched
     * (e.g. `/users/:id`) - a global `@Middleware` running earlier in the chain sees an empty `{}` for
     * the same request, and caching that would leak into the controller action.
     */
    private async buildRequest(c: Context): Promise<HonoRequest> {
        const cachedBody = c.get("nodeboot:body" as never) as {value: any} | undefined;
        let body: any;
        if (cachedBody) {
            body = cachedBody.value;
        } else {
            body = await this.parseBody(c);
            c.set("nodeboot:body" as never, {value: body} as never);
        }

        return {
            raw: c.req.raw,
            method: c.req.method,
            url: new URL(c.req.url),
            headers: c.req.raw.headers,
            params: c.req.param(),
            query: c.req.query(),
            body,
        };
    }

    /**
     * Eagerly parses the request body based on its content-type.
     */
    private async parseBody(c: Context): Promise<any> {
        const method = c.req.method;
        if (method === "GET" || method === "HEAD") return undefined;

        const contentType = c.req.header("content-type") ?? "";
        if (!contentType) return undefined;

        try {
            if (contentType.includes("application/json")) {
                const text = await c.req.text();
                return text ? JSON.parse(text) : undefined;
            }
            if (
                contentType.includes("multipart/form-data") ||
                contentType.includes("application/x-www-form-urlencoded")
            ) {
                return await c.req.parseBody({...this.configs?.multipart?.options, all: true});
            }
            if (contentType.includes("text/")) {
                return await c.req.text();
            }
            return await c.req.arrayBuffer();
        } catch (error) {
            this.logger.warn(`Failed to parse request body: ${error}`);
            return undefined;
        }
    }

    /**
     * Gets param from the request.
     */
    getParamFromRequest(actionOptions: HonoAction, param: ParamMetadata): any {
        const c = actionOptions.context as Context;
        const request = actionOptions.request;

        switch (param.type) {
            case "body":
                return request.body;

            case "body-param":
                return request.body?.[param.name];

            case "param":
                return request.params[param.name];

            case "params":
                return request.params;

            case "session":
                return c.get("session" as never);

            case "session-param": {
                const session = c.get("session" as never) as any;
                return session?.get ? session.get(param.name) : session?.[param.name];
            }

            case "state":
                if (param.name) return c.get(param.name as never);
                return c.var;

            case "query":
                return request.query[param.name];

            case "queries":
                return request.query;

            case "file":
                return request.body?.[param.name];

            case "files": {
                const value = request.body?.[param.name];
                if (value === undefined) return undefined;
                return Array.isArray(value) ? value : [value];
            }

            case "header":
                return request.headers.get(param.name) ?? request.headers.get(param.name.toLowerCase()) ?? undefined;

            case "headers":
                return this.headersToObject(request.headers);

            case "cookie":
                return getCookie(c, param.name);

            case "cookies":
                return getCookie(c);
        }
    }

    private headersToObject(headers: Headers): Record<string, string> {
        const result: Record<string, string> = {};
        headers.forEach((value, key) => {
            result[key] = value;
        });
        return result;
    }

    /**
     * Handles result of successfully executed controller actionMetadata.
     */
    handleSuccess(result: any, action: HonoAction, actionMetadata: ActionMetadata): Response | undefined {
        const c = action.response;

        // if the actionMetadata returned the context or the response object itself, short-circuits
        if (result && (result === action.response || result === action.context)) {
            return c.res;
        }

        // transform result if needed
        result = this.resultTransformer.transformResult(result, actionMetadata);

        // apply http headers
        Object.keys(actionMetadata.headers).forEach(name => {
            c.header(name, actionMetadata.headers[name]);
        });

        const status = this.resolveResponseStatus(result, actionMetadata);

        if (actionMetadata.redirect) {
            // if redirect is set then do it
            if (typeof result === "string") {
                return c.redirect(result);
            } else if (result instanceof Object) {
                return c.redirect(templateUrl(actionMetadata.redirect, result));
            } else {
                return c.redirect(actionMetadata.redirect);
            }
        } else if (actionMetadata.renderedTemplate) {
            // FIXME: not supported by Hono yet, similarly to the Koa adapter
            throw new Error("'renderedTemplate' is not supported for Hono yet");
        } else if (result === undefined) {
            // throw NotFoundError on undefined response
            throw new NotFoundError();
        } else if (result === null) {
            return c.body(null, status as any);
        } else if (result instanceof Uint8Array) {
            // check if it's binary data (typed array)
            return c.body(result as any, status as any);
        } else if (typeof result === "string") {
            return c.body(result, status as any);
        } else {
            // send regular json result
            return c.json(result, status as any);
        }
    }

    /**
     * Handles result of failed executed controller actionMetadata.
     */
    async handleError(error: any, action: HonoAction, actionMetadata?: ActionMetadata): Promise<Response | undefined> {
        const c = action.response;
        try {
            // apply http headers
            if (actionMetadata) {
                Object.keys(actionMetadata.headers).forEach(name => {
                    c.header(name, actionMetadata.headers[name]);
                });
            }

            // resolve http status
            const status = error instanceof HttpError && error.httpCode ? error.httpCode : 500;

            if (!error.handled && this.customErrorHandler) {
                await this.customErrorHandler.onError(error, action, actionMetadata);
                return c.res;
            } else {
                delete error.handled;
                return c.json(this.globalErrorHandler.handleError(error), status as any);
            }
        } catch (e) {
            this.logger.error(`Unhandled error while processing request error`, e as Error);
            return c.json(this.globalErrorHandler.handleError(error), 500);
        }
    }

    /**
     * Creates middlewares from the given "use"-s.
     */
    protected prepareMiddlewares(uses: UseMetadata[]): MiddlewareHandler[] {
        const middlewareFunctions: MiddlewareHandler[] = [];
        uses.forEach(use => {
            if (use.middleware.prototype && use.middleware.prototype.use) {
                // if this is function instance of MiddlewareInterface
                middlewareFunctions.push(async (c, next) => {
                    const request = await this.buildRequest(c);
                    const action: HonoAction = {request, response: c, context: c, next};
                    try {
                        await getFromContainer<MiddlewareInterface>(use.middleware).use(action);
                        return next();
                    } catch (error) {
                        return this.handleError(error, action);
                    }
                });
            } else {
                middlewareFunctions.push(use.middleware as unknown as MiddlewareHandler);
            }
        });
        return middlewareFunctions;
    }

    private resolveResponseStatus(result: any, actionMetadata: ActionMetadata): number {
        if (actionMetadata.successHttpCode) {
            return actionMetadata.successHttpCode;
        } else if (result === undefined && actionMetadata.undefinedResultCode) {
            return actionMetadata.undefinedResultCode as number;
        } else if (result === null && actionMetadata.nullResultCode) {
            return actionMetadata.nullResultCode as number;
        }
        return result === null || result === undefined ? 204 : 200;
    }
}

// Re-exported so consumers of the driver can sign/verify cookies without importing "hono/cookie" directly.
export {getCookie, setCookie, deleteCookie, getSignedCookie, setSignedCookie};
