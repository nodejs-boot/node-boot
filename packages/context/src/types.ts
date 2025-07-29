import {IocContainer} from "./ioc";
import {Logger} from "winston";
import {ApplicationLifecycleBridge, Config} from "./services";

/**
 * Controller action properties.
 */
export interface Action<TRequest = any, TResponse = any, TNext = Function> {
    /**
     * Action Request object.
     */
    request: TRequest;

    /**
     * Action Response object.
     */
    response: TResponse;

    /**
     * Content in which action is executed.
     * Koa-specific property.
     */
    context?: any;

    /**
     * "Next" function used to call next middleware.
     */
    next?: TNext;
}

export type BeansContext<TApplication = any, TRouter = any> = {
    iocContainer: IocContainer;
    application: TApplication;
    router: TRouter;
    lifecycleBridge: ApplicationLifecycleBridge;
    logger: Logger;
    config: Config;
};

/**
 * Used to register custom parameter handler in the controller action parameters.
 */
export interface CustomParameterDecorator {
    /**
     * Indicates if this parameter is required or not.
     * If parameter is required and value provided by it is not set then Node-Boot will throw an error.
     */
    required?: boolean;

    /**
     * Factory function that returns value to be written to this parameter.
     * In function it provides you Action object which contains current request, response, context objects.
     * It also provides you original value of this parameter.
     * It can return promise, and if it returns promise then promise will be resolved before calling controller action.
     */
    value: (action: Action, value?: any) => Promise<any> | any;
}

/**
 * Controller action type.
 */
export type ActionType =
    | "all"
    | "checkout"
    | "connect"
    | "copy"
    | "delete"
    | "get"
    | "head"
    | "lock"
    | "merge"
    | "mkactivity"
    | "mkcol"
    | "move"
    | "m-search"
    | "notify"
    | "options"
    | "patch"
    | "post"
    | "propfind"
    | "proppatch"
    | "purge"
    | "put"
    | "report"
    | "search"
    | "subscribe"
    | "trace"
    | "unlock"
    | "unsubscribe";

/**
 * Controller action's parameter type.
 */
export type ParamType =
    | "body"
    | "body-param"
    | "query"
    | "queries"
    | "header"
    | "headers"
    | "file"
    | "files"
    | "param"
    | "params"
    | "session"
    | "session-param"
    | "state"
    | "cookie"
    | "cookies"
    | "request"
    | "response"
    | "context"
    | "current-user"
    | "custom-converter";

/**
 * Response handler type.
 */
export type ResponseHandlerType =
    | "success-code"
    | "error-code"
    | "content-type"
    | "header"
    | "rendered-template"
    | "redirect"
    | "location"
    | "on-null"
    | "on-undefined"
    | "response-class-transform-options"
    | "authorized";

export type LifecycleType =
    | "application.initialized"
    | "application.started"
    | "persistence.started"
    | "application.stopped";
