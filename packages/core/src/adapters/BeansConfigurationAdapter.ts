import {
    allowedProfiles,
    BEAN_METADATA_KEY,
    BEAN_NAME_METADATA_KEY,
    BeansContext,
    ConfigurationAdapter,
} from "@nodeboot/context";
import {ConfigurationOptions} from "../decorators";

/**
 * `BeansConfigurationAdapter` is a core piece of Node Boot's auto-configuration system
 * (the “juice/core” magic) that bridges `@Configuration` classes and the IoC container.
 *
 * It inspects a `@Configuration` class for `@Bean` factory methods,
 * evaluates environment/profile conditions, and registers the resulting beans
 * into the application’s IoC container.
 *
 * **How it works:**
 * 1. The Node Boot runtime discovers classes decorated with `@Configuration`.
 * 2. For each configuration class, it creates a `BeansConfigurationAdapter` instance.
 * 3. When `bind()` is called, it:
 *    - Checks if the configuration is allowed to load:
 *      - If `options.onConfig` is set, only runs if that config path exists.
 *      - If `@Profile` metadata is present, only runs if active profiles match (`allowedProfiles`).
 *    - Iterates over all methods in the configuration class.
 *    - For each method decorated with `@Bean`:
 *      - Invokes the factory method (supports async and sync).
 *      - Registers the returned bean instance into the IoC container.
 *      - Uses `@Bean('name')` metadata or type-based registration rules.
 *
 * **Bean registration rules:**
 * - If `@Bean('customName')` is set → register under that name.
 * - If primitive (`string`, `number`, etc.) → register under the method name.
 * - If an object:
 *   - Try to register by return type metadata (`design:returntype`).
 *   - If return type is missing, fall back to the instance’s constructor.
 * - Async beans **must** be explicitly named with `@Bean('name')` to be injectable.
 *
 * **Example usage:**
 * ```ts
 * @Configuration()
 * export class MyConfig {
 *   @Bean()
 *   greeting() {
 *     return "Hello World";
 *   }
 *
 *   @Bean("asyncService")
 *   async createService(ctx: BeansContext) {
 *     return new MyService(await ctx.config.get("serviceUrl"));
 *   }
 * }
 * ```
 *
 * **Environment-based loading:**
 * ```ts
 * @Configuration({ onConfig: "feature.enabled" })
 * @Profile(["dev", "test"])
 * export class DevOnlyConfig {
 *   @Bean()
 *   devBean() {
 *     return new DevHelper();
 *   }
 * }
 * // Will only load if config.has("feature.enabled") === true
 * // AND active profile matches "dev" or "test".
 * ```
 *
 * @author Manuel Santos <ney.br.santos@gmail.com>
 */
export class BeansConfigurationAdapter implements ConfigurationAdapter {
    constructor(private readonly target: Function, private readonly options?: ConfigurationOptions) {}

    /**
     * Checks if a value is a primitive type.
     * @param value - Any value.
     * @returns True if the value is string, number, boolean, symbol, or bigint.
     */
    isPrimitive(value: any): boolean {
        return (
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean" ||
            typeof value === "symbol" ||
            typeof value === "bigint"
        );
    }

    /**
     * Discovers and binds all beans defined in the associated configuration class
     * into the given IoC container, honoring profile and config path restrictions.
     *
     * @param beansContext - The current beans context, including IoC container and config.
     */
    async bind<TApplication>(beansContext: BeansContext<TApplication>): Promise<void> {
        const {iocContainer, config} = beansContext;

        if (this.allowedByConfig(config) && allowedProfiles(this.target)) {
            const prototype = this.target.prototype;
            const propertyNames = Object.getOwnPropertyNames(prototype);

            for (const propertyName of propertyNames) {
                const descriptor = Object.getOwnPropertyDescriptor(prototype, propertyName);
                const isBean = Reflect.getMetadata(BEAN_METADATA_KEY, prototype, propertyName);
                const beanName = Reflect.getMetadata(BEAN_NAME_METADATA_KEY, prototype, propertyName);

                if (descriptor && descriptor.value && isBean) {
                    let beanInstance: any;
                    // Deal with Beans async factory functions
                    if (descriptor.value.constructor.name === "AsyncFunction") {
                        beanInstance = await descriptor.value.bind(this.target)(beansContext);
                    } else {
                        beanInstance = descriptor.value.bind(this.target)(beansContext);
                    }

                    if (beanName) {
                        iocContainer.set(beanName, beanInstance);
                    } else {
                        if (this.isPrimitive(beanInstance)) {
                            iocContainer.set(propertyName, beanInstance);
                        } else if (beanInstance) {
                            let beanType = Reflect.getMetadata("design:returntype", prototype, propertyName);

                            if (beanType === Promise) {
                                throw new Error(
                                    `Failed to bind @Bean for factory function ${descriptor.value.name}() in @Configuration class ${this.target.name}.
                                     @Bean factories that return a Promise must be named @Bean('bean-name') to be injected.`,
                                );
                            }

                            if (!beanType) {
                                // When no return type is provided by the bean function
                                beanType = typeof beanInstance === "function" ? beanInstance : beanInstance.constructor;
                            }
                            iocContainer.set(beanType, beanInstance);
                        }
                    }
                }
            }
        }
    }

    /**
     * Checks whether this configuration is allowed to load based on the provided config object.
     * @param config - Application configuration object.
     * @returns True if no `onConfig` restriction is set, or if the config path exists.
     */
    private allowedByConfig(config: any) {
        return !this.options?.onConfig || config.has(this.options?.onConfig);
    }
}
