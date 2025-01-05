import {Hook} from "./Hook";
import {ApplicationContext} from "@node-boot/context";

export class ServiceHook extends Hook {
    use<T>(serviceClass: new (...args: any[]) => T): T {
        if (!Reflect.hasMetadata("__isService", serviceClass)) {
            throw new Error(`The class ${serviceClass.name} is not decorated with @Service.`);
        }
        const iocContainer = ApplicationContext.getIocContainer();
        if (iocContainer) {
            return iocContainer.get(serviceClass);
        }
        throw new Error(`IOC Container is required for useService hook to work`);
    }
}
