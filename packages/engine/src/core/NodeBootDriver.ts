import {ValidatorOptions} from "class-validator";
import {ClassTransformOptions, instanceToPlain} from "class-transformer";
import {HttpError} from "@node-boot/error";
import {
    Action,
    ActionMetadata,
    AuthorizationChecker,
    CurrentUserChecker,
    MiddlewareMetadata,
    NodeBootEngineOptions,
    ParamMetadata,
} from "@node-boot/context";

/**
 * Base driver functionality for all other drivers.
 * Abstract layer to organize controllers integration with different http server implementations.
 */
export abstract class NodeBootDriver<TServer, TAction extends Action = Action> {
    /**
     * Reference to the underlying framework app object.
     */
    app: TServer;

    /**
     * Indicates if class-transformer should be used or not.
     */
    useClassTransformer: boolean;

    /**
     * Indicates if class-validator should be used or not.
     */
    enableValidation: boolean;

    /**
     * Global class transformer options passed to class-transformer during classToPlain operation.
     * This operation is being executed when server returns response to user.
     */
    classToPlainTransformOptions?: ClassTransformOptions;

    /**
     * Global class-validator options passed during validate operation.
     */
    validationOptions: ValidatorOptions;

    /**
     * Global class transformer options passed to class-transformer during plainToClass operation.
     * This operation is being executed when parsing user parameters.
     */
    plainToClassTransformOptions?: ClassTransformOptions;

    /**
     * Indicates if default routing-controllers error handler should be used or not.
     */
    isDefaultErrorHandlingEnabled: boolean;

    /**
     * Indicates if routing-controllers should operate in development mode.
     */
    developmentMode: boolean;

    /**
     * Global application prefix.
     */
    routePrefix = "";

    /**
     * Map of error overrides.
     */
    errorOverridingMap: {[key: string]: any};

    /**
     * Special function used to check user authorization roles per request.
     * Must return true or promise with boolean true resolved for authorization to succeed.
     */
    authorizationChecker?: AuthorizationChecker;

    /**
     * Special function used to get currently authorized user.
     */
    currentUserChecker?: CurrentUserChecker;

    protected transformResult(result: any, actionMetadata: ActionMetadata, action: TAction): any {
        // check if we need to transform result
        const shouldTransform =
            this.useClassTransformer && // transform only if class-transformer is enabled
            actionMetadata.options?.transformResponse !== false && // don't transform if actionMetadata response transform is disabled
            result instanceof Object && // don't transform primitive types (string/number/boolean)
            !(
                (result instanceof Uint8Array || result.pipe instanceof Function) // don't transform binary data // don't transform streams
            );

        // transform result if needed
        if (shouldTransform) {
            const options = actionMetadata.responseClassTransformOptions || this.classToPlainTransformOptions;
            result = instanceToPlain(result, options);
        }

        return result;
    }

    protected processJsonError(error: any) {
        if (!this.isDefaultErrorHandlingEnabled) return error;

        if (typeof error.toJSON === "function") return error.toJSON();

        let processedError: any = {};
        if (error instanceof Error) {
            const name = error.name && error.name !== "Error" ? error.name : error.constructor.name;
            processedError.name = name;

            if (error.message) processedError.message = error.message;
            if (error.stack && this.developmentMode) processedError.stack = error.stack;

            Object.keys(error)
                .filter(key => key !== "stack" && key !== "name" && key !== "message" && (!(error instanceof HttpError) || key !== "httpCode"))
                .forEach(key => (processedError[key] = (error as any)[key]));

            if (this.errorOverridingMap)
                Object.keys(this.errorOverridingMap)
                    .filter(key => name === key)
                    .forEach(key => (processedError = this.merge(processedError, this.errorOverridingMap[key])));

            return Object.keys(processedError).length > 0 ? processedError : undefined;
        }

        return error;
    }

    protected processTextError(error: any) {
        if (!this.isDefaultErrorHandlingEnabled) return error;

        if (error instanceof Error) {
            if (this.developmentMode && error.stack) {
                return error.stack;
            } else if (error.message) {
                return error.message;
            }
        }
        return error;
    }

    protected merge(obj1: any, obj2: any): any {
        const result: any = {};
        for (const i in obj1) {
            if (i in obj2 && typeof obj1[i] === "object" && i !== null) {
                result[i] = this.merge(obj1[i], obj2[i]);
            } else {
                result[i] = obj1[i];
            }
        }
        for (const i in obj2) {
            result[i] = obj2[i];
        }
        return result;
    }

    /**
     * Initializes the things driver needs before routes and middleware registration.
     */
    abstract initialize(): void;

    /**
     * Registers given middleware.
     */
    abstract registerMiddleware(middleware: MiddlewareMetadata, options: NodeBootEngineOptions): void;

    /**
     * Registers actionMetadata in the driver.
     */
    abstract registerAction(actionMetadata: ActionMetadata, executeCallback: (action: TAction) => any): void;

    /**
     * Registers all routes in the framework.
     */
    abstract registerRoutes(): void;

    /**
     * Gets param from the request.
     */
    abstract getParamFromRequest(action: TAction, param: ParamMetadata): any;

    /**
     * Defines an algorithm of how to handle error during executing controller actionMetadata.
     */
    abstract handleError(error: any, actionMetadata: ActionMetadata, action: TAction): any;

    /**
     * Defines an algorithm of how to handle success result of executing controller actionMetadata.
     */
    abstract handleSuccess(result: any, actionMetadata: ActionMetadata, action: TAction): void;
}
