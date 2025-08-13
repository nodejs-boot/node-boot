import {ApplicationContext} from "@nodeboot/context";
import {BeansConfigurationAdapter} from "../adapters";

export const IS_CONFIGURATION_KEY = Symbol("isConfiguration");

export type ConfigurationOptions = {
    onConfig?: string;
};

/**
 * Marks a class as a configuration provider for Node Boot's IoC container.
 *
 * Classes decorated with `@Configuration` can define `@Bean` factory methods
 * that will be automatically discovered and registered in the application's
 * IoC container.
 *
 * The decorator registers a `BeansConfigurationAdapter` for the class in the
 * `ApplicationContext`, enabling the following features:
 * 1. Automatic scanning of all methods decorated with `@Bean`.
 * 2. Conditional loading based on environment profiles (`@Profile`) and config options.
 * 3. Automatic binding of bean instances into the IoC container, supporting
 *    both synchronous and asynchronous factory methods.
 *
 * Example usage:
 * ```ts
 * @Configuration()
 * export class AppConfig {
 *   @Bean()
 *   greeting() {
 *     return "Hello, World!";
 *   }
 *
 *   @Bean("asyncService")
 *   async createService(ctx: BeansContext) {
 *     return new MyService(await ctx.config.get("serviceUrl"));
 *   }
 * }
 * ```
 *
 * Environment- and profile-based example:
 * ```ts
 * @Configuration({ onConfig: "feature.enabled" })
 * @Profile(["dev", "test"])
 * export class DevConfig {
 *   @Bean()
 *   devBean() {
 *     return new DevHelper();
 *   }
 * }
 * // Only loaded if config.has("feature.enabled") is true
 * // AND active profile is "dev" or "test".
 * ```
 *
 * @param options - Optional configuration options that can restrict loading of this configuration.
 *                  For example, `onConfig` specifies a config path that must exist for the configuration
 *                  to be loaded.
 * @returns A class decorator that registers the class as a Beans provider.
 *
 * @author Manuel Santos <ney.br.santos@gmail.com>
 */
export function Configuration(options?: ConfigurationOptions): ClassDecorator {
    return function (target: Function) {
        Reflect.defineMetadata(IS_CONFIGURATION_KEY, true, target);
        ApplicationContext.get().configurationAdapters.push(new BeansConfigurationAdapter(target, options));
    };
}
