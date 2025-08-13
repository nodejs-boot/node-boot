import {MetadataArgsStorage} from "./MetadataArgsStorage";
import {
    ActionMetadata,
    allowedProfiles,
    ControllerMetadata,
    InterceptorMetadata,
    MiddlewareMetadata,
    NodeBootEngineOptions,
    ParamMetadata,
    ParamMetadataArgs,
    ResponseHandlerMetadata,
    UseMetadata,
} from "@nodeboot/context";

/**
 * Builds metadata from the given metadata arguments.
 */
export class MetadataBuilder {
    constructor(private options: NodeBootEngineOptions) {}

    /**
     * Builds controller metadata from a registered controller metadata args.
     */
    buildControllerMetadata(classes?: Function[]): ControllerMetadata[] {
        return this.createControllers(classes);
    }

    /**
     * Builds middleware metadata from a registered middleware metadata args.
     */
    buildMiddlewareMetadata(classes?: Function[]): MiddlewareMetadata[] {
        return this.createMiddlewares(classes);
    }

    /**
     * Builds interceptor metadata from a registered interceptor metadata args.
     */
    buildInterceptorMetadata(classes?: Function[]): InterceptorMetadata[] {
        return this.createInterceptors(classes);
    }

    /**
     * Creates middleware metadatas.
     */
    protected createMiddlewares(classes?: Function[]): MiddlewareMetadata[] {
        const metadataArgsStorage = MetadataArgsStorage.get();
        const middlewares = !classes
            ? metadataArgsStorage.middlewares
            : metadataArgsStorage.filterMiddlewareMetadatasForClasses(classes);
        return middlewares
            .filter(metadata => allowedProfiles(metadata.target))
            .map(middlewareArgs => new MiddlewareMetadata(middlewareArgs));
    }

    /**
     * Creates interceptor metadatas.
     */
    protected createInterceptors(classes?: Function[]): InterceptorMetadata[] {
        const metadataArgsStorage = MetadataArgsStorage.get();
        const interceptors = !classes
            ? metadataArgsStorage.interceptors
            : metadataArgsStorage.filterInterceptorMetadatasForClasses(classes);
        return interceptors
            .filter(metadata => allowedProfiles(metadata.target))
            .map(
                interceptorArgs =>
                    new InterceptorMetadata({
                        ...interceptorArgs,
                        interceptor: interceptorArgs.target,
                    }),
            );
    }

    /**
     * Creates controller metadatas.
     */
    protected createControllers(classes?: Function[]): ControllerMetadata[] {
        const metadataArgsStorage = MetadataArgsStorage.get();
        const controllers = !classes
            ? metadataArgsStorage.controllers
            : metadataArgsStorage.filterControllerMetadatasForClasses(classes);
        return controllers
            .filter(metadata => allowedProfiles(metadata.target))
            .map(controllerArgs => {
                const controller = new ControllerMetadata(controllerArgs);
                controller.build(this.createControllerResponseHandlers(controller));
                controller.actions = this.createActions(controller);
                controller.uses = this.createControllerUses(controller);
                controller.interceptors = this.createControllerInterceptorUses(controller);
                return controller;
            });
    }

    /**
     * Creates action metadatas.
     */
    protected createActions(controller: ControllerMetadata): ActionMetadata[] {
        const actionsWithTarget: ActionMetadata[] = [];
        for (let target = controller.target; target; target = Object.getPrototypeOf(target)) {
            const actions = MetadataArgsStorage.get().filterActionsWithTarget(target);
            const methods = actionsWithTarget.map(a => a.method);
            actions
                .filter(({method}) => !methods.includes(method))
                .forEach(actionArgs => {
                    const action = new ActionMetadata(
                        controller,
                        {
                            ...actionArgs,
                            target: controller.target,
                        },
                        this.options,
                    );
                    action.options = {...controller.options, ...actionArgs.options};
                    action.params = this.createParams(action);
                    action.uses = this.createActionUses(action);
                    action.interceptors = this.createActionInterceptorUses(action);
                    action.build(this.createActionResponseHandlers(action));

                    actionsWithTarget.push(action);
                });
        }

        return actionsWithTarget;
    }

    /**
     * Creates param metadatas.
     */
    protected createParams(action: ActionMetadata): ParamMetadata[] {
        return MetadataArgsStorage.get()
            .filterParamsWithTargetAndMethod(action.target, action.method)
            .map(paramArgs => new ParamMetadata(action, this.decorateDefaultParamOptions(paramArgs)));
    }

    /**
     * Creates response handler metadatas for action.
     */
    protected createActionResponseHandlers(action: ActionMetadata): ResponseHandlerMetadata[] {
        return MetadataArgsStorage.get()
            .filterResponseHandlersWithTargetAndMethod(action.target, action.method)
            .map(handlerArgs => new ResponseHandlerMetadata(handlerArgs));
    }

    /**
     * Creates response handler metadatas for controller.
     */
    protected createControllerResponseHandlers(controller: ControllerMetadata): ResponseHandlerMetadata[] {
        return MetadataArgsStorage.get()
            .filterResponseHandlersWithTarget(controller.target)
            .map(handlerArgs => new ResponseHandlerMetadata(handlerArgs));
    }

    /**
     * Creates use metadatas for actions.
     */
    protected createActionUses(action: ActionMetadata): UseMetadata[] {
        return MetadataArgsStorage.get()
            .filterUsesWithTargetAndMethod(action.target, action.method)
            .map(useArgs => new UseMetadata(useArgs));
    }

    /**
     * Creates use interceptors for actions.
     */
    protected createActionInterceptorUses(action: ActionMetadata): InterceptorMetadata[] {
        return MetadataArgsStorage.get()
            .filterInterceptorUsesWithTargetAndMethod(action.target, action.method)
            .map(useArgs => new InterceptorMetadata(useArgs));
    }

    /**
     * Creates use metadatas for controllers.
     */
    protected createControllerUses(controller: ControllerMetadata): UseMetadata[] {
        return MetadataArgsStorage.get()
            .filterUsesWithTargetAndMethod(controller.target)
            .map(useArgs => new UseMetadata(useArgs));
    }

    /**
     * Creates use interceptors for controllers.
     */
    protected createControllerInterceptorUses(controller: ControllerMetadata): InterceptorMetadata[] {
        return MetadataArgsStorage.get()
            .filterInterceptorUsesWithTargetAndMethod(controller.target)
            .map(useArgs => new InterceptorMetadata(useArgs));
    }

    /**
     * Decorate paramArgs with default settings
     */
    private decorateDefaultParamOptions(paramArgs: ParamMetadataArgs) {
        const options = this.options?.defaults?.paramOptions;
        if (!options) return paramArgs;

        if (paramArgs.required === undefined) paramArgs.required = options.required || false;

        return paramArgs;
    }
}
