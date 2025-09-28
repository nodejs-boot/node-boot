import {
    ActionMetadataArgs,
    ControllerMetadataArgs,
    InterceptorMetadataArgs,
    MiddlewareMetadataArgs,
    ModelMetadataArgs,
    ParamMetadataArgs,
    PropertyMetadataArgs,
    ResponseHandlerMetadataArgs,
    UseInterceptorMetadataArgs,
    UseMetadataArgs,
} from "@nodeboot/context";

/**
 * Storage all metadata read from decorators.
 */
export class MetadataArgsStorage {
    /**
     * Registered controller metadata args.
     */
    controllers: ControllerMetadataArgs[] = [];

    /**
     * Registered middleware metadata args.
     */
    middlewares: MiddlewareMetadataArgs[] = [];

    /**
     * Registered interceptor metadata args.
     */
    interceptors: InterceptorMetadataArgs[] = [];

    /**
     * Registered models (data-classes) metadata args.
     */
    models: ModelMetadataArgs[] = [];

    /**
     * Registered data-classes properties metadata args.
     */
    modelProperties: PropertyMetadataArgs[] = [];

    /**
     * Registered "use middleware" metadata args.
     */
    uses: UseMetadataArgs[] = [];

    /**
     * Registered "use interceptor" metadata args.
     */
    useInterceptors: UseInterceptorMetadataArgs[] = [];

    /**
     * Registered action metadata args.
     */
    actions: ActionMetadataArgs[] = [];

    /**
     * Registered param metadata args.
     */
    params: ParamMetadataArgs[] = [];

    /**
     * Registered response handler metadata args.
     */
    responseHandlers: ResponseHandlerMetadataArgs[] = [];

    /**
     * Filters registered middlewares by a given classes.
     */
    filterMiddlewareMetadatasForClasses(classes: Function[]): MiddlewareMetadataArgs[] {
        return classes
            .map(cls => this.middlewares.find(middleware => middleware.target === cls))
            .filter(middlewareArgs => middlewareArgs !== undefined) as MiddlewareMetadataArgs[]; // this might be not needed if all classes where decorated with `@Middleware`
    }

    /**
     * Filters registered interceptors by a given classes.
     */
    filterInterceptorMetadatasForClasses(classes: Function[]): InterceptorMetadataArgs[] {
        return this.interceptors.filter(ctrl => {
            return classes.filter(cls => ctrl.target === cls).length > 0;
        });
    }

    /**
     * Filters registered controllers by a given classes.
     */
    filterControllerMetadatasForClasses(classes: Function[]): ControllerMetadataArgs[] {
        return this.controllers.filter(ctrl => {
            return classes.filter(cls => ctrl.target === cls).length > 0;
        });
    }

    /**
     * Filters registered actions by a given classes.
     */
    filterActionsWithTarget(target: Function): ActionMetadataArgs[] {
        return this.actions.filter(action => action.target === target);
    }

    /**
     * Filters registered "use middlewares" by a given target class and method name.
     */
    filterUsesWithTargetAndMethod(target: Function, methodName?: string): UseMetadataArgs[] {
        return this.uses.filter(use => {
            return use.target === target && use.method === methodName;
        });
    }

    /**
     * Filters registered "use interceptors" by a given target class and method name.
     */
    filterInterceptorUsesWithTargetAndMethod(target: Function, methodName?: string): UseInterceptorMetadataArgs[] {
        return this.useInterceptors.filter(use => {
            return use.target === target && use.method === methodName;
        });
    }

    /**
     * Filters parameters by a given classes.
     */
    filterParamsWithTargetAndMethod(target: Function, methodName: string): ParamMetadataArgs[] {
        return this.params.filter(param => {
            return param.object.constructor === target && param.method === methodName;
        });
    }

    /**
     * Filters response handlers by a given class.
     */
    filterResponseHandlersWithTarget(target: Function): ResponseHandlerMetadataArgs[] {
        return this.responseHandlers.filter(property => {
            return property.target === target;
        });
    }

    /**
     * Filters response handlers by a given classes.
     */
    filterResponseHandlersWithTargetAndMethod(target: Function, methodName: string): ResponseHandlerMetadataArgs[] {
        return this.responseHandlers.filter(property => {
            return property.target === target && property.method === methodName;
        });
    }

    /**
     * Filters Models (Data classes) by a given target class.
     */
    filterModelsByTarget(target: Function): ModelMetadataArgs[] {
        return this.models.filter(data => data.target === target);
    }

    /**
     * Filters Models (Data classes) properties by a given target class.
     */
    filterPropertyByTarget(target: Function): PropertyMetadataArgs[] {
        return this.modelProperties.filter(property => property.target === target);
    }

    /**
     * Removes all saved metadata.
     */
    reset() {
        this.controllers = [];
        this.middlewares = [];
        this.interceptors = [];
        this.uses = [];
        this.useInterceptors = [];
        this.actions = [];
        this.params = [];
        this.responseHandlers = [];
        this.models = [];
        this.modelProperties = [];
    }

    /**
     * Resets the global metadata storage singleton.
     * Useful for testing and hot-reload scenarios to prevent memory leaks.
     */
    static reset(): void {
        if ((global as any).engineMetadataArgsStorage) {
            (global as any).engineMetadataArgsStorage.reset();
            (global as any).engineMetadataArgsStorage = undefined;
        }
    }

    /**
     * Gets metadata args storage.
     * Metadata args storage follows the best practices and stores metadata in a global variable.
     */
    static get(): MetadataArgsStorage {
        if (!(global as any).engineMetadataArgsStorage)
            (global as any).engineMetadataArgsStorage = new MetadataArgsStorage();

        return (global as any).engineMetadataArgsStorage;
    }
}
