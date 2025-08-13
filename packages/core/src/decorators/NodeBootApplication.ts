import {
    ApplicationAdapter,
    ApplicationContext,
    ApplicationOptions,
    IocContainer,
    NodeBootEngineOptions,
} from "@nodeboot/context";
import {BeansConfigurationAdapter} from "../adapters";

/**
 * Marks a class as the entry point of a Node Boot application.
 *
 * This decorator initializes the Node Boot application context and sets up
 * essential components, including configuration adapters, IoC container bindings,
 * and application-wide options.
 *
 * Features enabled by this decorator:
 * 1. Registers the decorated class as a Node Boot application in the `ApplicationContext`.
 * 2. Adds a `BeansConfigurationAdapter` for scanning `@Bean` methods in the application class.
 * 3. Configures the `ApplicationAdapter` to provide Node Boot engine options such as:
 *    - Route prefix and API defaults
 *    - Validation and transformation options
 *    - Controllers and middlewares
 *    - Optional current user and authorization checkers
 *
 * Example usage:
 * ```ts
 * @EnableDI(Container)
 * @EnableOpenApi()
 * @EnableSwaggerUI()
 * @EnableActuator()
 * @EnableRepositories()
 * @EnableScheduling()
 * @EnableHttpClients()
 * @EnableValidations()
 * @EnableComponentScan()
 * @NodeBootApplication()
 * export class SampleApp implements NodeBootApp {
 *     start(): Promise<NodeBootAppView> {
 *         return NodeBoot.run(ExpressServer);
 *     }
 * }
 * ```
 *
 * Notes:
 * - The decorator automatically integrates the application's `@Configuration` and `@Bean` definitions.
 * - It sets up the IoC container and application context for dependency injection.
 * - This is typically used on the root application class.
 *
 * @param options - Optional application-level options, such as API defaults or global configuration.
 * @returns A class decorator that registers the class as a Node Boot application.
 *
 * @author Manuel Santos <ney.br.santos@gmail.com>
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
