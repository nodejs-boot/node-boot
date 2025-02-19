import {GlobalErrorHandler, NodeBootDriver, ServerConfig} from "@nodeboot/engine";
import {
    Action,
    ActionMetadata,
    ErrorHandlerInterface,
    getFromContainer,
    LoggerService,
    MiddlewareInterface,
    MiddlewareMetadata,
    NodeBootEngineOptions,
    ParamMetadata,
    UseMetadata,
} from "@nodeboot/context";
import {FastifyError, FastifyInstance, FastifyReply, FastifyRequest} from "fastify";
import {HTTPMethods} from "fastify/types/utils";
import templateUrl from "template-url";
import {
    AccessDeniedError,
    AuthorizationCheckerNotDefinedError,
    AuthorizationRequiredError,
    HttpError,
    NotFoundError,
} from "@nodeboot/error";
import {DependenciesLoader} from "../loader";
import {AsyncFunction} from "fastify/types/instance";
import {FastifyServerConfigs} from "../types";

const actionToHttpMethodMap = {
    delete: "DELETE",
    get: "GET",
    patch: "PATCH",
    options: "OPTIONS",
    put: "PUT",
    post: "POST",
};

type FastifyServerOptions = {
    logger: LoggerService;
    fastify: FastifyInstance;
    configs?: FastifyServerConfigs;
};

export class FastifyDriver extends NodeBootDriver<FastifyInstance, Action<FastifyRequest, FastifyReply>> {
    private readonly logger: LoggerService;
    private readonly configs?: FastifyServerConfigs;
    private readonly globalErrorHandler: GlobalErrorHandler;
    private customErrorHandler: ErrorHandlerInterface;

    constructor(options: FastifyServerOptions) {
        super();
        this.logger = options.logger;
        this.configs = options.configs;
        this.app = options.fastify;
        this.globalErrorHandler = new GlobalErrorHandler(this);
    }

    initialize() {
        ServerConfig.of(this.configs)
            .ifCookies(
                options => {
                    const fastifyCookie = DependenciesLoader.loadCookie();
                    this.app.register(fastifyCookie, options);
                },
                () => this.logger.warn(`Cookies is not configured`),
            )
            .ifCors(
                options => {
                    const fastifyCors = DependenciesLoader.loadCors();
                    this.app.register(fastifyCors, options);
                },
                () => this.logger.warn(`CORS is not configured`),
            )
            .ifSession(
                options => {
                    const fastifySession = DependenciesLoader.loadSession();
                    this.app.register(fastifySession, options);
                },
                () => this.logger.warn(`Session is not configured`),
            )
            .ifTemplate(
                options => {
                    const fastifyView = DependenciesLoader.loadView();
                    this.app.register(fastifyView, options);
                },
                () => this.logger.warn(`Session is not configured`),
            )
            .ifMultipart(
                options => {
                    const fastifyMultipart = DependenciesLoader.loadMultipart();
                    this.app.register(fastifyMultipart, options);
                },
                () => this.logger.warn(`Multipart is not configured`),
            );
    }

    /**
     * Registers middleware that run before controller actions.
     */
    registerMiddleware(middleware: MiddlewareMetadata, options: NodeBootEngineOptions): void {
        // Register a custom error Handler
        if ((middleware.instance as ErrorHandlerInterface).onError) {
            this.customErrorHandler = middleware.instance as ErrorHandlerInterface;
        }
        // if its a regular middleware then register it as fastify preHandler hook
        else if ((middleware.instance as MiddlewareInterface).use) {
            let fastifyHook;
            if (middleware.type === "before") {
                fastifyHook = async (request: FastifyRequest, reply: FastifyReply) => {
                    await this.callGlobalMiddleware(request, options, middleware, reply, undefined);
                };

                // Name the function for better debugging
                this.nameGlobalMiddlewareFunction(fastifyHook, middleware);
                this.app.addHook("preHandler", fastifyHook);
            } else {
                fastifyHook = async (request: FastifyRequest, reply: FastifyReply, payload: any) => {
                    await this.callGlobalMiddleware(request, options, middleware, reply, payload);
                };

                // Name the function for better debugging
                this.nameGlobalMiddlewareFunction(fastifyHook, middleware);
                this.app.addHook("onSend", fastifyHook);
            }
        }
    }

    private async callGlobalMiddleware(
        request: FastifyRequest,
        options: NodeBootEngineOptions,
        middleware: MiddlewareMetadata,
        reply: FastifyReply,
        payload: any,
    ) {
        if (request.url.startsWith(options.routePrefix || "/")) {
            try {
                await (middleware.instance as MiddlewareInterface).use(
                    {
                        request,
                        response: reply,
                    },
                    payload,
                );
            } catch (error: any) {
                await this.handleError(error, {
                    request,
                    response: reply,
                });
            }
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
        executeAction: (action: Action<FastifyRequest, FastifyReply>) => Promise<any>,
    ) {
        const defaultMiddlewares: AsyncFunction[] = [];

        if (actionMetadata.isAuthorizedUsed) {
            defaultMiddlewares.push(async (request: FastifyRequest, reply: FastifyReply) => {
                await this.checkAuthorization(request, reply, actionMetadata);
            });
        }

        // TODO Make sure nothing is required if @fastify/multipart is registered
        /*if (actionMetadata.isFileUsed || actionMetadata.isFilesUsed) {
            // Implement file handling if needed
            // ...
        }*/

        const uses = [...actionMetadata.controllerMetadata.uses, ...actionMetadata.uses];
        const beforeMiddlewares = this.prepareUseMiddlewares(uses.filter(use => !use.afterAction));
        const afterMiddlewares = this.prepareUseMiddlewares(uses.filter(use => use.afterAction));
        const errorMiddlewares = this.prepareUseErrorMiddlewares(uses);

        const routeHandler = async (request: FastifyRequest, reply: FastifyReply) => {
            await executeAction({request, response: reply});
        };

        const afterMiddlewaresAdapter = async (request: FastifyRequest, reply: FastifyReply, payload: any) => {
            for (const afterMiddleware of afterMiddlewares) {
                await afterMiddleware(request, reply, payload);
            }
        };

        const errorMiddlewaresAdapter = async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
            for (const errorMiddleware of errorMiddlewares) {
                await errorMiddleware(request, reply, error);
            }
        };

        // Register route and hooks
        const route = ActionMetadata.appendBaseRoute(this.routePrefix, actionMetadata.fullRoute);
        this.app.route({
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

    async checkAuthorization(request: FastifyRequest, reply: FastifyReply, actionMetadata: ActionMetadata) {
        if (!this.authorizationChecker) throw new AuthorizationCheckerNotDefinedError();

        const action = {request, response: reply};
        try {
            const checkResult = await this.authorizationChecker.check(action, actionMetadata.authorizedRoles);

            if (!checkResult) {
                const error =
                    actionMetadata.authorizedRoles.length === 0
                        ? new AuthorizationRequiredError(action.request.method, action.request.url)
                        : new AccessDeniedError(action.request.method, action.request.url);

                await this.handleError(error, action, actionMetadata);
            }
        } catch (error: any) {
            await this.handleError(error, action, actionMetadata);
        }
    }

    /**
     * Creates middlewares from the given "use"-s.
     */
    protected prepareUseMiddlewares(uses: UseMetadata[]) {
        const middlewareFunctions: AsyncFunction[] = [];
        uses.forEach((use: UseMetadata) => {
            if (use.isCustomMiddleware()) {
                // if this is function instance of MiddlewareInterface
                middlewareFunctions.push(async (request: FastifyRequest, reply: FastifyReply, payload?: any) => {
                    try {
                        return await getFromContainer<MiddlewareInterface>(use.middleware).use(
                            {request, response: reply},
                            payload,
                        );
                    } catch (error) {
                        await this.handleError(error as Error, {
                            request,
                            response: reply,
                        });
                    }
                });
            } else if (!use.isErrorMiddleware()) {
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
        const middlewareFunctions: AsyncFunction[] = [];
        uses.filter((use: UseMetadata) => use.isErrorMiddleware()).forEach((use: UseMetadata) => {
            // if this is function instance of ErrorMiddlewareInterface
            middlewareFunctions.push(
                async (request: FastifyRequest, reply: FastifyReply, error: FastifyError, done: () => void) => {
                    return getFromContainer<ErrorHandlerInterface>(use.middleware).onError(error, {
                        request,
                        response: reply,
                        next: done,
                    });
                },
            );
        });
        return middlewareFunctions;
    }

    registerRoutes() {}

    getParamFromRequest(action: Action<FastifyRequest, FastifyReply>, param: ParamMetadata): any {
        const request = action.request;
        switch (param.type) {
            case "session-param":
                return request.session[param.name];

            case "session":
                return request.session;

            case "body":
                return request.body;

            case "body-param":
                return (request.body as any)[param.name];

            case "param":
                return (request.params as any)[param.name];

            case "params":
                return request.params;

            case "query":
                return (request.query as any)[param.name];

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
                return this.app.parseCookie(request.headers.cookie || "")[param.name];

            case "cookies":
                return this.app.parseCookie(request.headers.cookie || "");

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

    async handleError(error: Error, action: Action<FastifyRequest, FastifyReply>, actionMetadata?: ActionMetadata) {
        // Handle error using Fastify's reply
        if (actionMetadata) {
            Object.keys(actionMetadata.headers).forEach(name => {
                (action.response as FastifyReply).header(name, actionMetadata.headers[name]);
            });
        }

        // set http status
        if (error instanceof HttpError && error.httpCode) {
            action.response.code(error.httpCode);
        } else {
            action.response.code(500);
        }

        if (this.customErrorHandler) {
            await this.customErrorHandler.onError(error, action, actionMetadata);
        } else {
            const parsedError = this.globalErrorHandler.handleError(error);
            action.response.send(parsedError);
        }
    }

    handleSuccess(result: any, action: Action<FastifyRequest, FastifyReply>, actionMetadata: ActionMetadata) {
        // Handle success using Fastify's reply
        // if the actionMetadata returned the response object itself, short-circuits
        if (result && result === action.response) {
            return;
        }

        // set http status code
        this.applyResponseStatus(result, action, actionMetadata);

        // apply http headers
        Object.keys(actionMetadata.headers).forEach(name => {
            action.response.header(name, actionMetadata.headers[name]);
        });

        if (actionMetadata.redirect) {
            // Apply redirect
            this.applyRedirect(result, action, actionMetadata);
        } else if (actionMetadata.renderedTemplate) {
            // Apply render template
            this.applyTemplateRender(result, action, actionMetadata);
        } else if (result === undefined) {
            this.applyUndefined(actionMetadata, action);
        } else if (result === null) {
            // send null response
            action.response.send(null);
        } else if (result instanceof Buffer) {
            // check if it's binary data (Buffer)
            action.response.send(result);
        } else if (result instanceof Uint8Array) {
            // check if it's binary data (typed array)
            action.response.send(Buffer.from(result));
        } else if (result.pipe instanceof Function) {
            result.pipe(action.response.raw);
        } else {
            // send regular result
            action.response.send(result);
        }
    }

    private applyUndefined(actionMetadata: ActionMetadata, action: Action<FastifyRequest, FastifyReply>) {
        // Apply undefined result
        // throw NotFoundError on undefined response
        if (actionMetadata.undefinedResultCode) {
            if (actionMetadata.isJsonTyped) {
                action.response.send({}); // Sending an empty object in Fastify as an equivalent of response.json()
            } else {
                action.response.send();
            }
        } else {
            throw new NotFoundError();
        }
    }

    private applyTemplateRender(
        result: any,
        action: Action<FastifyRequest, FastifyReply>,
        actionMetadata: ActionMetadata,
    ) {
        // if template is set then render it
        // Check doc https://www.npmjs.com/package/@fastify/view
        // Issue 41: https://github.com/nodejs-boot/node-boot/issues/41
        const renderOptions = result && result instanceof Object ? result : {};
        action.response.view(actionMetadata.renderedTemplate, renderOptions);
    }

    private applyRedirect(result: any, options: Action<FastifyRequest, FastifyReply>, action: ActionMetadata) {
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
        action: Action<FastifyRequest, FastifyReply>,
        actionMetadata: ActionMetadata,
    ) {
        if (result === undefined && actionMetadata.undefinedResultCode) {
            action.response.code(actionMetadata.undefinedResultCode);
        } else if (result === null) {
            if (actionMetadata.nullResultCode) {
                action.response.code(actionMetadata.nullResultCode);
            } else {
                action.response.code(204);
            }
        } else if (actionMetadata.successHttpCode) {
            action.response.code(actionMetadata.successHttpCode);
        }
    }
}
