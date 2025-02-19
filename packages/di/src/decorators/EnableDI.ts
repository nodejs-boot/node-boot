import {ApplicationContext, IocContainer, UseContainerOptions} from "@nodeboot/context";

/**
 * Defines the IOC container to use for Dependency-injection
 *
 * @param iocContainer The IOC container to be used
 * @param options Extra options for the IOC container
 */
export function EnableDI<TContainer>(iocContainer: IocContainer<TContainer>, options?: UseContainerOptions): Function {
    return function () {
        ApplicationContext.get().diOptions = {
            iocContainer,
            options,
        };
    };
}
