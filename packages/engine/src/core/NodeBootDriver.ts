import {ValidatorOptions} from "class-validator";
import {ClassTransformOptions} from "class-transformer";
import {
    Action,
    ActionMetadata,
    AuthorizationChecker,
    CurrentUserChecker,
    MiddlewareMetadata,
    NodeBootEngineOptions,
    ParamMetadata,
} from "@nodeboot/context";

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
     * Indicates if Node-Boot should operate in development mode.
     */
    developmentMode: boolean;

    /**
     * Global application prefix.
     */
    routePrefix = "";

    /**
     * Special function used to check user authorization roles per request.
     * Must return true or promise with boolean true resolved for authorization to succeed.
     */
    authorizationChecker?: AuthorizationChecker;

    /**
     * Special function used to get currently authorized user.
     */
    currentUserChecker?: CurrentUserChecker;

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
    abstract registerAction(actionMetadata: ActionMetadata, executeCallback: (action: TAction) => Promise<any>): void;

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
    abstract handleError(
        error: any,
        action: TAction,
        actionMetadata?: ActionMetadata,
        useGlobalHandler?: boolean,
    ): Promise<any>;

    /**
     * Defines an algorithm of how to handle success result of executing controller actionMetadata.
     */
    abstract handleSuccess(result: any, action: TAction, actionMetadata: ActionMetadata): void;
}
