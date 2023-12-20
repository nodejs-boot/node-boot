import {decorateDi} from "@node-boot/di";
import {NodeBootToolkit} from "@node-boot/engine";

/**
 * Registers a global interceptor.
 *
 * @param options Arguments for @Interceptor decorator:
 *  <br/>- <b>priority</b> Middleware priority in the chain
 */
export function Interceptor(options?: {priority?: number}) {
    return <TFunction extends Function>(target: TFunction) => {
        // DI is optional and the decorator will only be applied if the DI container dependency is available.
        decorateDi(target);
        // Registering the interceptor
        NodeBootToolkit.getMetadataArgsStorage().interceptors.push({
            target: target,
            global: true,
            priority: options?.priority ?? 0,
        });
    };
}
