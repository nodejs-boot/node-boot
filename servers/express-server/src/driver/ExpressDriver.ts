import {
    GlobalErrorHandler,
    NodeBootDriver,
    ResultTransformer,
    ServerConfig,
    ServerConfigOptions,
} from "@node-boot/engine";
import {
    Action,
    ActionMetadata,
    ErrorHandlerInterface,
    getFromContainer,
    MiddlewareMetadata,
    NodeBootEngineOptions,
    ParamMetadata,
    UseMetadata,
} from "@node-boot/context";
import {
    AccessDeniedError,
    AuthorizationCheckerNotDefinedError,
    AuthorizationRequiredError,
    NotFoundError,
} from "@node-boot/error";
import {Application, Request, Response} from "express";
import {LoggerService, MiddlewareInterface} from "@node-boot/context/src";
import cookie, {CookieParseOptions, CookieSerializeOptions} from "cookie";
import cors, {CorsOptions} from "cors";
import session, {SessionOptions} from "express-session";
import {Options as MulterOptions} from "multer";
import {DependenciesLoader} from "../loader";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const templateUrl = require("template-url");

export type ExpressServerConfigs = ServerConfigOptions<
    CookieParseOptions & CookieSerializeOptions,
    CorsOptions,
    SessionOptions,
    MulterOptions
>;

type ExpressServerOptions = {
    logger: LoggerService;
    configs?: ExpressServerConfigs;
    express?: Application;
};

/**
 * Integration with express framework.
 */
export class ExpressDriver extends NodeBootDriver<Application> {
    private readonly logger: LoggerService;
    private readonly configs?: ExpressServerConfigs;
    private readonly globalErrorHandler: GlobalErrorHandler;
    private readonly resultTransformer: ResultTransformer;
    private custormErrorHandler: boolean;

    constructor(serverOptions: ExpressServerOptions) {
        super();
        this.app = serverOptions.express ?? DependenciesLoader.loadExpress();
        this.logger = serverOptions.logger;
        this.configs = serverOptions.configs;
        this.globalErrorHandler = new GlobalErrorHandler(this);
        this.resultTransformer = new ResultTransformer(this);
        this.custormErrorHandler = false;
    }

    /**
     * Initializes the things driver needs before routes and middlewares registration.
     */
    initialize() {
        ServerConfig.of(this.configs)
            .ifCors(
                options => this.app.use(cors(options)),
                () => this.logger.warn(`CORS is not configured`),
            )
            .ifSession(
                options => this.app.use(session(options)),
                () => this.logger.warn(`Session is not configured`),
            );
    }

    /**
     * Registers middleware that run before controller actions.
     */
    registerMiddleware(middleware: MiddlewareMetadata, options: NodeBootEngineOptions): void {
        let middlewareWrapper;

        // if its an error handler then register it with proper signature in express
        if ((middleware.instance as ErrorHandlerInterface).onError) {
            this.custormErrorHandler = true;
            middlewareWrapper = async (error: any, request: any, response: any, next: (err?: any) => any) => {
                try {
                    await (middleware.instance as ErrorHandlerInterface).onError(error, {request, response});
                    next();
                } catch (e) {
                    this.handleError(e, {request, response, next}, undefined, true);
                }
            };
        }

        // if its a regular middleware then register it as express middleware
        else if ((middleware.instance as MiddlewareInterface).use) {
            middlewareWrapper = async (request: any, response: any, next: (err?: any) => any) => {
                try {
                    await (middleware.instance as MiddlewareInterface).use({request, response});
                    next();
                } catch (error) {
                    this.handleError(error, {request, response, next});
                }
            };
        }

        if (middlewareWrapper) {
            // Name the function for better debugging
            Object.defineProperty(middlewareWrapper, "name", {
                value: middleware.instance.constructor.name,
                writable: true,
            });

            this.app.use(options.routePrefix || "/", middlewareWrapper);
        }
    }

    /**
     * Registers action in the driver.
     */
    registerAction(actionMetadata: ActionMetadata, executeCallback: (options: Action) => Promise<any>): void {
        // middlewares required for this action
        const defaultMiddlewares: any[] = [];

        if (actionMetadata.isBodyUsed) {
            if (actionMetadata.isJsonTyped) {
                defaultMiddlewares.push(DependenciesLoader.loadBodyParser().json(actionMetadata.bodyExtraOptions));
            } else {
                defaultMiddlewares.push(DependenciesLoader.loadBodyParser().text(actionMetadata.bodyExtraOptions));
            }
        }

        if (actionMetadata.isAuthorizedUsed) {
            defaultMiddlewares.push(async (request: Request, response: Response, next: Function) => {
                if (!this.authorizationChecker) throw new AuthorizationCheckerNotDefinedError();

                const action = {request, response, next};
                try {
                    const authorized = await this.authorizationChecker.check(action, actionMetadata.authorizedRoles);
                    if (!authorized) {
                        const error =
                            actionMetadata.authorizedRoles.length === 0
                                ? new AuthorizationRequiredError(action.request.method, action.request.url)
                                : new AccessDeniedError(action.request.method, action.request.url);
                        this.handleError(error, action, actionMetadata, true);
                    } else {
                        next();
                    }
                } catch (error) {
                    this.handleError(error, action, actionMetadata, true);
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
        const uses = [...actionMetadata.controllerMetadata.uses, ...actionMetadata.uses];
        const beforeMiddlewares = this.prepareMiddlewares(uses.filter(use => !use.afterAction));
        const afterMiddlewares = this.prepareMiddlewares(uses.filter(use => use.afterAction));

        // prepare route and route handler function
        const route = ActionMetadata.appendBaseRoute(this.routePrefix, actionMetadata.fullRoute);
        const routeHandler = async (request: any, response: any, next: Function) => {
            return await executeCallback({request, response, next});
        };

        // This ensures that a request is only processed once to prevent unhandled rejections saying
        // "Can't set headers after they are sent"
        // Some examples of reasons a request may cause multiple route calls:
        // * Express calls the "get" route automatically when we call the "head" route:
        //   Reference: https://expressjs.com/en/4x/api.html#router.METHOD
        //   This causes a double execution on our side.
        // * Multiple routes match the request (e.g. GET /users/me matches both @All(/users/me) and @Get(/users/:id)).
        // The following middleware only starts an action processing if the request has not been processed before.
        const routeGuard = function routeGuard(
            request: Request & {routingControllersStarted?: boolean},
            _: unknown,
            next: Function,
        ) {
            if (!request.routingControllersStarted) {
                request.routingControllersStarted = true;
                return next();
            }
        };

        // finally register action in express
        this.app[actionMetadata.type.toLowerCase()](
            ...[route, routeGuard, ...beforeMiddlewares, ...defaultMiddlewares, routeHandler, ...afterMiddlewares],
        );
    }

    /**
     * Registers all routes in the framework.
     */
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    registerRoutes() {}

    /**
     * Gets param from the request.
     */
    getParamFromRequest(action: Action, param: ParamMetadata): any {
        const request: any = action.request;
        switch (param.type) {
            case "body":
                return request.body;

            case "body-param":
                return request.body[param.name];

            case "param":
                return request.params[param.name];

            case "params":
                return request.params;

            case "session-param":
                return request.session[param.name];

            case "session":
                return request.session;

            case "state":
                throw new Error("@State decorators are not supported by express driver.");

            case "query":
                return request.query[param.name];

            case "queries":
                return request.query;

            case "header":
                return request.headers[param.name.toLowerCase()];

            case "headers":
                return request.headers;

            case "file":
                return request.file;

            case "files":
                return request.files;

            case "cookie":
                if (request.headers.cookie) return;
                return cookie.parse(request.headers.cookie, this.configs?.cookie?.options)[param.name];
            case "cookies":
                if (!request.headers.cookie) return;
                return cookie.parse(request.headers.cookie, this.configs?.cookie?.options);
        }
    }

    /**
     * Handles result of successfully executed controller actionMetadata.
     */
    handleSuccess(result: any, action: Action<Request, Response>, actionMetadata: ActionMetadata): void {
        // if the actionMetadata returned the response object itself, short-circuits
        if (result && result === action.response) {
            action.next?.();
            return;
        }

        // transform result if needed
        result = this.resultTransformer.transformResult(result, actionMetadata);

        // set http status code
        if (result === undefined && actionMetadata.undefinedResultCode) {
            action.response.status(actionMetadata.undefinedResultCode);
        } else if (result === null) {
            if (actionMetadata.nullResultCode) {
                action.response.status(actionMetadata.nullResultCode);
            } else {
                action.response.status(204);
            }
        } else if (actionMetadata.successHttpCode) {
            action.response.status(actionMetadata.successHttpCode);
        }

        // apply http headers
        Object.keys(actionMetadata.headers).forEach(name => {
            action.response.header(name, actionMetadata.headers[name]);
        });

        if (actionMetadata.redirect) {
            // if redirect is set then do it
            if (typeof result === "string") {
                action.response.redirect(result);
            } else if (result instanceof Object) {
                action.response.redirect(templateUrl(actionMetadata.redirect, result));
            } else {
                action.response.redirect(actionMetadata.redirect);
            }

            action.next?.();
        } else if (actionMetadata.renderedTemplate) {
            // if template is set then render it
            const renderOptions = result && result instanceof Object ? result : {};

            action.response.render(actionMetadata.renderedTemplate, renderOptions, (err: any, html: string) => {
                if (err && actionMetadata.isJsonTyped) {
                    return action.next?.(err);
                } else if (err && !actionMetadata.isJsonTyped) {
                    return action.next?.(err);
                } else if (html) {
                    action.response.send(html);
                }
                action.next?.();
            });
        } else if (result === undefined) {
            // throw NotFoundError on undefined response

            if (actionMetadata.undefinedResultCode) {
                if (actionMetadata.isJsonTyped) {
                    action.response.json();
                } else {
                    action.response.send();
                }
                action.next?.();
            } else {
                throw new NotFoundError();
            }
        } else if (result === null) {
            // send null response
            if (actionMetadata.isJsonTyped) {
                action.response.json(null);
            } else {
                action.response.send(null);
            }
            action.next?.();
        } else if (result instanceof Buffer) {
            // check if it's binary data (Buffer)
            action.response.end(result, "binary");
        } else if (result instanceof Uint8Array) {
            // check if it's binary data (typed array)
            action.response.end(Buffer.from(result as any), "binary");
        } else if (result.pipe instanceof Function) {
            result.pipe(action.response);
        } else {
            // send regular result
            if (actionMetadata.isJsonTyped) {
                action.response.json(result);
            } else {
                action.response.send(result);
            }
            action.next?.();
        }
    }

    /**
     * Handles result of failed executed controller action.
     */
    handleError(
        error: any,
        action: Action<Request, Response>,
        actionMetadata?: ActionMetadata,
        useGlobalHandler?: boolean,
    ): any {
        const response = action.response;

        // set http code
        // note that we can't use error instanceof HttpError properly anymore because of new typescript emit process
        if (error.httpCode) {
            response.status(error.httpCode);
        } else {
            response.status(500);
        }

        // apply http headers
        if (actionMetadata) {
            Object.keys(actionMetadata.headers).forEach(name => {
                response.header(name, actionMetadata.headers[name]);
            });
        }

        if (useGlobalHandler || !this.custormErrorHandler) {
            const parsedError = this.globalErrorHandler.handleError(error);
            // send error content
            response.json(parsedError);
        } else {
            action.next?.(error);
        }
    }

    /**
     * Creates middlewares from the given "use"-s.
     */
    protected prepareMiddlewares(uses: UseMetadata[]) {
        const middlewareFunctions: Function[] = [];
        uses.forEach((use: UseMetadata) => {
            if (use.middleware.prototype && use.middleware.prototype.use) {
                // if this is function instance of MiddlewareInterface
                middlewareFunctions.push(async (request: any, response: any, next: (err: any) => any) => {
                    try {
                        return getFromContainer<MiddlewareInterface>(use.middleware).use({
                            request,
                            response,
                            next,
                        });
                    } catch (error) {
                        this.handleError(error, {request, response, next});
                    }
                });
            } else if (use.middleware.prototype && use.middleware.prototype.error) {
                // if this is function instance of ErrorMiddlewareInterface
                middlewareFunctions.push(async (error: any, request: any, response: any, next: (err: any) => any) => {
                    return getFromContainer<ErrorHandlerInterface>(use.middleware).onError(error, {
                        request,
                        response,
                        next,
                    });
                });
            } else {
                middlewareFunctions.push(use.middleware);
            }
        });
        return middlewareFunctions;
    }
}
