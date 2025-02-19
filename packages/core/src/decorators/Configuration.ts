import {ApplicationContext} from "@nodeboot/context";
import {BeansConfigurationAdapter} from "../adapters";

export const IS_CONFIGURATION_KEY = Symbol("isConfiguration");

export function Configuration(): ClassDecorator {
    return function (target: Function) {
        Reflect.defineMetadata(IS_CONFIGURATION_KEY, true, target);

        ApplicationContext.get().configurationAdapters.push(new BeansConfigurationAdapter(target));
    };
}
