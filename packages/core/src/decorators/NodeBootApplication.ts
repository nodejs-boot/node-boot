import {
  ApplicationAdapter,
  ApplicationContext,
  ApplicationOptions,
  IocContainer
} from "@node-boot/context";
import { RoutingControllersOptions } from "routing-controllers/types/RoutingControllersOptions";
import { BeansConfigurationAdapter } from "../adapters";

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
      environment: options?.environment ?? "development",
      port: options?.port ?? 3000,
      platformName: options?.platformName ?? "node-boot",
      appName: options?.appName ?? "node-boot-app"
    };

    // Bind Configurations adapters to search from @Beans under the Application class
    context.configurationAdapters.push(new BeansConfigurationAdapter(target));

    // Bind Application Adapter
    context.applicationAdapter = new (class implements ApplicationAdapter {
      bind(): RoutingControllersOptions {
        const context = ApplicationContext.get();

        if (
          context.applicationOptions.customErrorHandler &&
          context.applicationOptions.defaultErrorHandler
        ) {
          throw new Error(
            `Invalid configurations: 'defaultErrorHandler' cannot be enabled if an @ErrorHandler is provided. Please disable defaultErrorHandler or delete the custom @ErrorHandler.`
          );
        }
        return {
          /* cors: {
                                 origin: ORIGIN,
                                 credentials: CREDENTIALS
                               },*/
          classTransformer: context.classTransformer,
          classToPlainTransformOptions: context.classToPlainTransformOptions,
          plainToClassTransformOptions: context.plainToClassTransformOptions,
          controllers: context.controllerClasses,
          middlewares: context.globalMiddlewares,
          defaultErrorHandler: options?.defaultErrorHandler,
          currentUserChecker: context.currentUserChecker,
          authorizationChecker: context.authorizationChecker
        };
      }
    })();
  };
}
