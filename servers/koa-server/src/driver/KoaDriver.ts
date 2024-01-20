import {isPromiseLike, NodeBootDriver, ServerConfig, ServerConfigOptions} from "@node-boot/engine";
import {
    Action,
    ActionMetadata,
    getFromContainer,
    MiddlewareMetadata,
    ParamMetadata,
    UseMetadata,
} from "@node-boot/context";
import {
    AccessDeniedError,
    AuthorizationCheckerNotDefinedError,
    AuthorizationRequiredError,
    HttpError,
    NotFoundError,
} from "@node-boot/error";
import Koa from "koa";
import Router from "@koa/router";
import {LoggerService, MiddlewareInterface} from "@node-boot/context/src";
import {DependenciesLoader} from "../loader";
import session, {opts as SessionOptions} from "koa-session";
import {parseCookie} from "koa-cookies";
import cors, {Options as CorsOptions} from "@koa/cors";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const templateUrl = require("template-url");

export type KoaServerConfigs = ServerConfigOptions<unknown, CorsOptions, SessionOptions, unknown, unknown>;

type KoaServerOptions = {
    logger: LoggerService;
    configs?: KoaServerConfigs;
    koa?: Koa;
    router?: Router;
};

/**
 * Integration with koa framework.
 */
export class KoaDriver extends NodeBootDriver<Koa> {
    private readonly logger: LoggerService;
    private readonly router: Router;
    private readonly configs?: KoaServerConfigs;

    constructor(serverOptions: KoaServerOptions) {
        super();
        this.logger = serverOptions.logger;
        this.configs = serverOptions.configs;
        this.app = serverOptions.koa ?? DependenciesLoader.loadKoa();
        this.router = serverOptions.router ?? DependenciesLoader.loadRouter();
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
        if ((middleware.instance as MiddlewareInterface).use) {
            this.app.use(function (context: any, next: any) {
                return (middleware.instance as MiddlewareInterface).use({
                    request: context.request,
                    response: context.response,
                    context,
                    next,
                });
            });
        }
    }

    /**
     * Registers action in the driver.
     */
    registerAction(actionMetadata: ActionMetadata, executeCallback: (options: Action) => any): void {
        // middlewares required for this action
        const defaultMiddlewares: any[] = [];

        if (actionMetadata.isAuthorizedUsed) {
            defaultMiddlewares.push((context: any, next: Function) => {
                if (!this.authorizationChecker) throw new AuthorizationCheckerNotDefinedError();

                const action: Action = {request: context.request, response: context.response, context, next};
                try {
                    const checkResult = this.authorizationChecker.check(action, actionMetadata.authorizedRoles);

                    const handleError = (result: any) => {
                        if (!result) {
                            const error =
                                actionMetadata.authorizedRoles.length === 0
                                    ? new AuthorizationRequiredError(action.request.name, action.request.url)
                                    : new AccessDeniedError(action.request.name, action.request.url);
                            return this.handleError(error, actionMetadata, action);
                        } else {
                            return next();
                        }
                    };

                    if (isPromiseLike(checkResult)) {
                        return checkResult
                            .then(result => handleError(result))
                            .catch(error => this.handleError(error, actionMetadata, action));
                    } else {
                        return handleError(checkResult);
                    }
                } catch (error) {
                    return this.handleError(error, actionMetadata, action);
                }
            });
        }

        if (actionMetadata.isFileUsed || actionMetadata.isFilesUsed) {
            const multer = DependenciesLoader.loadMulter();
            actionMetadata.params
                .filter(param => param.type === "file")
                .forEach(param => {
                    defaultMiddlewares.push(multer(param.extraOptions).single(param.name));
                });
            actionMetadata.params
                .filter(param => param.type === "files")
                .forEach(param => {
                    defaultMiddlewares.push(multer(param.extraOptions).array(param.name));
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

        const routeHandler = (context: any, next: () => Promise<any>) => {
            const options: Action = {request: context.request, response: context.response, context, next};
            return executeCallback(options);
        };

        // This ensures that a request is only processed once. Multiple routes may match a request
        // e.g. GET /users/me matches both @All(/users/me) and @Get(/users/:id)), only the first matching route should
        // be called.
        // The following middleware only starts an action processing if the request has not been processed before.
        const routeGuard = (context: any, next: () => Promise<any>) => {
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
        // FIXME Bind Error handler here
        //this.app.onerror = err => {
        //    console.log(err);
        //}
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
     * Handles result of successfully executed controller action.
     */
    handleSuccess(result: any, action: ActionMetadata, options: Action): void {
        // if the action returned the context or the response object itself, short-circuits
        if (result && (result === options.response || result === options.context)) {
            return options.next?.();
        }

        // transform result if needed
        result = this.transformResult(result, action);

        if (action.redirect) {
            // if redirect is set then do it
            if (typeof result === "string") {
                options.response.redirect(result);
            } else if (result instanceof Object) {
                options.response.redirect(templateUrl(action.redirect, result));
            } else {
                options.response.redirect(action.redirect);
            }
        } else if (action.renderedTemplate) {
            // if template is set then render it
            // FIXME: not working in koa
            throw new Error("'renderedTemplate' is not supported for Koa yet");
            /* const renderOptions = result && result instanceof Object ? result : {};

             this.app.use(async function(ctx: any, next: any) {
                 await ctx.render(action.renderedTemplate, renderOptions);
             });*/
        } else if (result === undefined) {
            // throw NotFoundError on undefined response
            if (action.undefinedResultCode instanceof Function) {
                throw new (action.undefinedResultCode as any)(options);
            } else if (!action.undefinedResultCode) {
                throw new NotFoundError();
            }
        } else if (result === null) {
            // send null response
            if (action.nullResultCode instanceof Function) throw new (action.nullResultCode as any)(options);

            options.response.body = null;
        } else if (result instanceof Uint8Array) {
            // check if it's binary data (typed array)
            options.response.body = Buffer.from(result as any);
        } else {
            // send regular result
            options.response.body = result;
        }

        // set http status code
        if (result === undefined && action.undefinedResultCode) {
            options.response.status = action.undefinedResultCode;
        } else if (result === null && action.nullResultCode) {
            options.response.status = action.nullResultCode;
        } else if (action.successHttpCode) {
            options.response.status = action.successHttpCode;
        } else if (options.response.body === null) {
            options.response.status = 204;
        }

        // apply http headers
        Object.keys(action.headers).forEach(name => {
            options.response.set(name, action.headers[name]);
        });

        return options.next?.();
    }

    /**
     * Handles result of failed executed controller action.
     */
    handleError(error: any, action: ActionMetadata | undefined, options: Action) {
        return new Promise<void>((resolve, reject) => {
            if (this.isDefaultErrorHandlingEnabled) {
                // apply http headers
                if (action) {
                    Object.keys(action.headers).forEach(name => {
                        options.response.set(name, action.headers[name]);
                    });
                }

                // send error content
                if (action && action.isJsonTyped) {
                    options.response.body = this.processJsonError(error);
                } else {
                    options.response.body = this.processTextError(error);
                }

                // set http status
                if (error instanceof HttpError && error.httpCode) {
                    options.response.status = error.httpCode;
                } else {
                    options.response.status = 500;
                }

                return resolve();
            }
            return reject(error);
        });
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
                        return await getFromContainer<MiddlewareInterface>(use.middleware).use({
                            request: context.request,
                            response: context.response,
                            context,
                            next,
                        });
                    } catch (error) {
                        return await this.handleError(error, undefined, {
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
