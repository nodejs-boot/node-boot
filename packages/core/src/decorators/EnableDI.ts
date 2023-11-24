import {ApplicationContext, IocContainer} from "@node-boot/context";
import {UseContainerOptions} from "routing-controllers/types/container";

/**
 * Defines the IOC container to use for Dependency-injection
 *
 * @param iocContainer The IOC container to be used
 * @param options Extra options for the IOC container
 */
export function EnableDI<TContainer>(
    iocContainer: IocContainer<TContainer>,
    options?: UseContainerOptions,
): Function {
    return function (object: Function) {
        ApplicationContext.get().diOptions = {
            iocContainer,
            options,
        };
    };
}
