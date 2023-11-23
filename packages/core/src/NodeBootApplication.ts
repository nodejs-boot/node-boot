import {
  ApplicationOptions,
  ApplicationContext,
  ApplicationAdapter
} from "@node-boot/context";
import { RoutingControllersOptions } from "routing-controllers/types/RoutingControllersOptions";
import { BeansConfigurationAdapter } from "./adapters/BeansConfigurationAdapter";

/**
 * Defines a class as an entry-point for a NodeJs application
 *
 * @param options Extra options that apply to the application
 */
export function NodeBootApplication(options?: ApplicationOptions): Function {
  return function (target: any) {
    Reflect.defineMetadata("custom:nodeBootApp", true, target);

    // Bind Configurations adapters to search from @Beans under the Application class
    ApplicationContext.get().configurationAdapters.push(
      new BeansConfigurationAdapter(target)
    );

    // Bind Application Adapter
    ApplicationContext.get().applicationAdapter = new (class
      implements ApplicationAdapter
    {
      bind(): RoutingControllersOptions {
        const context = ApplicationContext.get();
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
