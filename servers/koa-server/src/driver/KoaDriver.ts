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
import Koa, {Context, Request, Response} from "koa";
import Router from "@koa/router";
import session from "koa-session";
import {parseCookie} from "koa-cookies";
import cors from "@koa/cors";
import multer from "@koa/multer";

import {KoaServerConfigs} from "../types";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const templateUrl = require("template-url");

type KoaServerOptions = {
    logger: LoggerService;
    koa: Koa;
    router: Router;
    configs?: KoaServerConfigs;
};

/**
 * Integration with koa framework.
 */
export class KoaDriver extends NodeBootDriver<Koa, Action<Request, Response>> {
    private readonly logger: LoggerService;
    private readonly router: Router;
    private readonly configs?: KoaServerConfigs;
    private readonly globalErrorHandler: GlobalErrorHandler;
    private readonly resultTransformer: ResultTransformer;
    private customErrorHandler: ErrorHandlerInterface;

    constructor(serverOptions: KoaServerOptions) {
        super();
        this.logger = serverOptions.logger;
        this.configs = serverOptions.configs;
        this.app = serverOptions.koa;
        this.router = serverOptions.router;
        this.globalErrorHandler = new GlobalErrorHandler();
        this.resultTransformer = new ResultTransformer(this);
    }

    /**
     * Initializes the things driver needs before routes and middleware registration.
     */
    initialize() {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const bodyParser = require("koa-bodyparser");
        this.app.use(bodyParser());

        ServerConfig.of(this.configs)
            .ifCors(
                options => this.app.use(cors(options)),
                () => this.logger.warn(`CORS is not configured`),
            )
            .ifCookies(
                () => this.app.use(parseCookie()), // always add all cookies to ctx.cookies
                () => this.logger.warn(`Cookies is not configured`),
            )
            .ifSession(
                options => {
                    if (options) {
                        this.app.use(session(options, this.app));
                    } else {
                        this.app.use(session(this.app));
                    }
                },
                () => this.logger.warn(`Session is not configured`),
            );
    }

    /**
     * Registers middleware that run before controller actions.
     */
    registerMiddleware(middleware: MiddlewareMetadata): void {
        // if its an error handler then register it with proper signature in express
        if ((middleware.instance as ErrorHandlerInterface).onError) {
            this.customErrorHandler = middleware.instance as ErrorHandlerInterface;
        }
        // if its a regular middleware then register it as koa middleware
        else if ((middleware.instance as MiddlewareInterface).use) {
            const middlewareWrapper = async (context: any, next: any) => {
                try {
                    await (middleware.instance as MiddlewareInterface).use({
                        request: context.request,
                        response: context.response,
                        context,
                        next,
                    });
                    return next();
                } catch (error) {
                    await this.handleError(error, {
                        request: context.request,
                        response: context.response,
                        context,
                        next,
                    });
                }
            };
            this.nameMiddleware(middlewareWrapper, middleware);
        }
    }

    private nameMiddleware(
        middlewareWrapper: (context: any, next: any) => Promise<any>,
        middleware: MiddlewareMetadata,
    ) {
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
    registerAction(
        actionMetadata: ActionMetadata,
        executeCallback: (options: Action<Request, Response>) => Promise<any>,
    ): void {
        // middlewares required for this action
        const defaultMiddlewares: any[] = [];

        if (actionMetadata.isAuthorizedUsed) {
            defaultMiddlewares.push(async (context: any, next: Function) => {
                if (!this.authorizationChecker) throw new AuthorizationCheckerNotDefinedError();

                const action = {request: context.request, response: context.response, context, next};
                try {
                    const checkResult = await this.authorizationChecker.check(action, actionMetadata.authorizedRoles);
                    if (!checkResult) {
                        const error =
                            actionMetadata.authorizedRoles.length === 0
                                ? new AuthorizationRequiredError(action.request.name, action.request.url)
                                : new AccessDeniedError(action.request.name, action.request.url);
                        await this.handleError(error, action, actionMetadata);
                    } else {
                        return next();
                    }
                } catch (error) {
                    await this.handleError(error, action, actionMetadata);
                }
            });
        }

        if (actionMetadata.isFileUsed || actionMetadata.isFilesUsed) {
            actionMetadata.params
                .filter(param => param.type === "file")
                .forEach(param => {
                    defaultMiddlewares.push(
                        multer({...this.configs?.multipart, ...param.extraOptions}).single(param.name),
                    );
                });
            actionMetadata.params
                .filter(param => param.type === "files")
                .forEach(param => {
                    defaultMiddlewares.push(
                        multer({...this.configs?.multipart, ...param.extraOptions}).array(param.name),
                    );
                });
        }

        // user used middlewares
        const uses = actionMetadata.controllerMetadata.uses.concat(actionMetadata.uses);
        const beforeMiddlewares = this.prepareMiddlewares(uses.filter(use => !use.afterAction));
        const afterMiddlewares = this.prepareMiddlewares(uses.filter(use => use.afterAction));

        // prepare route and route handler function
        let route = ActionMetadata.appendBaseRoute(this.routePrefix, actionMetadata.fullRoute);

        // @koa/router is strict about trailing slashes, allow accessing routes without them
        if (typeof route === "string" && route.length > 1 && route.endsWith("/")) {
            route = route.substring(0, route.length - 1);
        }

        const routeHandler = async (context: Context, next: () => Promise<any>) => {
            const options: Action<Request, Response> = {
                request: context.request,
                response: context.response,
                context,
                next,
            };
            await executeCallback(options);
            return next();
        };

        // This ensures that a request is only processed once. Multiple routes may match a request
        // e.g. GET /users/me matches both @All(/users/me) and @Get(/users/:id)), only the first matching route should
        // be called.
        // The following middleware only starts an action processing if the request has not been processed before.
        const routeGuard = async (context: any, next: () => Promise<any>) => {
            if (!context.request.routingControllersStarted) {
                context.request.routingControllersStarted = true;
                return next();
            }
            return;
        };

        // finally register action in koa
        this.router[actionMetadata.type.toLowerCase()](
            ...[route, routeGuard, ...beforeMiddlewares, ...defaultMiddlewares, routeHandler, ...afterMiddlewares],
        );
    }

    /**
     * Registers all routes in the framework.
     */
    registerRoutes() {
        this.app.use(this.router.routes());
        this.app.use(this.router.allowedMethods());
    }

    /**
     * Gets param from the request.
     */
    getParamFromRequest(actionOptions: Action, param: ParamMetadata): any {
        const context = actionOptions.context;
        const request: any = actionOptions.request;
        switch (param.type) {
            case "body":
                return request.body;

            case "body-param":
                return request.body[param.name];

            case "param":
                return context.params[param.name];

            case "params":
                return context.params;

            case "session":
                return context.session;

            case "session-param":
                return context.session[param.name];

            case "state":
                if (param.name) return context.state[param.name];
                return context.state;

            case "query":
                return context.query[param.name];

            case "queries":
                return context.query;

            case "file":
                return context.request.file;

            case "files":
                return context.request.files;

            case "header":
                return context.headers[param.name.toLowerCase()];

            case "headers":
                return request.headers;

            case "cookie":
                if (!context.cookies) return;
                return context.cookies[param.name];

            case "cookies":
                if (!context.cookies) return {};
                return context.cookies;
        }
    }

    /**
     * Handles result of successfully executed controller actionMetadata.
     */
    handleSuccess(result: any, action: Action<Request, Response>, actionMetadata: ActionMetadata): void {
        // if the actionMetadata returned the context or the response object itself, short-circuits
        if (result && (result === action.response || result === action.context)) {
            return;
        }

        // transform result if needed
        result = this.resultTransformer.transformResult(result, actionMetadata);

        if (actionMetadata.redirect) {
            // if redirect is set then do it
            if (typeof result === "string") {
                action.response.redirect(result);
            } else if (result instanceof Object) {
                action.response.redirect(templateUrl(actionMetadata.redirect, result));
            } else {
                action.response.redirect(actionMetadata.redirect);
            }
        } else if (actionMetadata.renderedTemplate) {
            // if template is set then render it
            // FIXME: not working in koa
            // Issue 41: https://github.com/nodejs-boot/node-boot/issues/41
            throw new Error("'renderedTemplate' is not supported for Koa yet");
        } else if (result === undefined) {
            // throw NotFoundError on undefined response
            throw new NotFoundError();
        } else if (result === null) {
            action.response.body = null;
        } else if (result instanceof Uint8Array) {
            // check if it's binary data (typed array)
            action.response.body = Buffer.from(result as any);
        } else {
            // send regular result
            action.response.body = result;
        }

        // set http status code
        if (result === undefined && actionMetadata.undefinedResultCode) {
            action.response.status = actionMetadata.undefinedResultCode;
        } else if (result === null && actionMetadata.nullResultCode) {
            action.response.status = actionMetadata.nullResultCode;
        } else if (actionMetadata.successHttpCode) {
            action.response.status = actionMetadata.successHttpCode;
        } else if (action.response.body === null) {
            action.response.status = 204;
        }

        // apply http headers
        Object.keys(actionMetadata.headers).forEach(name => {
            action.response.set(name, actionMetadata.headers[name]);
        });
    }

    /**
     * Handles result of failed executed controller actionMetadata.
     */
    async handleError(error: any, action: Action<Request, Response>, actionMetadata?: ActionMetadata) {
        try {
            // apply http headers
            if (actionMetadata) {
                Object.keys(actionMetadata.headers).forEach(name => {
                    action.response.set(name, actionMetadata.headers[name]);
                });
            }

            // set http status
            if (error instanceof HttpError && error.httpCode) {
                action.response.status = error.httpCode;
            } else {
                action.response.status = 500;
            }

            if (!error.handled && this.customErrorHandler) {
                await this.customErrorHandler.onError(error, action, actionMetadata);
            } else {
                delete error.handled;
                action.response.body = this.globalErrorHandler.handleError(error);
            }
        } catch (e) {
            // Continue processing un-cough errors
            action.next?.(error);
        }
    }

    /**
     * Creates middlewares from the given "use"-s.
     */
    protected prepareMiddlewares(uses: UseMetadata[]) {
        const middlewareFunctions: Function[] = [];
        uses.forEach(use => {
            if (use.middleware.prototype && use.middleware.prototype.use) {
                // if this is function instance of MiddlewareInterface
                middlewareFunctions.push(async (context: any, next: (err?: any) => Promise<any>) => {
                    try {
                        await getFromContainer<MiddlewareInterface>(use.middleware).use({
                            request: context.request,
                            response: context.response,
                            context,
                            next,
                        });
                        return next();
                    } catch (error) {
                        return this.handleError(error, {
                            request: context.request,
                            response: context.response,
                            context,
                            next,
                        });
                    }
                });
            } else {
                middlewareFunctions.push(use.middleware);
            }
        });
        return middlewareFunctions;
    }
}
