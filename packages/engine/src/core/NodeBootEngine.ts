import {MetadataBuilder} from "../metadata";
import {
    Action,
    ActionMetadata,
    getFromContainer,
    InterceptorInterface,
    InterceptorMetadata,
    NodeBootEngineOptions,
} from "@nodeboot/context";
import {runInSequence} from "../util";
import {NodeBootDriver} from "./NodeBootDriver";
import {ActionParameterHandler} from "../handler";

/**
 * Registers controllers and middlewares in the given server framework.
 */
export class NodeBootEngine<TServer, TDriver extends NodeBootDriver<TServer>> {
    /**
     * Used to check and handle controller action parameters.
     */
    private parameterHandler: ActionParameterHandler<TServer, TDriver>;

    /**
     * Used to build metadata objects for controllers and middlewares.
     */
    private metadataBuilder: MetadataBuilder;

    /**
     * Global interceptors run on each controller action.
     */
    private interceptors: InterceptorMetadata[] = [];

    constructor(private driver: TDriver, private options: NodeBootEngineOptions) {
        this.parameterHandler = new ActionParameterHandler(driver);
        this.metadataBuilder = new MetadataBuilder(options);
    }

    /**
     * Initializes the things driver needs before routes and middleware registration.
     */
    initialize(): this {
        this.driver.initialize();
        return this;
    }

    /**
     * Registers all given interceptors.
     */
    registerInterceptors(classes?: Function[]): this {
        const interceptors = this.metadataBuilder
            .buildInterceptorMetadata(classes)
            .sort((middleware1, middleware2) => middleware1.priority - middleware2.priority)
            .reverse();
        this.interceptors.push(...interceptors);
        return this;
    }

    /**
     * Registers all given controllers and actions from those controllers.
     */
    registerControllers(classes?: Function[]): this {
        const controllers = this.metadataBuilder.buildControllerMetadata(classes);
        controllers.forEach(controller => {
            controller.actions.forEach(actionMetadata => {
                const interceptorFns = this.prepareInterceptors([
                    ...this.interceptors,
                    ...actionMetadata.controllerMetadata.interceptors,
                    ...actionMetadata.interceptors,
                ]);
                this.driver.registerAction(actionMetadata, async (action: Action) => {
                    return await this.executeAction(actionMetadata, action, interceptorFns);
                });
            });
        });
        this.driver.registerRoutes();
        return this;
    }

    /**
     * Registers post-execution middlewares in the driver.
     */
    registerMiddlewares(type: "before" | "after", classes?: Function[]): this {
        this.metadataBuilder
            .buildMiddlewareMetadata(classes)
            .filter(middleware => middleware.global && middleware.type === type)
            .sort((middleware1, middleware2) => middleware2.priority - middleware1.priority)
            .forEach(middleware => this.driver.registerMiddleware(middleware, this.options));

        return this;
    }

    /**
     * Executes given controller action.
     */
    protected async executeAction(actionMetadata: ActionMetadata, action: Action, interceptorFns: Function[]) {
        // compute all parameters
        const paramsPromises = actionMetadata.params
            .sort((param1, param2) => param1.index - param2.index)
            .map(param => this.parameterHandler.handle(action, param));

        // after all parameters are computed
        try {
            const params = (await Promise.all(paramsPromises)).filter(value => value);
            return await this.handleCallMethodResult(params, action, actionMetadata, interceptorFns);
        } catch (error) {
            // otherwise simply handle error without action execution
            return this.driver.handleError(error, action, actionMetadata);
        }
    }

    /**
     * Handles result of the actionMetadata method execution.
     */
    protected async handleCallMethodResult(
        params: any[],
        action: Action,
        actionMetadata: ActionMetadata,
        interceptorFns: Function[],
    ) {
        // execute action and handle result
        const allParams = actionMetadata.appendParams ? actionMetadata.appendParams(action).concat(params) : params;

        try {
            const result = await actionMetadata.callMethod(allParams, action);
            return await this.handleResult(result, action, actionMetadata, interceptorFns);
        } catch (e) {
            return this.driver.handleError(e, action, actionMetadata);
        }
    }

    private async handleResult(
        result: any,
        action: Action,
        actionMetadata: ActionMetadata,
        interceptorFns: Function[],
    ) {
        try {
            if (interceptorFns.length > 0) {
                await runInSequence(interceptorFns, async interceptorFn => {
                    result = await interceptorFn(action, result);
                });
            }
            this.driver.handleSuccess(result, action, actionMetadata);
        } catch (e) {
            await this.driver.handleError(e, action, actionMetadata);
        }
    }

    /**
     * Creates interceptors from the given "use interceptors".
     */
    protected prepareInterceptors(uses: InterceptorMetadata[]): Function[] {
        return uses.map(use => {
            if (use.interceptor.prototype && use.interceptor.prototype.intercept) {
                // if this is function instance of InterceptorInterface
                return function (action: Action, result: any) {
                    return getFromContainer<InterceptorInterface>(use.interceptor, action).intercept(action, result);
                };
            }
            return use.interceptor;
        });
    }
}
