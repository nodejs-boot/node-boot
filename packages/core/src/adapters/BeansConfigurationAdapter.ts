import {BEAN_METADATA_KEY, BEAN_NAME_METADATA_KEY, BeansContext, ConfigurationAdapter} from "@nodeboot/context";
import {ConfigurationOptions} from "../decorators";

export class BeansConfigurationAdapter implements ConfigurationAdapter {
    constructor(private readonly target: Function, private readonly options?: ConfigurationOptions) {}

    isPrimitive(value: any): boolean {
        return (
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean" ||
            typeof value === "symbol" ||
            typeof value === "bigint"
        );
    }

    async bind<TApplication>(beansContext: BeansContext<TApplication>): Promise<void> {
        const {iocContainer, config} = beansContext;

        // Allow configurations to resolve beans only if a config path exists
        if (!this.options?.onConfig || config.has(this.options?.onConfig)) {
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
                                    `Failed to bind @Bean for factory function ${descriptor.value.name}() registered in @Configuration class ${this.target.name}. 
                @Bean factories return a Promise should be named @Bean('bean-name') otherwise they cannot be injected`,
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
}
