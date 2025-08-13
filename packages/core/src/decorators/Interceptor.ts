import {decorateDi} from "@nodeboot/di";
import {NodeBootToolkit} from "@nodeboot/engine";
import {ApplicationContext} from "@nodeboot/context";

/**
 * Registers a global interceptor.
 *
 * @param options Arguments for @Interceptor decorator:
 *  <br/>- <b>priority</b> Middleware priority in the chain
 */
export function Interceptor(options?: {priority?: number}): ClassDecorator {
    return (target: any) => {
        // DI is optional and the decorator will only be applied if the DI container dependency is available.
        decorateDi(target);

        // Registering the interceptor
        NodeBootToolkit.getMetadataArgsStorage().interceptors.push({
            target: target,
            global: true,
            priority: options?.priority ?? 0,
        });

        ApplicationContext.get().interceptorClasses.push(target);
    };
}
