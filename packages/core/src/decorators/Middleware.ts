import {decorateDi} from "@nodeboot/di";
import {NodeBootToolkit} from "@nodeboot/engine";
import {ApplicationContext} from "@nodeboot/context";

/**
 * Marks given class as a middleware.
 * Allows to create global middlewares and control order of middleware execution.
 *
 * @param options Arguments for Node-Boot @Middleware decorator:
 *  <br/>- <b>type</b> Type of decorator. <i>before</i> for inbound and <i>after</i> for outbound middleware.
 *  <br/>- <b>priority</b> Middleware priority in the chain
 */
export function Middleware(options: {type: "after" | "before"; priority?: number}): ClassDecorator {
    return (target: any) => {
        // DI is optional and the decorator will only be applied if the DI container dependency is available.
        decorateDi(target);

        NodeBootToolkit.getMetadataArgsStorage().middlewares.push({
            target: target,
            global: true,
            type: options?.type ?? "before",
            priority: options?.priority ?? 0,
        });

        ApplicationContext.get().globalMiddlewares.push(target);
    };
}
