import {ApplicationContext, Config} from "@node-boot/context";
import {ConfigService} from "@node-boot/config";

export function useService<T>(serviceClass: new (...args: any[]) => T): T {
    if (!Reflect.hasMetadata("__isService", serviceClass)) {
        throw new Error(`The class ${serviceClass.name} is not decorated with @Service.`);
    }
    const iocContainer = ApplicationContext.getIocContainer();
    if (iocContainer) {
        return iocContainer.get(serviceClass);
    }
    throw new Error(`IOC Container is required for useService hook to work`);
}

export function useAppConfig(): Config {
    const iocContainer = ApplicationContext.getIocContainer();
    if (iocContainer?.has(ConfigService)) {
        return iocContainer.get(ConfigService);
    }
    throw new Error(
        `No Config found in the IOC container. Please bootstrap your NodeBoot server before calling useConfig hook`,
    );
}
