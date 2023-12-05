import {
    Action,
    ActionMetadata,
    BaseDriver,
    getFromContainer,
    HttpError,
    MiddlewareMetadata,
    NotFoundError,
    ParamMetadata,
    RoutingControllersOptions,
    UseMetadata,
} from "routing-controllers";
import {
    FastifyError,
    FastifyInstance,
    FastifyReply,
    FastifyRequest,
} from "fastify";
import {HTTPMethods} from "fastify/types/utils";
import {
    DoneFuncWithErrOrRes,
    HookHandlerDoneFunction,
} from "fastify/types/hooks";
import {
    AccessDeniedError,
    AuthorizationCheckerNotDefinedError,
    AuthorizationRequiredError,
    FastifyErrorHandlerInterface,
    FastifyErrorMiddlewareInterface,
    FastifyMiddlewareInterface,
} from "@node-boot/core";
import {FastifyCookieOptions} from "@fastify/cookie";
import {FastifySessionOptions} from "@fastify/session";
import {FastifyMultipartOptions} from "@fastify/multipart";
import {FastifyViewOptions} from "@fastify/view";
import templateUrl from "template-url";
import {FastifyCorsOptions} from "@fastify/cors";

const actionToHttpMethodMap = {
    delete: "DELETE",
    get: "GET",
    patch: "PATCH",
    options: "OPTIONS",
    put: "PUT",
    post: "POST",
};

export type ServerOptions = {
    cookieOptions?: FastifyCookieOptions;
    corsOptions?: FastifyCorsOptions;
    sessionOptions?: FastifySessionOptions;
    multipartOptions?: FastifyMultipartOptions;
    templateOptions?: FastifyViewOptions;
};

export class FastifyDriver extends BaseDriver {
    constructor(
        private readonly serverOptions: ServerOptions,
        private fastify?: FastifyInstance,
    ) {
        super();
        this.loadFastify();
        this.app = this.fastify;
    }

    useApp() {
        return this.app as FastifyInstance;
    }

    initialize() {
        if (this.serverOptions.cookieOptions) {
            const fastifyCookie = this.loadCookie();
            this.useApp().register(
                fastifyCookie,
                this.serverOptions.cookieOptions,
            );
        }

        if (this.serverOptions.corsOptions) {
            const fastifyCors = this.loadCors();
            this.useApp().register(fastifyCors, this.serverOptions.corsOptions);
        }

        if (this.serverOptions.sessionOptions) {
            const fastifySession = this.loadSession();
            this.useApp().register(
                fastifySession,
                this.serverOptions.sessionOptions,
            );
        }

        if (this.serverOptions.multipartOptions) {
            const fastifyMultipart = this.loadMultipart();
            this.useApp().register(
                fastifyMultipart,
                this.serverOptions.multipartOptions,
            );
        }

        if (this.serverOptions.templateOptions) {
            const fastifyView = this.loadView();
            this.useApp().register(
                fastifyView,
                this.serverOptions.templateOptions,
            );
        }
    }

    /**
     * Registers middleware that run before controller actions.
     */
    registerMiddleware(
        middleware: MiddlewareMetadata,
        options: RoutingControllersOptions,
    ): void {
        // Register a custom error Handler
        if ((middleware.instance as FastifyErrorHandlerInterface).error) {
            const errorHandler = (
                error: FastifyError,
                request: FastifyRequest,
                reply: FastifyReply,
            ) => {
                (middleware.instance as FastifyErrorHandlerInterface).error(
                    request,
                    reply,
                    error,
                );
            };

            // Name the function for better debugging
            this.nameGlobalMiddlewareFunction(errorHandler, middleware);
            this.useApp().setErrorHandler(errorHandler);
        }
        // if its a regular middleware then register it as fastify preHandler hook
        else if ((middleware.instance as FastifyMiddlewareInterface).use) {
            let fastifyHook;
            if (middleware.type === "before") {
                fastifyHook = (
                    request: FastifyRequest,
                    reply: FastifyReply,
                    done: HookHandlerDoneFunction,
                ) => {
                    this.callGlobalMiddleware(
                        request,
                        options,
                        middleware,
                        reply,
                        done,
                        undefined,
                    );
                };

                // Name the function for better debugging
                this.nameGlobalMiddlewareFunction(fastifyHook, middleware);
                this.useApp().addHook("preHandler", fastifyHook);
            } else {
                fastifyHook = (
                    request: FastifyRequest,
                    reply: FastifyReply,
                    payload: any,
                    done: DoneFuncWithErrOrRes,
                ) => {
                    this.callGlobalMiddleware(
                        request,
                        options,
                        middleware,
                        reply,
                        done,
                        payload,
                    );
                };

                // Name the function for better debugging
                this.nameGlobalMiddlewareFunction(fastifyHook, middleware);
                this.useApp().addHook("onSend", fastifyHook);
            }
        }
    }

    private callGlobalMiddleware(
        request: FastifyRequest,
        options: RoutingControllersOptions,
        middleware: MiddlewareMetadata,
        reply: FastifyReply,
        done: DoneFuncWithErrOrRes,
        payload: any,
    ) {
        if (request.url.startsWith(options.routePrefix || "/")) {
            try {
                const useResult = (
                    middleware.instance as FastifyMiddlewareInterface
                ).use(request, reply, done, payload);
                if (this.isPromiseLike(useResult)) {
                    useResult
                        .then(useResult => done())
                        .catch((error: any) => {
                            this.handleError(error, undefined, {
                                request,
                                response: reply,
                                next: done,
                            });
                            return error;
                        });
                } else {
                    done();
                }
            } catch (error) {
                this.handleError(error, undefined, {
                    request,
                    response: reply,
                    next: done,
                });
            }
        } else {
            // For routes without the prefix, simply call done() to continue
            done();
        }
    }

    private nameGlobalMiddlewareFunction(hook, middleware: MiddlewareMetadata) {
        // Name the function for better debugging
        Object.defineProperty(hook, "name", {
            value: middleware.instance.constructor.name,
            writable: true,
        });
    }

    registerAction(
        actionMetadata: ActionMetadata,
        executeAction: (options: Action) => any,
    ) {
        const defaultMiddlewares: any[] = [];

        if (actionMetadata.isAuthorizedUsed) {
            defaultMiddlewares.push(
                async (
                    request: FastifyRequest,
                    reply: FastifyReply,
                    done: HookHandlerDoneFunction,
                ) => {
                    await this.checkAuthorization(
                        request,
                        reply,
                        done,
                        actionMetadata,
                    );
                },
            );
        }

        // TODO Make sure nothing is required if @fastify/multipart is registered
        /*if (actionMetadata.isFileUsed || actionMetadata.isFilesUsed) {
            // Implement file handling if needed
            // ...
        }*/

        const uses = [
            ...actionMetadata.controllerMetadata.uses,
            ...actionMetadata.uses,
        ];
        const beforeMiddlewares = this.prepareUseMiddlewares(
            uses.filter(use => !use.afterAction),
        );
        const afterMiddlewares = this.prepareUseMiddlewares(
            uses.filter(use => use.afterAction),
        );
        const errorMiddlewares = this.prepareUseErrorMiddlewares(uses);

        const routeHandler = async (request, reply) => {
            // This ensures that a request is only processed once. Multiple routes may match a request
            // e.g. GET /users/me matches both @All(/users/me) and @Get(/users/:id)), only the first matching route should
            // be called.
            // The following middleware only starts an action processing if the request has not been processed before.
            if (!request.routingControllersStarted) {
                request.routingControllersStarted = true;
                await executeAction({request, response: reply});
            }
        };

        const afterMiddlewaresAdapter = async (
            request,
            reply,
            payload,
            done,
        ) => {
            afterMiddlewares.forEach(middleware =>
                middleware(request, reply, payload, done),
            );
        };

        const errorMiddlewaresAdapter = async (request, reply, error, done) => {
            errorMiddlewares.forEach(middleware =>
                middleware(request, reply, error, done),
            );
        };

        // Register route and hooks
        const route = ActionMetadata.appendBaseRoute(
            this.routePrefix,
            actionMetadata.fullRoute,
        );
        this.useApp().route({
            method: this.actionToHttpMethod(actionMetadata),
            url: route.toString(),
            preHandler: [...beforeMiddlewares, ...defaultMiddlewares],
            handler: routeHandler,
            onSend: afterMiddlewaresAdapter,
            onError: errorMiddlewaresAdapter,
        });
    }

    private actionToHttpMethod(actionMetadata: ActionMetadata): HTTPMethods {
        const httpMethod = actionToHttpMethodMap[actionMetadata.type];
        if (!httpMethod) {
            throw new Error(`Unsupported Action type '${actionMetadata.type}'`);
        }
        return httpMethod;
    }

    async checkAuthorization(request, reply, done, actionMetadata) {
        if (!this.authorizationChecker)
            throw new AuthorizationCheckerNotDefinedError();

        const action: Action = {request, response: reply, next: done};
        try {
            const checkResult = await this.authorizationChecker(
                action,
                actionMetadata.authorizedRoles,
            );

            if (!checkResult) {
                const error =
                    actionMetadata.authorizedRoles.length === 0
                        ? new AuthorizationRequiredError(action)
                        : new AccessDeniedError(action);
                await this.handleError(error, actionMetadata, action);
            }
        } catch (error) {
            await this.handleError(error, actionMetadata, action);
        }
    }

    /**
     * Creates middlewares from the given "use"-s.
     */
    protected prepareUseMiddlewares(uses: UseMetadata[]) {
        const middlewareFunctions: Function[] = [];
        uses.forEach((use: UseMetadata) => {
            if (this.isCustomMiddleware(use)) {
                // if this is function instance of MiddlewareInterface
                middlewareFunctions.push(
                    (
                        request: FastifyRequest,
                        reply: FastifyReply,
                        done: HookHandlerDoneFunction,
                        payload?: any,
                    ) => {
                        try {
                            const useResult =
                                getFromContainer<FastifyMiddlewareInterface>(
                                    use.middleware,
                                ).use(request, reply, done, payload);

                            if (this.isPromiseLike(useResult)) {
                                useResult.catch((error: any) => {
                                    this.handleError(error, undefined, {
                                        request,
                                        response: reply,
                                        next: done,
                                    });
                                    return error;
                                });
                            }
                            return useResult;
                        } catch (error) {
                            this.handleError(error, undefined, {
                                request,
                                response: reply,
                                next: done,
                            });
                        }
                    },
                );
            } else if (!this.isErrorMiddleware(use)) {
                // NOT a custom middleware
                // FIXME - Check if we can support use middleware using @fastify/middie
                // middlewareFunctions.push(use.middleware);
            }
        });
        return middlewareFunctions;
    }

    /**
     * Creates error middlewares from the given "use"-s.
     */
    prepareUseErrorMiddlewares(uses: UseMetadata[]) {
        const middlewareFunctions: Function[] = [];
        uses.filter((use: UseMetadata) => this.isErrorMiddleware(use)).forEach(
            (use: UseMetadata) => {
                // if this is function instance of ErrorMiddlewareInterface
                middlewareFunctions.push(
                    (
                        request: FastifyRequest,
                        reply: FastifyReply,
                        error: any,
                        done: () => void,
                    ) => {
                        return getFromContainer<FastifyErrorMiddlewareInterface>(
                            use.middleware,
                        ).useError(request, reply, error, done);
                    },
                );
            },
        );
        return middlewareFunctions;
    }

    private isCustomMiddleware(use: UseMetadata) {
        return use.middleware.prototype && use.middleware.prototype.use;
    }

    private isErrorMiddleware(use: UseMetadata) {
        return use.middleware.prototype && use.middleware.prototype.useError;
    }

    registerRoutes() {
        // Register all routes in Fastify
        // You will need to implement route registration for Fastify
    }

    getParamFromRequest(action: Action, param: ParamMetadata): any {
        const request = action.request;
        switch (param.type) {
            // TODO - https://www.npmjs.com/package/@fastify/session
            case "session-param":
                return request.session[param.name];

            case "session":
                return request.session;

            case "body":
                return request.body;

            case "body-param":
                return request.body[param.name];

            case "param":
                return request.params[param.name];

            case "params":
                return request.params;

            case "query":
                return request.query[param.name];

            case "queries":
                return request.query;

            case "header":
                return request.headers[param.name.toLowerCase()];

            case "headers":
                return request.headers;

            // Adapt other cases based on your use case and Fastify's request object
            // For example, for cookies:
            // https://github.com/fastify/fastify-cookie
            case "cookie":
                return this.useApp().parseCookie(request.headers.cookie || "")[
                    param.name
                ];

            case "cookies":
                return this.useApp().parseCookie(request.headers.cookie || "");

            // For files, you may need to use Fastify's file handling mechanisms
            //  https://snyk.io/blog/node-js-file-uploads-with-fastify/
            //  https://www.npmjs.com/package/@fastify/multipart
            case "file":
                return request.file;

            case "files":
                return request.files;

            default:
                return undefined;
        }
    }

    handleError(
        error: any,
        action: ActionMetadata | undefined,
        options: Action,
    ) {
        // Handle error using Fastify's reply
        if (action) {
            Object.keys(action.headers).forEach(name => {
                (options.response as FastifyReply).header(
                    name,
                    action.headers[name],
                );
            });
        }

        // set http status
        if (error instanceof HttpError && error.httpCode) {
            options.response.code(error.httpCode);
        } else {
            options.response.code(500);
        }
        options.response.send(error);
    }

    handleSuccess(result: any, action: ActionMetadata, options: Action): void {
        // Handle success using Fastify's reply
        // if the action returned the response object itself, short-circuits
        if (result && result === options.response) {
            return;
        }

        // set http status code
        this.applyResponseStatus(result, action, options);

        // apply http headers
        Object.keys(action.headers).forEach(name => {
            options.response.header(name, action.headers[name]);
        });

        if (action.redirect) {
            // Apply redirect
            this.applyRedirect(result, options, action);
        } else if (action.renderedTemplate) {
            // Apply render template
            this.applyTemplateRender(result, options, action);
        } else if (result === undefined) {
            this.applyUndefined(action, options);
        } else if (result === null) {
            // send null response
            options.response.send(null);
        } else if (result instanceof Buffer) {
            // check if it's binary data (Buffer)
            options.response.send(result);
        } else if (result instanceof Uint8Array) {
            // check if it's binary data (typed array)
            options.response.send(Buffer.from(result));
        } else if (result.pipe instanceof Function) {
            result.pipe(options.response.raw);
        } else {
            // send regular result
            options.response.send(result);
        }
    }

    private applyUndefined(action: ActionMetadata, options: Action) {
        // Apply undefined result
        // throw NotFoundError on undefined response
        if (action.undefinedResultCode) {
            if (action.isJsonTyped) {
                options.response.send({}); // Sending an empty object in Fastify as an equivalent of response.json()
            } else {
                options.response.send();
            }
        } else {
            throw new NotFoundError();
        }
    }

    private applyTemplateRender(
        result: any,
        options: Action,
        action: ActionMetadata,
    ) {
        // if template is set then render it
        const renderOptions = result && result instanceof Object ? result : {};

        options.response.view(
            action.renderedTemplate,
            renderOptions,
            (err, html) => {
                if (err) {
                    throw err;
                } else if (html) {
                    options.response.send(html);
                }
            },
        );
    }

    private applyRedirect(
        result: any,
        options: Action,
        action: ActionMetadata,
    ) {
        // if redirect is set then do it
        if (typeof result === "string") {
            options.response.redirect(result);
        } else if (result instanceof Object) {
            // This is a simple URI template implementation following the
            // RFC 6570 URI Template specification: https://datatracker.ietf.org/doc/html/rfc6570.
            options.response.redirect(templateUrl(action.redirect, result));
        } else {
            options.response.redirect(action.redirect);
        }
    }

    private applyResponseStatus(
        result: any,
        action: ActionMetadata,
        options: Action,
    ) {
        if (result === undefined && action.undefinedResultCode) {
            if (action.undefinedResultCode instanceof Function) {
                throw new (action.undefinedResultCode as any)(options);
            }
            options.response.code(action.undefinedResultCode);
        } else if (result === null) {
            if (action.nullResultCode) {
                if (action.nullResultCode instanceof Function) {
                    throw new (action.nullResultCode as any)(options);
                }
                options.response.code(action.nullResultCode);
            } else {
                options.response.code(204);
            }
        } else if (action.successHttpCode) {
            options.response.code(action.successHttpCode);
        }
    }

    /**
     * Dynamically loads fastify module.
     */
    protected loadFastify() {
        if (require) {
            if (!this.fastify) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                    const fastify = require("fastify")();
                    this.fastify = fastify();
                } catch (e) {
                    throw new Error(
                        "fastify package was not found installed. Try to install it: npm install fastify --save",
                    );
                }
            }
        } else {
            throw new Error(
                "Cannot load fastify. Try to install all required dependencies.",
            );
        }
    }

    /**
     * Dynamically loads @fastify/session module.
     */
    protected loadSession() {
        try {
            return require("@fastify/session");
        } catch (e) {
            throw new Error(
                "@fastify/session package was not found installed. Try to install it: npm install @fastify/session --save",
            );
        }
    }

    /**
     * Dynamically loads @fastify/cookie module.
     */
    protected loadCookie() {
        try {
            return require("@fastify/cookie");
        } catch (e) {
            throw new Error(
                "@fastify/cookie package was not found installed. Try to install it: npm install @fastify/cookie --save",
            );
        }
    }

    /**
     * Dynamically loads @fastify/multipart module.
     */
    protected loadMultipart() {
        try {
            return require("@fastify/multipart");
        } catch (e) {
            throw new Error(
                "@fastify/multipart package was not found installed. Try to install it: npm install @fastify/multipart --save",
            );
        }
    }

    /**
     * Dynamically loads @fastify/cors module.
     */
    protected loadCors() {
        try {
            return require("@fastify/cors");
        } catch (e) {
            throw new Error(
                "@fastify/cors package was not found installed. Try to install it: npm install @fastify/cors --save",
            );
        }
    }

    /**
     * Dynamically loads @fastify/view module.
     */
    protected loadView() {
        try {
            return require("@fastify/view");
        } catch (e) {
            throw new Error(
                "@fastify/view package was not found installed. Try to install it: npm install @fastify/view --save",
            );
        }
    }

    /**
     * Checks if given value is a Promise-like object.
     */
    isPromiseLike(arg: any): arg is Promise<any> {
        return (
            arg != null &&
            typeof arg === "object" &&
            typeof arg.then === "function"
        );
    }
}
