import {ApplicationContext, IocContainer, UseContainerOptions} from "@nodeboot/context";
import {activateDiPlugin} from "../ioc";

/**
 * Plugs a custom IOC container into Node-Boot's Dependency-injection.
 *
 * Optional: without it Node-Boot uses its default, Nonna-backed container. Use it to bring your own, for
 * example TypeDI's `Container` (install `typedi`) or an Inversify container (install `inversify`).
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
        // Beans decorated before this ran are replayed through the plugin library (TypeDI/Inversify).
        activateDiPlugin();
    };
}
