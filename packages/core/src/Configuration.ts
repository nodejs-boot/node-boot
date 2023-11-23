import {ApplicationContext, BeansConfigurationAdapter} from "@node-boot/context";

export const IS_CONFIGURATION_KEY = Symbol("isConfiguration");

export function Configuration(): Function {

    return function (target: Function) {
        Reflect.defineMetadata(IS_CONFIGURATION_KEY, true, target);

        ApplicationContext.get()
            .configurationAdapters.push(new BeansConfigurationAdapter(target));
    };
}
