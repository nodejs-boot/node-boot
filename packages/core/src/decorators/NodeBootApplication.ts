import {
    ApplicationAdapter,
    ApplicationContext,
    ApplicationOptions,
    IocContainer,
    NodeBootEngineOptions,
} from "@nodeboot/context";
import {BeansConfigurationAdapter} from "../adapters";

/**
 * Defines a class as an entry-point for a NodeJs application
 *
 * @param options Extra options that apply to the application
 */
export function NodeBootApplication(options?: ApplicationOptions): Function {
    return function (target: any) {
        Reflect.defineMetadata("custom:nodeBootApp", true, target);

        const context = ApplicationContext.get();

        context.applicationOptions = {
            ...options,
        };

        // Bind Configurations adapters to search from @Beans under the Application class
        context.configurationAdapters.push(new BeansConfigurationAdapter(target));

        // Bind Application Adapter
        context.applicationAdapter = new (class implements ApplicationAdapter {
            bind(iocContainer: IocContainer): NodeBootEngineOptions {
                const context = ApplicationContext.get();
                return {
                    routePrefix: context.applicationOptions.apiOptions?.routePrefix,
                    defaults: {
                        nullResultCode: context.applicationOptions.apiOptions?.nullResultCode,
                        paramOptions: context.applicationOptions.apiOptions?.paramOptions,
                        undefinedResultCode: context.applicationOptions.apiOptions?.undefinedResultCode,
                    },
                    validation: context.validation,
                    classTransformer: context.classTransformer,
                    classToPlainTransformOptions: context.classToPlainTransformOptions,
                    plainToClassTransformOptions: context.plainToClassTransformOptions,
                    controllers: context.controllerClasses,
                    middlewares: context.globalMiddlewares,
                    currentUserChecker: context.currentUserChecker
                        ? iocContainer.get(context.currentUserChecker)
                        : undefined,
                    authorizationChecker: context.authorizationChecker
                        ? iocContainer.get(context.authorizationChecker)
                        : undefined,
                };
            }
        })();
    };
}
