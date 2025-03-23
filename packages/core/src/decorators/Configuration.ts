import {ApplicationContext} from "@nodeboot/context";
import {BeansConfigurationAdapter} from "../adapters";

export const IS_CONFIGURATION_KEY = Symbol("isConfiguration");

export type ConfigurationOptions = {
    onConfig?: string;
};

export function Configuration(options?: ConfigurationOptions): ClassDecorator {
    return function (target: Function) {
        Reflect.defineMetadata(IS_CONFIGURATION_KEY, true, target);
        ApplicationContext.get().configurationAdapters.push(new BeansConfigurationAdapter(target, options));
    };
}
