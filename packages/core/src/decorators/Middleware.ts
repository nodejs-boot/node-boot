import {Middleware as InnerMiddleware} from "routing-controllers";
import {decorateDi} from "@node-boot/di";

/**
 * Marks given class as a middleware.
 * Allows to create global middlewares and control order of middleware execution.
 *
 * @param args Arguments for routing-controllers @Middleware decorator:
 *  <br/>- <b>type</b> Type of decorator. <i>before</i> for inbound and <i>after</i> for outbound middleware.
 *  <br/>- <b>priority</b> Middleware priority in the chain
 */
export function Middleware(...args: Parameters<typeof InnerMiddleware>) {
    return <TFunction extends Function>(target: TFunction) => {
        // DI is optional and the decorator will only be applied if the DI container dependency is available.
        decorateDi(target);
        InnerMiddleware(...args)(target);
    };
}
