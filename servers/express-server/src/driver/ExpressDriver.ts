import {isPromiseLike, NodeBootDriver} from "@node-boot/engine";
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
import {AccessDeniedError, AuthorizationCheckerNotDefinedError, AuthorizationRequiredError, NotFoundError} from "@node-boot/error";
import {Application, Request, Response} from "express";
import {MiddlewareInterface} from "@node-boot/context/src";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookie = require("cookie");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const templateUrl = require("template-url");

/**
 * Integration with express framework.
 */
export class ExpressDriver extends NodeBootDriver<Application> {
    constructor(express?: Application) {
        super();
        this.app = express ?? this.loadExpress();
    }

    /**
     * Initializes the things driver needs before routes and middlewares registration.
     */
    initialize() {
        if (this.cors) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const cors = require("cors");
            if (this.cors === true) {
                this.app.use(cors());
            } else {
                this.app.use(cors(this.cors));
            }
        }
    }

    /**
     * Registers middleware that run before controller actions.
     */
    registerMiddleware(middleware: MiddlewareMetadata, options: NodeBootEngineOptions): void {
        let middlewareWrapper;

        // FIXME Improve this code using the the DI container
        //middleware.getInstance<ExpressErrorMiddlewareInterface>();

        // if its an error handler then register it with proper signature in express
        if ((middleware.instance as ErrorHandlerInterface).onError) {
            middlewareWrapper = (error: any, request: any, response: any, next: (err?: any) => any) => {
                (middleware.instance as ErrorHandlerInterface).onError(error, {request, response, next});
            };
        }

        // if its a regular middleware then register it as express middleware
        else if ((middleware.instance as MiddlewareInterface).use) {
            middlewareWrapper = (request: any, response: any, next: (err: any) => any) => {
                try {
                    const useResult = (middleware.instance as MiddlewareInterface).use({request, response, next});
                    if (isPromiseLike(useResult)) {
                        useResult.catch((error: any) => {
                            this.handleError(error, undefined, {request, response, next});
                            return error;
                        });
                    }
                } catch (error) {
                    this.handleError(error, undefined, {request, response, next});
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
    registerAction(actionMetadata: ActionMetadata, executeCallback: (options: Action) => any): void {
        // middlewares required for this action
        const defaultMiddlewares: any[] = [];

        if (actionMetadata.isBodyUsed) {
            if (actionMetadata.isJsonTyped) {
                defaultMiddlewares.push(this.loadBodyParser().json(actionMetadata.bodyExtraOptions));
            } else {
                defaultMiddlewares.push(this.loadBodyParser().text(actionMetadata.bodyExtraOptions));
            }
        }

        if (actionMetadata.isAuthorizedUsed) {
            defaultMiddlewares.push((request: Request, response: Response, next: Function) => {
                if (!this.authorizationChecker) throw new AuthorizationCheckerNotDefinedError();

                const action: Action = {request, response, next};
                try {
                    const checkResult = this.authorizationChecker.check(action, actionMetadata.authorizedRoles);

                    const handleError = (result: any) => {
                        if (!result) {
                            const error =
                                actionMetadata.authorizedRoles.length === 0
                                    ? new AuthorizationRequiredError(action.request.method, action.request.url)
                                    : new AccessDeniedError(action.request.method, action.request.url);
                            this.handleError(error, actionMetadata, action);
                        } else {
                            next();
                        }
                    };

                    if (isPromiseLike(checkResult)) {
                        checkResult.then(result => handleError(result)).catch(error => this.handleError(error, actionMetadata, action));
                    } else {
                        handleError(checkResult);
                    }
                } catch (error) {
                    this.handleError(error, actionMetadata, action);
                }
            });
        }

        if (actionMetadata.isFileUsed || actionMetadata.isFilesUsed) {
            const multer = this.loadMulter();
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
        const routeHandler = function routeHandler(request: any, response: any, next: Function) {
            return executeCallback({request, response, next});
        };

        // This ensures that a request is only processed once to prevent unhandled rejections saying
        // "Can't set headers after they are sent"
        // Some examples of reasons a request may cause multiple route calls:
        // * Express calls the "get" route automatically when we call the "head" route:
        //   Reference: https://expressjs.com/en/4x/api.html#router.METHOD
        //   This causes a double execution on our side.
        // * Multiple routes match the request (e.g. GET /users/me matches both @All(/users/me) and @Get(/users/:id)).
        // The following middleware only starts an action processing if the request has not been processed before.
        const routeGuard = function routeGuard(request: any, response: any, next: Function) {
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
                if (!request.headers.cookie) return;
                return cookie.parse(request.headers.cookie)[param.name];

            case "cookies":
                if (!request.headers.cookie) return {};
                return cookie.parse(request.headers.cookie);
        }
    }

    /**
     * Handles result of successfully executed controller actionMetadata.
     */
    handleSuccess(result: any, actionMetadata: ActionMetadata, action: Action<Request, Response>): void {
        // if the actionMetadata returned the response object itself, short-circuits
        if (result && result === action.response) {
            action.next?.();
            return;
        }

        // transform result if needed
        result = this.transformResult(result, actionMetadata, action);

        // set http status code
        if (result === undefined && actionMetadata.undefinedResultCode) {
            if (actionMetadata.undefinedResultCode instanceof Function) {
                throw new (actionMetadata.undefinedResultCode as any)(action);
            }
            action.response.status(actionMetadata.undefinedResultCode);
        } else if (result === null) {
            if (actionMetadata.nullResultCode) {
                if (actionMetadata.nullResultCode instanceof Function) {
                    throw new (actionMetadata.nullResultCode as any)(action);
                }
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
    handleError(error: any, action: ActionMetadata | undefined, options: Action): any {
        if (this.isDefaultErrorHandlingEnabled) {
            const response: any = options.response;

            // set http code
            // note that we can't use error instanceof HttpError properly anymore because of new typescript emit process
            if (error.httpCode) {
                response.status(error.httpCode);
            } else {
                response.status(500);
            }

            // apply http headers
            if (action) {
                Object.keys(action.headers).forEach(name => {
                    response.header(name, action.headers[name]);
                });
            }

            // send error content
            if (action && action.isJsonTyped) {
                response.json(this.processJsonError(error));
            } else {
                response.send(this.processTextError(error)); // todo: no need to do it because express by default does it
            }
        }
        options.next?.(error);
    }

    /**
     * Creates middlewares from the given "use"-s.
     */
    protected prepareMiddlewares(uses: UseMetadata[]) {
        const middlewareFunctions: Function[] = [];
        uses.forEach((use: UseMetadata) => {
            if (use.middleware.prototype && use.middleware.prototype.use) {
                // if this is function instance of MiddlewareInterface
                middlewareFunctions.push((request: any, response: any, next: (err: any) => any) => {
                    try {
                        const useResult = getFromContainer<MiddlewareInterface>(use.middleware).use({
                            request,
                            response,
                            next,
                        });
                        if (isPromiseLike(useResult)) {
                            useResult.catch((error: any) => {
                                this.handleError(error, undefined, {request, response, next});
                                return error;
                            });
                        }

                        return useResult;
                    } catch (error) {
                        this.handleError(error, undefined, {request, response, next});
                    }
                });
            } else if (use.middleware.prototype && use.middleware.prototype.error) {
                // if this is function instance of ErrorMiddlewareInterface
                middlewareFunctions.push(function (error: any, request: any, response: any, next: (err: any) => any) {
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

    /**
     * Dynamically loads express module.
     */
    protected loadExpress(): Application {
        if (require) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                return require("express")();
            } catch (e) {
                throw new Error("express package was not found installed. Try to install it: npm install express --save");
            }
        } else {
            throw new Error("Cannot load express. Try to install all required dependencies.");
        }
    }

    /**
     * Dynamically loads body-parser module.
     */
    protected loadBodyParser() {
        try {
            return require("body-parser");
        } catch (e) {
            throw new Error("body-parser package was not found installed. Try to install it: npm install body-parser --save");
        }
    }

    /**
     * Dynamically loads multer module.
     */
    protected loadMulter() {
        try {
            return require("multer");
        } catch (e) {
            throw new Error("multer package was not found installed. Try to install it: npm install multer --save");
        }
    }
}
